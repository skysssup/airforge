/**
 * Collider layout shared by the rendered Rapier world (render/PhysicsWorld)
 * and the headless world used in tests, so both simulate the same bodies.
 */

import type { Vec3 } from '../events/types'
import type { PlatformObject, RampObject } from '../scene/objects'
import { GROUND_HALF_HEIGHT, GROUND_Y, WALL_HALF_HEIGHT, WALL_HALF_WIDTH, WALL_X } from './params'

/** A fixed cuboid rotated around Z, described by its center and half extents. */
export interface Box {
  center: Vec3
  rotationZ: number
  halfExtents: Vec3
}

/** Floor plus one wall on each side; balls cannot leave this region sideways. */
export const BOUNDARY: Box[] = [
  { center: { x: 0, y: GROUND_Y, z: 0 }, rotationZ: 0, halfExtents: { x: WALL_X + WALL_HALF_WIDTH, y: GROUND_HALF_HEIGHT, z: 1 } },
  { center: { x: -WALL_X, y: GROUND_Y + WALL_HALF_HEIGHT, z: 0 }, rotationZ: 0, halfExtents: { x: WALL_HALF_WIDTH, y: WALL_HALF_HEIGHT, z: 1 } },
  { center: { x: WALL_X, y: GROUND_Y + WALL_HALF_HEIGHT, z: 0 }, rotationZ: 0, halfExtents: { x: WALL_HALF_WIDTH, y: WALL_HALF_HEIGHT, z: 1 } },
]

/** Linear and angular damping applied to every ball. */
export const BALL_DAMPING = 0.05

/** Physics step used by both worlds; the rendered world interpolates between steps. */
export const TIME_STEP = 1 / 60

export function boxFor(object: RampObject | PlatformObject): Box {
  if (object.kind === 'platform') {
    return { center: object.center, rotationZ: object.rotationZ, halfExtents: object.halfExtents }
  }
  const dx = object.end.x - object.start.x
  const dy = object.end.y - object.start.y
  return {
    center: { x: (object.start.x + object.end.x) / 2, y: (object.start.y + object.end.y) / 2, z: 0 },
    rotationZ: Math.atan2(dy, dx),
    halfExtents: { x: Math.max(Math.hypot(dx, dy) / 2, 0.1), y: object.width, z: object.thickness / 2 },
  }
}
