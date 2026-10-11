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
    const res = await fetch(`${WUZAPI_URL}/chat/status/${instance}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!res.ok) {
      return NextResponse.json({ connected: false })
    }

    const data = await res.json()
    return NextResponse.json({ connected: data?.connected ?? false, data })
  } catch {
    return NextResponse.json({ connected: false })
  }
}