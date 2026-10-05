'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from './db'
import { addMonthsClamped, ensureGenerated } from './recurrence'
import { parseBRL } from '@/lib/money'
import { parseDateInput, todayUtc } from '@/lib/dates'
import type { TxType } from '@/lib/types'

type Result = { ok: true } | { ok: false; error: string }
const fail = (error: string): Result => ({ ok: false, error })
const done = (): Result => {
  revalidatePath('/', 'layout')
  return { ok: true }
}

export type TxInput = {
  type: TxType
  amount: string
  description: string
  categoryId: number
  date: string
  tags: string[]
  repeat: 'none' | 'monthly' | 'installments'
  installments: number
}
export type UpdateInput = {
  amount: string
  description: string
  categoryId: number
  date: string
  tags: string[]
  isPaid: boolean
}

const tagConnect = (names: string[]) =>
  [...new Set(names.map((n) => n.trim()).filter(Boolean))].map((name) => ({
    where: { name },
    create: { name },
  }))

async function validate(
  i: { amount: string; description: string; categoryId: number; date: string },
  type?: TxType,
): Promise<{ error: string } | { cents: number; date: Date; description: string }> {
  const cents = parseBRL(i.amount)
  if (cents === null) return { error: 'Informe um valor maior que zero.' }
  if (!i.description.trim()) return { error: 'Informe uma descrição.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date)) return { error: 'Data inválida.' }
  const cat = await prisma.category.findUnique({ where: { id: i.categoryId } })
  if (!cat) return { error: 'Escolha uma categoria.' }
  if (type && cat.kind !== type) return { error: 'Categoria incompatível com o tipo.' }
  return { cents, date: parseDateInput(i.date), description: i.description.trim() }
}

export async function createTransaction(input: TxInput): Promise<Result> {
  const v = await validate(input, input.type)
  if ('error' in v) return fail(v.error)
  const today = todayUtc()
  const tags = tagConnect(input.tags)

  if (input.repeat === 'none') {
    await prisma.transaction.create({
      data: {
        type: input.type,
        amountCents: v.cents,
        date: v.date,
        description: v.description,
        categoryId: input.categoryId,
        isPaid: v.date <= today,
        tags: { connectOrCreate: tags },
      },
    })
    return done()
  }

  if (input.repeat === 'monthly') {
    await prisma.recurrence.create({
      data: {
        kind: 'RECURRING',
        type: input.type,
        startDate: v.date,
        amountCents: v.cents,
        description: v.description,
        categoryId: input.categoryId,
        tags: { connectOrCreate: tags },
      },
    })
    await ensureGenerated(prisma)
    return done()
  }

  const n = Math.trunc(input.installments)
  if (!(n >= 2 && n <= 120)) return fail('Parcelas devem ser entre 2 e 120.')
  // The amount is the value of each installment (income and expense alike).
  const plan = Array.from({ length: n }, (_, i) => ({
    no: i + 1,
    date: addMonthsClamped(v.date, i),
    amountCents: v.cents,
  }))
  const rec = await prisma.recurrence.create({
    data: {
      kind: 'INSTALLMENT',
      type: input.type,
      startDate: v.date,
      amountCents: v.cents,
      description: v.description,
      categoryId: input.categoryId,
      lastGeneratedUntil: plan[plan.length - 1].date,
      tags: { connectOrCreate: tags },
    },
  })
  await prisma.$transaction(
    plan.map((p) =>
      prisma.transaction.create({
        data: {
          type: input.type,
          amountCents: p.amountCents,
          date: p.date,
          description: v.description,
          categoryId: input.categoryId,
          recurrenceId: rec.id,
          installmentNo: p.no,
          installmentTotal: n,
          // installments start pending; the user settles each one in /contas
          isPaid: false,
          tags: { connectOrCreate: tags },
        },
      }),
    ),
  )
  return done()
}

export async function updateTransaction(
  id: number,
  input: UpdateInput,
  scope: 'one' | 'following',
): Promise<Result> {
  const tx = await prisma.transaction.findUnique({ where: { id }, include: { recurrence: true } })
  if (!tx) return fail('Lançamento não encontrado.')
  const v = await validate(input, tx.type as TxType)
  if ('error' in v) return fail(v.error)

  await prisma.transaction.update({
    where: { id },
    data: {
      amountCents: v.cents,
      date: v.date,
      description: v.description,
      categoryId: input.categoryId,
      isPaid: input.isPaid,
      tags: { set: [], connectOrCreate: tagConnect(input.tags) },
    },
  })

  if (scope === 'following' && tx.recurrence) {
    const recurring = tx.recurrence.kind === 'RECURRING'
    await prisma.transaction.updateMany({
      where: { recurrenceId: tx.recurrenceId, date: { gt: tx.date } },
      data: {
        description: v.description,
        categoryId: input.categoryId,
        ...(recurring ? { amountCents: v.cents } : {}),
      },
    })
    if (recurring) {
      await prisma.recurrence.update({
        where: { id: tx.recurrence.id },
        data: { description: v.description, categoryId: input.categoryId, amountCents: v.cents },
      })
    }
  }
  return done()
}

export async function deleteTransaction(id: number, scope: 'one' | 'following'): Promise<Result> {
  const tx = await prisma.transaction.findUnique({ where: { id }, include: { recurrence: true } })
  if (!tx) return fail('Lançamento não encontrado.')
  if (scope === 'following' && tx.recurrenceId && tx.recurrence) {
    await prisma.transaction.deleteMany({
      where: { recurrenceId: tx.recurrenceId, date: { gte: tx.date } },
    })
    if (tx.recurrence.kind === 'RECURRING') {
      await prisma.recurrence.update({
        where: { id: tx.recurrenceId },
        data: { endDate: new Date(tx.date.getTime() - 86_400_000) },
      })
    }
    const left = await prisma.transaction.count({ where: { recurrenceId: tx.recurrenceId } })
    if (left === 0) await prisma.recurrence.delete({ where: { id: tx.recurrenceId } })
  } else {
    await prisma.transaction.delete({ where: { id } })
  }
  return done()
}

export async function togglePaid(id: number): Promise<Result> {
  const tx = await prisma.transaction.findUnique({ where: { id } })
  if (!tx) return fail('Lançamento não encontrado.')
  await prisma.transaction.update({ where: { id }, data: { isPaid: !tx.isPaid } })
  return done()
}

export async function endRecurrence(id: number): Promise<Result> {
  const today = todayUtc()
  await prisma.transaction.deleteMany({ where: { recurrenceId: id, date: { gt: today } } })
  await prisma.recurrence.update({ where: { id }, data: { endDate: today } })
  return done()
}

export async function deleteRecurrence(id: number): Promise<Result> {
  await prisma.transaction.deleteMany({ where: { recurrenceId: id } })
  await prisma.recurrence.delete({ where: { id } })
  return done()
}

export async function createCategory(c: {
  name: string
  color: string
  kind: TxType
}): Promise<Result> {
  const name = c.name.trim()
  if (!name) return fail('Informe um nome.')
  if (await prisma.category.findUnique({ where: { name } })) return fail('Já existe uma categoria com esse nome.')
  await prisma.category.create({ data: { name, color: c.color, kind: c.kind } })
  return done()
}

export async function updateCategory(id: number, c: { name: string; color: string }): Promise<Result> {
  const name = c.name.trim()
  if (!name) return fail('Informe um nome.')
  const other = await prisma.category.findUnique({ where: { name } })
  if (other && other.id !== id) return fail('Já existe uma categoria com esse nome.')
  await prisma.category.update({ where: { id }, data: { name, color: c.color } })
  return done()
}

export async function deleteCategory(id: number): Promise<Result> {
  const [t, r] = await Promise.all([
    prisma.transaction.count({ where: { categoryId: id } }),
    prisma.recurrence.count({ where: { categoryId: id } }),
  ])
  if (t + r > 0) return fail(`Categoria em uso por ${t} lançamento(s) e ${r} recorrência(s). Mova-os antes de excluir.`)
  await prisma.category.delete({ where: { id } })
  return done()
}

export async function deleteTag(id: number): Promise<Result> {
  await prisma.tag.delete({ where: { id } })
  return done()
}
