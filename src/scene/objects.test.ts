import { describe, expect, it } from 'vitest'
import { objectFromRecognition, createBallAt, topSurfaceY, clearBallFromColliders, hitTest, curveCenterline, liftClearOfShapes, ballOverlapsShapes, type CurveObject, type PlatformObject, type RampObject } from './objects'
import { recognizeStroke } from '../shapes/recognize'
import { cleanCircle, cleanDiagonalLine, cleanRectangle, uArc } from '../test/strokes'
import { BALL_RADIUS, CURVE_RADIUS, MAX_BALL_RADIUS, MAX_CURVE_POINTS, MAX_WORLD_COORDINATE, MIN_BALL_RADIUS, MIN_CURVE_SEGMENT, SPAWN_CLEARANCE, ballMinY } from '../physics/params'
import { DEFAULT_VIEW } from '../coords/transforms'

const platform: PlatformObject = {
  id: 'p1', kind: 'platform', createdAt: 0,
  center: { x: 0, y: 0, z: 0 }, halfExtents: { x: 2, y: 0.2, z: 0.2 }, rotationZ: 0,
}

describe('object creation from recognition', () => {
  it('creates a ramp, ball, and platform from clean strokes', () => {
    const create = (points: { x: number; y: number }[]) => objectFromRecognition(recognizeStroke(points).primary!, DEFAULT_VIEW)
    expect(create(cleanDiagonalLine())?.kind).toBe('ramp')
    expect(create(cleanCircle())?.kind).toBe('ball')
    expect(create(cleanRectangle())?.kind).toBe('platform')
  })

  it('sizes a drawn ball to the circle within the allowed radius range', () => {
    const ball = (radiusPx: number) => objectFromRecognition(
      { kind: 'circle', quality: 1, metrics: {}, params: { cx: 640, cy: 200, radius: radiusPx } },
      DEFAULT_VIEW,
    )
    const pxPerUnit = DEFAULT_VIEW.height / (2 * DEFAULT_VIEW.worldHalfHeight)
    const half = ball(pxPerUnit * 0.5)
    expect(half?.kind).toBe('ball')
    expect(half?.kind === 'ball' && half.radius).toBeCloseTo(0.5, 9)
    expect(ball(1)).toMatchObject({ radius: MIN_BALL_RADIUS })
    expect(ball(10_000)).toMatchObject({ radius: MAX_BALL_RADIUS })
  })

  it('rejects drawn coordinates outside the import safety bounds', () => {
    const view = { ...DEFAULT_VIEW, worldHalfWidth: MAX_WORLD_COORDINATE * 2 }
    expect(objectFromRecognition({
      kind: 'line', quality: 1, metrics: {},
      params: { x1: 0, y1: 100, x2: 100, y2: 200 },
    }, view)).toBeNull()
    expect(createBallAt({ x: MAX_WORLD_COORDINATE + 1, y: 1, z: 0 })).toBeNull()
  })

  it('rejects platforms larger than the import size limit', () => {
    expect(objectFromRecognition({
      kind: 'rectangle', quality: 1, metrics: {},
      params: { corners: [{ x: 0, y: 0 }, { x: 1280, y: 0 }, { x: 1280, y: 100 }, { x: 0, y: 100 }] },
    }, { ...DEFAULT_VIEW, worldHalfWidth: 100 })).toBeNull()
  })

  it('keeps the tilt of a rotated rectangle', () => {
    const obj = objectFromRecognition({
      kind: 'rectangle', quality: 0.95, metrics: {},
      params: { corners: [{ x: 200, y: 200 }, { x: 320, y: 240 }, { x: 300, y: 300 }, { x: 180, y: 260 }] },
    }, DEFAULT_VIEW)
    expect(obj?.kind).toBe('platform')
    if (obj?.kind !== 'platform') return
    expect(Math.abs(obj.rotationZ)).toBeGreaterThan(0.15)
    const ball = createBallAt({ x: obj.center.x, y: obj.center.y, z: 0 }, [obj])!
    expect(ball.position.y).toBeGreaterThanOrEqual(topSurfaceY([obj], obj.center.x)! + SPAWN_CLEARANCE - 1e-6)
  })
})

describe('spawn clearance', () => {
  it('never spawns a ball inside a platform', () => {
    const ball = createBallAt({ x: 0, y: 0, z: 0 }, [platform])!
    expect(ball.position.y).toBeGreaterThanOrEqual(topSurfaceY([platform], 0)! + BALL_RADIUS + SPAWN_CLEARANCE - 1e-6)
  })

  it('lifts a ball clear of a near-vertical ramp', () => {
    const ramp: RampObject = {
      id: 'r-vert', kind: 'ramp', createdAt: 0,
      start: { x: 0, y: -2, z: 0 }, end: { x: 0.05, y: 2, z: 0 }, width: 0.28, thickness: 0.35,
    }
    const ball = createBallAt({ x: 0, y: 0, z: 0 }, [ramp])!
    const top = topSurfaceY([ramp], 0)!
    expect(top).toBeGreaterThan(2)
    expect(ball.position.y).toBeGreaterThanOrEqual(top + BALL_RADIUS + SPAWN_CLEARANCE - 1e-6)
  })

  it('lifts a ball above the floor', () => {
    expect(clearBallFromColliders({ x: 0, y: -10, z: 0 }, BALL_RADIUS, []).y).toBeCloseTo(ballMinY(BALL_RADIUS))
  })

  it('marks a ball dropped straight away with its release point', () => {
    const ball = createBallAt({ x: 1, y: 2, z: 0 }, [], true)!
    expect(ball.releasedFrom).toEqual(ball.position)
  })
})

describe('curves', () => {
  const dip: CurveObject = {
    id: 'dip', kind: 'curve', createdAt: 0, radius: CURVE_RADIUS,
    points: [{ x: -3, y: 2, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 3, y: 2, z: 0 }],
  }

  it('turns a drawn bend into a smooth track that keeps its ends', () => {
    const stroke = uArc()
    const curve = objectFromRecognition(recognizeStroke(stroke).primary!, DEFAULT_VIEW) as CurveObject
    expect(curve.kind).toBe('curve')
    expect(curve.radius).toBe(CURVE_RADIUS)
    const start = objectFromRecognition({ kind: 'line', quality: 1, metrics: {}, params: { x1: stroke[0]!.x, y1: stroke[0]!.y, x2: stroke.at(-1)!.x, y2: stroke.at(-1)!.y } }, DEFAULT_VIEW) as RampObject
    expect(curve.points[0]).toEqual(start.start)
    expect(curve.points.at(-1)).toEqual(start.end)
    const gaps = curve.points.slice(1).map((p, i) => Math.hypot(p.x - curve.points[i]!.x, p.y - curve.points[i]!.y))
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(MIN_CURVE_SEGMENT / 2)
    expect(curve.points.length).toBeLessThanOrEqual(MAX_CURVE_POINTS)
  })

  it('caps a long, wiggly path at the point limit and ignores a path too short to be a track', () => {
    const spiral = Array.from({ length: 4000 }, (_, i) => ({ x: Math.cos(i / 60) * (1 + i / 800), y: Math.sin(i / 60) * (1 + i / 800), z: 0 }))
    const points = curveCenterline(spiral)!
    expect(points.length).toBeLessThanOrEqual(MAX_CURVE_POINTS)
    expect(points.at(-1)).toEqual({ ...spiral.at(-1)!, z: 0 })
    expect(curveCenterline([{ x: 0, y: 0, z: 0 }, { x: 0.3, y: 0, z: 0 }])).toBeNull()
  })

  it('is hit along its length, and lifts a ball placed on it just clear', () => {
    expect(hitTest([dip], { x: 0, y: 0.1, z: 0 }, 0)).toBe(dip)
    expect(hitTest([dip], { x: 0, y: 1, z: 0 }, 0.2)).toBeNull()
    expect(topSurfaceY([dip], 0)).toBeCloseTo(CURVE_RADIUS)
    const lifted = liftClearOfShapes({ x: 0, y: 0, z: 0 }, BALL_RADIUS, [dip])
    expect(lifted.y).toBeGreaterThanOrEqual(CURVE_RADIUS + BALL_RADIUS + SPAWN_CLEARANCE)
    expect(lifted.y).toBeLessThan(CURVE_RADIUS + BALL_RADIUS + SPAWN_CLEARANCE + 0.03)
    expect(ballOverlapsShapes(lifted, BALL_RADIUS, [dip])).toBe(false)
  })
})

describe('hitTest', () => {
  const ramp: RampObject = {
    id: 'ramp', kind: 'ramp', createdAt: 0,
    start: { x: -4, y: 2, z: 0 }, end: { x: 4, y: -2, z: 0 }, width: 0.28, thickness: 0.35,
  }
  const ball = createBallAt({ x: 0, y: 3, z: 0 })!

  it('finds rotated shapes by their outline, with a small tolerance', () => {
    expect(hitTest([ramp], { x: 2, y: -1, z: 0 }, 0)).toBe(ramp)
    expect(hitTest([ramp], { x: 2, y: -0.6, z: 0 }, 0)).toBeNull()
    expect(hitTest([ramp], { x: 2, y: -0.6, z: 0 }, 0.2)).toBe(ramp)
    expect(hitTest([ramp], { x: 4.5, y: -2.25, z: 0 }, 0.2)).toBeNull()
  })

  it('prefers balls over the shapes behind them', () => {
    const big: PlatformObject = { ...platform, center: { x: 0, y: 3, z: 0 }, halfExtents: { x: 3, y: 1, z: 0.2 } }
    expect(hitTest([ball, big], ball.position, 0)).toBe(ball)
    expect(hitTest([ball, big], { x: 2, y: 3, z: 0 }, 0)).toBe(big)
  })
})
