import { describe, expect, it } from 'vitest'
import { copyOf, pivotOf, snapMove, transformObject } from './transform'
import type { BallObject, PlatformObject, RampObject } from './objects'

const ramp: RampObject = { id: 'r', kind: 'ramp', createdAt: 0, start: { x: -2, y: 1, z: 0 }, end: { x: 2, y: -1, z: 0 }, width: 0.28, thickness: 0.35 }
const platform: PlatformObject = { id: 'p', kind: 'platform', createdAt: 0, center: { x: 1, y: -2, z: 0 }, halfExtents: { x: 1, y: 0.12, z: 0.2 }, rotationZ: 0.1 }
const ball: BallObject = { id: 'b', kind: 'ball', createdAt: 0, position: { x: 0, y: 3, z: 0 }, radius: 0.35, dynamic: true, releasedFrom: { x: 0, y: 4, z: 0 } }

describe('transforms', () => {
  it('rotates a ramp around its midpoint without changing its length, then moves it', () => {
    const turned = transformObject(ramp, { dx: 1, dy: 2, angle: Math.PI / 2 }) as RampObject
    expect(pivotOf(turned).x).toBeCloseTo(1)
    expect(pivotOf(turned).y).toBeCloseTo(2)
    expect(turned.start.x).toBeCloseTo(0)
    expect(turned.start.y).toBeCloseTo(0)
    expect(turned.end.x).toBeCloseTo(2)
    expect(turned.end.y).toBeCloseTo(4)
    expect(Math.hypot(turned.end.x - turned.start.x, turned.end.y - turned.start.y)).toBeCloseTo(Math.hypot(4, 2))
  })

  it('turns a platform about its center and moves a ball without rotating it', () => {
    expect(transformObject(platform, { dx: -1, dy: 0.5, angle: 0.2 })).toMatchObject({ center: { x: 0, y: -1.5 }, rotationZ: 0.1 + 0.2 })
    expect(transformObject(ball, { dx: 1, dy: -1, angle: 1 })).toMatchObject({ position: { x: 1, y: 2, z: 0 } })
  })

  it('snaps a move so the pivot lands on the grid', () => {
    const { dx, dy } = snapMove(platform, 0.3, 0.2, 0.5)
    expect(platform.center.x + dx).toBeCloseTo(1.5)
    expect(platform.center.y + dy).toBeCloseTo(-2)
  })

  it('copies with a fresh id and an offset; a copied ball waits for Drop', () => {
    const copy = copyOf(ball, 0.6, -0.6) as BallObject
    expect(copy.id).not.toBe(ball.id)
    expect(copy.position).toEqual({ x: 0.6, y: 2.4, z: 0 })
    expect(copy.dynamic).toBe(false)
    expect(copy).not.toHaveProperty('releasedFrom')
    expect(copyOf(ramp, 1, 0)).toMatchObject({ kind: 'ramp', start: { x: -1, y: 1 }, end: { x: 3, y: -1 } })
    expect(ramp.start).toEqual({ x: -2, y: 1, z: 0 })
  })
})
