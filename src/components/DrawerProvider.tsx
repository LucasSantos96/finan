'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createTransaction, updateTransaction } from '@/server/actions'
import { todayInput } from '@/lib/dates'
import { maskBRL } from '@/lib/money'
import type { CategoryOption, TxRow, TxType } from '@/lib/types'

type Ctx = { openNew: () => void; openEdit: (row: TxRow) => void }
const DrawerCtx = createContext<Ctx>({ openNew() {}, openEdit() {} })
export const useDrawer = () => useContext(DrawerCtx)

const centsToInput = (c: number) => maskBRL(String(c))

export function DrawerProvider({
  categories,
  tags: tagSuggestions,
  children,
}: {
  categories: CategoryOption[]
  tags: string[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TxRow | null>(null)

  const [type, setType] = useState<TxType>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [date, setDate] = useState(todayInput())
  const [tags, setTags] = useState('')
  const [repeat, setRepeat] = useState<'none' | 'monthly' | 'installments'>('none')
  const [installments, setInstallments] = useState(2)
  const [isPaid, setIsPaid] = useState(true)
  const [scope, setScope] = useState<'one' | 'following'>('one')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const reset = useCallback((row: TxRow | null) => {
    setEditing(row)
    setType(row?.type ?? 'EXPENSE')
    setAmount(row ? centsToInput(row.amountCents) : '')
    setDescription(row?.description ?? '')
    setCategoryId(row?.categoryId ?? null)
    setDate(row?.date ?? todayInput())
    setTags(row ? row.tags.join(', ') : '')
    setRepeat('none')
    setInstallments(2)
    setIsPaid(row?.isPaid ?? true)
    setScope('one')
    setError('')
  }, [])

  const openNew = useCallback(() => {
    reset(null)
    setOpen(true)
  }, [reset])
  const openEdit = useCallback(
    (row: TxRow) => {
      reset(row)
      setOpen(true)
    },
    [reset],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      const el = e.target as HTMLElement
      if (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openNew()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openNew])

  useEffect(() => {
    if (open) setTimeout(() => amountRef.current?.focus(), 50)
  }, [open])

  const visible = categories.filter((c) => c.kind === type)

  async function submit(keepOpen: boolean) {
    if (categoryId === null) return setError('Escolha uma categoria.')
    setBusy(true)
    setError('')
    const tagList = tags.split(',')
    let res
    try {
      res = editing
        ? await updateTransaction(
            editing.id,
            { amount, description, categoryId, date, tags: tagList, isPaid },
            scope,
          )
        : await createTransaction({
            type,
            amount,
            description,
            categoryId,
            date,
            tags: tagList,
            repeat,
            installments,
          })
    } catch {
      setBusy(false)
      return setError('Não foi possível salvar. Confira o valor e tente de novo.')
    }
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
    if (keepOpen && !editing) reset(null)
    else setOpen(false)
  }

  return (
    <DrawerCtx.Provider value={{ openNew, openEdit }}>
      {children}
      {open && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-6 transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editing ? 'Editar lançamento' : 'Novo lançamento'}</h2>
          <button onClick={() => setOpen(false)} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(false)
          }}
          className="space-y-5"
        >
          {!editing && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface-2)] p-1">
              {(['INCOME', 'EXPENSE'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => {
                    setType(t)
                    setCategoryId(null)
                  }}
                  className={`rounded-lg py-2 text-sm ${
                    type === t
                      ? t === 'INCOME'
                        ? 'bg-[var(--blue)] text-white'
                        : 'bg-[var(--orange)] text-black'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  {t === 'INCOME' ? 'Entrada' : 'Saída'}
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="text-xs text-[var(--muted)]">
              {repeat === 'installments' ? 'Valor total (R$)' : 'Valor (R$)'}
            </label>
            <input
              ref={amountRef}
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(maskBRL(e.target.value))}
              className="w-full bg-transparent text-4xl font-semibold tabular-nums outline-none placeholder:text-[var(--border)]"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--muted)]">Descrição</label>
            <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-[var(--muted)]">Categoria</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {visible.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                    categoryId === c.id ? 'border-[var(--blue)] text-[var(--text)]' : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  <span className="size-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)]">Data</label>
              <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[var(--muted)]">Tags (vírgula)</label>
              <input
                className="field"
                list="tag-suggestions"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <datalist id="tag-suggestions">
                {tagSuggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          {editing ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                Pago
              </label>
              {editing.recurrenceId && (
                <div className="space-y-1 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={scope === 'one'} onChange={() => setScope('one')} /> Só esta
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={scope === 'following'} onChange={() => setScope('following')} />{' '}
                    Esta e as seguintes (descrição, categoria
                    {editing.installmentTotal ? '' : ', valor'})
                  </label>
                </div>
              )}
            </>
          ) : (
            <details className="rounded-xl border border-[var(--border)] p-3" open={repeat !== 'none'}>
              <summary className="cursor-pointer text-sm text-[var(--muted)]">Repetir</summary>
              <div className="mt-3 space-y-3">
                <select className="field" value={repeat} onChange={(e) => setRepeat(e.target.value as typeof repeat)}>
                  <option value="none">Não repete</option>
                  <option value="monthly">Mensal</option>
                  <option value="installments">Parcelado</option>
                </select>
                {repeat === 'installments' && (
                  <div>
                    <label className="text-xs text-[var(--muted)]">Número de parcelas</label>
                    <input
                      type="number"
                      min={2}
                      max={120}
                      className="field"
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </details>
          )}

          {error && <p className="text-sm text-[var(--orange-2)]">{error}</p>}

          <div className="flex gap-3">
            <button
              disabled={busy}
              className="flex-1 rounded-xl bg-[var(--blue)] py-2.5 font-medium text-white disabled:opacity-60"
            >
              Salvar
            </button>
            {!editing && (
              <button
                type="button"
                disabled={busy}
                onClick={() => submit(true)}
                className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--muted)]"
              >
                Salvar e novo
              </button>
            )}
          </div>
        </form>
      </aside>
    </DrawerCtx.Provider>
  )
}
