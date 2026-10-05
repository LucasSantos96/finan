import { describe, expect, it } from 'vitest'
import { maskBRL, parseBRL } from './money'

describe('maskBRL', () => {
  it.each([
    ['', ''],
    ['abc', ''],
    ['0', ''],
    ['1', '0,01'],
    ['12', '0,12'],
    ['123', '1,23'],
    ['100000', '1.000,00'],
    ['1234567', '12.345,67'],
    ['1.000,00', '1.000,00'],
    ['R$ 9,90', '9,90'],
    ['0012', '0,12'],
  ])('masks %j as %j', (input, out) => {
    expect(maskBRL(input)).toBe(out)
  })

  it('round-trips with parseBRL', () => {
    expect(parseBRL(maskBRL('100000'))).toBe(100000)
    expect(parseBRL(maskBRL('1234567'))).toBe(1234567)
  })
})

describe('parseBRL', () => {
  it.each([
    ['1.234,56', 123456],
    ['12,5', 1250],
    ['12.5', 1250],
    ['12', 1200],
    ['1.234', 123400],
    ['R$ 9,90', 990],
    ['0,01', 1],
  ])('parses %s', (input, cents) => {
    expect(parseBRL(input)).toBe(cents)
  })

  it.each(['', '  ', 'abc', '-5', '0', '1,2,3', '12,345'])('rejects %j', (input) => {
    expect(parseBRL(input)).toBeNull()
  })
})
