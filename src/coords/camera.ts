import { GROUND_TOP_Y, WALL_HALF_WIDTH, WALL_X, WORLD_HALF_HEIGHT } from '../physics/params'
import type { ViewBounds } from './transforms'

export const CAMERA_FOV_DEG = 24
export const CAMERA_NEAR = 0.1
export const CAMERA_FAR = 200

const TAN_HALF_FOV = Math.tan((CAMERA_FOV_DEG * Math.PI) / 360)

/**
 * The part of the world every viewport frames: both side walls with a band of
 * wall showing, the floor with a band of ground under it, and the world region above.
 */
export const FRAME_HALF_WIDTH = WALL_X - WALL_HALF_WIDTH + 0.3
export const FRAME_BOTTOM = GROUND_TOP_Y - 0.6
export const FRAME_TOP = WORLD_HALF_HEIGHT + 0.3

/**
 * Fit the frame into the viewport. The ground band always sits on the bottom
 * edge; extra width is split between both sides and extra height (portrait
 * screens) goes above the scene.
 */
export function viewBoundsFor(width: number, height: number): ViewBounds {
  const valid = width > 0 && height > 0
  const w = valid ? width : 1280
  const h = valid ? height : 720
  const pixelsPerUnit = Math.min(w / (2 * FRAME_HALF_WIDTH), h / (FRAME_TOP - FRAME_BOTTOM))
  const worldHalfHeight = h / (2 * pixelsPerUnit)
  return { width, height, worldHalfWidth: w / (2 * pixelsPerUnit), worldHalfHeight, centerY: FRAME_BOTTOM + worldHalfHeight }
}

export function cameraDistanceFor(view: ViewBounds): number {
  return view.worldHalfHeight / TAN_HALF_FOV
}
