/**
 * Screen ↔ world coordinate transforms for the 2.5D playground.
 *
 * - Screen: origin top-left, +x right, +y down, CSS pixels.
 * - World: origin at the scene center, +x right, +y up, +z toward the camera.
 * - Drawing maps to world x/y at z = 0; bodies have depth on z but cannot move along it.
 * - Webcam landmarks are mirrored (selfie view) so drawing matches the hand's motion.
 */

import type { Vec2, Vec3 } from '../events/types'
import { viewBoundsFor } from './camera'

export interface ViewBounds {
  /** CSS pixel width of the drawing surface */
  width: number
  /** CSS pixel height of the drawing surface */
  height: number
  /** Half-extent of the visible world along X at the draw plane */
  worldHalfWidth: number
  /** Half-extent of the visible world along Y at the draw plane */
  worldHalfHeight: number
  /** World y at the center of the view (the camera looks straight down -Z from here) */
  centerY: number
}

/** The view until the canvas has measured itself. */
export const DEFAULT_VIEW: ViewBounds = viewBoundsFor(1280, 720)

/** Map a screen pixel to world x/y on the draw plane (z = 0). */
export function screenToWorld(screen: Vec2, view: ViewBounds = DEFAULT_VIEW): Vec3 {
  const x = (screen.x / view.width - 0.5) * 2 * view.worldHalfWidth
  const y = view.centerY + (0.5 - screen.y / view.height) * 2 * view.worldHalfHeight
  return { x, y, z: 0 }
}

/** Map world x/y to a screen pixel. */
export function worldToScreen(world: Vec3 | Vec2, view: ViewBounds = DEFAULT_VIEW): Vec2 {
  return {
    x: (world.x / (2 * view.worldHalfWidth) + 0.5) * view.width,
    y: (0.5 - (world.y - view.centerY) / (2 * view.worldHalfHeight)) * view.height,
  }
}

/** Mirror a normalized [0,1] landmark for selfie-style drawing. */
export function mirrorNormalized(p: Vec2): Vec2 {
  return { x: 1 - p.x, y: p.y }
}

/** Convert normalized MediaPipe landmark → screen pixels (mirrored by default). */
export function landmarkToScreen(
  landmark: Vec2,
  view: ViewBounds,
  mirrored = true,
): Vec2 {
  const n = mirrored ? mirrorNormalized(landmark) : landmark
  return { x: n.x * view.width, y: n.y * view.height }
}

/** Euclidean distance in 2D. */
export function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}
