/**
 * Stroke capture. Mouse points are kept as drawn. Webcam points are smoothed
 * with a moving average of 4, and a jump larger than MAX_POINT_GAP marks the
 * stroke for cancellation so tracking glitches never connect distant points.
 */

import type { Vec2 } from '../events/types'
import { dist2 } from '../coords/transforms'

export const SMOOTH_WINDOW = 4
export const MAX_STROKE_POINTS = 2000
export const MIN_POINT_SPACING = 1.5
export const MAX_POINT_GAP = 160

export type StrokeSource = 'mouse' | 'webcam'

export interface StrokeState {
  source: StrokeSource
  points: Vec2[]
  rawBuffer: Vec2[]
  active: boolean
  /** Set when a webcam point jumped farther than MAX_POINT_GAP; callers must cancel. */
  gapExceeded: boolean
}

export function createStroke(source: StrokeSource): StrokeState {
  return { source, points: [], rawBuffer: [], active: true, gapExceeded: false }
}

/** Add a raw input point; returns the stored point, or null when it was skipped. */
export function addRawPoint(stroke: StrokeState, raw: Vec2): Vec2 | null {
  if (!stroke.active || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return null
  if (stroke.points.length >= MAX_STROKE_POINTS) return null
  const last = stroke.points.at(-1)

  let point = raw
  if (stroke.source === 'webcam') {
    // Compare raw positions so smoothing lag is not mistaken for a jump.
    const lastRaw = stroke.rawBuffer.at(-1)
    if (lastRaw && dist2(lastRaw, raw) > MAX_POINT_GAP) {
      stroke.gapExceeded = true
      return null
    }
    stroke.rawBuffer.push(raw)
    if (stroke.rawBuffer.length > SMOOTH_WINDOW) stroke.rawBuffer.shift()
    point = averagePoints(stroke.rawBuffer)
  }

  if (last && dist2(last, point) < MIN_POINT_SPACING) return null
  stroke.points.push(point)
  return point
}

export function endStroke(stroke: StrokeState): Vec2[] {
  stroke.active = false
  stroke.rawBuffer = []
  return stroke.points.slice()
}

export function cancelStroke(stroke: StrokeState): void {
  stroke.active = false
  stroke.points = []
  stroke.rawBuffer = []
  stroke.gapExceeded = false
}

function averagePoints(pts: Vec2[]): Vec2 {
  let x = 0
  let y = 0
  for (const p of pts) {
    x += p.x
    y += p.y
  }
  return { x: x / pts.length, y: y / pts.length }
}
