import { describe, expect, it } from 'vitest'
import { recognizeStroke } from './recognize'
import { addRawPoint, createStroke } from '../stroke/capture'
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
} from '../test/strokes'

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

  it('recognizes a quick flick with only a few pointer events as a line', () => {
    expect(recognizeStroke([{ x: 100, y: 100 }, { x: 400, y: 300 }]).primary?.kind).toBe('line')
    expect(recognizeStroke([{ x: 100, y: 100 }, { x: 110, y: 104 }]).primary).toBeNull()
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

describe('rectangles drawn with a mouse', () => {
  /** Outline sampled every `step` pixels and passed through mouse stroke capture. */
  function rectanglePath(x: number, y: number, w: number, h: number, step: number) {
    const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]] as const
    const points: { x: number; y: number }[] = []
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = corners[i]!
      const [bx, by] = corners[i + 1]!
      const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / step))
      for (let k = 0; k < n; k++) points.push({ x: ax + ((bx - ax) * k) / n, y: ay + ((by - ay) * k) / n })
    }
    const stroke = createStroke('mouse')
    for (const p of [...points, { x, y }]) addRawPoint(stroke, p)
    return stroke.points
  }

  it.each([[260, 60], [300, 40], [500, 80], [400, 30]])('recognizes a thin %ix%i platform outline', (w, h) => {
    for (const step of [6, 12, 26]) expect(recognizeStroke(rectanglePath(150, 450, w, h, step)).primary?.kind).toBe('rectangle')
  })

  it('recognizes a square drawn with sparse pointer events', () => {
    expect(recognizeStroke(rectanglePath(150, 150, 200, 200, 26)).primary?.kind).toBe('square')
  })
})
