const WUZAPI_URL = process.env.WUZAPI_URL || 'http://wuzapi:8088'

const ALLOWED: Record<string, string> = {
  '5522981073895': 'Lucas',
  '5522981503492': 'Larissa',
}

export type WuzapiWebhookData = {
  id?: string
  from?: string
  pushname?: string
  body?: string
  caption?: string
  type?: string
  timestamp?: string
  media?: {
    url?: string
    mimetype?: string
    filename?: string
    data?: string
  }
}

function cleanPhone(from: string): string {
  return from.replace(/@.*$/, '')
}

export function isAllowed(phone: string): boolean {
  return phone in ALLOWED
}

export function getSenderName(phone: string): string {
  return ALLOWED[phone] || 'Usuário'
}

export async function sendText(phone: string, body: string) {
  const url = `${WUZAPI_URL}/chat/send/text`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, body }),
  })
  if (!res.ok) {
    console.error(`wuzapi send error ${res.status}: ${await res.text()}`)
  }
  return res
}

export function extractPhone(data: WuzapiWebhookData): string | null {
  if (!data.from) return null
  return cleanPhone(data.from)
}

export function isMediaMessage(data: WuzapiWebhookData): boolean {
  const mediaTypes = ['image', 'video', 'document', 'audio', 'ptt', 'sticker']
  return mediaTypes.includes(data.type || '')
}

export function getMessageText(data: WuzapiWebhookData): string {
  return data.body || data.caption || ''
}

export { ALLOWED }