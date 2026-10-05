import { NewButton } from './NewButton'

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 pl-12 lg:pl-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        <NewButton />
      </div>
    </header>
  )
}
