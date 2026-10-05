// UTC date-only helpers. "today" uses the local calendar date.
export function todayUtc(): Date {
  const n = new Date()
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()))
}

export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function todayInput(): string {
  return toDateInput(todayUtc())
}

export function parseDateInput(s: string): Date {
  return new Date(`${s}T00:00:00Z`)
}

export function currentMonth(): string {
  return todayInput().slice(0, 7)
}

export function monthRange(m: string): { start: Date; end: Date } {
  const [y, mo] = m.split('-').map(Number)
  return { start: new Date(Date.UTC(y, mo - 1, 1)), end: new Date(Date.UTC(y, mo, 1)) }
}

export function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function shiftDaysUtc(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + delta))
}

export function startOfWeekUtc(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day))
}

export function dayMonthShort(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(d)
}

export function weekdayShort(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(d).replace('.', '')
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? parseDateInput(d.slice(0, 10)) : d
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date)
}

export function monthLabel(m: string): string {
  const { start } = monthRange(m)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start)
}

export function monthShort(m: string): string {
  const { start } = monthRange(m)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
    .format(start)
    .replace('.', '')
}
