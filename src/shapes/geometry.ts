/** Pure geometry helpers for shape recognition (no OpenCV). */

import type { Vec2 } from '../events/types'

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s }
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

export function normalize(v: Vec2): Vec2 {
  const L = length(v) || 1e-6
  return { x: v.x / L, y: v.y / L }
}

/** Perpendicular distance from point to infinite line through a→b. */
export function pointLineDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a)
  const L = length(ab) || 1e-6
  const ap = sub(p, a)
  const projLen = dot(ap, ab) / L
  const proj = add(a, scale(normalize(ab), projLen))
  return dist(p, proj)
}

/** Welzl-style / bounding: minimum enclosing circle via iterative approx (Ritter + refine). */
export function minEnclosingCircle(points: Vec2[]): { cx: number; cy: number; r: number } {
  if (points.length === 0) return { cx: 0, cy: 0, r: 0 }
  if (points.length === 1) {
    const p = points[0]!
    return { cx: p.x, cy: p.y, r: 0 }
  }

  // Bounding box center as seed, then expand
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  let cx = (minX + maxX) / 2
  let cy = (minY + maxY) / 2
  let r = 0
  for (const p of points) {
    r = Math.max(r, Math.hypot(p.x - cx, p.y - cy))
  }

  // One refinement: if farthest points dominate, recenter on diameter of two extremes
  let farthest = points[0]!
  let maxD = 0
  for (const p of points) {
    const d = Math.hypot(p.x - cx, p.y - cy)
    if (d > maxD) {
      maxD = d
      farthest = p
    }
  }
  let second = points[0]!
  maxD = 0
  for (const p of points) {
    const d = Math.hypot(p.x - farthest.x, p.y - farthest.y)
    if (d > maxD) {
      maxD = d
      second = p
    }
  }
  cx = (farthest.x + second.x) / 2
  cy = (farthest.y + second.y) / 2
  r = 0
  for (const p of points) {
    r = Math.max(r, Math.hypot(p.x - cx, p.y - cy))
  }
  return { cx, cy, r }
}

/** Convex hull (Andrew's monotone chain). Returns CCW hull. */
export function convexHull(points: Vec2[]): Vec2[] {
  if (points.length < 3) return points.slice()
  const sorted = points
    .slice()
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))

  const cross = (o: Vec2, a: Vec2, b: Vec2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

  const lower: Vec2[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }
  const upper: Vec2[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]!
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/** Ramer–Douglas–Peucker approximation (closed polygon if closed=true). */
export function approxPolyDP(points: Vec2[], epsilon: number, closed: boolean): Vec2[] {
  if (points.length < 3) return points.slice()

  const pts = closed && (points[0]!.x !== points[points.length - 1]!.x || points[0]!.y !== points[points.length - 1]!.y)
    ? [...points, points[0]!]
    : points.slice()

  function rdp(start: number, end: number, out: Vec2[]): void {
    let maxDist = 0
    let idx = -1
    const a = pts[start]!
    const b = pts[end]!
    for (let i = start + 1; i < end; i++) {
      const d = pointLineDistance(pts[i]!, a, b)
      if (d > maxDist) {
        maxDist = d
        idx = i
      }
    }
    if (maxDist > epsilon && idx >= 0) {
      rdp(start, idx, out)
      rdp(idx, end, out)
    } else {
      out.push(a)
    }
  }

  const result: Vec2[] = []
  rdp(0, pts.length - 1, result)
  // drop duplicate closing point if present
  if (
    closed &&
    result.length > 1 &&
    result[0]!.x === result[result.length - 1]!.x &&
    result[0]!.y === result[result.length - 1]!.y
  ) {
    result.pop()
  }
  // ensure last endpoint included for open
  if (!closed) result.push(pts[pts.length - 1]!)
  else if (result.length === 0 || result[result.length - 1] !== pts[pts.length - 1]) {
    // RDP above already pushed starts; for closed we need all vertices
  }
  return result
}

/** Perimeter / path length. */
export function pathLength(points: Vec2[]): number {
  let L = 0
  for (let i = 1; i < points.length; i++) {
    L += dist(points[i - 1]!, points[i]!)
  }
  return L
}

export function unwrapAngles(angles: number[]): number[] {
  if (angles.length === 0) return []
  const out = [angles[0]!]
  for (let i = 1; i < angles.length; i++) {
    let a = angles[i]!
    let prev = out[i - 1]!
    while (a - prev > Math.PI) a -= 2 * Math.PI
    while (a - prev < -Math.PI) a += 2 * Math.PI
    out.push(a)
  }
  return out
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length
  return Math.sqrt(v)
}
