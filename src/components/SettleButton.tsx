'use client'
import { useTransition } from 'react'
import { Check } from 'lucide-react'
import { togglePaid } from '@/server/actions'

export function SettleButton({ id, income, description }: { id: number; income: boolean; description: string }) {
  const [pending, start] = useTransition()
  const verb = income ? 'Receber' : 'Pagar'
  return (
    <button
      aria-label={`${verb}: ${description}`}
      disabled={pending}
      onClick={() => start(async () => void (await togglePaid(id)))}
      className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
        income
          ? 'border-[var(--blue)]/40 text-[var(--blue-2)] hover:bg-[var(--blue)] hover:text-white'
          : 'border-[var(--orange)]/40 text-[var(--orange-2)] hover:bg-[var(--orange)] hover:text-black'
      }`}
    >
      <Check size={13} className="transition-transform group-hover:scale-110" />
      {pending ? '...' : verb}
    </button>
  )
}
