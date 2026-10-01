import { describe, expect, it } from 'vitest'

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

describe('object count wording', () => {
  it('uses singular and plural correctly', () => {
    expect(plural(1, 'ramp', 'ramps')).toBe('1 ramp')
    expect(plural(2, 'ball', 'balls')).toBe('2 balls')
    expect(plural(0, 'platform', 'platforms')).toBe('0 platforms')
  })
})
