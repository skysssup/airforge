/**
 * Rapier physics parameters and spawn-offset rules.
 *
 * Never spawn a ball inside a collider — always offset above the nearest
 * surface or use a documented default drop height.
 */

export interface PhysicsParams {
  /** Gravity magnitude applied on -Y (m/s² style). Default Earth-ish. */
  gravity: number
  /** Restitution (bounce) 0–1 */
  bounce: number
  /** Coulomb friction 0–FRICTION_MAX */
  friction: number
  paused: boolean
}

export const FRICTION_MIN = 0
export const FRICTION_MAX = 2
export const GRAVITY_MIN = 0
export const GRAVITY_MAX = 50
export const BOUNCE_MIN = 0
export const BOUNCE_MAX = 1

export const DEFAULT_PHYSICS: PhysicsParams = {
  gravity: 9.81,
  bounce: 0.35,
  friction: 0.55,
  paused: false,
}

/** Mesh thickness along Z for 2.5D bodies. */
export const MESH_THICKNESS = 0.35

/** Ball radius in world units. */
export const BALL_RADIUS = 0.35

/**
 * Visible world half-extents at the draw plane (shared with coords + importer).
 * Must stay in sync with DEFAULT_VIEW in coords/transforms.ts.
 */
export const WORLD_HALF_WIDTH = 8
export const WORLD_HALF_HEIGHT = 4.5

/** Reject imported sizes outside this band. */
export const MIN_OBJECT_SIZE = 0.01
export const MAX_OBJECT_SIZE = 20

/**
 * Vertical spawn offset above a surface / default drop height.
 * Documented: balls are spawned at least BALL_RADIUS + SPAWN_CLEARANCE
 * above any platform/ramp AABB top, or at DEFAULT_DROP_Y if none.
 */
export const SPAWN_CLEARANCE = 0.15
export const DEFAULT_DROP_Y = 3.5

export const MAX_OBJECTS = 40
export const GROUND_Y = -4.2

export function ballSpawnY(surfaceTopY: number | null): number {
  if (surfaceTopY == null) return DEFAULT_DROP_Y
  return surfaceTopY + BALL_RADIUS + SPAWN_CLEARANCE
}
