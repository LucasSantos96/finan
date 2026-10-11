import { NextResponse } from 'next/server'

const WUZAPI_URL = process.env.WUZAPI_URL || 'http://wuzapi:8088'

export async function POST(req: Request) {
  const { instance, token } = await req.json()
  if (!instance || !token) {
    return NextResponse.json({ error: 'instance e token são obrigatórios' }, { status: 400 })
  }

  try {
    const statusRes = await fetch(`${WUZAPI_URL}/chat/status/${instance}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (statusRes.ok) {
      const statusData = await statusRes.json()
      if (statusData?.connected) {
        return NextResponse.json({ alreadyConnected: true })
      }
    }

    const res = await fetch(`${WUZAPI_URL}/chat/connect/${instance}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Wuzapi erro ${res.status}: ${text}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: `Erro de conexão: ${e}` }, { status: 500 })
  }
}