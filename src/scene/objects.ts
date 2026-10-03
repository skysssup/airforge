/**
 * Scene object model: ramp, ball, platform.
 * Geometry is derived from recognized shapes / user actions in world space.
 */

import type { Vec3, ObjectKind } from '../events/types'
import type { CircleParams, LineParams, RectParams, ShapeCandidate } from '../shapes/recognize'
import { shapeToObjectKind } from '../shapes/recognize'
import { screenToWorld, type ViewBounds, DEFAULT_VIEW } from '../coords/transforms'
import {
  BALL_RADIUS,
  MESH_THICKNESS,
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
  /** Half-thickness of the box collider along the surface normal (visual width) */
  width: number
  thickness: number
}

export interface BallObject extends SceneObjectBase {
  kind: 'ball'
  position: Vec3
  radius: number
  /** If false, ball is kinematic/static preview until Drop */
  dynamic: boolean
}

export interface PlatformObject extends SceneObjectBase {
  kind: 'platform'
  /** World-space center */
  center: Vec3
  /** Half extents (x, y thickness, z) — y is thin for a flat platform */
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

/** Build a SceneObject from a recognition candidate + stroke in screen space. */
export function objectFromRecognition(
  candidate: ShapeCandidate,
  view: ViewBounds = DEFAULT_VIEW,
  mirrored = false,
  existing: SceneObject[] = [],
): SceneObject | null {
  if (existing.length >= MAX_OBJECTS) return null

  const kind = shapeToObjectKind(candidate.kind)
  const id = makeObjectId(kind)
  const createdAt = Date.now()

  if (candidate.kind === 'line') {
    const p = candidate.params as LineParams
    const start = screenToWorld({ x: p.x1, y: p.y1 }, view, mirrored)
    const end = screenToWorld({ x: p.x2, y: p.y2 }, view, mirrored)
    if (!isWithinWorldBounds(start) || !isWithinWorldBounds(end)) return null
    return {
      id,
      kind: 'ramp',
      createdAt,
      start,
      end,
      width: 0.28,
      thickness: MESH_THICKNESS,
    }
  }

  if (candidate.kind === 'circle') {
    const p = candidate.params as CircleParams
    const center = screenToWorld({ x: p.cx, y: p.cy }, view, mirrored)
    const position = clearBallFromColliders(
      { x: center.x, y: center.y, z: 0 },
      BALL_RADIUS,
      existing,
    )
    if (!isWithinWorldBounds(position)) return null
    return {
      id,
      kind: 'ball',
      createdAt,
      position,
      radius: BALL_RADIUS,
      dynamic: false,
    }
  }

  // rectangle / square → platform (preserve tilt via rotationZ)
  const p = candidate.params as RectParams
  const worldCorners = p.corners.map((c) => screenToWorld(c, view, mirrored))
  if (!worldCorners.every(isWithinWorldBounds)) return null
  const cx = worldCorners.reduce((s, c) => s + c.x, 0) / worldCorners.length
  const cy = worldCorners.reduce((s, c) => s + c.y, 0) / worldCorners.length
  // Longest edge defines the platform orientation (avoid flattening tilted rects).
  let bestLen = -1
  let edgeDx = 1
  let edgeDy = 0
  for (let i = 0; i < worldCorners.length; i++) {
    const a = worldCorners[i]!
    const b = worldCorners[(i + 1) % worldCorners.length]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len > bestLen) {
      bestLen = len
      edgeDx = dx
      edgeDy = dy
    }
  }
  const rotationZ = Math.atan2(edgeDy, edgeDx)
  const cos = Math.cos(-rotationZ)
  const sin = Math.sin(-rotationZ)
  let maxU = 0
  let maxV = 0
  for (const c of worldCorners) {
    const dx = c.x - cx
    const dy = c.y - cy
    const u = dx * cos - dy * sin
    const v = dx * sin + dy * cos
    maxU = Math.max(maxU, Math.abs(u))
    maxV = Math.max(maxV, Math.abs(v))
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

/** Create a ball from the "Add ball" control. */
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
    position: { x: cleared.x, y: cleared.y, z: 0 },
    radius: BALL_RADIUS,
    dynamic,
  }
}

/**
 * Approximate top Y of static surfaces under a given X (for spawn clearance).
 * Uses the world AABB of the same rotated cuboid PhysicsWorld mounts, so
 * steep / near-vertical ramps cannot leave a ball embedded in the collider.
 */
export function topSurfaceY(objects: SceneObject[], x: number): number | null {
  let top: number | null = null
  for (const o of objects) {
    if (o.kind === 'platform') {
      const cos = Math.cos(o.rotationZ)
      const sin = Math.sin(o.rotationZ)
      const hx = o.halfExtents.x
      const hy = o.halfExtents.y
      const aabbHalfX = Math.abs(hx * cos) + Math.abs(hy * sin)
      if (x >= o.center.x - aabbHalfX - 0.2 && x <= o.center.x + aabbHalfX + 0.2) {
        const aabbHalfY = Math.abs(hx * sin) + Math.abs(hy * cos)
        const topY = o.center.y + aabbHalfY
        top = top == null ? topY : Math.max(top, topY)
      }
    } else if (o.kind === 'ramp') {
      const pose = rampPose(o)
      const halfLen = Math.max(pose.length / 2, 0.1)
      const halfW = o.width
      const cos = Math.cos(pose.rotationZ)
      const sin = Math.sin(pose.rotationZ)
      const aabbHalfX = Math.abs(halfLen * cos) + Math.abs(halfW * sin)
      const aabbHalfY = Math.abs(halfLen * sin) + Math.abs(halfW * cos)
      if (x >= pose.center.x - aabbHalfX - 0.2 && x <= pose.center.x + aabbHalfX + 0.2) {
        const topY = pose.center.y + aabbHalfY
        top = top == null ? topY : Math.max(top, topY)
      }
    }
  }
  return top
}

/** Lift a ball center so it clears the ground collider and any surface under its X. */
export function clearBallFromColliders(
  position: Vec3,
  radius: number,
  existing: SceneObject[],
): Vec3 {
  const surfaceTop = topSurfaceY(existing, position.x)
  const surfaceClear =
    surfaceTop == null ? -Infinity : surfaceTop + radius + SPAWN_CLEARANCE
  const y = Math.max(position.y, surfaceClear, ballMinY(radius))
  return { x: position.x, y, z: position.z }
}

/** Ramp center, length, and Z-rotation for mesh placement. */
export function rampPose(ramp: RampObject): {
  center: Vec3
  length: number
  rotationZ: number
} {
  const dx = ramp.end.x - ramp.start.x
  const dy = ramp.end.y - ramp.start.y
  const length = Math.hypot(dx, dy)
  return {
    center: {
      x: (ramp.start.x + ramp.end.x) / 2,
      y: (ramp.start.y + ramp.end.y) / 2,
      z: 0,
    },
    length,
    rotationZ: Math.atan2(dy, dx),
  }
}

export function cloneObjects(objects: SceneObject[]): SceneObject[] {
  return objects.map((o) => structuredClone(o))
}
