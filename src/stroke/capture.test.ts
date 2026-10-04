import { describe, expect, it } from 'vitest'
import { addRawPoint, cancelStroke, createStroke, endStroke, MAX_POINT_GAP, MIN_POINT_SPACING } from './capture'

describe('mouse strokes', () => {
  it('keep points exactly where they were drawn', () => {
    const s = createStroke('mouse')
    for (const p of [{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 60 }]) addRawPoint(s, p)
    expect(s.points).toEqual([{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 60 }])
  })

  it('accept long jumps between pointer events from fast strokes', () => {
    const s = createStroke('mouse')
    addRawPoint(s, { x: 0, y: 0 })
    expect(addRawPoint(s, { x: MAX_POINT_GAP * 2, y: 0 })).not.toBeNull()
    expect(s.gapExceeded).toBe(false)
  })

  it('skip points closer than the minimum spacing', () => {
    const s = createStroke('mouse')
    addRawPoint(s, { x: 0, y: 0 })
    expect(addRawPoint(s, { x: MIN_POINT_SPACING / 2, y: 0 })).toBeNull()
    expect(s.points).toHaveLength(1)
  })
})

describe('webcam strokes', () => {
  it('smooth jittery points', () => {
    const s = createStroke('webcam')
    addRawPoint(s, { x: 100, y: 100 })
    expect(addRawPoint(s, { x: 110, y: 120 })).toEqual({ x: 105, y: 110 })
  })

  it('do not mistake steady fast movement for a jump', () => {
    const s = createStroke('webcam')
    for (let i = 0; i < 10; i++) expect(addRawPoint(s, { x: i * (MAX_POINT_GAP - 10), y: 0 })).not.toBeNull()
    expect(s.gapExceeded).toBe(false)
  })

  it('flag a tracking jump instead of connecting distant points', () => {
    const s = createStroke('webcam')
    addRawPoint(s, { x: 100, y: 100 })
    addRawPoint(s, { x: 110, y: 105 })
    const before = s.points.length
    expect(addRawPoint(s, { x: 100 + MAX_POINT_GAP + 50, y: 100 })).toBeNull()
    expect(s.gapExceeded).toBe(true)
    expect(s.points).toHaveLength(before)
  })

  it('ignore non-finite coordinates without poisoning the smoothing window', () => {
    const s = createStroke('webcam')
    expect(addRawPoint(s, { x: NaN, y: 10 })).toBeNull()
    expect(addRawPoint(s, { x: 10, y: Infinity })).toBeNull()
    expect(addRawPoint(s, { x: 10, y: 10 })).toEqual({ x: 10, y: 10 })
  })
})

it('cancel clears points and the gap flag', () => {
  const s = createStroke('webcam')
  addRawPoint(s, { x: 0, y: 0 })
  s.gapExceeded = true
  cancelStroke(s)
  expect(s).toMatchObject({ points: [], gapExceeded: false, active: false })
  expect(addRawPoint(s, { x: 5, y: 5 })).toBeNull()
})

it('endStroke returns a copy of the points', () => {
  const s = createStroke('mouse')
  addRawPoint(s, { x: 1, y: 1 })
  addRawPoint(s, { x: 10, y: 10 })
  const pts = endStroke(s)
  pts.push({ x: 99, y: 99 })
  expect(s.points).toHaveLength(2)
})
