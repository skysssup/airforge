import { describe, expect, it } from 'vitest'
import {
  addRawPoint,
  cancelStroke,
  createStroke,
  endStroke,
  MAX_POINT_GAP,
} from './capture'

describe('stroke capture', () => {
  it('smooths and accepts nearby points', () => {
    const s = createStroke('t1', 'mouse')
    expect(addRawPoint(s, { x: 10, y: 10 })).not.toBeNull()
    expect(addRawPoint(s, { x: 20, y: 12 })).not.toBeNull()
    expect(s.points.length).toBeGreaterThanOrEqual(2)
    expect(s.gapExceeded).toBe(false)
  })

  it('flags gapExceeded instead of connecting a teleport jump', () => {
    const s = createStroke('t2', 'webcam')
    addRawPoint(s, { x: 100, y: 100 })
    addRawPoint(s, { x: 110, y: 105 })
    const before = s.points.length
    const result = addRawPoint(s, { x: 100 + MAX_POINT_GAP + 50, y: 100 })
    expect(result).toBeNull()
    expect(s.gapExceeded).toBe(true)
    expect(s.points.length).toBe(before)
  })

  it('cancel clears points and gap flag', () => {
    const s = createStroke('t3', 'webcam')
    addRawPoint(s, { x: 0, y: 0 })
    s.gapExceeded = true
    cancelStroke(s)
    expect(s.points).toHaveLength(0)
    expect(s.gapExceeded).toBe(false)
    expect(s.active).toBe(false)
  })

  it('endStroke returns a copy of points', () => {
    const s = createStroke('t4', 'mouse')
    addRawPoint(s, { x: 1, y: 1 })
    addRawPoint(s, { x: 10, y: 10 })
    const pts = endStroke(s)
    expect(pts.length).toBe(s.points.length)
    pts.push({ x: 99, y: 99 })
    expect(s.points.find((p) => p.x === 99)).toBeUndefined()
  })
})
