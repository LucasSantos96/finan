'use client'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { formatBRL } from '@/lib/money'

type P = { label: string; income: number; expense: number }

export function CashflowChart({ data }: { data: P[] }) {
  const empty = data.every((d) => d.income === 0 && d.expense === 0)
  if (empty) return <p className="grid h-64 place-items-center text-sm text-[var(--muted)]">Sem dados ainda.</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{ background: '#05070b', border: '1px solid var(--border)', borderRadius: 12 }}
          formatter={(v, name) => [formatBRL(Number(v)), name === 'income' ? 'Entradas' : 'Saídas']}
          labelStyle={{ color: 'var(--muted)' }}
        />
        <Bar dataKey="income" fill="var(--blue)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expense" fill="var(--orange)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
