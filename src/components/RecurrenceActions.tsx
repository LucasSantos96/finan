'use client'
import { deleteRecurrence, endRecurrence } from '@/server/actions'
import { ConfirmButton } from './ConfirmButton'

export function RecurrenceActions({ id, canEnd }: { id: number; canEnd: boolean }) {
  return (
    <div className="flex justify-end gap-1">
      {canEnd && <ConfirmButton label="Encerrar" onConfirm={() => endRecurrence(id)} />}
      <ConfirmButton label="Excluir tudo" confirmLabel="Apaga o histórico. Confirmar?" onConfirm={() => deleteRecurrence(id)} />
    </div>
  )
}
