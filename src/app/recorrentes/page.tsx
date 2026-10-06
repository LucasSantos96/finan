import { Card } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { RecurrenceTable } from '@/components/RecurrenceTable'
import { listRecurrences } from '@/server/queries'

export default async function Recorrentes() {
  const recs = await listRecurrences()
  return (
    <>
      <PageHeader title="Recorrentes e parcelas" subtitle="Lançamentos que se repetem" />
      <Card>
        {recs.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">
            Nada por aqui. Crie um lançamento e use “Repetir”.
          </p>
        ) : (
          <RecurrenceTable recs={recs} />
        )}
      </Card>
    </>
  )
}
