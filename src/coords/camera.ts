import { WORLD_HALF_HEIGHT, WORLD_HALF_WIDTH } from '../physics/params'
import type { ViewBounds } from './transforms'

export const CAMERA_FOV_DEG = 42
export const CAMERA_NEAR = 0.1
export const CAMERA_FAR = 200

const TAN_HALF_FOV = Math.tan((CAMERA_FOV_DEG * Math.PI) / 360)

export function viewBoundsFor(width: number, height: number): ViewBounds {
  const aspect = width > 0 && height > 0 ? width / height : WORLD_HALF_WIDTH / WORLD_HALF_HEIGHT
  const worldHalfHeight = Math.max(WORLD_HALF_HEIGHT, WORLD_HALF_WIDTH / aspect)
  return { width, height, worldHalfWidth: worldHalfHeight * aspect, worldHalfHeight }
}

export function cameraDistanceFor(view: ViewBounds): number {
  return view.worldHalfHeight / TAN_HALF_FOV
}
