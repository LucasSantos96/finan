import Link from 'next/link'
import { Card, Money } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { MonthPicker } from '@/components/MonthPicker'
import { TransactionsTable } from '@/components/TransactionsTable'
import { CashflowChart } from '@/components/charts/CashflowChart'
import { CategoryDonut } from '@/components/charts/CategoryDonut'
import { currentMonth, formatDate, monthLabel, todayInput } from '@/lib/dates'
import { formatBRL } from '@/lib/money'
import { getByCategory, getCashflow, getSummary, listTransactions } from '@/server/queries'

const ranges = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'year', label: 'Ano' },
] as const

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ m?: string; g?: string }> }) {
  const { m, g } = await searchParams
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : currentMonth()
  const granularity = g === 'week' || g === 'year' ? g : 'month'
  const [summary, cashflow, byCategory, recent] = await Promise.all([
    getSummary(month),
    getCashflow(month, granularity),
    getByCategory(month),
    listTransactions({ month, take: 8 }),
  ])
  const income = cashflow.reduce((a, d) => a + d.income, 0)
  const expense = cashflow.reduce((a, d) => a + d.expense, 0)
  const net = income - expense
  const period =
    granularity === 'week'
      ? `${formatDate(cashflow[0].key).slice(0, 5)} a ${formatDate(cashflow[cashflow.length - 1].key).slice(0, 5)}`
      : granularity === 'year'
        ? month.slice(0, 4)
        : monthLabel(month)
  const todayKey = granularity === 'year' ? currentMonth() : todayInput()
  const stats = [
    { label: 'Entradas previstas', value: formatBRL(income), dot: 'bg-[var(--blue)]', tone: 'text-[var(--text)]' },
    { label: 'Saídas previstas', value: formatBRL(expense), dot: 'bg-[var(--orange)]', tone: 'text-[var(--text)]' },
    {
      label: 'Resultado',
      value: `${net > 0 ? '+' : ''}${formatBRL(net)}`,
      dot: 'bg-[var(--muted)]',
      tone: net < 0 ? 'text-[var(--orange-2)]' : 'text-[var(--blue-2)]',
    },
  ]

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Acompanhe suas entradas e saídas">
        <MonthPicker month={month} basePath="/" extra={granularity === 'month' ? {} : { g: granularity }} />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="mb-6 text-sm text-[var(--muted)]">Saldo (realizado)</p>
          <Money cents={summary.balance} />
        </Card>
        <Card>
          <p className="mb-6 text-sm text-[var(--muted)]">Entradas do mês</p>
          <Money cents={summary.income} className="text-4xl text-[var(--blue-2)]" />
        </Card>
        <Card>
          <p className="mb-6 text-sm text-[var(--muted)]">Saídas do mês</p>
          <Money cents={summary.expense} className="text-4xl text-[var(--orange-2)]" />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Fluxo de caixa</p>
              <p className="mt-0.5 text-xs capitalize text-[var(--muted)]">{period}</p>
            </div>
            <nav aria-label="Período do gráfico" className="grid grid-cols-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-0.5">
              {ranges.map((r) => {
                const active = granularity === r.key
                return (
                  <Link
                    key={r.key}
                    href={`/?${new URLSearchParams({ m: month, ...(r.key === 'month' ? {} : { g: r.key }) })}`}
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
          </div>
          <dl className="mb-5 grid grid-cols-3 divide-x divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--bg)]/60">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0 px-3 py-3 sm:px-4">
                <dt className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <span className={`size-2 rounded-[3px] ${s.dot}`} />
                  {s.label}
                </dt>
                <dd className={`mt-1.5 truncate text-sm font-semibold tabular-nums sm:text-base ${s.tone}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
          <CashflowChart data={cashflow} todayKey={todayKey} />
          <p className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
            <span className="stripes inline-block h-3 w-5 rounded-[3px] border border-[var(--muted)]/50" />
            Listrado = ainda pendente. Barra cheia = já recebido ou pago.
          </p>
        </Card>
        <Card>
          <p className="mb-4 text-sm">Gastos por categoria</p>
          <CategoryDonut data={byCategory} />
        </Card>
      </div>

      <Card className="mt-4">
        <p className="mb-2 text-sm">Últimas transações</p>
        <TransactionsTable rows={recent} />
      </Card>
    </>
  )
}
