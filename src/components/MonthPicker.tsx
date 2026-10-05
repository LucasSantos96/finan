import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthLabel, shiftMonth } from '@/lib/dates'

export function MonthPicker({ month, basePath }: { month: string; basePath: string }) {
  const btn = 'rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2'
  return (
    <div className="flex items-center gap-2">
      <Link className={btn} href={`${basePath}?m=${shiftMonth(month, -1)}`} aria-label="Mês anterior">
        <ChevronLeft size={16} />
      </Link>
      <span className="min-w-36 text-center text-sm capitalize">{monthLabel(month)}</span>
      <Link className={btn} href={`${basePath}?m=${shiftMonth(month, 1)}`} aria-label="Próximo mês">
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}
