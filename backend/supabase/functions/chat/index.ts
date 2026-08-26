// Edge Function: chat  (widget de información + IA)
// Responde preguntas del cliente sobre precios, servicios, estilistas y horarios.
// La logica de respuesta (IA + reglas) vive en ../_shared/reply.ts, compartida
// con whatsapp-bot (Evolution API) para que ambas superficies respondan igual.
//
// Entrada (POST JSON): { "message": "..." , "history": [ {role, content} ], "business_id": "..." (opcional) }
// Salida: { "reply": "..." }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getReply } from '../_shared/reply.ts'

// Fallback para llamadas viejas sin business_id (index.html estatico
// original, siempre de Micheline). Quitar cuando ese sitio se retire.
const LEGACY_MICHELINE_BUSINESS_ID = '645fbc08-035a-4302-9fbe-9a4a21b9decd'

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { message, history, business_id } = await req.json()
    const businessId: string = business_id || LEGACY_MICHELINE_BUSINESS_ID
    if (!message) {
      return new Response(JSON.stringify({ error: 'Falta message' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      (Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!
    )

    // Rate limiting: maximo 30 mensajes por IP en la ultima hora. El modo IA
    // llama a la API de Claude (tiene costo), asi que conviene frenar el abuso.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip') ?? 'unknown'
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: hitsIp } = await supabase.from('rate_limit_log')
      .select('id', { count: 'exact', head: true })
      .eq('fn', 'chat').eq('rate_key', ip).gte('created_at', oneHourAgo)
    if ((hitsIp ?? 0) >= 30) {
      return new Response(JSON.stringify({ error: 'Demasiados mensajes. Intenta de nuevo mas tarde.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    await supabase.from('rate_limit_log').insert({ fn: 'chat', rate_key: ip })

    const result = await getReply(
      supabase, businessId, message, history ?? [],
      'Toca el botón "Reservar cita" arriba, elige servicio y estilista, y verás los horarios libres.',
    )
    return new Response(JSON.stringify(result),
      { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
