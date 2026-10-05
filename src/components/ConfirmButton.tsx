'use client'
import { useState, useTransition } from 'react'

export function ConfirmButton({
  label,
  confirmLabel = 'Confirmar?',
  onConfirm,
  className = '',
}: {
  label: string
  confirmLabel?: string
  onConfirm: () => Promise<unknown>
  className?: string
}) {
  const [armed, setArmed] = useState(false)
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!armed) {
          setArmed(true)
          setTimeout(() => setArmed(false), 3000)
          return
        }
        start(async () => {
          await onConfirm()
          setArmed(false)
        })
      }}
      className={`rounded-lg px-2.5 py-1 text-xs ${
        armed ? 'bg-[var(--orange)] text-black' : 'text-[var(--muted)] hover:text-[var(--orange-2)]'
      } ${className}`}
    >
      {pending ? '...' : armed ? confirmLabel : label}
    </button>
  )
}
