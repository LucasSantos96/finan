import type { PrismaClient } from '@prisma/client'
import { todayUtc } from '@/lib/dates'

export function addMonthsClamped(start: Date, n: number): Date {
  const y = start.getUTCFullYear()
  const m = start.getUTCMonth() + n
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(start.getUTCDate(), lastDay)))
}

export function splitInstallments(totalCents: number, n: number): number[] {
  const base = Math.floor(totalCents / n)
  const extra = totalCents - base * n
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0))
}

export function planInstallments(startDate: Date, totalCents: number, count: number) {
  return splitInstallments(totalCents, count).map((amountCents, i) => ({
    no: i + 1,
    date: addMonthsClamped(startDate, i),
    amountCents,
  }))
}

export function planRecurring(args: {
  startDate: Date
  endDate: Date | null
  lastGeneratedUntil: Date | null
  horizon: Date
}): Date[] {
  const out: Date[] = []
  for (let k = 0; ; k++) {
    const date = addMonthsClamped(args.startDate, k)
    if (date > args.horizon) break
    if (args.endDate && date > args.endDate) break
    if (!args.lastGeneratedUntil || date > args.lastGeneratedUntil) out.push(date)
  }
  return out
}

export async function ensureGenerated(db: PrismaClient, today: Date = todayUtc()): Promise<void> {
  const horizon = addMonthsClamped(today, 12)
  const recurrences = await db.recurrence.findMany({
    where: { kind: 'RECURRING' },
    include: { tags: true },
  })
  for (const r of recurrences) {
    const dates = planRecurring({
      startDate: r.startDate,
      endDate: r.endDate,
      lastGeneratedUntil: r.lastGeneratedUntil,
      horizon,
    })
    if (dates.length === 0) continue
    await db.$transaction([
      ...dates.map((date) =>
        db.transaction.create({
          data: {
            type: r.type,
            amountCents: r.amountCents,
            date,
            description: r.description,
            categoryId: r.categoryId,
            recurrenceId: r.id,
            isPaid: date <= today,
            tags: { connect: r.tags.map((t) => ({ id: t.id })) },
          },
        }),
      ),
      db.recurrence.update({
        where: { id: r.id },
        data: { lastGeneratedUntil: dates[dates.length - 1] },
      }),
    ])
  }
}
