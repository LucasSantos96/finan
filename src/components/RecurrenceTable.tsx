'use client'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import type { RecurrenceRow } from '@/lib/types'
import { RecurrenceActions } from './RecurrenceActions'

type SortKey = 'description' | 'kind' | 'amountCents' | 'nextDate' | 'pendingCents'
type Dir = 'asc' | 'desc'

const columns: { key: SortKey; label: string; align?: 'right'; className?: string }[] = [
  { key: 'description', label: 'Descrição', className: 'py-3' },
  { key: 'kind', label: 'Tipo' },
  { key: 'amountCents', label: 'Valor', align: 'right' },
  { key: 'nextDate', label: 'Próximo vencimento', className: 'pl-4' },
  { key: 'pendingCents', label: 'A pagar', align: 'right' },
]

function compare(a: RecurrenceRow, b: RecurrenceRow, key: SortKey): number {
  switch (key) {
    case 'description':
      return a.description.localeCompare(b.description, 'pt-BR')
    case 'kind':
      return a.kind === b.kind ? a.total - b.total : a.kind.localeCompare(b.kind)
    case 'amountCents':
      return a.amountCents - b.amountCents
    case 'pendingCents':
      return a.pendingCents - b.pendingCents
    case 'nextDate':
      // without a next date, keep those at the end regardless of direction
      if (!a.nextDate || !b.nextDate) return a.nextDate ? -1 : b.nextDate ? 1 : 0
      return a.nextDate.localeCompare(b.nextDate)
  }
}

export function RecurrenceTable({ recs }: { recs: RecurrenceRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir } | null>(null)

  const rows = useMemo(() => {
    if (!sort) return recs
    const sign = sort.dir === 'asc' ? 1 : -1
    return [...recs].sort((a, b) => {
      if (sort.key === 'nextDate' && (!a.nextDate || !b.nextDate)) return compare(a, b, sort.key)
      return sign * compare(a, b, sort.key)
    })
  }, [recs, sort])

  const toggle = (key: SortKey) =>
    setSort((cur) => (cur?.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
            {columns.map((c) => {
              const active = sort?.key === c.key
              const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
              return (
                <th key={c.key} className={`font-normal ${c.align === 'right' ? 'text-right' : ''} ${c.className ?? ''}`}>
                  <button
                    type="button"
                    onClick={() => toggle(c.key)}
                    className={`inline-flex items-center gap-1 rounded-md py-3 transition-colors hover:text-[var(--text)] ${
                      active ? 'text-[var(--text)]' : ''
                    } ${c.align === 'right' ? 'flex-row-reverse' : ''}`}
                  >
                    {c.label}
                    <Icon size={13} className={active ? 'text-[var(--blue-2)]' : 'opacity-40'} />
                  </button>
                </th>
              )
            })}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[var(--border)]/60 last:border-0">
              <td className="py-3">
                <div>{r.description}</div>
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <span className="size-2 rounded-full" style={{ background: r.categoryColor }} />
                  {r.categoryName}
                  {r.endDate && ` · encerrada em ${formatDate(r.endDate)}`}
                </div>
              </td>
              <td>{r.kind === 'RECURRING' ? 'Mensal' : `${r.total}x`}</td>
              <td className="text-right tabular-nums">
                {formatBRL(r.amountCents)}
                {r.kind === 'INSTALLMENT' && <span className="text-xs text-[var(--muted)]"> /parcela</span>}
              </td>
              <td className="pl-4 text-[var(--muted)]">{r.nextDate ? formatDate(r.nextDate) : '—'}</td>
              <td className="text-right tabular-nums">
                {formatBRL(r.pendingCents)}
                <span className="text-xs text-[var(--muted)]"> ({r.pendingCount})</span>
              </td>
              <td>
                <RecurrenceActions id={r.id} canEnd={r.kind === 'RECURRING' && !r.endDate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
