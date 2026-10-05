'use client'
import { Plus } from 'lucide-react'
import { useDrawer } from './DrawerProvider'

export function NewButton() {
  const { openNew } = useDrawer()
  return (
    <button
      onClick={openNew}
      className="flex items-center gap-2 rounded-xl bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white"
    >
      <Plus size={16} /> Novo <kbd className="rounded bg-white/15 px-1.5 text-xs">N</kbd>
    </button>
  )
}
