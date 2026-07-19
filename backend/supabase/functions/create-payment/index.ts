// Edge Function: create-payment
// Crea un medio de pago para una cita y devuelve la URL donde el cliente paga.
//
// Entrada (POST JSON):
//   {
//     "appointment_id": "uuid",        // cita ya creada en estado 'pendiente_pago'
//     "method": "cardnet" | "transferencia",
//     "amount": 1234.50,               // opcional, si no viene se lee de la cita
//     "client_name": "...",
//     "client_email": "..."            // opcional, CardNET lo usa en el correo
//   }
//
// Salida:
//   cardnet       -> { ok:true, pay_url:"https://...", payment_id:"..." }
//   transferencia -> { ok:true, method:"transferencia", bank: {...datos...} }
//
// NOTA: las credenciales de CardNET se guardan como SECRETOS en Supabase
// (supabase secrets set CARDNET_MERCHANT_ID=... CARDNET_API_KEY=...).
// Nunca se exponen al frontend. El cliente paga en la pagina de CardNET
// (nosotros no tocamos la tarjeta -> cumplimiento PCI).

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
    const { appointment_id, method, amount, client_name, client_email } = body

    if (!appointment_id || !method) {
      return new Response(JSON.stringify({ error: 'Faltan appointment_id y method' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Leer la cita (monto, negocio, etc.)
    const { data: appt, error: eAppt } = await supabase
      .from('appointments')
      .select('id, price, business_id, status, client_name')
      .eq('id', appointment_id).single()
    if (eAppt || !appt) {
      return new Response(JSON.stringify({ error: 'Cita no encontrada' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const monto = amount ?? Number(appt.price) ?? 0
    if (monto <= 0) {
      return new Response(JSON.stringify({ error: 'La cita no tiene monto a cobrar' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    if (method === 'transferencia') {
      // Pago manual: devolvemos los datos bancarios del salón.
      // Se leen de la tabla business (columnas que agregaremos: bank_name, bank_account, bank_holder).
      const { data: biz } = await supabase
        .from('business').select('name, bank_name, bank_account, bank_holder')
        .eq('id', appt.business_id).single()
      // Marcar la cita como pendiente por transferencia
      await supabase.from('appointments').update({ payment_method: 'transferencia' })
        .eq('id', appointment_id)
      return new Response(JSON.stringify({
        ok: true, method: 'transferencia',
        bank: {
          business: biz?.name ?? 'Salón',
          bank: biz?.bank_name ?? 'Banco Popular / Reservas',
          holder: biz?.bank_holder ?? '',
          account: biz?.bank_account ?? '',
        }
      }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    if (method === 'cardnet') {
      const merchantId = Deno.env.get('CARDNET_MERCHANT_ID')
      const apiKey = Deno.env.get('CARDNET_API_KEY')
      if (!merchantId || !apiKey) {
        return new Response(JSON.stringify({ error: 'CardNET no configurado (falta CARDNET_MERCHANT_ID / CARDNET_API_KEY)' }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
      }

      // Crear Link de Pago en CardNET.
      // Endpoint tipico de CardNET Payment Request / Link de Pago.
      // (Ajustar URL/campos cuando tengas las credenciales y la doc real.)
      const cardnetRes = await fetch('https://server.pciapi.cardnet.com.do/payment-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'MerchantId': merchantId,
          'ApiKey': apiKey,
        },
        body: JSON.stringify({
          amount: monto.toFixed(2),
          currency: 'DOP',
          description: `Reserva Micheline - ${appt.client_name || client_name || 'Cliente'}`,
          customer_email: client_email || null,
          // URL a la que CardNET redirige al cliente tras pagar (tu landing)
          return_url: 'https://micheline-v2-beautera.vercel.app/pago-exito',
          // URL que CardNET llama para avisarnos del resultado (nuestro webhook)
          callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardnet-webhook`,
          // Identificador para reconciliar en el webhook
          reference: appointment_id,
        }),
      })
      const cardnetData = await cardnetRes.json().catch(() => ({}))
      if (!cardnetRes.ok || !cardnetData.pay_url) {
        return new Response(JSON.stringify({ error: 'CardNET no devolvió link de pago', detail: cardnetData }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } })
      }

      // Guardar el id de la transaccion/link en la cita
      await supabase.from('appointments').update({
        payment_method: 'cardnet',
        payment_id: cardnetData.id ?? cardnetData.payment_id ?? null,
      }).eq('id', appointment_id)

      return new Response(JSON.stringify({
        ok: true, method: 'cardnet',
        pay_url: cardnetData.pay_url,
        payment_id: cardnetData.id ?? cardnetData.payment_id ?? null,
      }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'method no soportado' }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
