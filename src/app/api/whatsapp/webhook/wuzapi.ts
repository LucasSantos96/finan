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

type WuzapiEvent = {
  Info?: { Sender?: string; SenderAlt?: string; IsFromMe?: boolean; IsGroup?: boolean; ID?: string; PushName?: string; MediaType?: string; Timestamp?: string }
  Message?: {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { caption?: string; mimetype?: string }
    videoMessage?: { caption?: string }
    documentMessage?: { caption?: string }
  }
}

/** Parse a Wuzapi webhook body (JSON or form, wrapped in `jsonData` or not) into our flat shape. Returns null for events to ignore. */
export function parseWuzapiWebhook(raw: unknown): WuzapiWebhookData | null {
  let obj = raw as Record<string, unknown> | null
  if (obj && typeof obj.jsonData === 'string') {
    try { obj = JSON.parse(obj.jsonData) } catch { return null }
  }
  if (!obj) return null
  // Already-flat payload (legacy shape)
  if (typeof obj.from === 'string') return obj as WuzapiWebhookData
  if (obj.type !== 'Message') return null

  const ev = obj.event as WuzapiEvent | undefined
  const info = ev?.Info
  if (!info || info.IsFromMe || info.IsGroup) return null

  // Senders may come as @lid; the real number is in SenderAlt
  const jid = [info.SenderAlt, info.Sender].find((j) => j && j.endsWith('@s.whatsapp.net'))
  if (!jid) return null

  const m = ev?.Message
  const mediaType = (info.MediaType || '').toLowerCase()
  return {
    id: info.ID,
    from: jid,
    pushname: info.PushName,
    type: mediaType || 'text',
    body: m?.conversation ?? m?.extendedTextMessage?.text,
    caption: m?.imageMessage?.caption ?? m?.videoMessage?.caption ?? m?.documentMessage?.caption,
    timestamp: info.Timestamp,
    media: m?.imageMessage ? { mimetype: m.imageMessage.mimetype } : undefined,
  }
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
    // The URL comes from the webhook payload: never send the token to a foreign host.
    if (new URL(mediaUrl).origin !== new URL(WUZAPI_URL).origin) return null
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