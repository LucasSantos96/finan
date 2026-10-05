import { Card } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { TransactionsTable } from '@/components/TransactionsTable'
import { currentMonth } from '@/lib/dates'
import type { TxType } from '@/lib/types'
import { listCategories, listTags, listTransactions } from '@/server/queries'

type SP = { m?: string; type?: string; cat?: string; tag?: string; status?: string; q?: string; sort?: string; f?: string }

export default async function Transacoes({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  // first visit (no form submitted) defaults to the current month; submitted form with empty month = all
  const month = sp.f ? sp.m || undefined : sp.m || currentMonth()
  const [sortKey, dir] = (sp.sort ?? 'date-desc').split('-') as ['date' | 'amount', 'asc' | 'desc']

  const [rows, categories, tags] = await Promise.all([
    listTransactions({
      month,
      type: sp.type === 'INCOME' || sp.type === 'EXPENSE' ? (sp.type as TxType) : undefined,
      categoryId: sp.cat ? Number(sp.cat) : undefined,
      tag: sp.tag || undefined,
      status: sp.status === 'paid' || sp.status === 'pending' ? sp.status : undefined,
      q: sp.q || undefined,
      sort: sortKey,
      dir,
    }),
    listCategories(),
    listTags(),
  ])

  return (
    <>
      <PageHeader title="Transações" subtitle={`${rows.length} lançamento(s)`} />
      <Card className="mb-4">
        <form className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <input type="hidden" name="f" value="1" />
          <input className="field" type="month" name="m" defaultValue={month ?? ''} />
          <input className="field" name="q" placeholder="Buscar..." defaultValue={sp.q ?? ''} />
          <select className="field" name="type" defaultValue={sp.type ?? ''}>
            <option value="">Todos os tipos</option>
            <option value="INCOME">Entradas</option>
            <option value="EXPENSE">Saídas</option>
          </select>
          <select className="field" name="cat" defaultValue={sp.cat ?? ''}>
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="field" name="tag" defaultValue={sp.tag ?? ''}>
            <option value="">Todas as tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.name}>
                #{t.name}
              </option>
            ))}
          </select>
          <select className="field" name="status" defaultValue={sp.status ?? ''}>
            <option value="">Qualquer status</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
          </select>
          <div className="flex gap-2">
            <select className="field" name="sort" defaultValue={sp.sort ?? 'date-desc'}>
              <option value="date-desc">Data ↓</option>
              <option value="date-asc">Data ↑</option>
              <option value="amount-desc">Valor ↓</option>
              <option value="amount-asc">Valor ↑</option>
            </select>
            <button className="rounded-xl bg-[var(--surface-2)] px-4 text-sm">Filtrar</button>
          </div>
        </form>
      </Card>
      <Card>
        <TransactionsTable rows={rows} />
      </Card>
    </>
  )
}
