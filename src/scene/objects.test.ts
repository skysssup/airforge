import { describe, expect, it } from 'vitest'
import { objectFromRecognition, createBallAt, topSurfaceY } from './objects'
import { recognizeStroke } from '../shapes/recognize'
import { cleanCircle, cleanDiagonalLine, cleanRectangle } from '../fixtures/strokes'
import { BALL_RADIUS, SPAWN_CLEARANCE } from '../physics/params'
import { DEFAULT_VIEW } from '../coords/transforms'

describe('object creation from recognition', () => {
  it('creates ramp from line', () => {
    const rec = recognizeStroke(cleanDiagonalLine())!
    const obj = objectFromRecognition(rec.primary!, DEFAULT_VIEW, false, [])
    expect(obj?.kind).toBe('ramp')
    if (obj?.kind === 'ramp') {
      expect(obj.start.x).not.toBe(obj.end.x)
    }
  })

  it('creates ball from circle', () => {
    const rec = recognizeStroke(cleanCircle())!
    const obj = objectFromRecognition(rec.primary!, DEFAULT_VIEW, false, [])
    expect(obj?.kind).toBe('ball')
  })

  it('creates platform from rectangle', () => {
    const rec = recognizeStroke(cleanRectangle())!
    const obj = objectFromRecognition(rec.primary!, DEFAULT_VIEW, false, [])
    expect(obj?.kind).toBe('platform')
  })

  it('never spawns ball inside platform (spawn offset)', () => {
    const platform = {
      id: 'p1',
      kind: 'platform' as const,
      createdAt: 0,
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 2, y: 0.2, z: 0.2 },
      rotationZ: 0,
    }
    const ball = createBallAt({ x: 0, y: 0, z: 0 }, [platform], false)!
    const top = topSurfaceY([platform], 0)!
    expect(ball.position.y).toBeGreaterThanOrEqual(top + BALL_RADIUS + SPAWN_CLEARANCE - 1e-6)
  })
  it('preserves tilted platform rotation instead of flattening', () => {
    // Axis-aligned AABB of a tilted rect would zero rotation; we keep edge angle.
    const tilted = [
      { x: 200, y: 200 },
      { x: 320, y: 240 },
      { x: 300, y: 300 },
      { x: 180, y: 260 },
    ]
    const candidate = {
      kind: 'rectangle' as const,
      quality: 0.95,
      params: { corners: tilted },
      metrics: {},
    }
    const obj = objectFromRecognition(candidate as never, DEFAULT_VIEW, false, [])
    expect(obj?.kind).toBe('platform')
    if (obj?.kind === 'platform') {
      expect(Math.abs(obj.rotationZ)).toBeGreaterThan(0.15)
      const top = topSurfaceY([obj], obj.center.x)
      expect(top).not.toBeNull()
      const ball = createBallAt({ x: obj.center.x, y: obj.center.y, z: 0 }, [obj], false)!
      expect(ball.position.y).toBeGreaterThanOrEqual((top as number) + SPAWN_CLEARANCE - 1e-6)
    }
  })


})
