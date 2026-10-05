'use client'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatBRL } from '@/lib/money'

type P = { name: string; color: string; cents: number }

export function CategoryDonut({ data }: { data: P[] }) {
  if (data.length === 0)
    return <p className="grid h-48 place-items-center text-sm text-[var(--muted)]">Sem saídas neste mês.</p>
  const total = data.reduce((a, d) => a + d.cents, 0)
  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="cents" nameKey="name" innerRadius={55} outerRadius={80} stroke="none" paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#05070b', border: '1px solid var(--border)', borderRadius: 12 }}
            itemStyle={{ color: 'var(--text)' }}
            formatter={(v) => formatBRL(Number(v))}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="tabular-nums text-[var(--muted)]">
              {Math.round((d.cents / total) * 100)}% · {formatBRL(d.cents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
