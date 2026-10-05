import { prisma } from './db'
import { ensureGenerated } from './recurrence'

const DEFAULTS: { name: string; color: string; kind: 'INCOME' | 'EXPENSE' }[] = [
  { name: 'Salário', color: '#3B82F6', kind: 'INCOME' },
  { name: 'Freelance', color: '#60A5FA', kind: 'INCOME' },
  { name: 'Investimentos', color: '#38BDF8', kind: 'INCOME' },
  { name: 'Alimentação', color: '#F59E0B', kind: 'EXPENSE' },
  { name: 'Moradia', color: '#FB923C', kind: 'EXPENSE' },
  { name: 'Transporte', color: '#F97316', kind: 'EXPENSE' },
  { name: 'Lazer', color: '#FBBF24', kind: 'EXPENSE' },
  { name: 'Saúde', color: '#EF8354', kind: 'EXPENSE' },
  { name: 'Assinaturas', color: '#D97706', kind: 'EXPENSE' },
  { name: 'Outros', color: '#94A3B8', kind: 'EXPENSE' },
]

export async function bootstrap(): Promise<void> {
  try {
    if ((await prisma.category.count()) === 0) {
      await prisma.category.createMany({ data: DEFAULTS })
    }
  } catch {
    // concurrent first load already seeded (unique name)
  }
  await ensureGenerated(prisma)
}
