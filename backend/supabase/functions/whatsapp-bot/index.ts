// Edge Function: whatsapp-bot
// Recibe mensajes de Meta WhatsApp y responde como "Micheline", agendando citas.
// Reusa la logica del chat existente y llama a create-booking para guardar la cita.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cabeceras CORS para las respuestas
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// Prompt base de la recepcionista Micheline
const SYSTEM = `Eres "Micheline", la asistente virtual de un salon de uñas en Santo Domingo.
Tu trabajo: atender al cliente por WhatsApp, decir servicios y precios, y agendar citas.
Servicios (precio base): Manicura clasica $15, Manicura con gel $40, Nail art premium $60, Pedicura spa $35, Retiro de esmalte en gel $25.
Reglas:
- Habla en espanol, corto y amable.
- Si el cliente quiere agendar, pregunta: servicio, fecha y hora.
- Cuando tengas servicio + fecha + hora + nombre + telefono, confirma la cita.
- No inventes precios.`

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Meta envia GET para verificar el webhook (challenge) SIN header de auth
  const url = new URL(req.url)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    // El verify_token lo configuras en Meta (usamos uno fijo)
    if (mode === 'subscribe' && token === 'micheline_webhook_2026') {
      return new Response(challenge, { status: 200 })
    }
    return new Response('forbidden', { status: 403 })
  }

  try {
    const body = await req.json()
    // Meta manda los mensajes dentro de entry[].changes[].value.messages[].text.body
    const change = body?.entry?.[0]?.changes?.[0]?.value
    const message = change?.messages?.[0]
    const from = message?.from // numero del cliente (E.164, ej +1809...)
    const text = message?.text?.body || ''

    if (!from || !text) {
      return new Response(JSON.stringify({ ok: true, note: 'no message' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Responder con la IA (logica simple de eco + datos reales de la BD)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // (Fase 1) Respuesta basica con datos reales: listar servicios si pregunta
    let reply = ''
    const lower = text.toLowerCase()
    if (lower.includes('servicio') || lower.includes('precio') || lower.includes('hola')) {
      const { data: servicios } = await supabase.from('servicios').select('name, price').eq('is_active', true).order('price')
      if (servicios) {
        reply = '💅 Hola, soy Micheline. Nuestros servicios:\n' +
          servicios.map((s: any) => `• ${s.name}: $${Number(s.price).toFixed(2)}`).join('\n') +
          '\n¿Cuál te gustaría y en qué fecha/hora?'
      } else {
        reply = '💅 Hola, soy Micheline. ¿En qué puedo ayudarte?'
      }
    } else {
      reply = '✅ Recibí tu mensaje. ¿Quieres agendar una cita? Dime el servicio, fecha y hora.'
    }

    // Enviar respuesta por la API de WhatsApp (Meta Graph)
    const waToken = Deno.env.get('WHATSAPP_TOKEN')!
    const phoneId = Deno.env.get('PHONE_NUMBER_ID')!
    await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: from,
        type: 'text',
        text: { body: reply },
      }),
    })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
