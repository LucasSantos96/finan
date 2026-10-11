const WUZAPI_URL = process.env.WUZAPI_URL || 'http://wuzapi:8088'
const WUZAPI_USER_TOKEN = process.env.WUZAPI_USER_TOKEN || 'finan-whatsapp-token'

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
    headers: {
      'Content-Type': 'application/json',
      'Token': WUZAPI_USER_TOKEN,
    },
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

export function isImage(data: WuzapiWebhookData): boolean {
  return data.type === 'image'
}

export async function fetchMediaBase64(mediaUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(mediaUrl, {
      headers: { 'Token': WUZAPI_USER_TOKEN },
    })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = res.headers.get('content-type') || 'image/jpeg'
    return { base64, mimeType }
  } catch {
    return null
  }
}

export function getMessageText(data: WuzapiWebhookData): string {
  return data.body || data.caption || ''
}

export function getUserToken() {
  return WUZAPI_USER_TOKEN
}

export { ALLOWED, WUZAPI_URL }