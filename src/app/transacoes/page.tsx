import Link from 'next/link'
import { Card } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { TransactionsTable } from '@/components/TransactionsTable'
import { Pagination } from '@/components/Pagination'
import { currentMonth } from '@/lib/dates'
import type { TxType } from '@/lib/types'
import { countTransactions, listCategories, listTags, listTransactions, type TxFilters } from '@/server/queries'

const PAGE_SIZE = 10

type SP = { m?: string; type?: string; cat?: string; tag?: string; status?: string; q?: string; sort?: string; f?: string; p?: string }

export default async function Transacoes({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  // first visit (no form submitted) defaults to the current month; submitted form with empty month = all
  const month = sp.f ? sp.m || undefined : sp.m || currentMonth()
  const [sortKey, dir] = (sp.sort ?? 'date-desc').split('-') as ['date' | 'amount', 'asc' | 'desc']
  const filter: TxFilters = {
    month,
    type: sp.type === 'INCOME' || sp.type === 'EXPENSE' ? (sp.type as TxType) : undefined,
    categoryId: sp.cat ? Number(sp.cat) : undefined,
    tag: sp.tag || undefined,
    status: sp.status === 'paid' || sp.status === 'pending' ? sp.status : undefined,
    q: sp.q || undefined,
  }
  const total = await countTransactions(filter)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(sp.p) || 1), totalPages)

  const [rows, categories, tags] = await Promise.all([
    listTransactions({ ...filter, sort: sortKey, dir, pageSize: PAGE_SIZE, page }),
    listCategories(),
    listTags(),
  ])

  // keep the active filters when moving between pages
  const pageParams = Object.fromEntries(
    Object.entries(sp).filter(([k, v]) => k !== 'p' && typeof v === 'string' && v !== ''),
  ) as Record<string, string>

  return (
    <>
      <PageHeader title="Transações" subtitle={`${total} lançamento(s)`} />
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
            <button className="rounded-xl bg-[var(--blue)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--blue-2)]">
              Filtrar
            </button>
          </div>
        </form>
        <div className="mt-3 flex justify-end">
          <Link href="/transacoes" className="text-xs text-[var(--muted)] transition-colors hover:text-[var(--text)]">
            Limpar filtros
          </Link>
        </div>
      </Card>
      <Card>
        <TransactionsTable rows={rows} />
        <Pagination page={page} totalPages={totalPages} basePath="/transacoes" params={pageParams} />
      </Card>
    </>
  )
}
