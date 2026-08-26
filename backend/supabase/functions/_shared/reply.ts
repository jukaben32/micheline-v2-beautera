// Logica compartida de respuesta IA / rule-based, usada por chat (widget web)
// y whatsapp-bot (Evolution API). Un solo lugar para el prompt y las reglas,
// para que las dos superficies respondan igual y no diverjan con el tiempo.

// deno-lint-ignore no-explicit-any
type SupabaseClient = any

export type ChatMsg = { role: 'user' | 'assistant'; content: string }

export async function getReply(
  supabase: SupabaseClient,
  businessId: string,
  message: string,
  history: ChatMsg[],
  // Como decirle al cliente que complete la reserva: el widget web dice
  // "toca el boton"; WhatsApp necesita un link real a /sites/<slug>.
  bookingInstruction: string,
): Promise<{ reply: string; mode: string; error?: string; usage?: { input_tokens: number; output_tokens: number } }> {
  const [{ data: negocio }, { data: servicios }, { data: estilistas }] = await Promise.all([
    supabase.from('business').select('name').eq('id', businessId).maybeSingle(),
    supabase.from('services').select('name,duration_min,price,category').eq('business_id', businessId).eq('is_active', true).order('price'),
    supabase.from('stylists').select('full_name,specialty,bio').eq('business_id', businessId).eq('is_active', true),
  ])

  const ctx = {
    negocio: negocio?.name || 'nuestro salón',
    servicios: servicios ?? [],
    estilistas: estilistas ?? [],
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

  if (anthropicKey) {
    const system = `Eres la asistente virtual de ${ctx.negocio}, un salon de uñas. ` +
      `Responde en español, corto y amable. Usa SOLO estos datos:\n` +
      `Servicios: ${JSON.stringify(ctx.servicios)}\n` +
      `Estilistas: ${JSON.stringify(ctx.estilistas)}\n` +
      `Si te piden reservar, di: "${bookingInstruction}"`
    const msgs = [...history.slice(-6), { role: 'user', content: message }]
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system,
        messages: msgs,
      }),
    })
    const data = await r.json()

    if (!r.ok) {
      console.error('Anthropic API error', r.status, JSON.stringify(data))
      return {
        reply: 'En este momento no puedo responder. Por favor intenta de nuevo en unos minutos.',
        mode: 'ai_error',
        error: data?.error?.message ?? `HTTP ${r.status}`,
      }
    }
    return {
      reply: data?.content?.[0]?.text ?? 'No pude responder ahora.',
      mode: 'ai',
      usage: data?.usage
        ? { input_tokens: data.usage.input_tokens ?? 0, output_tokens: data.usage.output_tokens ?? 0 }
        : undefined,
    }
  }

  // --- MODO SIN IA: reglas simples sobre los datos reales ---
  const txt = message.toLowerCase()
  const lastUserMsg = history.filter(h => h.role === 'user').map(h => h.content.toLowerCase()).pop() ?? ''
  const context = lastUserMsg + ' ' + txt
  let reply = ''

  if (txt.includes('precio') || txt.includes('cuesta') || txt.includes('costo') || txt.includes('precios')) {
    const servicioEnContexto = ctx.servicios.find((s: { name: string }) => context.includes(s.name.toLowerCase()))
    if (servicioEnContexto) {
      reply = `💅 El precio de ${servicioEnContexto.name} es $${Number(servicioEnContexto.price).toFixed(2)} (${servicioEnContexto.duration_min} min).`
    } else {
      reply = '💅 Nuestros servicios:\n' + ctx.servicios
        .map((s: { name: string; duration_min: number; price: number }) => `• ${s.name} (${s.duration_min} min) — $${Number(s.price).toFixed(2)}`)
        .join('\n')
    }
  } else if (txt.includes('estilista') || txt.includes('profesional') || txt.includes('quien') || txt.includes('especialista') || txt.includes('técnica')) {
    const estilistaEnContexto = ctx.estilistas.find((e: { full_name: string; specialty: string }) =>
      context.includes(e.full_name.toLowerCase()) || context.includes((e.specialty || '').toLowerCase()))
    if (estilistaEnContexto) {
      reply = `👩‍🎨 ${estilistaEnContexto.full_name} especializa en ${estilistaEnContexto.specialty}.`
    } else {
      reply = '👩‍🎨 Nuestras especialistas:\n' + ctx.estilistas
        .map((e: { full_name: string; specialty: string }) => `• ${e.full_name} — ${e.specialty}`)
        .join('\n')
    }
  } else if (txt.includes('horario') || txt.includes('abierto') || txt.includes('hora') || txt.includes('cuando') || txt.includes('día')) {
    reply = `🕘 ${bookingInstruction}`
  } else if (txt.includes('reserv') || txt.includes('agendar') || txt.includes('cita') || txt.includes('turno')) {
    reply = `📅 ¡Claro! ${bookingInstruction}`
  } else {
    reply = `Hola 💅 Soy la asistente de ${ctx.negocio}. Puedes preguntarme por precios, servicios, estilistas u horarios. ¿En qué te ayudo?`
  }

  return { reply, mode: 'info' }
}
