'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const API = '/api/conexao'

type Status = 'idle' | 'connecting' | 'waiting_qr' | 'connected' | 'error'

export default function ConexaoPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState('whatsapp')
  const [token, setToken] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearPolling()
  }, [clearPolling])

  async function connect() {
    setStatus('connecting')
    setError(null)
    setQrBase64(null)
    clearPolling()

    try {
      const res = await fetch(`${API}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance: instanceName, token }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setStatus('error')
        setError(data.error || 'Erro ao conectar')
        return
      }

      if (data.alreadyConnected) {
        setStatus('connected')
        return
      }

      setStatus('waiting_qr')
      pollQR()
    } catch (e) {
      setStatus('error')
      setError(String(e))
    }
  }

  function pollQR() {
    let attempts = 0
    intervalRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`${API}/qr?instance=${encodeURIComponent(instanceName)}&token=${encodeURIComponent(token)}`)
        const data = await res.json()

        if (data.connected) {
          clearPolling()
          setStatus('connected')
          setQrBase64(null)
          return
        }

        if (data.qr) {
          setQrBase64(data.qr)
        }

        if (attempts > 120) {
          clearPolling()
          setStatus('error')
          setError('Tempo limite excedido. Tente novamente.')
        }
      } catch {
        // continua tentando
      }
    }, 3000)
  }

  async function checkStatus() {
    try {
      const res = await fetch(`${API}/status?instance=${encodeURIComponent(instanceName)}&token=${encodeURIComponent(token)}`)
      const data = await res.json()
      setStatus(data.connected ? 'connected' : 'idle')
    } catch {
      setStatus('idle')
    }
  }

  useEffect(() => {
    if (token) checkStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 40, color: '#e0e0e0', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>📱 Conectar WhatsApp</h1>

      <label style={{ display: 'block', fontSize: 13, color: '#a0a0a0', marginBottom: 4 }}>
        Nome da instância
      </label>
      <input
        value={instanceName}
        onChange={(e) => setInstanceName(e.target.value)}
        placeholder="whatsapp"
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          background: '#1a1a2e', border: '1px solid #333', color: '#e0e0e0',
          fontSize: 15, marginBottom: 12, outline: 'none', boxSizing: 'border-box',
        }}
      />

      <label style={{ display: 'block', fontSize: 13, color: '#a0a0a0', marginBottom: 4 }}>
        Token de admin do Wuzapi
      </label>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Token de administrador"
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          background: '#1a1a2e', border: '1px solid #333', color: '#e0e0e0',
          fontSize: 15, marginBottom: 20, outline: 'none', boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {status !== 'connected' && (
          <button
            onClick={connect}
            disabled={status === 'connecting' || status === 'waiting_qr' || !token}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
              background: status === 'connecting' || status === 'waiting_qr' ? '#444' : '#25D366',
              color: '#fff', fontSize: 15, cursor: status === 'connecting' || status === 'waiting_qr' || !token ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {status === 'connecting' ? '🔄 Conectando...' : status === 'waiting_qr' ? '🔄 Aguardando QR...' : '🔗 Conectar'}
          </button>
        )}
        {status === 'connected' && (
          <button
            onClick={() => { setStatus('idle'); setQrBase64(null); }}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
              background: '#e74c3c', color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 600,
            }}
          >
            🔌 Desconectar
          </button>
        )}
      </div>

      {status === 'connected' && (
        <div style={{
          padding: 16, borderRadius: 10, background: '#0a3d0a', border: '1px solid #25D366',
          color: '#a0f0a0', fontSize: 14, marginBottom: 16,
        }}>
          ✅ WhatsApp conectado com sucesso! A instância <strong>{instanceName}</strong> está ativa.
        </div>
      )}

      {qrBase64 && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#b0b0b0', marginBottom: 12 }}>
            Escaneie o QR Code com o WhatsApp para conectar:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${qrBase64}`}
            alt="QR Code WhatsApp"
            style={{ borderRadius: 12, border: '2px solid #333', maxWidth: 280 }}
          />
        </div>
      )}

      {error && (
        <div style={{
          padding: 14, borderRadius: 10, background: '#3d0a0a', border: '1px solid #e74c3c',
          color: '#f0a0a0', fontSize: 13, marginTop: 12,
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ marginTop: 32, padding: 16, borderRadius: 10, background: '#1a1a2e', border: '1px solid #333', fontSize: 12, color: '#888' }}>
        <strong>Instruções:</strong>
        <ol style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Preencha o token de admin do Wuzapi</li>
          <li>Clique em &ldquo;Conectar&rdquo;</li>
          <li>Escaneie o QR Code com o WhatsApp</li>
          <li>Após conectado, apenas Lucas e Larissa poderão usar o agente</li>
        </ol>
      </div>
    </main>
  )
}