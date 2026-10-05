const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatBRL(cents: number): string {
  return brl.format(cents / 100)
}

/** Splits "R$ 1.234,56" into integer part ("R$ 1.234") and decimals ("56"). */
export function splitBRL(cents: number): { int: string; dec: string } {
  const [int, dec] = formatBRL(cents).split(',')
  return { int, dec }
}

/** Live input mask: digits fill from the right, "123456" -> "1.234,56". Empty if no non-zero digits. */
export function maskBRL(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12)
  if (!digits) return ''
  const padded = digits.padStart(3, '0')
  const int = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${int},${padded.slice(-2)}`
}

/** "1.234,56" | "12,5" | "12.5" | "12" -> cents. Null if invalid or <= 0. */
export function parseBRL(input: string): number | null {
  let s = input.replace(/R\$/gi, '').replace(/\s/g, '')
  if (!s) return null
  if (s.includes(',')) {
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(s)) return null
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    // decimal point, e.g. 12.5
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s) || /^\d+$/.test(s)) {
    s = s.replace(/\./g, '')
  } else {
    return null
  }
  const cents = Math.round(Number(s) * 100)
  return Number.isFinite(cents) && cents > 0 ? cents : null
}
