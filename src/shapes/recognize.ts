/**
 * Pure TypeScript shape recognition informed by WritingOnAir heuristics
 * (CodeItAlone / Subrato Kundu, MIT). Reimplemented — not a Python server.
 *
 * Priority: line → circle → rectangle/square
 * Quality metrics are geometric fit scores (not fake ML confidence).
 */

import type { Vec2 } from '../events/types'
import {
  approxPolyDP,
  convexHull,
  dist,
  dot,
  mean,
  minEnclosingCircle,
  normalize,
  pathLength,
  pointLineDistance,
  stddev,
  sub,
  unwrapAngles,
} from './geometry'

export type RecognizedKind = 'line' | 'circle' | 'rectangle' | 'square'

export interface LineParams {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface CircleParams {
  cx: number
  cy: number
  radius: number
}

export interface RectParams {
  corners: Vec2[]
}

export type ShapeParams = LineParams | CircleParams | RectParams

export interface ShapeCandidate {
  kind: RecognizedKind
  params: ShapeParams
  /** Geometric fit quality in [0, 1] — higher is better fit. */
  quality: number
  metrics: Record<string, number>
}

export interface RecognitionResult {
  primary: ShapeCandidate | null
  alternatives: ShapeCandidate[]
  ambiguous: boolean
}

/** Screen-space thresholds (pixels). Tuned for ~1280×720 canvas. */
const MIN_LINE_LENGTH = 30
const MIN_CIRCLE_RADIUS = 15
const MIN_RECT_PERIMETER = 100
const MIN_POINTS_LINE = 5
const MIN_POINTS_CIRCLE = 8
const MIN_POINTS_RECT = 15

export function recognizeStroke(points: Vec2[]): RecognitionResult {
  const alternatives: ShapeCandidate[] = []

  if (points.length < MIN_POINTS_LINE) {
    return { primary: null, alternatives, ambiguous: false }
  }

  // Priority matches WritingOnAir: line → circle → rectangle/square
  const line = detectLine(points)
  if (line) {
    return { primary: line, alternatives, ambiguous: false }
  }

  const circle = detectCircle(points)
  const rect = detectRectangle(points)

  if (circle) {
    // Circles often approx to 4-gons; only surface rect as alternative when circle is weak
    if (rect && circle.quality < 0.75) alternatives.push(rect)
    return {
      primary: circle,
      alternatives,
      ambiguous: false,
    }
  }

  if (rect) {
    return { primary: rect, alternatives, ambiguous: false }
  }

  return { primary: null, alternatives, ambiguous: false }
}

export function detectLine(points: Vec2[]): ShapeCandidate | null {
  if (points.length < MIN_POINTS_LINE) return null
  const start = points[0]!
  const end = points[points.length - 1]!
  const lineLength = dist(start, end)
  if (lineLength < MIN_LINE_LENGTH) return null

  const dir = normalize(sub(end, start))
  let maxDeviation = 0
  let totalDeviation = 0
  for (const p of points) {
    const d = pointLineDistance(p, start, end)
    maxDeviation = Math.max(maxDeviation, d)
    totalDeviation += d
  }
  const avgDeviation = totalDeviation / points.length
  const deviationRatio = avgDeviation / lineLength
  const maxDeviationRatio = maxDeviation / lineLength

  const isLine =
    (deviationRatio < 0.08 && maxDeviationRatio < 0.15) ||
    (avgDeviation < 15 && maxDeviation < 25)

  if (!isLine) return null

  const quality = clamp01(
    1 - Math.max(deviationRatio / 0.08, maxDeviationRatio / 0.15) * 0.5,
  )

  return {
    kind: 'line',
    params: { x1: start.x, y1: start.y, x2: end.x, y2: end.y },
    quality,
    metrics: {
      lineLength,
      avgDeviation,
      maxDeviation,
      deviationRatio,
      maxDeviationRatio,
      dirX: dir.x,
      dirY: dir.y,
    },
  }
}

export function detectCircle(points: Vec2[]): ShapeCandidate | null {
  if (points.length < MIN_POINTS_CIRCLE) return null

  const { cx, cy, r: radius } = minEnclosingCircle(points)
  if (radius < MIN_CIRCLE_RADIUS) return null

  const distances = points.map((p) => Math.hypot(p.x - cx, p.y - cy))
  const radiusStd = stddev(distances)
  const radiusVariationCoeff = radiusStd / (radius + 1e-6)
  const meanDistance = mean(distances)
  const radiusAccuracy = Math.abs(meanDistance - radius) / (radius + 1e-6)
  const startEndDist = dist(points[0]!, points[points.length - 1]!)
  const closureRatio = startEndDist / (radius * 2 + 1e-6)

  const angles = points.map((p) => Math.atan2(p.y - cy, p.x - cx))
  const unwrapped = unwrapAngles(angles)
  const totalAngleCoverage = Math.abs(unwrapped[unwrapped.length - 1]! - unwrapped[0]!)
  const minCoverage = 5.24 // ~300°
  const coverageOk = totalAngleCoverage >= minCoverage

  const perimeter = pathLength(points)
  const idealPerimeter = 2 * Math.PI * radius
  const perimeterRatio = perimeter / (idealPerimeter + 1e-6)
  const perimeterOk = perimeterRatio > 0.75 && perimeterRatio < 1.4

  const isCircle =
    radiusVariationCoeff < 0.18 &&
    radiusAccuracy < 0.15 &&
    closureRatio < 0.45 &&
    coverageOk &&
    perimeterOk

  if (!isCircle) return null

  const quality = clamp01(
    1 -
      (radiusVariationCoeff / 0.18) * 0.25 -
      (radiusAccuracy / 0.15) * 0.25 -
      (closureRatio / 0.45) * 0.2 -
      Math.max(0, 1 - totalAngleCoverage / (2 * Math.PI)) * 0.3,
  )

  return {
    kind: 'circle',
    params: { cx, cy, radius },
    quality,
    metrics: {
      radius,
      radiusVariationCoeff,
      radiusAccuracy,
      closureRatio,
      angleCoverageDeg: (totalAngleCoverage * 180) / Math.PI,
      perimeterRatio,
    },
  }
}

export function detectRectangle(points: Vec2[]): ShapeCandidate | null {
  if (points.length < MIN_POINTS_RECT) return null

  const hull = convexHull(points)
  if (hull.length < 4) return null

  const peri = pathLength([...hull, hull[0]!])
  const epsilon = 0.04 * peri
  let approx = approxPolyDP(hull, epsilon, true)

  if (approx.length !== 4) {
    for (const f of [0.03, 0.05, 0.06, 0.025, 0.08]) {
      approx = approxPolyDP(hull, f * peri, true)
      if (approx.length === 4) break
    }
  }
  if (approx.length !== 4) return null
  if (peri < MIN_RECT_PERIMETER) return null

  // Reject circular strokes mis-approximated as 4-gons
  {
    const mec = minEnclosingCircle(points)
    const dists = points.map((p) => Math.hypot(p.x - mec.cx, p.y - mec.cy))
    const varCoeff = stddev(dists) / (mec.r + 1e-6)
    const meanD = mean(dists)
    const acc = Math.abs(meanD - mec.r) / (mec.r + 1e-6)
    if (varCoeff < 0.12 && acc < 0.15 && mec.r > MIN_CIRCLE_RADIUS) {
      return null
    }
  }

  const corners = orderRectangleCorners(approx)

  const sides = [
    dist(corners[0]!, corners[1]!),
    dist(corners[1]!, corners[2]!),
    dist(corners[2]!, corners[3]!),
    dist(corners[3]!, corners[0]!),
  ]

  const oppositeOk =
    Math.abs(sides[0]! - sides[2]!) / Math.max(sides[0]!, sides[2]!) < 0.25 &&
    Math.abs(sides[1]! - sides[3]!) / Math.max(sides[1]!, sides[3]!) < 0.25
  if (!oppositeOk) return null

  const angles: number[] = []
  for (let i = 0; i < 4; i++) {
    const p1 = corners[i]!
    const p2 = corners[(i + 1) % 4]!
    const p3 = corners[(i + 2) % 4]!
    const v1 = normalize(sub(p1, p2))
    const v2 = normalize(sub(p3, p2))
    const cosA = clamp(dot(v1, v2), -1, 1)
    angles.push((Math.acos(cosA) * 180) / Math.PI)
  }
  const anglesOk = angles.every((a) => a > 70 && a < 110)
  if (!anglesOk) return null

  const avgSide = mean(sides)
  const allEqual = sides.every((s) => Math.abs(s - avgSide) / avgSide < 0.2)
  const kind: RecognizedKind = allEqual ? 'square' : 'rectangle'

  const angleErr = mean(angles.map((a) => Math.abs(a - 90))) / 20
  const sideErr =
    (Math.abs(sides[0]! - sides[2]!) / Math.max(sides[0]!, sides[2]!) +
      Math.abs(sides[1]! - sides[3]!) / Math.max(sides[1]!, sides[3]!)) /
    2
  const quality = clamp01(1 - angleErr * 0.5 - sideErr)

  return {
    kind,
    params: { corners },
    quality,
    metrics: {
      perimeter: peri,
      side0: sides[0]!,
      side1: sides[1]!,
      side2: sides[2]!,
      side3: sides[3]!,
      angleErr,
      sideErr,
    },
  }
}

function orderRectangleCorners(corners: Vec2[]): Vec2[] {
  const cx = mean(corners.map((c) => c.x))
  const cy = mean(corners.map((c) => c.y))
  const sorted = corners
    .slice()
    .sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))
  let topLeftIdx = 0
  let minSum = Infinity
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!.x + sorted[i]!.y
    if (s < minSum) {
      minSum = s
      topLeftIdx = i
    }
  }
  return [...sorted.slice(topLeftIdx), ...sorted.slice(0, topLeftIdx)]
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** Map recognized geometric shape → playground object kind. */
export function shapeToObjectKind(kind: RecognizedKind): 'ramp' | 'ball' | 'platform' {
  if (kind === 'line') return 'ramp'
  if (kind === 'circle') return 'ball'
  return 'platform'
}
