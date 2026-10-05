'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeftRight, HandCoins, LayoutDashboard, Menu, Repeat, Tags, X } from 'lucide-react'

const items = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { href: '/contas', label: 'Contas', icon: HandCoins },
  { href: '/recorrentes', label: 'Recorrentes', icon: Repeat },
  { href: '/categorias', label: 'Categorias', icon: Tags },
]

export function Sidebar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="fixed left-4 top-4 z-30 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <span className="grid size-8 place-items-center overflow-hidden rounded-[10px]">
              <span className="size-full bg-[linear-gradient(135deg,var(--blue)_50%,var(--orange)_50%)]" />
            </span>
            finan
          </span>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>
        <nav className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                  active
                    ? 'bg-[var(--surface-2)] font-medium text-[var(--text)]'
                    : 'text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)]/50 hover:text-[var(--text)]'
                }`}
              >
                <Icon size={18} className={active ? 'text-[var(--blue-2)]' : ''} />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
