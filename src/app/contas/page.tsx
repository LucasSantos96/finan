import Link from 'next/link'
import { Card, Money } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { MonthPicker } from '@/components/MonthPicker'
import { SettleButton } from '@/components/SettleButton'
import { formatBRL } from '@/lib/money'
import {
  currentMonth,
  dayMonthShort,
  formatDate,
  monthLabel,
  monthRange,
  parseDateInput,
  shiftDaysUtc,
  startOfWeekUtc,
  todayUtc,
  toDateInput,
} from '@/lib/dates'
import type { TxRow, TxType } from '@/lib/types'
import { listPending } from '@/server/queries'

const DAY = 86_400_000

const ranges = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'year', label: 'Ano' },
] as const

function dueText(date: string, today: Date) {
  const diff = Math.round((parseDateInput(date).getTime() - today.getTime()) / DAY)
  if (diff < 0) return { text: diff === -1 ? 'venceu ontem' : `atrasada há ${-diff} dias`, late: true }
  if (diff === 0) return { text: 'vence hoje', late: false }
  if (diff === 1) return { text: 'vence amanhã', late: false }
  return { text: `em ${diff} dias`, late: false }
}

function Ledger({ type, rows, today }: { type: TxType; rows: TxRow[]; today: Date }) {
  const income = type === 'INCOME'
  const todayStr = toDateInput(today)
  const total = rows.reduce((a, r) => a + r.amountCents, 0)
  const overdue = rows.filter((r) => r.date < todayStr)
  const overdueCents = overdue.reduce((a, r) => a + r.amountCents, 0)

  const upcoming = rows.filter((r) => r.date >= todayStr)
  const byMonth = new Map<string, TxRow[]>()
  for (const r of upcoming) {
    const k = r.date.slice(0, 7)
    byMonth.set(k, [...(byMonth.get(k) ?? []), r])
  }

  const accent = income ? 'text-[var(--blue-2)]' : 'text-[var(--orange-2)]'

  const Row = ({ r }: { r: TxRow }) => {
    const due = dueText(r.date, today)
    return (
      <li className="flex items-center gap-3 border-b border-[var(--border)]/60 py-3 last:border-0">
        <div className="w-11 shrink-0 text-center leading-tight">
          <div className="text-sm font-medium tabular-nums">{dayMonthShort(parseDateInput(r.date))}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{r.description}</div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--muted)]">
            <span className={due.late ? 'font-medium text-[var(--orange-2)]' : ''}>{due.text}</span>
            {r.installmentTotal && (
              <span>
                parcela {r.installmentNo} de {r.installmentTotal}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: r.categoryColor }} />
              {r.categoryName}
            </span>
          </div>
        </div>
        <div className={`text-sm font-medium tabular-nums ${accent}`}>{formatBRL(r.amountCents)}</div>
        <SettleButton id={r.id} income={income} description={r.description} />
      </li>
    )
  }

  return (
    <Card className="flex flex-col">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{income ? 'A receber' : 'A pagar'}</h2>
        <span className="text-xs text-[var(--muted)]">{rows.length} pendente(s)</span>
      </div>
      <Money cents={total} className={`text-4xl ${accent}`} />

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">
          {income ? 'Nada a receber neste período.' : 'Nenhuma conta pendente neste período.'}
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {overdue.length > 0 && (
            <section className="rounded-2xl border border-[var(--orange)]/30 bg-[var(--orange)]/[0.06] px-4 pt-3 pb-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-[var(--orange-2)]">Atrasadas</span>
                <span className="tabular-nums text-[var(--orange-2)]">{formatBRL(overdueCents)}</span>
              </div>
              <ul>
                {overdue.map((r) => (
                  <Row key={r.id} r={r} />
                ))}
              </ul>
            </section>
          )}
          {[...byMonth].map(([m, list]) => (
            <section key={m}>
              <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-1.5 text-xs text-[var(--muted)]">
                <span className="font-medium capitalize text-[var(--text)]">{monthLabel(m)}</span>
                <span className="tabular-nums">{formatBRL(list.reduce((a, r) => a + r.amountCents, 0))}</span>
              </div>
              <ul>
                {list.map((r) => (
                  <Row key={r.id} r={r} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  )
}

export default async function Contas({ searchParams }: { searchParams: Promise<{ m?: string; g?: string }> }) {
  const { m, g } = await searchParams
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : currentMonth()
  const granularity = g === 'week' || g === 'year' ? g : 'month'
  const today = todayUtc()

  // same period rules as the dashboard cashflow: week containing today (or the first week of the month), month, or year
  let start: Date
  let end: Date
  let period: string
  if (granularity === 'week') {
    const ref = month === currentMonth() ? today : monthRange(month).start
    start = startOfWeekUtc(ref)
    end = shiftDaysUtc(start, 7)
    period = `${formatDate(start).slice(0, 5)} a ${formatDate(shiftDaysUtc(start, 6)).slice(0, 5)}`
  } else if (granularity === 'year') {
    const y = Number(month.slice(0, 4))
    start = new Date(Date.UTC(y, 0, 1))
    end = new Date(Date.UTC(y + 1, 0, 1))
    period = String(y)
  } else {
    ;({ start, end } = monthRange(month))
    period = monthLabel(month)
  }

  const rows = await listPending({ start, end })

  return (
    <>
      <PageHeader title="Contas" subtitle="Pendências a pagar e a receber. Dê baixa conforme for acontecendo." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Período das contas" className="grid grid-cols-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-0.5">
          {ranges.map((r) => {
            const active = granularity === r.key
            return (
              <Link
                key={r.key}
                href={`/contas?${new URLSearchParams({ m: month, ...(r.key === 'month' ? {} : { g: r.key }) })}`}
                aria-current={active ? 'page' : undefined}
                scroll={false}
                className={`rounded-[10px] px-3.5 py-1.5 text-center text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--surface-2)] text-[var(--text)] shadow-[inset_0_0_0_1px_var(--border)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {r.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-3">
          <p className="text-xs capitalize text-[var(--muted)]">{period}</p>
          <MonthPicker month={month} basePath="/contas" extra={granularity === 'month' ? {} : { g: granularity }} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Ledger type="INCOME" rows={rows.filter((r) => r.type === 'INCOME')} today={today} />
        <Ledger type="EXPENSE" rows={rows.filter((r) => r.type === 'EXPENSE')} today={today} />
      </div>
    </>
  )
}
