import { describe, expect, it } from 'vitest'
import {
  addMonthsClamped,
  ensureGenerated,
  planInstallments,
  planRecurring,
  splitInstallments,
} from './recurrence'

const d = (s: string) => new Date(`${s}T00:00:00Z`)
const iso = (x: Date) => x.toISOString().slice(0, 10)

describe('addMonthsClamped', () => {
  it('clamps day 31 and returns to 31 afterwards', () => {
    const start = d('2026-01-31')
    expect(iso(addMonthsClamped(start, 1))).toBe('2026-02-28')
    expect(iso(addMonthsClamped(start, 2))).toBe('2026-03-31')
    expect(iso(addMonthsClamped(start, 3))).toBe('2026-04-30')
  })
  it('handles leap years and year rollover', () => {
    expect(iso(addMonthsClamped(d('2028-01-31'), 1))).toBe('2028-02-29')
    expect(iso(addMonthsClamped(d('2026-11-15'), 3))).toBe('2027-02-15')
  })
})

describe('splitInstallments', () => {
  it('spreads leftover cents one per part from the first, and sums exactly', () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333])
    expect(splitInstallments(10000, 4)).toEqual([2500, 2500, 2500, 2500])
    expect(splitInstallments(1, 3).reduce((a, b) => a + b, 0)).toBe(1)
  })

  it('does not dump all leftover cents on the first part (R$ 1.000,00 in 36)', () => {
    const parts = splitInstallments(100000, 36)
    expect(parts.slice(0, 28).every((p) => p === 2778)).toBe(true)
    expect(parts.slice(28).every((p) => p === 2777)).toBe(true)
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100000)
    expect(Math.max(...parts) - Math.min(...parts)).toBe(1)
  })
})

describe('planInstallments', () => {
  it('numbers parts and spaces them monthly', () => {
    const plan = planInstallments(d('2026-10-31'), 10000, 3)
    expect(plan.map((p) => [p.no, iso(p.date), p.amountCents])).toEqual([
      [1, '2026-10-31', 3334],
      [2, '2026-11-30', 3333],
      [3, '2026-12-31', 3333],
    ])
  })
})

describe('planRecurring', () => {
  it('generates up to the horizon, after lastGeneratedUntil, within endDate', () => {
    const base = { startDate: d('2026-01-10'), endDate: null, lastGeneratedUntil: null }
    expect(planRecurring({ ...base, horizon: d('2026-03-10') }).map(iso)).toEqual([
      '2026-01-10',
      '2026-02-10',
      '2026-03-10',
    ])
    expect(
      planRecurring({ ...base, lastGeneratedUntil: d('2026-02-10'), horizon: d('2026-04-09') }).map(iso),
    ).toEqual(['2026-03-10'])
    expect(
      planRecurring({ ...base, endDate: d('2026-02-15'), horizon: d('2026-12-31') }).map(iso),
    ).toEqual(['2026-01-10', '2026-02-10'])
  })
})

describe('ensureGenerated', () => {
  function fakeDb() {
    const rec = {
      id: 1,
      kind: 'RECURRING',
      type: 'EXPENSE',
      startDate: d('2026-10-05'),
      endDate: null as Date | null,
      lastGeneratedUntil: null as Date | null,
      amountCents: 5000,
      description: 'Netflix',
      categoryId: 7,
      tags: [{ id: 3 }],
    }
    const rows: { date: Date; isPaid: boolean }[] = []
    const db = {
      recurrence: {
        findMany: async () => {
          const snapshot = { ...rec }
          await Promise.resolve() // yield, so concurrent callers read the same state
          return [snapshot]
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: { lastGeneratedUntil: Date | null }
          data: { lastGeneratedUntil: Date }
        }) => {
          if ((where.lastGeneratedUntil?.getTime() ?? null) !== (rec.lastGeneratedUntil?.getTime() ?? null))
            return { count: 0 }
          rec.lastGeneratedUntil = data.lastGeneratedUntil
          return { count: 1 }
        },
        update: async ({ data }: { data: { lastGeneratedUntil: Date } }) => {
          rec.lastGeneratedUntil = data.lastGeneratedUntil
        },
      },
      transaction: {
        create: async ({ data }: { data: { date: Date; isPaid: boolean } }) => {
          rows.push({ date: data.date, isPaid: data.isPaid })
        },
      },
      $transaction: async (arg: unknown) =>
        typeof arg === 'function' ? arg(db) : Promise.all(arg as Promise<unknown>[]),
    }
    return { db: db as never, rows }
  }

  it('creates occurrences up to +12 months, and is idempotent', async () => {
    const { db, rows } = fakeDb()
    await ensureGenerated(db, d('2026-10-05'))
    expect(rows).toHaveLength(13) // 2026-10-05 .. 2027-10-05
    expect(rows[0].isPaid).toBe(true) // date <= today
    expect(rows[1].isPaid).toBe(false)
    await ensureGenerated(db, d('2026-10-05'))
    expect(rows).toHaveLength(13)
  })

  it('does not duplicate when two requests generate concurrently', async () => {
    const { db, rows } = fakeDb()
    await Promise.all([ensureGenerated(db, d('2026-10-05')), ensureGenerated(db, d('2026-10-05'))])
    expect(rows).toHaveLength(13)
  })

  it('generates only the new month when time advances', async () => {
    const { db, rows } = fakeDb()
    await ensureGenerated(db, d('2026-10-05'))
    await ensureGenerated(db, d('2026-11-05'))
    expect(rows).toHaveLength(14)
  })
})
