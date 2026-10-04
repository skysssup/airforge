import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VIEW,
  landmarkToScreen,
  mirrorNormalized,
  screenToWorld,
  worldToScreen,
} from './transforms'

describe('coordinate transforms', () => {
  it('maps the screen center to x = 0 at the view center height', () => {
    const w = screenToWorld({ x: DEFAULT_VIEW.width / 2, y: DEFAULT_VIEW.height / 2 }, DEFAULT_VIEW)
    expect(w.x).toBeCloseTo(0, 5)
    expect(w.y).toBeCloseTo(DEFAULT_VIEW.centerY, 5)
    expect(w.z).toBe(0)
  })

  it('maps top-left screen to +y / -x world', () => {
    const w = screenToWorld({ x: 0, y: 0 }, DEFAULT_VIEW)
    expect(w.x).toBeCloseTo(-DEFAULT_VIEW.worldHalfWidth, 5)
    expect(w.y).toBeCloseTo(DEFAULT_VIEW.centerY + DEFAULT_VIEW.worldHalfHeight, 5)
  })

  it('roundtrips screen ↔ world', () => {
    const s0 = { x: 320, y: 180 }
    const w = screenToWorld(s0, DEFAULT_VIEW)
    const s1 = worldToScreen(w, DEFAULT_VIEW)
    expect(s1.x).toBeCloseTo(s0.x, 4)
    expect(s1.y).toBeCloseTo(s0.y, 4)
  })

  it('mirrors landmarks for selfie view', () => {
    expect(mirrorNormalized({ x: 0.25, y: 0.5 })).toEqual({ x: 0.75, y: 0.5 })
    const s = landmarkToScreen({ x: 0.25, y: 0.5 }, DEFAULT_VIEW, true)
    expect(s.x).toBeCloseTo(0.75 * DEFAULT_VIEW.width, 5)
    expect(s.y).toBeCloseTo(0.5 * DEFAULT_VIEW.height, 5)
  })
})
