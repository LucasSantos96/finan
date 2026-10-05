import { Card } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { CategoryCreateForm, CategoryRow, TagRow } from '@/components/CategoryForms'
import { listCategories, listTags } from '@/server/queries'

export default async function Categorias() {
  const [categories, tags] = await Promise.all([listCategories(), listTags()])
  const income = categories.filter((c) => c.kind === 'INCOME')
  const expense = categories.filter((c) => c.kind === 'EXPENSE')

  return (
    <>
      <PageHeader title="Categorias e tags" subtitle="Organize seus lançamentos" />
      <Card className="mb-4">
        <CategoryCreateForm />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-4 text-sm text-[var(--blue-2)]">Entradas</p>
          <div className="space-y-3">
            {income.map((c) => (
              <CategoryRow key={c.id} cat={c} />
            ))}
          </div>
        </Card>
        <Card>
          <p className="mb-4 text-sm text-[var(--orange-2)]">Saídas</p>
          <div className="space-y-3">
            {expense.map((c) => (
              <CategoryRow key={c.id} cat={c} />
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <p className="mb-4 text-sm">Tags</p>
        {tags.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Tags são criadas ao lançar (campo “Tags”).</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tags.map((t) => (
              <TagRow key={t.id} tag={t} />
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
