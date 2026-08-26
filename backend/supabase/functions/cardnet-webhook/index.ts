// Edge Function: cardnet-webhook
// CardNET llama este endpoint cuando el cliente termina de pagar.
// Nosotros confirmamos la cita (status -> 'confirmada') y disparan
// el email de confirmacion (reutilizando la logica de send-confirmation).
//
// CardNET envia el resultado del pago. Los campos exactos dependen de su
// doc, pero tipicamente incluye: reference (nuestro appointment_id),
// status ('approved'/'paid'), transaction_id.
//
// IMPORTANTE: en produccion, valida la firma HMAC que CardNET envia en
// el header para asegurarte de que el llamado es legitimo.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    // CardNET suele usar 'reference' para nuestro id y 'status' para el resultado
    const appointmentId = body.reference || body.reference_id || body.order_id
    const resultStatus = (body.status || body.result || '').toString().toLowerCase()

    if (!appointmentId) {
      return new Response(JSON.stringify({ error: 'Sin reference de cita' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Solo confirmamos si el pago fue aprobado
    const aprobado = ['approved', 'paid', 'completed', 'success', '1', 'ok'].includes(resultStatus)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      (Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!
    )

    if (aprobado) {
      const { data: appt, error } = await supabase
        .from('appointments')
        .update({
          status: 'confirmada',
          paid_at: new Date().toISOString(),
          payment_id: body.transaction_id || body.payment_id || body.id || undefined,
        })
        .eq('id', appointmentId)
        .select('id, client_name, client_phone, client_email, start_at, business_id')
        .single()
      if (error) throw error

      // Disparar confirmacion por email (reutiliza send-confirmation)
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))}` },
        body: JSON.stringify({
          name: appt.client_name, phone: appt.client_phone, email: appt.client_email,
          date: (appt.start_at || '').slice(0, 10), time: (appt.start_at || '').slice(11, 16),
          price: 0, service: { name: 'Reserva Micheline' }, stylist: { full_name: 'Micheline' },
        }),
      }).catch(() => {}) // no bloquea si falla el email

      return new Response(JSON.stringify({ ok: true, status: 'confirmada' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Pago no aprobado: dejamos la cita en pendiente_pago (o la cancelamos)
    await supabase.from('appointments').update({ status: 'cancelada' })
      .eq('id', appointmentId).is('status', 'pendiente_pago')

    return new Response(JSON.stringify({ ok: true, status: 'no_aprobado' }),
      { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
