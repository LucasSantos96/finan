import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentMonth, monthLabel, shiftMonth } from '@/lib/dates'

type Props = { month: string; basePath: string; extra?: Record<string, string> }

export function MonthPicker({ month, basePath, extra = {} }: Props) {
  const href = (m: string) => `${basePath}?${new URLSearchParams({ m, ...extra })}`
  const btn =
    'grid size-9 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
  const isCurrent = month === currentMonth()
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0.5">
        <Link className={btn} href={href(shiftMonth(month, -1))} aria-label="Mês anterior">
          <ChevronLeft size={16} />
        </Link>
        <span className="min-w-36 px-1 text-center text-sm font-medium capitalize">{monthLabel(month)}</span>
        <Link className={btn} href={href(shiftMonth(month, 1))} aria-label="Próximo mês">
          <ChevronRight size={16} />
        </Link>
      </div>
      {!isCurrent && (
        <Link
          href={href(currentMonth())}
          className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] transition-colors hover:text-[var(--text)]"
        >
          Hoje
        </Link>
      )}
    </div>
  )
}
