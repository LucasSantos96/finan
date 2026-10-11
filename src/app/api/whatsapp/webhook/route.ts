import { NextResponse } from 'next/server'
import { mastra } from '@/mastra'
import {
  extractPhone,
  isAllowed,
  getSenderName,
  sendText,
  isMediaMessage,
  getMessageText,
} from './wuzapi'
import type { WuzapiWebhookData } from './wuzapi'

export async function POST(req: Request) {
  let payload: WuzapiWebhookData | { data?: WuzapiWebhookData }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const data: WuzapiWebhookData = (payload as { data?: WuzapiWebhookData }).data ?? (payload as WuzapiWebhookData)
  const phone = extractPhone(data)

  if (!phone) {
    return NextResponse.json({ error: 'missing phone' }, { status: 400 })
  }

  if (!isAllowed(phone)) {
    console.log(`whatsapp: acesso negado para ${phone}`)
    return NextResponse.json({ blocked: true }, { status: 403 })
  }

  const senderName = getSenderName(phone)
  const isMedia = isMediaMessage(data)
  const text = getMessageText(data)

  if (!isMedia && !text) {
    return NextResponse.json({ error: 'empty message' }, { status: 400 })
  }

  const userPrompt = isMedia
    ? text
      ? `[O usuário enviou uma mídia do tipo "${data.type}" com a legenda: "${text}"]\n\nPor favor, analise a imagem/documento e responda à solicitação do usuário.`
      : `[O usuário enviou uma mídia do tipo "${data.type}"]\n\nPor favor, analise a imagem/documento e responda ao usuário.`
    : text

  const agentId = isMedia ? 'financas-visao' : 'financas'

  try {
    const agent = mastra.getAgent(agentId)

    const result = await agent.generate(userPrompt, {
      instructions: `Você está conversando com ${senderName} via WhatsApp.`,
      memory: {
        thread: { id: `whatsapp-${phone}` },
        resource: phone,
      },
      maxSteps: 10,
    })

    await sendText(phone, result.text)
  } catch (err) {
    console.error('whatsapp agent error:', err)
    await sendText(phone, '❌ Ocorreu um erro ao processar sua solicitação. Tente novamente.')
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ status: 'whatsapp webhook online' })
}