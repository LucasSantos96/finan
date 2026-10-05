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
