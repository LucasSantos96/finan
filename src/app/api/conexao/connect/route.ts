import { NextResponse } from 'next/server'

const WUZAPI_URL = process.env.WUZAPI_URL || 'http://wuzapi:8088'
const USER_TOKEN = process.env.WUZAPI_USER_TOKEN || 'finan-whatsapp-token'

export async function POST() {
  try {
    const statusRes = await fetch(`${WUZAPI_URL}/session/status`, {
      headers: { 'Token': USER_TOKEN },
    })
    if (statusRes.ok) {
      const data = await statusRes.json()
      if (data?.data?.loggedIn) {
        return NextResponse.json({ alreadyConnected: true })
      }
    }

    const res = await fetch(`${WUZAPI_URL}/session/connect`, {
      method: 'POST',
      headers: { 'Token': USER_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Subscribe: ['Message'], Immediate: true }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Wuzapi erro ${res.status}: ${text}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}