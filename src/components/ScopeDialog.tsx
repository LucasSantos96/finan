'use client'
export function ScopeDialog({
  onPick,
  onCancel,
}: {
  onPick: (scope: 'one' | 'following') => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60" onClick={onCancel}>
      <div
        className="w-80 space-y-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-2 text-sm">Excluir lançamento recorrente/parcelado</p>
        <button className="w-full rounded-xl bg-[var(--surface-2)] py-2 text-sm" onClick={() => onPick('one')}>
          Só esta
        </button>
        <button className="w-full rounded-xl bg-[var(--orange)] py-2 text-sm text-black" onClick={() => onPick('following')}>
          Esta e as seguintes
        </button>
        <button className="w-full py-2 text-sm text-[var(--muted)]" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
