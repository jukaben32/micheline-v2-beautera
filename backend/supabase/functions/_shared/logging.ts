// Registro de conversaciones (para /conversaciones en el dashboard) y de
// consumo de APIs con costo por uso (para /metricas). Un solo lugar para
// que chat, whatsapp-bot y la llamada de voz escriban igual.

// deno-lint-ignore no-explicit-any
type SupabaseClient = any

// Precios reales de Anthropic (Claude Haiku 4.5), USD por 1M tokens.
const HAIKU_PRICE_PER_1M_INPUT = 1.0
const HAIKU_PRICE_PER_1M_OUTPUT = 5.0

export async function logConversationTurn(
  supabase: SupabaseClient,
  params: {
    businessId: string
    channel: 'whatsapp' | 'web_chat' | 'voice'
    phone?: string | null
    sessionId?: string | null
    userMessage: string
    assistantReply: string
  },
) {
  const base = {
    business_id: params.businessId,
    channel: params.channel,
    phone: params.phone ?? null,
    session_id: params.sessionId ?? null,
  }
  await supabase.from('conversation_messages').insert([
    { ...base, role: 'user', content: params.userMessage },
    { ...base, role: 'assistant', content: params.assistantReply },
  ])
}

export async function logAnthropicUsage(
  supabase: SupabaseClient,
  businessId: string,
  usage: { input_tokens: number; output_tokens: number } | undefined,
) {
  if (!usage) return
  const cost = (usage.input_tokens / 1_000_000) * HAIKU_PRICE_PER_1M_INPUT
    + (usage.output_tokens / 1_000_000) * HAIKU_PRICE_PER_1M_OUTPUT
  await supabase.from('api_usage_events').insert({
    business_id: businessId,
    provider: 'anthropic',
    event_type: 'chat_message',
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    estimated_cost_usd: cost,
  })
}
