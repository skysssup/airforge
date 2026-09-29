/**
 * Screen ↔ world coordinate transforms for the 2.5D playground.
 *
 * Conventions (documented in README):
 * - Screen: origin top-left, +x right, +y down, pixels.
 * - World: origin at scene center, +x right, +y up, +z toward camera.
 * - Drawing maps to world x/y; meshes get thickness on z; bodies are z-constrained.
 * - Webcam frames are mirrored (selfie view) so drawing matches muscle memory.
 * - This is NOT precise 3D hand tracking — depth is ignored.
 */

import type { Vec2, Vec3 } from '../events/types'
import { WORLD_HALF_HEIGHT, WORLD_HALF_WIDTH } from '../physics/params'

export interface ViewBounds {
  /** CSS pixel width of the drawing surface */
  width: number
  /** CSS pixel height of the drawing surface */
  height: number
  /** Half-extent of the visible world along X at the draw plane */
  worldHalfWidth: number
  /** Half-extent of the visible world along Y at the draw plane */
  worldHalfHeight: number
}

export const DEFAULT_VIEW: ViewBounds = {
  width: 1280,
  height: 720,
  worldHalfWidth: WORLD_HALF_WIDTH,
  worldHalfHeight: WORLD_HALF_HEIGHT,
}

/** Map screen pixel (optionally mirrored) → world x/y on the draw plane (z=0). */
export function screenToWorld(
  screen: Vec2,
  view: ViewBounds = DEFAULT_VIEW,
  mirrored = false,
): Vec3 {
  const nx = mirrored ? 1 - screen.x / view.width : screen.x / view.width
  const ny = screen.y / view.height
  const x = (nx - 0.5) * 2 * view.worldHalfWidth
  const y = (0.5 - ny) * 2 * view.worldHalfHeight
  return { x, y, z: 0 }
}

/** Map world x/y → screen pixel. */
export function worldToScreen(
  world: Vec3 | Vec2,
  view: ViewBounds = DEFAULT_VIEW,
  mirrored = false,
): Vec2 {
  const nx = world.x / (2 * view.worldHalfWidth) + 0.5
  const ny = 0.5 - world.y / (2 * view.worldHalfHeight)
  const x = (mirrored ? 1 - nx : nx) * view.width
  const y = ny * view.height
  return { x, y }
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
