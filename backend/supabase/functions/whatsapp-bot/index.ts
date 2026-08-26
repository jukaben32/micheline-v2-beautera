// Edge Function: whatsapp-bot (Evolution API)
//
// Preparado para conectarse a un servidor Evolution API autoalojado
// (https://github.com/EvolutionAPI/evolution-api). Evolution puede manejar
// varias "instancias" (una por numero de WhatsApp conectado) desde un solo
// servidor con una sola API key de administracion — asi que un negocio
// nuevo NO necesita su propio servidor, solo su propia instancia.
//
// COMO CONECTAR CUANDO TENGAS EL SERVIDOR EVOLUTION LEVANTADO:
//   1. Crea la instancia del negocio en tu servidor Evolution
//      (POST {EVOLUTION_API_URL}/instance/create) y conecta el numero
//      (escaneando el QR que da Evolution).
//   2. Guarda el nombre de esa instancia en business.evolution_instance
//      (columna agregada en la migracion 022_whatsapp_evolution.sql).
//   3. Configura el webhook de esa instancia en Evolution apuntando a:
//      {SUPABASE_URL}/functions/v1/whatsapp-bot?token={EVOLUTION_WEBHOOK_TOKEN}
//      (el token es tuyo, cualquier cadena larga al azar — evita que
//      cualquiera pueda mandarle mensajes falsos a esta funcion).
//   4. Configura los secretos de esta funcion (supabase secrets set):
//      EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_TOKEN.
//   5. Sin esos 3 secretos configurados, esta funcion rechaza toda
//      peticion (ver chequeo de token abajo) — no hay riesgo de que
//      quede "a medio conectar" aceptando trafico sin querer.
//
// NOTA: el formato exacto del payload del webhook y del endpoint de envio
// puede variar segun la version de Evolution API que uses. Lo de abajo
// sigue el formato mas comun (event "messages.upsert", envio via
// POST /message/sendText/{instance}) — verificalo contra tu propia
// instancia antes de darlo por definitivo, y ajusta si hace falta.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getReply, type ChatMsg } from '../_shared/reply.ts'
import { logAnthropicUsage, logConversationTurn } from '../_shared/logging.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const HISTORY_LIMIT = 10

function extractText(msg: Record<string, unknown> | undefined): string {
  if (!msg) return ''
  const m = msg as Record<string, any>
  return m.conversation
    ?? m.extendedTextMessage?.text
    ?? m.imageMessage?.caption
    ?? m.videoMessage?.caption
    ?? ''
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const evoUrl = Deno.env.get('EVOLUTION_API_URL')
  const evoKey = Deno.env.get('EVOLUTION_API_KEY')
  const webhookToken = Deno.env.get('EVOLUTION_WEBHOOK_TOKEN')

  // Sin los 3 secretos configurados, esta funcion se queda inactiva a
  // proposito (no hay servidor Evolution real todavia).
  if (!evoUrl || !evoKey || !webhookToken) {
    return new Response(JSON.stringify({ ok: false, note: 'Evolution API no configurada aun (faltan secretos)' }),
      { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const url = new URL(req.url)
  if (url.searchParams.get('token') !== webhookToken) {
    return new Response('forbidden', { status: 403 })
  }

  try {
    const body = await req.json()

    // Solo nos interesan mensajes entrantes de texto.
    if (body.event && body.event !== 'messages.upsert') {
      return new Response(JSON.stringify({ ok: true, note: 'evento ignorado' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const data = body.data ?? body
    const fromMe = data?.key?.fromMe === true
    const remoteJid: string | undefined = data?.key?.remoteJid
    const text = extractText(data?.message)
    const instance: string | undefined = body.instance

    if (fromMe || !remoteJid || !text || !instance) {
      return new Response(JSON.stringify({ ok: true, note: 'sin mensaje entrante valido' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const phone = remoteJid.split('@')[0]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      (Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!
    )

    // Resolver el negocio dueño de esta instancia de WhatsApp.
    const { data: business } = await supabase.from('business')
      .select('id, name, slug').eq('evolution_instance', instance).maybeSingle()
    if (!business) {
      console.error('whatsapp-bot: instancia sin negocio asociado', instance)
      return new Response(JSON.stringify({ ok: true, note: 'instancia no registrada' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Rate limiting: maximo 30 mensajes por telefono en la ultima hora.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: hits } = await supabase.from('rate_limit_log')
      .select('id', { count: 'exact', head: true })
      .eq('fn', 'whatsapp-bot').eq('rate_key', phone).gte('created_at', oneHourAgo)
    if ((hits ?? 0) >= 30) {
      return new Response(JSON.stringify({ ok: true, note: 'rate limited' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    await supabase.from('rate_limit_log').insert({ fn: 'whatsapp-bot', rate_key: phone })

    // Historial de esta conversacion (persistido: WhatsApp no manda contexto).
    const { data: pastRows } = await supabase.from('conversation_messages')
      .select('role, content').eq('business_id', business.id).eq('channel', 'whatsapp').eq('phone', phone)
      .order('created_at', { ascending: false }).limit(HISTORY_LIMIT)
    const history: ChatMsg[] = (pastRows ?? []).reverse().map(r => ({ role: r.role, content: r.content }))

    const siteUrl = business.slug ? `https://micheline-dashboard.vercel.app/sites/${business.slug}` : null
    const bookingInstruction = siteUrl
      ? `Visita ${siteUrl} para ver los horarios disponibles y reservar tu cita.`
      : 'Te escribiremos en breve para coordinar tu cita.'

    const result = await getReply(supabase, business.id, text, history, bookingInstruction)

    // Guardar el intercambio para la proxima vez y el consumo de Anthropic.
    await logConversationTurn(supabase, {
      businessId: business.id, channel: 'whatsapp', phone,
      userMessage: text, assistantReply: result.reply,
    })
    await logAnthropicUsage(supabase, business.id, result.usage)

    // Enviar la respuesta por Evolution API.
    // Verifica el nombre exacto del endpoint/campos contra tu version real.
    await fetch(`${evoUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evoKey },
      body: JSON.stringify({ number: phone, text: result.reply }),
    }).catch((e) => console.error('Error enviando mensaje via Evolution API', e))

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('whatsapp-bot error', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
