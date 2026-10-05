import { describe, expect, it } from 'vitest'
import { parseBRL } from './money'

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
