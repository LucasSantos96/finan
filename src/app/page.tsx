import { Card, Money } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { MonthPicker } from '@/components/MonthPicker'
import { TransactionsTable } from '@/components/TransactionsTable'
import { CashflowChart } from '@/components/charts/CashflowChart'
import { CategoryDonut } from '@/components/charts/CategoryDonut'
import { currentMonth } from '@/lib/dates'
import { getByCategory, getCashflow, getSummary, listTransactions } from '@/server/queries'

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : currentMonth()
  const [summary, cashflow, byCategory, recent] = await Promise.all([
    getSummary(month),
    getCashflow(month),
    getByCategory(month),
    listTransactions({ month, take: 8 }),
  ])

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Acompanhe suas entradas e saídas">
        <MonthPicker month={month} basePath="/" />
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
          <p className="mb-4 text-sm">Fluxo de caixa · 12 meses</p>
          <CashflowChart data={cashflow} />
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
