import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number
  totalPages: number
  basePath: string
  params: Record<string, string>
}) {
  if (totalPages <= 1) return null
  const href = (p: number) => {
    const qs = new URLSearchParams(params)
    if (p > 1) qs.set('p', String(p))
    const s = qs.toString()
    return s ? `${basePath}?${s}` : basePath
  }
  const btn =
    'grid size-8 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
  const disabled = 'pointer-events-none opacity-30'
  return (
    <nav aria-label="Paginação" className="mt-4 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
      <Link
        href={href(page - 1)}
        scroll={false}
        aria-label="Página anterior"
        aria-disabled={page <= 1}
        className={`${btn} ${page <= 1 ? disabled : ''}`}
      >
        <ChevronLeft size={16} />
      </Link>
      <span className="tabular-nums">
        Página {page} de {totalPages}
      </span>
      <Link
        href={href(page + 1)}
        scroll={false}
        aria-label="Próxima página"
        aria-disabled={page >= totalPages}
        className={`${btn} ${page >= totalPages ? disabled : ''}`}
      >
        <ChevronRight size={16} />
      </Link>
    </nav>
  )
}
