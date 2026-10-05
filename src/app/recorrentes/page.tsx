import { Card } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { RecurrenceActions } from '@/components/RecurrenceActions'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/dates'
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                  <th className="py-3 font-normal">Descrição</th>
                  <th className="font-normal">Tipo</th>
                  <th className="text-right font-normal">Valor</th>
                  <th className="pl-4 font-normal">Próximo vencimento</th>
                  <th className="text-right font-normal">A pagar</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recs.map((r) => (
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
        )}
      </Card>
    </>
  )
}
