import { NextResponse } from 'next/server'

const WUZAPI_URL = process.env.WUZAPI_URL || 'http://wuzapi:8088'
const USER_TOKEN = process.env.WUZAPI_USER_TOKEN || 'finan-whatsapp-token'

export async function GET() {
  try {
    const statusRes = await fetch(`${WUZAPI_URL}/session/status`, {
      headers: { 'Token': USER_TOKEN },
    })
    if (statusRes.ok) {
      const data = await statusRes.json()
      if (data?.data?.loggedIn) {
        return NextResponse.json({ connected: true })
      }
    }

    const qrRes = await fetch(`${WUZAPI_URL}/session/qr`, {
      headers: { 'Token': USER_TOKEN },
    })

    if (!qrRes.ok) {
      return NextResponse.json({ error: 'QR ainda não disponível' }, { status: 404 })
    }

    const qrData = await qrRes.json()
    const base64 = String(qrData?.data?.QRCode ?? '').replace(/^data:image\/png;base64,/, '')

    if (base64) {
      return NextResponse.json({ qr: base64 })
    }

    return NextResponse.json({ waiting: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}