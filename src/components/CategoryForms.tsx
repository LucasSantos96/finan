'use client'
import { useState, useTransition } from 'react'
import { createCategory, deleteCategory, deleteTag, updateCategory } from '@/server/actions'
import type { CategoryOption, TxType } from '@/lib/types'
import { ConfirmButton } from './ConfirmButton'

export function CategoryCreateForm() {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [kind, setKind] = useState<TxType>('EXPENSE')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await createCategory({ name, color, kind })
          if (res.ok) {
            setName('')
            setError('')
          } else setError(res.error)
        })
      }}
    >
      <input className="field max-w-60" placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="field max-w-36" value={kind} onChange={(e) => setKind(e.target.value as TxType)}>
        <option value="EXPENSE">Saída</option>
        <option value="INCOME">Entrada</option>
      </select>
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded-lg bg-transparent" />
      <button disabled={pending} className="rounded-xl bg-[var(--blue)] px-4 py-2 text-sm text-white">
        Adicionar
      </button>
      {error && <span className="text-sm text-[var(--orange-2)]">{error}</span>}
    </form>
  )
}

export function CategoryRow({ cat }: { cat: CategoryOption }) {
  const [name, setName] = useState(cat.name)
  const [color, setColor] = useState(cat.color)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const dirty = name !== cat.name || color !== cat.color

  return (
    <div>
      <div className="flex items-center gap-3">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-9 rounded-md bg-transparent" />
        <input className="field max-w-60 py-1.5" value={name} onChange={(e) => setName(e.target.value)} />
        {dirty && (
          <button
            disabled={pending}
            className="rounded-lg bg-[var(--surface-2)] px-3 py-1 text-xs"
            onClick={() =>
              start(async () => {
                const res = await updateCategory(cat.id, { name, color })
                setError(res.ok ? '' : res.error)
              })
            }
          >
            Salvar
          </button>
        )}
        <ConfirmButton
          label="Excluir"
          onConfirm={async () => {
            const res = await deleteCategory(cat.id)
            if (!res.ok) setError(res.error)
          }}
        />
      </div>
      {error && <p className="mt-1 text-xs text-[var(--orange-2)]">{error}</p>}
    </div>
  )
}

export function TagRow({ tag }: { tag: { id: number; name: string; count: number } }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm">
      <span>
        #{tag.name} <span className="text-xs text-[var(--muted)]">· {tag.count}</span>
      </span>
      <ConfirmButton label="Excluir" onConfirm={() => deleteTag(tag.id)} />
    </div>
  )
}
