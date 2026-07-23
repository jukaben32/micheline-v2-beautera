// Edge Function: chat  (widget de información + IA)
// Responde preguntas del cliente sobre precios, servicios, estilistas y horarios.
// Usa Claude (@anthropic-ai/sdk) si hay ANTHROPIC_API_KEY; si no, responde
// con datos reales de la BD (rule-based). Esta misma función es el punto de
// entrada para conectar luego un bot de Meta WhatsApp.
//
// Entrada (POST JSON): { "message": "..." , "history": [ {role, content} ] }
// Salida: { "reply": "..." }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { message, history } = await req.json()
    if (!message) {
      return new Response(JSON.stringify({ error: 'Falta message' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Traer datos reales de la BD para contexto/respuesta
    const [{ data: servicios }, { data: estilistas }] = await Promise.all([
      supabase.from('services').select('name,duration_min,price,category').eq('is_active', true).order('price'),
      supabase.from('stylists').select('full_name,specialty,bio').eq('is_active', true),
    ])

    const ctx = {
      negocio: 'Micheline Nail Bar',
      servicios: servicios ?? [],
      estilistas: estilistas ?? [],
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (anthropicKey) {
      // --- MODO IA: Claude responde usando el contexto real ---
      const system = `Eres la asistente virtual de ${ctx.negocio}, un salon de uñas. ` +
        `Responde en español, corto y amable. Usa SOLO estos datos:\n` +
        `Servicios: ${JSON.stringify(ctx.servicios)}\n` +
        `Estilistas: ${JSON.stringify(ctx.estilistas)}\n` +
        `Si te piden reservar, di que usen el boton "Reservar cita" del widget.`
      const msgs = [...(history ?? []).slice(-6), { role: 'user', content: message }]
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // claude-3-5-haiku-latest fue retirado el 19-feb-2026; usar el modelo vigente.
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system,
          messages: msgs,
        }),
      })
      const data = await r.json()

      if (!r.ok) {
        // Loguear el error real de Anthropic (visible en Supabase > Edge Functions > Logs)
        console.error('Anthropic API error', r.status, JSON.stringify(data))
        return new Response(JSON.stringify({
          reply: 'En este momento no puedo responder. Para más info llama al 809-246-5821 o escríbenos por WhatsApp.',
          mode: 'ai_error',
          error: data?.error?.message ?? `HTTP ${r.status}`,
        }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
      }

      const reply = data?.content?.[0]?.text ?? 'No pude responder ahora.'
      return new Response(JSON.stringify({ reply, mode: 'ai' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // --- MODO SIN IA: reglas simples sobre los datos reales con contexto de historial ---
    const txt = message.toLowerCase()
    let reply = ''

    // Obtener el último mensaje del usuario del historial para contexto
    const lastUserMsg = history
      .filter(h => h.role === 'user')
      .map(h => h.content.toLowerCase())
      .pop() ?? ''

    // Contexto combinado: último mensaje del usuario + mensaje actual
    const context = lastUserMsg + ' ' + txt

    // Servicios
    if (txt.includes('precio') || txt.includes('cuesta') || txt.includes('costo') || txt.includes('precios')) {
      // Buscar si se menciona un servicio específico en el contexto
      const servicioEnContexto = ctx.servicios.find(s => 
        context.includes(s.name.toLowerCase())
      )
      if (servicioEnContexto) {
        reply = `💅 El precio de ${servicioEnContexto.name} es $${Number(servicioEnContexto.price).toFixed(2)} (${servicioEnContexto.duration_min} min).`
      } else {
        reply = '💅 Nuestros servicios:\n' + ctx.servicios
          .map((s: any) => `• ${s.name} (${s.duration_min} min) — $${Number(s.price).toFixed(2)}`)
          .join('\n')
      }
    }
    // Estilistas
    else if (txt.includes('estilista') || txt.includes('profesional') || txt.includes('quien') || 
             txt.includes('especialista') || txt.includes('técnica')) {
      // Buscar si se menciona un estilista específico en el contexto
      const estilistaEnContexto = ctx.estilistas.find(e => 
        context.includes(e.full_name.toLowerCase()) || 
        context.includes(e.specialty.toLowerCase())
      )
      if (estilistaEnContexto) {
        reply = `👩‍🎨 ${estilistaEnContexto.full_name} especializa en ${estilistaEnContexto.specialty}.`
      } else {
        reply = '👩‍🎨 Nuestras especialistas:\n' + ctx.estilistas
          .map((e: any) => `• ${e.full_name} — ${e.specialty}`)
          .join('\n')
      }
    }
    // Horarios
    else if (txt.includes('horario') || txt.includes('abierto') || txt.includes('hora') || 
             txt.includes('cuando') || txt.includes('día')) {
      reply = '🕘 Atendemos lunes a sábado de 9:00 a.m. a 5:00 p.m. Usa "Reservar cita" para ver huecos disponibles.'
    }
    // Reservas
    else if (txt.includes('reserv') || txt.includes('agendar') || txt.includes('cita') || 
             txt.includes('turno') || txt.includes('hora')) {
      reply = '📅 ¡Claro! Toca el botón "Reservar cita" arriba, elige servicio y estilista, y verás los horarios libres. '
    }
    // Otros
    else {
      reply = 'Hola 💅 Soy la asistente de Micheline Nail Bar. Puedes preguntarme por precios, servicios, estilistas u horarios. ¿En qué te ayudo?'
    }

    return new Response(JSON.stringify({ reply, mode: 'info' }),
      { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
