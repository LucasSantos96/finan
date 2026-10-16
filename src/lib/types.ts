export type TxType = 'INCOME' | 'EXPENSE'

export type TxRow = {
  id: number
  type: TxType
  amountCents: number
  date: string // YYYY-MM-DD
  description: string
  categoryId: number
  categoryName: string
  categoryColor: string
  isPaid: boolean
  tags: string[]
  recurrenceId: number | null
  installmentNo: number | null
  installmentTotal: number | null
}

export type CategoryOption = { id: number; name: string; color: string; kind: TxType }

export type RecurrenceRow = {
  id: number
  kind: 'INSTALLMENT' | 'RECURRING'
  type: TxType
  description: string
  amountCents: number
  categoryName: string
  categoryColor: string
  endDate: string | null
  total: number
  pendingCount: number
  pendingCents: number
  nextDate: string | null
}
