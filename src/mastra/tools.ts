import { createTool } from '@mastra/core/tools'
import { z } from 'zod/v4'
import { prisma } from '@/server/db'
import { formatBRL } from '@/lib/money'
import { currentMonth, monthRange, toDateInput, todayUtc, formatDate } from '@/lib/dates'

function brl(cents: number) {
  return formatBRL(cents)
}

async function sum(where: Record<string, unknown>) {
  const r = await prisma.transaction.aggregate({ _sum: { amountCents: true }, where })
  return r._sum.amountCents ?? 0
}

export const consultarSaldo = createTool({
  id: 'consultarSaldo',
  description: 'Consulta o saldo atual (receitas pagas menos despesas pagas de todos os tempos).',
  execute: async () => {
    const [income, expense] = await Promise.all([
      sum({ type: 'INCOME', isPaid: true }),
      sum({ type: 'EXPENSE', isPaid: true }),
    ])
    const balance = income - expense
    return { saldo: brl(balance), receitas: brl(income), despesas: brl(expense), saldoCents: balance, receitasCents: income, despesasCents: expense }
  },
})

export const listarTransacoes = createTool({
  id: 'listarTransacoes',
  description: 'Lista transações financeiras com filtros opcionais. Retorna no máximo 20 resultados.',
  inputSchema: z.object({
    mes: z.string().optional().describe('Mês no formato YYYY-MM. Ex: 2026-10'),
    tipo: z.enum(['INCOME', 'EXPENSE']).optional().describe('Tipo: INCOME (receita) ou EXPENSE (despesa)'),
    categoriaId: z.number().int().optional().describe('ID da categoria'),
    status: z.enum(['paid', 'pending']).optional().describe('paid = pago, pending = pendente'),
    busca: z.string().optional().describe('Texto para buscar na descrição'),
    pagina: z.number().int().default(1).describe('Número da página'),
  }),
  execute: async ({ mes, tipo, categoriaId, status, busca, pagina }) => {
    const month = mes ?? currentMonth()
    const { start, end } = monthRange(month)
    const where: Record<string, unknown> = { date: { gte: start, lt: end } }
    if (tipo) where.type = tipo
    if (categoriaId) where.categoryId = categoriaId
    if (status === 'paid') where.isPaid = true
    if (status === 'pending') where.isPaid = false
    if (busca) where.description = { contains: busca }

    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true, tags: { select: { name: true } } },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: 20,
        skip: (pagina - 1) * 20,
      }),
      prisma.transaction.count({ where }),
    ])

    const transacoes = rows.map((t) => ({
      id: t.id,
      tipo: t.type === 'INCOME' ? 'Receita' : 'Despesa',
      valor: brl(t.amountCents),
      data: formatDate(t.date),
      descricao: t.description,
      categoria: t.category.name,
      pago: t.isPaid,
      tags: t.tags.map((tag) => tag.name),
      parcelado: t.installmentNo ? `${t.installmentNo}/${t.installmentTotal}` : null,
    }))

    return { transacoes, total, pagina, totalPaginas: Math.ceil(total / 20) }
  },
})

export const obterTransacao = createTool({
  id: 'obterTransacao',
  description: 'Obtém os detalhes de uma transação específica pelo ID.',
  inputSchema: z.object({
    id: z.number().int().describe('ID da transação'),
  }),
  execute: async ({ id }) => {
    const t = await prisma.transaction.findUnique({
      where: { id },
      include: { category: true, tags: { select: { name: true } }, recurrence: true },
    })
    if (!t) return { erro: 'Transação não encontrada.' }
    return {
      id: t.id,
      tipo: t.type === 'INCOME' ? 'Receita' : 'Despesa',
      valor: brl(t.amountCents),
      valorCents: t.amountCents,
      data: formatDate(t.date),
      dataIso: toDateInput(t.date),
      descricao: t.description,
      categoriaId: t.categoryId,
      categoria: t.category.name,
      pago: t.isPaid,
      tags: t.tags.map((tag) => tag.name),
      recorrencia: t.recurrence
        ? { id: t.recurrence.id, tipo: t.recurrence.kind, descricao: t.recurrence.description }
        : null,
      parcelado: t.installmentNo ? { numero: t.installmentNo, total: t.installmentTotal } : null,
    }
  },
})

export const criarTransacao = createTool({
  id: 'criarTransacao',
  description: 'Registra uma nova transação financeira (receita ou despesa). NUNCA crie duplicatas — se já tentou criar e recebeu confirmação, não repita.',
  inputSchema: z.object({
    tipo: z.enum(['INCOME', 'EXPENSE']).describe('INCOME para receita, EXPENSE para despesa'),
    valor: z.number().positive().describe('Valor em centavos (ex: 15000 = R$ 150,00)'),
    descricao: z.string().min(1).describe('Descrição da transação'),
    categoriaId: z.number().int().describe('ID da categoria'),
    data: z.string().optional().describe('Data no formato YYYY-MM-DD. Padrão: hoje'),
    pago: z.boolean().default(true).describe('Se já foi pago/recebido'),
  }),
  execute: async ({ tipo, valor, descricao, categoriaId, data, pago }) => {
    const cat = await prisma.category.findUnique({ where: { id: categoriaId } })
    if (!cat) return { erro: 'Categoria não encontrada.' }
    if (cat.kind !== tipo) return { erro: `Esta categoria é do tipo ${cat.kind === 'INCOME' ? 'Receita' : 'Despesa'}, incompatível com ${tipo === 'INCOME' ? 'Receita' : 'Despesa'}.` }

    const date = data ? new Date(`${data}T00:00:00Z`) : todayUtc()
    const tx = await prisma.transaction.create({
      data: { type: tipo, amountCents: valor, date, description: descricao.trim(), categoryId: categoriaId, isPaid: pago },
    })

    return {
      sucesso: true,
      id: tx.id,
      tipo: tipo === 'INCOME' ? 'Receita' : 'Despesa',
      valor: brl(valor),
      descricao: tx.description,
      data: formatDate(tx.date),
      pago: tx.isPaid,
    }
  },
})

export const atualizarTransacao = createTool({
  id: 'atualizarTransacao',
  description: 'Atualiza os dados de uma transação existente. Envie apenas os campos que deseja alterar.',
  inputSchema: z.object({
    id: z.number().int().describe('ID da transação a ser alterada'),
    valor: z.number().positive().optional().describe('Novo valor em centavos'),
    descricao: z.string().min(1).optional().describe('Nova descrição'),
    categoriaId: z.number().int().optional().describe('Nova categoria'),
    data: z.string().optional().describe('Nova data YYYY-MM-DD'),
    pago: z.boolean().optional().describe('Se está pago/recebido'),
  }),
  execute: async ({ id, valor, descricao, categoriaId, data, pago }) => {
    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing) return { erro: 'Transação não encontrada.' }

    const updateData: Record<string, unknown> = {}
    if (valor !== undefined) updateData.amountCents = valor
    if (descricao !== undefined) updateData.description = descricao.trim()
    if (categoriaId !== undefined) {
      const cat = await prisma.category.findUnique({ where: { id: categoriaId } })
      if (!cat) return { erro: 'Categoria não encontrada.' }
      if (cat.kind !== existing.type) return { erro: `Categoria incompatível com o tipo ${existing.type === 'INCOME' ? 'Receita' : 'Despesa'}.` }
      updateData.categoryId = categoriaId
    }
    if (data !== undefined) updateData.date = new Date(`${data}T00:00:00Z`)
    if (pago !== undefined) updateData.isPaid = pago

    if (Object.keys(updateData).length === 0) return { erro: 'Nenhum campo para alterar.' }

    await prisma.transaction.update({ where: { id }, data: updateData as never })

    const updated = await prisma.transaction.findUnique({ where: { id }, include: { category: true } })
    return {
      sucesso: true,
      id: updated!.id,
      tipo: updated!.type === 'INCOME' ? 'Receita' : 'Despesa',
      valor: brl(updated!.amountCents),
      descricao: updated!.description,
      data: formatDate(updated!.date),
      categoria: updated!.category.name,
      pago: updated!.isPaid,
    }
  },
})

export const excluirTransacao = createTool({
  id: 'excluirTransacao',
  description: 'Exclui permanentemente uma transação. Operação DESTRUTIVA — confirme com o usuário antes de executar.',
  inputSchema: z.object({
    id: z.number().int().describe('ID da transação a ser excluída'),
  }),
  execute: async ({ id }) => {
    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing) return { erro: 'Transação não encontrada.' }

    await prisma.transaction.delete({ where: { id } })
    return {
      sucesso: true,
      mensagem: `Transação "${existing.description}" (${brl(existing.amountCents)}) excluída permanentemente.`,
    }
  },
})

export const resumoMensal = createTool({
  id: 'resumoMensal',
  description: 'Retorna o resumo financeiro de um mês: receitas, despesas pagas e resultado.',
  inputSchema: z.object({
    mes: z.string().optional().describe('Mês YYYY-MM. Padrão: mês atual'),
  }),
  execute: async ({ mes }) => {
    const month = mes ?? currentMonth()
    const { start, end } = monthRange(month)
    const date = { gte: start, lt: end }

    const [income, expense] = await Promise.all([
      sum({ type: 'INCOME', date }),
      sum({ type: 'EXPENSE', date, isPaid: true }),
    ])

    const [paidIn, paidOut] = await Promise.all([
      sum({ type: 'INCOME', isPaid: true }),
      sum({ type: 'EXPENSE', isPaid: true }),
    ])

    return {
      mes: month,
      receitas: brl(income),
      despesas: brl(expense),
      resultado: brl(income - expense),
      saldoAtual: brl(paidIn - paidOut),
      receitasCents: income,
      despesasCents: expense,
      resultadoCents: income - expense,
      saldoCents: paidIn - paidOut,
    }
  },
})

export const despesasPorCategoria = createTool({
  id: 'despesasPorCategoria',
  description: 'Lista as despesas de um mês agrupadas por categoria, ordenadas por maior gasto.',
  inputSchema: z.object({
    mes: z.string().optional().describe('Mês YYYY-MM. Padrão: mês atual'),
  }),
  execute: async ({ mes }) => {
    const month = mes ?? currentMonth()
    const { start, end } = monthRange(month)

    const groups = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { type: 'EXPENSE', date: { gte: start, lt: end } },
      _sum: { amountCents: true },
    })

    const cats = await prisma.category.findMany({
      where: { id: { in: groups.map((g) => g.categoryId) } },
    })

    const resultado = groups
      .map((g) => {
        const c = cats.find((x) => x.id === g.categoryId)!
        return { categoria: c.name, cor: c.color, valor: brl(g._sum.amountCents ?? 0), cents: g._sum.amountCents ?? 0 }
      })
      .sort((a, b) => b.cents - a.cents)

    return { mes: month, categorias: resultado }
  },
})

export const contasPendentes = createTool({
  id: 'contasPendentes',
  description: 'Lista transações pendentes (não pagas) com vencimento futuro ou em atraso.',
  execute: async () => {
    const rows = await prisma.transaction.findMany({
      where: { isPaid: false },
      include: { category: true, tags: { select: { name: true } } },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    })

    const hoje = todayUtc()
    const transacoes = rows.map((t) => ({
      id: t.id,
      tipo: t.type === 'INCOME' ? 'Receita' : 'Despesa',
      valor: brl(t.amountCents),
      data: formatDate(t.date),
      descricao: t.description,
      categoria: t.category.name,
      status: t.date <= hoje ? 'Vencida' : 'A vencer',
      parcelado: t.installmentNo ? `${t.installmentNo}/${t.installmentTotal}` : null,
    }))

    const total = rows.reduce((acc, t) => acc + t.amountCents, 0)
    return { transacoes, total, totalFormatado: brl(total), quantidade: rows.length }
  },
})

export const listarCategorias = createTool({
  id: 'listarCategorias',
  description: 'Lista todas as categorias disponíveis com seus IDs.',
  execute: async () => {
    const categorias = await prisma.category.findMany({
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    })
    return {
      categorias: categorias.map((c) => ({
        id: c.id,
        nome: c.name,
        tipo: c.kind === 'INCOME' ? 'Receita' : 'Despesa',
        cor: c.color,
      })),
    }
  },
})

export const alternarPago = createTool({
  id: 'alternarPago',
  description: 'Marca uma transação como paga ou não paga (toggle).',
  inputSchema: z.object({
    id: z.number().int().describe('ID da transação'),
  }),
  execute: async ({ id }) => {
    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing) return { erro: 'Transação não encontrada.' }

    await prisma.transaction.update({ where: { id }, data: { isPaid: !existing.isPaid } })
    const novoStatus = !existing.isPaid ? 'Pago' : 'Pendente'
    return {
      sucesso: true,
      id: existing.id,
      descricao: existing.description,
      valor: brl(existing.amountCents),
      status: novoStatus,
      pago: !existing.isPaid,
    }
  },
})

export const fluxoCaixa = createTool({
  id: 'fluxoCaixa',
  description: 'Retorna o fluxo de caixa (receitas vs despesas) agrupado por dia, semana ou mês.',
  inputSchema: z.object({
    mes: z.string().optional().describe('Mês YYYY-MM. Padrão: mês atual'),
    granularidade: z.enum(['dia', 'mes']).default('dia').describe('Agrupamento: dia ou mes'),
  }),
  execute: async ({ mes, granularidade }) => {
    const month = mes ?? currentMonth()
    let start: Date
    let end: Date
    const buckets = new Map<string, { receitas: number; despesas: number }>()

    if (granularidade === 'mes') {
      const y = Number(month.slice(0, 4))
      start = new Date(Date.UTC(y, 0, 1))
      end = new Date(Date.UTC(y + 1, 0, 1))
      for (let i = 0; i < 12; i++) buckets.set(`${y}-${String(i + 1).padStart(2, '0')}`, { receitas: 0, despesas: 0 })
    } else {
      const { start: s, end: e } = monthRange(month)
      start = s; end = e
      const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
      for (let i = 1; i <= days; i++) {
        const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, i))
        buckets.set(toDateInput(d), { receitas: 0, despesas: 0 })
      }
    }

    const rows = await prisma.transaction.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true, type: true, amountCents: true },
    })

    for (const r of rows) {
      const key = granularidade === 'mes' ? toDateInput(r.date).slice(0, 7) : toDateInput(r.date)
      const b = buckets.get(key)
      if (!b) continue
      if (r.type === 'INCOME') b.receitas += r.amountCents
      else b.despesas += r.amountCents
    }

    const fluxo = [...buckets].map(([key, v]) => ({
      periodo: key,
      receitas: brl(v.receitas),
      despesas: brl(v.despesas),
      saldo: brl(v.receitas - v.despesas),
    }))

    return { mes: month, granularidade, fluxo }
  },
})

export const tools = {
  consultarSaldo,
  listarTransacoes,
  obterTransacao,
  criarTransacao,
  atualizarTransacao,
  excluirTransacao,
  resumoMensal,
  despesasPorCategoria,
  contasPendentes,
  listarCategorias,
  alternarPago,
  fluxoCaixa,
}