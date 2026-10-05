import Link from 'next/link'
import { Card, Money } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { SettleButton } from '@/components/SettleButton'
import { formatBRL } from '@/lib/money'
import { dayMonthShort, monthLabel, parseDateInput, shiftMonth, todayUtc, toDateInput } from '@/lib/dates'
import type { TxRow, TxType } from '@/lib/types'
import { listPending } from '@/server/queries'

const DAY = 86_400_000

function dueText(date: string, today: Date) {
  const diff = Math.round((parseDateInput(date).getTime() - today.getTime()) / DAY)
  if (diff < 0) return { text: diff === -1 ? 'venceu ontem' : `atrasada há ${-diff} dias`, late: true }
  if (diff === 0) return { text: 'vence hoje', late: false }
  if (diff === 1) return { text: 'vence amanhã', late: false }
  return { text: `em ${diff} dias`, late: false }
}

function Ledger({
  type,
  rows,
  today,
  showAll,
}: {
  type: TxType
  rows: TxRow[]
  today: Date
  showAll: boolean
}) {
  const income = type === 'INCOME'
  const todayStr = toDateInput(today)
  const thisMonth = todayStr.slice(0, 7)
  const cutoff = shiftMonth(thisMonth, 1) // through end of next month unless "ver tudo"
  const total = rows.reduce((a, r) => a + r.amountCents, 0)
  const overdue = rows.filter((r) => r.date < todayStr)
  const overdueCents = overdue.reduce((a, r) => a + r.amountCents, 0)

  const upcoming = rows.filter((r) => r.date >= todayStr)
  const visible = showAll ? upcoming : upcoming.filter((r) => r.date.slice(0, 7) <= cutoff)
  const hidden = upcoming.length - visible.length

  const byMonth = new Map<string, TxRow[]>()
  for (const r of visible) {
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
          {income ? 'Nada a receber. Tudo em dia.' : 'Nenhuma conta pendente. Tudo em dia.'}
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
          {hidden > 0 && (
            <Link href="/contas?tudo=1" className="block text-center text-xs text-[var(--muted)] hover:text-[var(--text)]">
              Ver mais {hidden} pendente(s) nos meses seguintes
            </Link>
          )}
        </div>
      )}
    </Card>
  )
}

export default async function Contas({ searchParams }: { searchParams: Promise<{ tudo?: string }> }) {
  const sp = await searchParams
  const rows = await listPending()
  const today = todayUtc()
  const showAll = sp.tudo === '1'
  return (
    <>
      <PageHeader title="Contas" subtitle="Pendências a pagar e a receber. Dê baixa conforme for acontecendo." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Ledger type="INCOME" rows={rows.filter((r) => r.type === 'INCOME')} today={today} showAll={showAll} />
        <Ledger type="EXPENSE" rows={rows.filter((r) => r.type === 'EXPENSE')} today={today} showAll={showAll} />
      </div>
      {showAll && (
        <Link href="/contas" className="mt-4 block text-center text-xs text-[var(--muted)] hover:text-[var(--text)]">
          Mostrar só os próximos 2 meses
        </Link>
      )}
    </>
  )
}
