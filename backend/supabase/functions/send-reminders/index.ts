// Edge Function: send-reminders
// Pensada para correr con un cron (Supabase Cron) 1 vez al día.
//  - Recordatorio 24h antes a citas confirmadas del día siguiente
//  - Reactivación: email a clientes que no vienen hace > 3 meses
//
// No requiere body. Se invoca por el scheduler de Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const tz = 'America/Santo_Domingo'
  let enviados = 0

  const sendEmail = async (to: string, subject: string, html: string) => {
    if (!resendKey || !to) return
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Micheline Nail Bar <hola@micheline.com>', to: [to], subject, html })
    }).catch(() => {})
    enviados++
  }

  // --- 1) Recordatorio 24h antes ---
  const maniana = new Date(Date.now() + 24 * 3600 * 1000)
  const fecha = maniana.toISOString().slice(0, 10)
  const { data: citas } = await supabase
    .from('appointments')
    .select('client_name, client_phone, client_email, start_at, stylists(full_name)')
    .eq('status', 'confirmada')
    .gte('start_at', `${fecha}T00:00:00-04:00`)
    .lt('start_at', `${fecha}T23:59:59-04:00`)
  for (const c of citas ?? []) {
    const hora = new Date(c.start_at).toLocaleTimeString('es', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
    await sendEmail(c.client_email,
      'Recordatorio: tu cita mañana - Micheline Nail Bar',
      `<p>Hola ${c.client_name}, te recordamos tu cita mañana ${hora} con ${c.stylists?.full_name}. ¡Te esperamos! 💅</p>`)
  }

  // --- 2) Reactivación de clientes inactivos (>90 días sin cita) ---
  const hace90 = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
  const { data: inactivos } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('category', 'inactivo')
  for (const cl of inactivos ?? []) {
    await sendEmail(cl.email,
      'Te extrañamos - Micheline Nail Bar',
      `<p>Hola ${cl.full_name}, han pasado meses sin verte. ¡Reserva y tomate un momento para ti! 💅</p>`)
  }

  return new Response(JSON.stringify({ ok: true, emails_enviados: enviados }),
    { headers: { 'Content-Type': 'application/json' } })
})
