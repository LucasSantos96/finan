'use client'
import { useState, useTransition } from 'react'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { deleteTransaction, togglePaid } from '@/server/actions'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import type { TxRow } from '@/lib/types'
import { StatusPill } from './ui'
import { useDrawer } from './DrawerProvider'
import { ScopeDialog } from './ScopeDialog'

export function TransactionsTable({ rows }: { rows: TxRow[] }) {
  const { openEdit } = useDrawer()
  const [, start] = useTransition()
  const [deleting, setDeleting] = useState<TxRow | null>(null)

  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--muted)]">Nenhum lançamento.</p>
  }

  const remove = (row: TxRow, scope: 'one' | 'following') =>
    start(async () => {
      await deleteTransaction(row.id, scope)
      setDeleting(null)
    })

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
            <th className="py-3 font-normal">Descrição</th>
            <th className="font-normal">Data</th>
            <th className="font-normal">Categoria</th>
            <th className="text-right font-normal">Valor</th>
            <th className="pl-4 font-normal">Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[var(--border)]/60 last:border-0">
              <td className="py-3">
                <div>{r.description}</div>
                <div className="text-xs text-[var(--muted)]">
                  {r.installmentTotal ? `Parcela ${r.installmentNo}/${r.installmentTotal} ` : ''}
                  {r.tags.map((t) => `#${t}`).join(' ')}
                </div>
              </td>
              <td className="text-[var(--muted)]">{formatDate(r.date)}</td>
              <td>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: r.categoryColor }} />
                  {r.categoryName}
                </span>
              </td>
              <td
                className={`text-right tabular-nums ${
                  r.type === 'INCOME' ? 'text-[var(--blue-2)]' : 'text-[var(--orange-2)]'
                }`}
              >
                {r.type === 'INCOME' ? '+' : '−'}
                {formatBRL(r.amountCents)}
              </td>
              <td className="pl-4">
                <StatusPill paid={r.isPaid} />
              </td>
              <td className="whitespace-nowrap text-right">
                <button
                  title={r.isPaid ? 'Marcar pendente' : 'Marcar pago'}
                  className="p-1.5 text-[var(--muted)] hover:text-[var(--blue-2)]"
                  onClick={() => start(async () => void (await togglePaid(r.id)))}
                >
                  <Check size={15} />
                </button>
                <button
                  title="Editar"
                  className="p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
                  onClick={() => openEdit(r)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  title="Excluir"
                  className="p-1.5 text-[var(--muted)] hover:text-[var(--orange-2)]"
                  onClick={() => (r.recurrenceId ? setDeleting(r) : remove(r, 'one'))}
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {deleting && <ScopeDialog onPick={(s) => remove(deleting, s)} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
