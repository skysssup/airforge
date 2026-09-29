/**
 * Stroke capture + smoothing.
 * Informed by WritingOnAir: moving-average window of 4, cancel on hand loss
 * (never connect distant points across a gap).
 */

import type { Vec2 } from '../events/types'
import { dist2 } from '../coords/transforms'

export const SMOOTH_WINDOW = 4
export const MAX_STROKE_POINTS = 2000
export const MIN_POINT_SPACING = 1.5
/** Reject / cancel when a new point teleports farther than this (px). */
export const MAX_POINT_GAP = 160

export interface StrokeState {
  id: string
  source: 'mouse' | 'webcam'
  points: Vec2[]
  rawBuffer: Vec2[]
  active: boolean
  /** Set when a raw point jumped farther than MAX_POINT_GAP — callers must cancel. */
  gapExceeded: boolean
}

export function createStroke(id: string, source: 'mouse' | 'webcam'): StrokeState {
  return { id, source, points: [], rawBuffer: [], active: true, gapExceeded: false }
}

/** Push a raw point; returns the smoothed point if accepted, else null. */
export function addRawPoint(stroke: StrokeState, raw: Vec2): Vec2 | null {
  if (!stroke.active) return null
  if (stroke.points.length >= MAX_STROKE_POINTS) return null

  // Gap against the *raw* tip so smoothing cannot dilute a teleport jump
  if (stroke.points.length > 0) {
    const last = stroke.points[stroke.points.length - 1]!
    if (dist2(last, raw) > MAX_POINT_GAP) {
      stroke.gapExceeded = true
      return null
    }
  }

  stroke.rawBuffer.push(raw)
  if (stroke.rawBuffer.length > SMOOTH_WINDOW) {
    stroke.rawBuffer.shift()
  }

  const smoothed = averagePoints(stroke.rawBuffer)

  if (stroke.points.length > 0) {
    const last = stroke.points[stroke.points.length - 1]!
    if (dist2(last, smoothed) < MIN_POINT_SPACING) return null
  }

  stroke.points.push(smoothed)
  return smoothed
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
  const n = pts.length || 1
  return { x: x / n, y: y / n }
}
