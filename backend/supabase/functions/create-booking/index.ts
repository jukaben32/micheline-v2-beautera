// Edge Function: create-booking
// Crea una cita, valida que no choque, guarda/crea el cliente y
// manda confirmación por Resend (email). Reemplaza a n8n.
//
// Entrada (POST JSON):
//   {
//     "stylist_id": "uuid",
//     "service_id": "uuid",
//     "date": "YYYY-MM-DD",
//     "time": "HH:MM",
//     "client_name": "...",
//     "client_phone": "...",
//     "client_email": "...",   (opcional, para recibir email)
//     "notes": "..."           (opcional)
//   }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SLOT_MINUTES = 30

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    const { stylist_id, service_id, date, time, client_name, client_phone, client_email, notes } = body

    if (!stylist_id || !service_id || !date || !time || !client_name || !client_phone) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      (Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!
    )

    // Rate limiting: maximo 3 reservas por telefono y 5 por IP en la ultima hora.
    // Evita spam de reservas falsas (bots que llaman la funcion directo, sin pasar
    // por el honeypot del formulario).
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip') ?? 'unknown'
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const [{ count: byPhone }, { count: byIp }] = await Promise.all([
      supabase.from('rate_limit_log').select('id', { count: 'exact', head: true })
        .eq('fn', 'create-booking').eq('rate_key', client_phone).gte('created_at', oneHourAgo),
      supabase.from('rate_limit_log').select('id', { count: 'exact', head: true })
        .eq('fn', 'create-booking').eq('rate_key', ip).gte('created_at', oneHourAgo),
    ])
    if ((byPhone ?? 0) >= 3 || (byIp ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: 'Demasiados intentos de reserva. Intenta de nuevo mas tarde.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    await supabase.from('rate_limit_log').insert([
      { fn: 'create-booking', rate_key: client_phone },
      { fn: 'create-booking', rate_key: ip },
    ])

    // Duración del servicio
    const { data: service } = await supabase
      .from('services').select('duration_min, name, price').eq('id', service_id).single()
    const duration = service?.duration_min ?? SLOT_MINUTES
    const price = Number(service?.price) || 0

    // Calcular inicio/fin en America/Santo_Domingo (UTC-4)
    const [h, m] = time.split(':').map(Number)
    const startMin = h * 60 + m
    const endMin = startMin + duration
    const startAt = `${date}T${String(Math.floor(startMin/60)).padStart(2,'0')}:${String(startMin%60).padStart(2,'0')}:00-04:00`
    const endAt = `${date}T${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}:00-04:00`

    // Validar choque con citas confirmadas
    const { data: clash } = await supabase
      .from('appointments')
      .select('id')
      .eq('stylist_id', stylist_id)
      .eq('status', 'confirmada')
      .lt('start_at', endAt)
      .gt('end_at', startAt)
    if (clash && clash.length > 0) {
      return new Response(JSON.stringify({ error: 'Ese horario ya está ocupado' }),
        { status: 409, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Crear o encontrar cliente
    let clientId: string | null = null
    const { data: existing } = await supabase
      .from('clients').select('id').eq('phone', client_phone).maybeSingle()
    if (existing) {
      clientId = existing.id
      await supabase.from('clients').update({ full_name: client_name })
        .eq('id', clientId)
    } else {
      const { data: nuevo } = await supabase
        .from('clients').insert({ full_name: client_name, phone: client_phone, email: client_email, category: 'nuevo' })
        .select('id').single()
      clientId = nuevo?.id ?? null
    }

    // Insertar cita en estado 'pendiente_pago' (se confirma al pagar)
    const { data: appt, error } = await supabase
      .from('appointments').insert({
        client_id: clientId, stylist_id, service_id,
        start_at: startAt, end_at: endAt,
        client_name, client_phone, notes, source: 'widget',
        status: 'pendiente_pago', price
      }).select('id').single()
    if (error) throw error

    // Enviar confirmación por Resend (si hay API key y email)
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey && client_email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Micheline Nail Bar <onboarding@resend.dev>', // cambiar a tu dominio cuando esté verificado en Resend
          to: [client_email],
          subject: 'Confirmación de tu cita - Micheline Nail Bar',
          html: `<h2>¡Cita confirmada!</h2><p>Hola ${client_name}, tu cita es el <b>${date}</b> a las <b>${time}</b> con Micheline.</p><p>Te esperamos 💅</p>`
        })
      }).catch(() => {}) // no bloquea si falla el email
    }

    return new Response(JSON.stringify({ ok: true, appointment_id: appt?.id }),
      { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
