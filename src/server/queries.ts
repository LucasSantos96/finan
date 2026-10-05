import type { Prisma } from '@prisma/client'
import { prisma } from './db'
import { currentMonth, monthRange, monthShort, shiftDaysUtc, startOfWeekUtc, toDateInput, todayUtc, weekdayShort } from '@/lib/dates'
import type { CategoryOption, TxRow, TxType } from '@/lib/types'

const include = { category: true, tags: true } as const
type Row = Prisma.TransactionGetPayload<{ include: typeof include }>

function toRow(t: Row): TxRow {
  return {
    id: t.id,
    type: t.type as TxType,
    amountCents: t.amountCents,
    date: toDateInput(t.date),
    description: t.description,
    categoryId: t.categoryId,
    categoryName: t.category.name,
    categoryColor: t.category.color,
    isPaid: t.isPaid,
    tags: t.tags.map((x) => x.name),
    recurrenceId: t.recurrenceId,
    installmentNo: t.installmentNo,
    installmentTotal: t.installmentTotal,
  }
}

export type TxFilters = {
  month?: string
  type?: TxType
  categoryId?: number
  tag?: string
  status?: 'paid' | 'pending'
  q?: string
  sort?: 'date' | 'amount'
  dir?: 'asc' | 'desc'
  take?: number
}

export async function listTransactions(f: TxFilters = {}): Promise<TxRow[]> {
  const where: Prisma.TransactionWhereInput = {}
  if (f.month) {
    const { start, end } = monthRange(f.month)
    where.date = { gte: start, lt: end }
  }
  if (f.type) where.type = f.type
  if (f.categoryId) where.categoryId = f.categoryId
  if (f.tag) where.tags = { some: { name: f.tag } }
  if (f.status === 'paid') where.isPaid = true
  if (f.status === 'pending') where.isPaid = false
  if (f.q) where.description = { contains: f.q }
  const dir = f.dir ?? 'desc'
  const rows = await prisma.transaction.findMany({
    where,
    include,
    orderBy: [f.sort === 'amount' ? { amountCents: dir } : { date: dir }, { id: 'desc' }],
    take: f.take,
  })
  return rows.map(toRow)
}

async function sum(where: Prisma.TransactionWhereInput): Promise<number> {
  const r = await prisma.transaction.aggregate({ _sum: { amountCents: true }, where })
  return r._sum.amountCents ?? 0
}

export async function getSummary(month: string) {
  const { start, end } = monthRange(month)
  const date = { gte: start, lt: end }
  const [income, expense, paidIn, paidOut] = await Promise.all([
    sum({ type: 'INCOME', date }),
    sum({ type: 'EXPENSE', date }),
    sum({ type: 'INCOME', isPaid: true }),
    sum({ type: 'EXPENSE', isPaid: true }),
  ])
  return { income, expense, balance: paidIn - paidOut }
}

type CashflowPoint = {
  label: string
  income: number
  expense: number
  incomePaid: number
  incomePending: number
  expensePaid: number
  expensePending: number
}
const emptyPoint = (label: string): CashflowPoint => ({
  label,
  income: 0,
  expense: 0,
  incomePaid: 0,
  incomePending: 0,
  expensePaid: 0,
  expensePending: 0,
})

export type CashflowGranularity = 'week' | 'month' | 'year'

export async function getCashflow(month: string, granularity: CashflowGranularity = 'month') {
  const buckets = new Map<string, CashflowPoint>()
  let start: Date
  let end: Date
  let keyOf: (d: Date) => string

  if (granularity === 'week') {
    const ref = month === currentMonth() ? todayUtc() : monthRange(month).start
    const ws = startOfWeekUtc(ref)
    start = ws
    end = shiftDaysUtc(ws, 7)
    for (let i = 0; i < 7; i++) {
      const d = shiftDaysUtc(ws, i)
      buckets.set(toDateInput(d), emptyPoint(weekdayShort(d)))
    }
    keyOf = (d) => toDateInput(d)
  } else if (granularity === 'year') {
    const y = Number(month.slice(0, 4))
    start = new Date(Date.UTC(y, 0, 1))
    end = new Date(Date.UTC(y + 1, 0, 1))
    for (let i = 0; i < 12; i++) {
      const m = `${y}-${String(i + 1).padStart(2, '0')}`
      buckets.set(m, emptyPoint(monthShort(m)))
    }
    keyOf = (d) => toDateInput(d).slice(0, 7)
  } else {
    const y = Number(month.slice(0, 4))
    const mo = Number(month.slice(5, 7))
    start = monthRange(month).start
    end = monthRange(month).end
    const days = new Date(Date.UTC(y, mo, 0)).getUTCDate()
    for (let i = 1; i <= days; i++) {
      const d = new Date(Date.UTC(y, mo - 1, i))
      buckets.set(toDateInput(d), emptyPoint(String(i)))
    }
    keyOf = (d) => toDateInput(d)
  }

  const rows = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end } },
    select: { date: true, type: true, amountCents: true, isPaid: true },
  })
  for (const r of rows) {
    const b = buckets.get(keyOf(r.date))
    if (!b) continue
    if (r.type === 'INCOME') {
      b.income += r.amountCents
      if (r.isPaid) b.incomePaid += r.amountCents
      else b.incomePending += r.amountCents
    } else {
      b.expense += r.amountCents
      if (r.isPaid) b.expensePaid += r.amountCents
      else b.expensePending += r.amountCents
    }
  }
  return [...buckets].map(([key, v]) => ({ key, ...v }))
}

export async function getByCategory(month: string) {
  const { start, end } = monthRange(month)
  const groups = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { type: 'EXPENSE', date: { gte: start, lt: end } },
    _sum: { amountCents: true },
  })
  const cats = await prisma.category.findMany({
    where: { id: { in: groups.map((g) => g.categoryId) } },
  })
  return groups
    .map((g) => {
      const c = cats.find((x) => x.id === g.categoryId)!
      return { name: c.name, color: c.color, cents: g._sum.amountCents ?? 0 }
    })
    .sort((a, b) => b.cents - a.cents)
}

export async function listRecurrences() {
  const rows = await prisma.recurrence.findMany({
    include: {
      category: true,
      transactions: {
        where: { isPaid: false },
        orderBy: { date: 'asc' },
        select: { date: true, amountCents: true },
      },
      _count: { select: { transactions: true } },
    },
    orderBy: { id: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as 'INSTALLMENT' | 'RECURRING',
    type: r.type as TxType,
    description: r.description,
    amountCents: r.amountCents,
    categoryName: r.category.name,
    categoryColor: r.category.color,
    endDate: r.endDate ? toDateInput(r.endDate) : null,
    total: r._count.transactions,
    pendingCount: r.transactions.length,
    pendingCents: r.transactions.reduce((a, t) => a + t.amountCents, 0),
    nextDate: r.transactions[0] ? toDateInput(r.transactions[0].date) : null,
  }))
}

export async function listCategories(): Promise<CategoryOption[]> {
  const rows = await prisma.category.findMany({ orderBy: [{ kind: 'asc' }, { name: 'asc' }] })
  return rows.map((c) => ({ id: c.id, name: c.name, color: c.color, kind: c.kind as TxType }))
}

export async function listTags() {
  const rows = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { transactions: true } } },
  })
  return rows.map((t) => ({ id: t.id, name: t.name, count: t._count.transactions }))
}

export async function listPending(): Promise<TxRow[]> {
  const rows = await prisma.transaction.findMany({
    where: { isPaid: false },
    include,
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  })
  return rows.map(toRow)
}
