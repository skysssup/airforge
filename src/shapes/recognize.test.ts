import { describe, expect, it } from 'vitest'
import { recognizeStroke } from './recognize'
import {
  ambiguousScribble,
  cleanCircle,
  cleanDiagonalLine,
  cleanRectangle,
  cleanSquare,
  noisyCircle,
  noisyLine,
  openArc,
  tinyStroke,
} from '../fixtures/strokes'

describe('shape recognition', () => {
  it('detects clean diagonal as line', () => {
    const r = recognizeStroke(cleanDiagonalLine())
    expect(r.primary?.kind).toBe('line')
    expect(r.primary!.quality).toBeGreaterThan(0.5)
  })

  it('detects noisy line as line', () => {
    const r = recognizeStroke(noisyLine())
    expect(r.primary?.kind).toBe('line')
  })

  it('rejects tiny strokes', () => {
    const r = recognizeStroke(tinyStroke())
    expect(r.primary).toBeNull()
  })

  it('detects clean circle', () => {
    const r = recognizeStroke(cleanCircle())
    expect(r.primary?.kind).toBe('circle')
  })

  it('detects noisy circle', () => {
    const r = recognizeStroke(noisyCircle())
    expect(r.primary?.kind).toBe('circle')
  })

  it('rejects open arc as circle', () => {
    const r = recognizeStroke(openArc())
    expect(r.primary?.kind).not.toBe('circle')
  })

  it('detects rectangle', () => {
    const r = recognizeStroke(cleanRectangle())
    expect(r.primary?.kind).toBe('rectangle')
  })

  it('detects square', () => {
    const r = recognizeStroke(cleanSquare())
    expect(r.primary?.kind).toBe('square')
  })

  it('ambiguous scribble has no confident primary or is non-line', () => {
    const r = recognizeStroke(ambiguousScribble())
    // scribble should not be a clean line
    expect(r.primary?.kind).not.toBe('line')
  })

  it('exposes geometric quality metrics (not fake confidence)', () => {
    const r = recognizeStroke(cleanDiagonalLine())
    expect(r.primary?.metrics.deviationRatio).toBeTypeOf('number')
    expect(r.primary!.quality).toBeGreaterThanOrEqual(0)
    expect(r.primary!.quality).toBeLessThanOrEqual(1)
  })
})
