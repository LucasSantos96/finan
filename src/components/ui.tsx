import { splitBRL } from '@/lib/money'

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.03)] ${className}`}
    >
      {children}
    </div>
  )
}

export function Money({ cents, className = 'text-4xl' }: { cents: number; className?: string }) {
  const { int, dec } = splitBRL(cents)
  return (
    <span className={`font-semibold leading-none tracking-tight tabular-nums ${className}`}>
      {int}
      <span className="text-[0.5em] font-medium text-[var(--muted)]">,{dec}</span>
    </span>
  )
}

export function StatusPill({ paid }: { paid: boolean }) {
  const tone = paid
    ? 'bg-[color:var(--blue)]/12 text-[var(--blue-2)]'
    : 'bg-[color:var(--orange)]/12 text-[var(--orange-2)]'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {paid ? 'Pago' : 'Pendente'}
    </span>
  )
}
