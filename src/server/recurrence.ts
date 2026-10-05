import type { PrismaClient } from '@prisma/client'
import { todayUtc } from '@/lib/dates'

export function addMonthsClamped(start: Date, n: number): Date {
  const y = start.getUTCFullYear()
  const m = start.getUTCMonth() + n
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(start.getUTCDate(), lastDay)))
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
    // Claim the range first (compare-and-set) so concurrent requests can't both create it.
    await db.$transaction(async (tx) => {
      const claimed = await tx.recurrence.updateMany({
        where: { id: r.id, lastGeneratedUntil: r.lastGeneratedUntil },
        data: { lastGeneratedUntil: dates[dates.length - 1] },
      })
      if (claimed.count === 0) return
      for (const date of dates) {
        await tx.transaction.create({
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
        })
      }
    })
  }
}
