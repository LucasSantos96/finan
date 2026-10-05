'use client'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBRL } from '@/lib/money'

type P = {
  key: string
  label: string
  income: number
  expense: number
  incomePaid: number
  incomePending: number
  expensePaid: number
  expensePending: number
}

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const tickBRL = (cents: number) => (cents === 0 ? '0' : compact.format(cents / 100))

type TipProps = {
  active?: boolean
  label?: string
  payload?: { payload: P }[]
}

function Tip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const net = p.incomePaid - p.expensePaid
  const rows = [
    { name: 'Recebido', value: formatBRL(p.incomePaid), color: 'var(--blue)' },
    { name: 'A receber', value: formatBRL(p.incomePending), color: 'var(--blue)', pending: true },
    { name: 'Pago', value: formatBRL(p.expensePaid), color: 'var(--orange)' },
    { name: 'A pagar', value: formatBRL(p.expensePending), color: 'var(--orange)', pending: true },
  ]
  return (
    <div className="min-w-44 rounded-xl border border-[var(--border)] bg-[#05070b]/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-2 font-medium capitalize text-[var(--muted)]">{label}</p>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-[var(--muted)]">
              <span
                className="size-2 rounded-[3px]"
                style={r.pending ? { border: `1px solid ${r.color}` } : { background: r.color }}
              />
              {r.name}
            </span>
            <span className="tabular-nums text-[var(--text)]">{r.value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-2">
        <span className="text-[var(--muted)]">Resultado realizado</span>
        <span className={`font-semibold tabular-nums ${net < 0 ? 'text-[var(--orange-2)]' : 'text-[var(--blue-2)]'}`}>
          {net > 0 ? '+' : ''}
          {formatBRL(net)}
        </span>
      </div>
    </div>
  )
}

export function CashflowChart({ data, todayKey }: { data: P[]; todayKey?: string }) {
  const empty = data.every((d) => d.income === 0 && d.expense === 0)
  if (empty)
    return (
      <div className="stripes grid h-64 place-items-center rounded-2xl border border-dashed border-[var(--border)] text-center">
        <div>
          <p className="text-sm text-[var(--text)]">Nada lançado neste período</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Entradas e saídas aparecem aqui assim que você registrar.</p>
        </div>
      </div>
    )
  const today = todayKey ? data.find((d) => d.key === todayKey) : undefined
  const dense = data.length > 14
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={dense ? 1 : 4} barCategoryGap={dense ? '18%' : '28%'} margin={{ top: 8, right: 0, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="cf-income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue-2)" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity={0.55} />
          </linearGradient>
          <linearGradient id="cf-expense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--orange-2)" />
            <stop offset="100%" stopColor="var(--orange)" stopOpacity={0.55} />
          </linearGradient>
          <pattern id="cf-income-pending" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--blue)" fillOpacity={0.12} />
            <rect width="2" height="6" fill="var(--blue-2)" fillOpacity={0.7} />
          </pattern>
          <pattern id="cf-expense-pending" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--orange)" fillOpacity={0.12} />
            <rect width="2" height="6" fill="var(--orange-2)" fillOpacity={0.7} />
          </pattern>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          tick={{ fill: 'var(--muted)', fontSize: 11 }}
          interval={dense ? 'preserveStartEnd' : 0}
          minTickGap={12}
        />
        <YAxis axisLine={false} tickLine={false} width={44} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={tickBRL} tickCount={5} />
        <Tooltip content={<Tip />} cursor={{ fill: 'rgb(255 255 255 / 0.04)', radius: 6 }} />
        {today && (
          <ReferenceLine
            x={today.label}
            stroke="var(--muted)"
            strokeDasharray="2 4"
            label={{ value: 'hoje', position: 'insideTopRight', fill: 'var(--muted)', fontSize: 10 }}
          />
        )}
        <Bar dataKey="incomePaid" stackId="in" fill="url(#cf-income)" maxBarSize={dense ? 9 : 22} />
        <Bar dataKey="incomePending" stackId="in" fill="url(#cf-income-pending)" stroke="var(--blue-2)" strokeOpacity={0.5} radius={[5, 5, 0, 0]} maxBarSize={dense ? 9 : 22} />
        <Bar dataKey="expensePaid" stackId="out" fill="url(#cf-expense)" maxBarSize={dense ? 9 : 22} />
        <Bar dataKey="expensePending" stackId="out" fill="url(#cf-expense-pending)" stroke="var(--orange-2)" strokeOpacity={0.5} radius={[5, 5, 0, 0]} maxBarSize={dense ? 9 : 22} />
      </BarChart>
    </ResponsiveContainer>
  )
}
