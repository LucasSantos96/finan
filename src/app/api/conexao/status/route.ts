import { NextResponse } from 'next/server'

const WUZAPI_URL = process.env.WUZAPI_URL || 'http://wuzapi:8088'
const USER_TOKEN = process.env.WUZAPI_USER_TOKEN || 'finan-whatsapp-token'

export async function GET() {
  try {
    const res = await fetch(`${WUZAPI_URL}/session/status`, {
      headers: { 'Token': USER_TOKEN },
    })

    if (!res.ok) {
      return NextResponse.json({ connected: false })
    }

    const data = await res.json()
    return NextResponse.json({ connected: data?.data?.loggedIn ?? false })
  } catch {
    return NextResponse.json({ connected: false })
  }
}