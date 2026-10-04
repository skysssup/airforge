/** Synthetic screen-space strokes for recognition and store tests. */

import type { Vec2 } from '../events/types'

/** Clean diagonal line (ramp). */
export function cleanDiagonalLine(n = 40): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    pts.push({ x: 100 + t * 400, y: 100 + t * 250 })
  }
  return pts
}

/** Noisy line — still within line thresholds. */
export function noisyLine(n = 50, noise = 4): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const jx = ((i * 17) % 7) - 3
    const jy = ((i * 13) % 5) - 2
    pts.push({
      x: 80 + t * 500 + (jx * noise) / 3,
      y: 120 + t * 200 + (jy * noise) / 3,
    })
  }
  return pts
}

/** Tiny stroke — should not recognize. */
export function tinyStroke(): Vec2[] {
  return [
    { x: 200, y: 200 },
    { x: 205, y: 202 },
    { x: 208, y: 201 },
    { x: 210, y: 203 },
  ]
}

/** Clean circle. */
export function cleanCircle(cx = 400, cy = 300, r = 80, n = 48): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return pts
}

/** Noisy circle. */
export function noisyCircle(cx = 400, cy = 300, r = 90, n = 56): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 * 0.98 // nearly closed
    const jitter = 1 + (((i * 19) % 5) - 2) * 0.03
    pts.push({
      x: cx + Math.cos(a) * r * jitter,
      y: cy + Math.sin(a) * r * jitter,
    })
  }
  return pts
}

/** Axis-aligned rectangle. */
export function cleanRectangle(
  x = 200,
  y = 150,
  w = 280,
  h = 160,
  nPerSide = 12,
): Vec2[] {
  const pts: Vec2[] = []
  const edges: [Vec2, Vec2][] = [
    [{ x, y }, { x: x + w, y }],
    [{ x: x + w, y }, { x: x + w, y: y + h }],
    [{ x: x + w, y: y + h }, { x, y: y + h }],
    [{ x, y: y + h }, { x, y }],
  ]
  for (const [a, b] of edges) {
    for (let i = 0; i < nPerSide; i++) {
      const t = i / nPerSide
      pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    }
  }
  pts.push({ x, y })
  return pts
}

/** Square. */
export function cleanSquare(x = 250, y = 180, s = 200): Vec2[] {
  return cleanRectangle(x, y, s, s, 14)
}

/** Ambiguous scribble — neither clean line nor circle. */
export function ambiguousScribble(): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i < 60; i++) {
    const t = i / 59
    pts.push({
      x: 300 + Math.sin(t * 8) * 60 + t * 40,
      y: 250 + Math.cos(t * 5) * 40 + Math.sin(t * 12) * 20,
    })
  }
  return pts
}

/** Incomplete arc — should not be circle. */
export function openArc(cx = 400, cy = 300, r = 80, n = 30): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI * 0.6 // ~108°
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return pts
}
