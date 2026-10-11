import { NextResponse } from 'next/server'

const WUZAPI_URL = process.env.WUZAPI_URL || 'http://wuzapi:8088'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const instance = searchParams.get('instance')
  const token = searchParams.get('token')

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
        return NextResponse.json({ connected: true })
      }
    }

    const qrRes = await fetch(`${WUZAPI_URL}/chat/qr/${instance}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!qrRes.ok) {
      return NextResponse.json({ error: 'QR ainda não disponível' }, { status: 404 })
    }

    const data = await qrRes.json()
    if (data?.qr) {
      return NextResponse.json({ qr: data.qr })
    }

    return NextResponse.json({ waiting: true })
  } catch (e) {
    return NextResponse.json({ error: `Erro: ${e}` }, { status: 500 })
  }
}