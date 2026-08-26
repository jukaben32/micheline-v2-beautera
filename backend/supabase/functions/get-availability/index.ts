// Edge Function: get-availability
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const SLOT_MINUTES = 30
// Fallback para llamadas viejas sin service_id ni stylist_id (index.html
// estatico original, siempre de Micheline). Quitar cuando ese sitio se
// retire por completo a favor de /sites/[slug].
const LEGACY_MICHELINE_BUSINESS_ID = '645fbc08-035a-4302-9fbe-9a4a21b9decd'

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    // stylist_id puede venir null cuando el cliente elige "Cualquiera disponible"
    const { stylist_id: rawStylistId, date, service_id } = await req.json()
    if (!date) {
      return new Response(JSON.stringify({ error: 'Falta date' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      (Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!
    )

    // Negocio dueño de esta consulta: se deriva de service_id o stylist_id
    // (nunca de un valor suelto que mande el cliente), con fallback legacy.
    let businessId: string = LEGACY_MICHELINE_BUSINESS_ID
    if (service_id) {
      const { data: svc } = await supabase.from('services').select('business_id').eq('id', service_id).maybeSingle()
      if (svc) businessId = svc.business_id
    } else if (rawStylistId) {
      const { data: sty } = await supabase.from('stylists').select('business_id').eq('id', rawStylistId).maybeSingle()
      if (sty) businessId = sty.business_id
    }

    const dayOfWeek = new Date(date + 'T00:00:00').getDay()

    // Si no hay estilista concreta, tomamos la disponibilidad de cualquier
    // estilista activa de ESTE negocio que trabaje ese dia (mayor rango horario).
    let stylist_id = rawStylistId
    let avail: { start_time: string; end_time: string } | null = null
    if (stylist_id) {
      const { data } = await supabase
        .from('availability').select('start_time, end_time')
        .eq('stylist_id', stylist_id).eq('business_id', businessId).eq('day_of_week', dayOfWeek).single()
      avail = data
    } else {
      const { data: rows } = await supabase
        .from('availability')
        .select('stylist_id, start_time, end_time, stylists!inner(is_active)')
        .eq('business_id', businessId)
        .eq('day_of_week', dayOfWeek)
        .eq('stylists.is_active', true)
        .order('start_time', { ascending: true })
      if (rows && rows.length > 0) {
        const widest = rows.reduce((a: any, b: any) =>
          (b.end_time > a.end_time ? b : a), rows[0])
        stylist_id = widest.stylist_id
        avail = { start_time: widest.start_time, end_time: widest.end_time }
      }
    }
    if (!avail) {
      return new Response(JSON.stringify({ slots: [] }),
        { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const dayStart = date + 'T00:00:00Z'
    const dayEnd = date + 'T23:59:59Z'
    const { data: booked } = await supabase.from('appointments')
      .select('start_at, end_at').eq('stylist_id', stylist_id).eq('business_id', businessId)
      .eq('status', 'confirmada').gte('start_at', dayStart).lte('start_at', dayEnd)
    const { data: blocked } = await supabase.from('blocked_slots')
      .select('start_at, end_at').eq('stylist_id', stylist_id).eq('business_id', businessId)
      .gte('start_at', dayStart).lte('start_at', dayEnd)
    // America/Santo_Domingo = UTC-4. Un hueco LOCAL se convierte a UTC SUMANDO 4h.
    const TZ_OFFSET_MIN = 4 * 60
    const baseUtcMin = Date.parse(date + 'T00:00:00Z') / 60000
    const slots: string[] = []
    const [sh, sm] = avail.start_time.split(':').map(Number)
    const [eh, em] = avail.end_time.split(':').map(Number)
    let cur = sh * 60 + sm
    const end = eh * 60 + em
    while (cur + SLOT_MINUTES <= end) {
      const slotStart = cur
      const slotEnd = cur + SLOT_MINUTES
      const slotStartUtc = baseUtcMin + slotStart + TZ_OFFSET_MIN
      const slotEndUtc = baseUtcMin + slotEnd + TZ_OFFSET_MIN
      const conflict = [...(booked ?? []), ...(blocked ?? [])].some((b) => {
        const bs = Date.parse(b.start_at) / 60000
        const be = Date.parse(b.end_at) / 60000
        return slotStartUtc < be && slotEndUtc > bs
      })
      if (!conflict) {
        const hh = String(Math.floor(slotStart / 60)).padStart(2, '0')
        const mm = String(slotStart % 60).padStart(2, '0')
        slots.push(`${hh}:${mm}`)
      }
      cur += SLOT_MINUTES
    }
    return new Response(JSON.stringify({ slots }),
      { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
