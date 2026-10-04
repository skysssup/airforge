import { describe, expect, it } from 'vitest'
import type { BufferAttribute } from 'three'
import { TRAIL_OPACITY, TRAIL_SECONDS, TrailRibbon } from './trail'

const PIXEL = 0.01
const alphaAt = (trail: TrailRibbon, point: number) => (trail.geometry.getAttribute('color') as BufferAttribute).getW(point * 2)

describe('ball trail', () => {
  it('keeps only the last TRAIL_SECONDS of the path, newest point opaque', () => {
    const trail = new TrailRibbon()
    const step = 1 / 60
    for (let i = 0; i < 120; i++) trail.add(i * 0.05, 0, step, PIXEL)
    expect(trail.length).toBe(Math.floor(TRAIL_SECONDS / step) + 1)
    expect(trail.geometry.drawRange.count).toBe((trail.length - 1) * 6)
    expect(alphaAt(trail, trail.length - 1)).toBeCloseTo(TRAIL_OPACITY, 5)
    expect(alphaAt(trail, 0)).toBeLessThan(0.01)
  })

  it('does not add points while the ball rests, and the trail fades away', () => {
    const trail = new TrailRibbon()
    trail.add(0, 0, 0.1, PIXEL)
    trail.add(1, 0, 0.1, PIXEL)
    for (let i = 0; i < 10; i++) trail.add(1, PIXEL / 2, 0.1, PIXEL)
    expect(trail.length).toBe(1)
    expect(trail.geometry.drawRange.count).toBe(0)
  })

  it('draws a ribbon of constant screen width around the path', () => {
    const trail = new TrailRibbon()
    trail.add(0, 0, 0, PIXEL)
    trail.add(1, 0, 0, PIXEL)
    const position = trail.geometry.getAttribute('position') as BufferAttribute
    const width = position.getY(2) - position.getY(3)
    expect(width).toBeCloseTo(2 * PIXEL, 6)
  })
})
