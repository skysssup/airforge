/** Scene object model (ramp, ball, platform) and the geometry helpers that place them. */

import type { Vec3, ObjectKind } from '../events/types'
import type { CircleParams, LineParams, RectParams, ShapeCandidate } from '../shapes/recognize'
import { shapeToObjectKind } from '../shapes/recognize'
import { screenToWorld, type ViewBounds, DEFAULT_VIEW } from '../coords/transforms'
import { boxFor } from '../physics/world'
import {
  BALL_RADIUS,
  MAX_BALL_RADIUS,
  MESH_THICKNESS,
  MIN_BALL_RADIUS,
  SPAWN_CLEARANCE,
  ballMinY,
  MAX_OBJECTS,
  MAX_OBJECT_SIZE,
  isWithinWorldBounds,
} from '../physics/params'

export interface SceneObjectBase {
  id: string
  kind: ObjectKind
  createdAt: number
}

export interface RampObject extends SceneObjectBase {
  kind: 'ramp'
  /** World-space endpoints of the ramp centerline */
  start: Vec3
  end: Vec3
  /** Half-thickness of the box collider along the surface normal */
  width: number
  /** Full depth along Z */
  thickness: number
}

export interface BallObject extends SceneObjectBase {
  kind: 'ball'
  position: Vec3
  radius: number
  /** Waiting balls (false) hold still until Drop releases them. */
  dynamic: boolean
  /** Where Drop released the ball; Restart moves it back here. Not saved to files. */
  releasedFrom?: Vec3
}

export interface PlatformObject extends SceneObjectBase {
  kind: 'platform'
  /** World-space center */
  center: Vec3
  /** Half extents (x along the platform, y thickness, z depth) */
  halfExtents: Vec3
  /** Rotation around Z in radians */
  rotationZ: number
}

export type SceneObject = RampObject | BallObject | PlatformObject

let _oid = 0
export function makeObjectId(kind: ObjectKind): string {
  _oid += 1
  return `${kind}_${Date.now().toString(36)}_${_oid}`
}

/** Build a SceneObject from a recognition candidate whose params are in screen pixels. */
export function objectFromRecognition(
  candidate: ShapeCandidate,
  view: ViewBounds = DEFAULT_VIEW,
  existing: SceneObject[] = [],
): SceneObject | null {
  if (existing.length >= MAX_OBJECTS) return null

  const kind = shapeToObjectKind(candidate.kind)
  const id = makeObjectId(kind)
  const createdAt = Date.now()

  if (candidate.kind === 'line') {
    const p = candidate.params as LineParams
    const start = screenToWorld({ x: p.x1, y: p.y1 }, view)
    const end = screenToWorld({ x: p.x2, y: p.y2 }, view)
    if (!isWithinWorldBounds(start) || !isWithinWorldBounds(end)) return null
    return { id, kind: 'ramp', createdAt, start, end, width: 0.28, thickness: MESH_THICKNESS }
  }

  if (candidate.kind === 'circle') {
    const p = candidate.params as CircleParams
    const center = screenToWorld({ x: p.cx, y: p.cy }, view)
    const drawnRadius = (p.radius / view.height) * 2 * view.worldHalfHeight
    const radius = Math.min(MAX_BALL_RADIUS, Math.max(MIN_BALL_RADIUS, drawnRadius))
    const position = clearBallFromColliders(center, radius, existing)
    if (!isWithinWorldBounds(position)) return null
    return { id, kind: 'ball', createdAt, position, radius, dynamic: false }
  }

  // rectangle / square → platform (preserve tilt via rotationZ)
  const p = candidate.params as RectParams
  const worldCorners = p.corners.map((c) => screenToWorld(c, view))
  if (!worldCorners.every(isWithinWorldBounds)) return null
  const cx = worldCorners.reduce((s, c) => s + c.x, 0) / worldCorners.length
  const cy = worldCorners.reduce((s, c) => s + c.y, 0) / worldCorners.length
  // The longest edge sets the platform's orientation, so tilted rectangles stay tilted.
  let bestLen = -1
  let edgeDx = 1
  let edgeDy = 0
  for (let i = 0; i < worldCorners.length; i++) {
    const a = worldCorners[i]!
    const b = worldCorners[(i + 1) % worldCorners.length]!
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (len > bestLen) {
      bestLen = len
      edgeDx = b.x - a.x
      edgeDy = b.y - a.y
    }
  }
  const rotationZ = Math.atan2(edgeDy, edgeDx)
  let maxU = 0
  let maxV = 0
  for (const c of worldCorners) {
    const local = toLocal(c, { x: cx, y: cy, z: 0 }, rotationZ)
    maxU = Math.max(maxU, Math.abs(local.x))
    maxV = Math.max(maxV, Math.abs(local.y))
  }
  const halfAlong = Math.max(maxU, 0.4)
  const halfThick = Math.max(Math.min(maxV, 0.35), 0.12)
  if (halfAlong > MAX_OBJECT_SIZE) return null
  return {
    id,
    kind: 'platform',
    createdAt,
    center: { x: cx, y: cy, z: 0 },
    halfExtents: { x: halfAlong, y: halfThick, z: MESH_THICKNESS / 2 },
    rotationZ,
  }
}

/** Create a waiting (or already released) ball at a position, lifted clear of other colliders. */
export function createBallAt(
  position: Vec3,
  existing: SceneObject[] = [],
  dynamic = false,
): BallObject | null {
  if (existing.length >= MAX_OBJECTS) return null
  const cleared = clearBallFromColliders(position, BALL_RADIUS, existing)
  if (!isWithinWorldBounds(cleared)) return null
  return {
    id: makeObjectId('ball'),
    kind: 'ball',
    createdAt: Date.now(),
    position: cleared,
    radius: BALL_RADIUS,
    dynamic,
    ...(dynamic && { releasedFrom: cleared }),
  }
}

/**
 * Top Y of the static surfaces whose world AABB spans x (for spawn clearance).
 * Uses the same rotated cuboids as the physics world, so steep ramps cannot
 * leave a ball embedded in a collider.
 */
export function topSurfaceY(objects: SceneObject[], x: number): number | null {
  let top: number | null = null
  for (const o of objects) {
    if (o.kind === 'ball') continue
    const { center, rotationZ, halfExtents } = boxFor(o)
    const cos = Math.abs(Math.cos(rotationZ))
    const sin = Math.abs(Math.sin(rotationZ))
    const aabbHalfX = halfExtents.x * cos + halfExtents.y * sin
    if (Math.abs(x - center.x) > aabbHalfX + 0.2) continue
    const topY = center.y + halfExtents.x * sin + halfExtents.y * cos
    top = top == null ? topY : Math.max(top, topY)
  }
  return top
}

/** Lift a ball center so it clears the ground collider and any surface under its X. */
export function clearBallFromColliders(position: Vec3, radius: number, existing: SceneObject[]): Vec3 {
  const surfaceTop = topSurfaceY(existing, position.x)
  const surfaceClear = surfaceTop == null ? -Infinity : surfaceTop + radius + SPAWN_CLEARANCE
  return { x: position.x, y: Math.max(position.y, surfaceClear, ballMinY(radius)), z: 0 }
}

/** Whether a ball at `center` touches the box of any ramp or platform, with `margin` to spare. */
export function ballOverlapsShapes(center: Vec3, radius: number, objects: SceneObject[], margin = 0): boolean {
  return objects.some((o) => {
    if (o.kind === 'ball') return false
    const { center: c, rotationZ, halfExtents } = boxFor(o)
    const local = toLocal(center, c, rotationZ)
    const nearX = Math.max(-halfExtents.x, Math.min(halfExtents.x, local.x))
    const nearY = Math.max(-halfExtents.y, Math.min(halfExtents.y, local.y))
    return Math.hypot(local.x - nearX, local.y - nearY) < radius + margin
  })
}

/** Raise a placed ball just enough to clear the floor and any shape it overlaps; a clear ball stays where it is. */
export function liftClearOfShapes(position: Vec3, radius: number, objects: SceneObject[]): Vec3 {
  let y = Math.max(position.y, ballMinY(radius))
  for (let i = 0; i < 2000 && ballOverlapsShapes({ ...position, y }, radius, objects, SPAWN_CLEARANCE); i++) y += 0.02
  return { x: position.x, y, z: 0 }
}

/**
 * Topmost object under a world point, or null. Balls are checked before ramps
 * and platforms; `tolerance` widens every shape so thin ones are easy to hit.
 */
export function hitTest(objects: SceneObject[], point: Vec3, tolerance: number): SceneObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i]!
    if (o.kind === 'ball' && Math.hypot(point.x - o.position.x, point.y - o.position.y) <= o.radius + tolerance) return o
  }
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i]!
    if (o.kind === 'ball') continue
    const { center, rotationZ, halfExtents } = boxFor(o)
    const local = toLocal(point, center, rotationZ)
    if (Math.abs(local.x) <= halfExtents.x + tolerance && Math.abs(local.y) <= halfExtents.y + tolerance) return o
  }
  return null
}

function toLocal(point: Vec3, center: Vec3, rotationZ: number): { x: number; y: number } {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const cos = Math.cos(rotationZ)
  const sin = Math.sin(rotationZ)
  return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos }
}

export function cloneObjects(objects: SceneObject[]): SceneObject[] {
  return objects.map((o) => structuredClone(o))
}
