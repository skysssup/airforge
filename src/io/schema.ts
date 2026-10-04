/**
 * Versioned JSON scene export/import.
 * No video. Size limits + validation reject malicious / oversized payloads.
 */

import type { ObjectKind } from '../events/types'
import type { PhysicsParams } from '../physics/params'
import {
  BOUNCE_MAX,
  BOUNCE_MIN,
  DEFAULT_PHYSICS,
  FRICTION_MAX,
  FRICTION_MIN,
  GRAVITY_MAX,
  GRAVITY_MIN,
  MAX_OBJECT_SIZE,
  MAX_OBJECTS,
  MAX_WORLD_COORDINATE,
  MIN_OBJECT_SIZE,
  isWithinWorldBounds,
} from '../physics/params'

export const SCENE_FORMAT_VERSION = 1 as const
export const MAX_JSON_BYTES = 512_000 // 512 KB

export interface SerializedVec3 {
  x: number
  y: number
  z: number
}

export interface SerializedObject {
  id: string
  kind: ObjectKind
  createdAt: number
  // ramp
  start?: SerializedVec3
  end?: SerializedVec3
  width?: number
  thickness?: number
  // ball
  position?: SerializedVec3
  radius?: number
  dynamic?: boolean
  // platform
  center?: SerializedVec3
  halfExtents?: SerializedVec3
  rotationZ?: number
}

export interface AirForgeSceneFile {
  format: 'airforge-scene'
  version: typeof SCENE_FORMAT_VERSION
  name: string
  exportedAt: string
  physics: PhysicsParams
  objects: SerializedObject[]
}

export type ValidationResult =
  | { ok: true; scene: AirForgeSceneFile }
  | { ok: false; error: string }

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function isPositiveSize(v: number): boolean {
  return v >= MIN_OBJECT_SIZE && v <= MAX_OBJECT_SIZE
}

function isVec3(v: unknown): v is SerializedVec3 {
  return (
    typeof v === 'object' &&
    v !== null &&
    isNum((v as SerializedVec3).x) &&
    isNum((v as SerializedVec3).y) &&
    isNum((v as SerializedVec3).z)
  )
}

/** Copy only the coordinates so unknown keys never reach the scene. */
function vec3({ x, y, z }: SerializedVec3): SerializedVec3 {
  return { x, y, z }
}

function utf8ByteLength(raw: string): number {
  return new TextEncoder().encode(raw).length
}

export function validateSceneJson(raw: string): ValidationResult {
  if (utf8ByteLength(raw) > MAX_JSON_BYTES) {
    return { ok: false, error: `File too large (>${MAX_JSON_BYTES} bytes).` }
  }

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Malformed JSON.' }
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'Root must be an object.' }
  }

  const obj = data as Record<string, unknown>

  if (obj.format !== 'airforge-scene') {
    return { ok: false, error: 'Missing or invalid format field (expected airforge-scene).' }
  }
  if (obj.version !== SCENE_FORMAT_VERSION) {
    return {
      ok: false,
      error: `Unsupported version ${String(obj.version)} (expected ${SCENE_FORMAT_VERSION}).`,
    }
  }
  if (typeof obj.name !== 'string' || obj.name.length > 200) {
    return { ok: false, error: 'Invalid name.' }
  }
  if (typeof obj.exportedAt !== 'string') {
    return { ok: false, error: 'Invalid exportedAt.' }
  }

  const physics = parsePhysics(obj.physics)
  if (!physics.ok) return physics

  if (!Array.isArray(obj.objects)) {
    return { ok: false, error: 'objects must be an array.' }
  }
  if (obj.objects.length > MAX_OBJECTS) {
    return { ok: false, error: `Too many objects (max ${MAX_OBJECTS}).` }
  }

  const objects: SerializedObject[] = []
  const seenIds = new Set<string>()
  for (const item of obj.objects) {
    const parsed = parseObject(item)
    if (!parsed.ok) return parsed
    if (seenIds.has(parsed.object.id)) {
      return { ok: false, error: `Duplicate object id: ${parsed.object.id}` }
    }
    seenIds.add(parsed.object.id)
    objects.push(parsed.object)
  }

  // Reject unexpected prototype pollution keys at root (best-effort)
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return { ok: false, error: 'Forbidden key in payload.' }
    }
  }

  return {
    ok: true,
    scene: {
      format: 'airforge-scene',
      version: SCENE_FORMAT_VERSION,
      name: obj.name,
      exportedAt: obj.exportedAt,
      physics: physics.physics,
      objects,
    },
  }
}

function parsePhysics(
  v: unknown,
): { ok: true; physics: PhysicsParams } | { ok: false; error: string } {
  if (typeof v !== 'object' || v === null) {
    return { ok: false, error: 'Invalid physics block.' }
  }
  const p = v as Record<string, unknown>
  if (!isNum(p.gravity) || p.gravity < GRAVITY_MIN || p.gravity > GRAVITY_MAX) {
    return { ok: false, error: 'physics.gravity out of range.' }
  }
  if (!isNum(p.bounce) || p.bounce < BOUNCE_MIN || p.bounce > BOUNCE_MAX) {
    return { ok: false, error: 'physics.bounce out of range.' }
  }
  if (!isNum(p.friction) || p.friction < FRICTION_MIN || p.friction > FRICTION_MAX) {
    return { ok: false, error: 'physics.friction out of range.' }
  }
  return {
    ok: true,
    physics: {
      gravity: p.gravity,
      bounce: p.bounce,
      friction: p.friction,
      paused: typeof p.paused === 'boolean' ? p.paused : false,
    },
  }
}

function parseObject(
  v: unknown,
): { ok: true; object: SerializedObject } | { ok: false; error: string } {
  if (typeof v !== 'object' || v === null) {
    return { ok: false, error: 'Invalid object entry.' }
  }
  const o = v as Record<string, unknown>
  if (typeof o.id !== 'string' || o.id.length > 100) {
    return { ok: false, error: 'Invalid object id.' }
  }
  if (o.kind !== 'ramp' && o.kind !== 'ball' && o.kind !== 'platform') {
    return { ok: false, error: `Unknown object kind: ${String(o.kind)}` }
  }
  if (!isNum(o.createdAt)) {
    return { ok: false, error: 'Invalid createdAt.' }
  }

  const base: SerializedObject = {
    id: o.id,
    kind: o.kind,
    createdAt: o.createdAt,
  }

  if (o.kind === 'ramp') {
    if (!isVec3(o.start) || !isVec3(o.end)) {
      return { ok: false, error: 'Ramp missing start/end.' }
    }
    if (!isWithinWorldBounds(o.start) || !isWithinWorldBounds(o.end)) {
      return { ok: false, error: `Object coordinates must be within ±${MAX_WORLD_COORDINATE} world units.` }
    }
    base.start = vec3(o.start)
    base.end = vec3(o.end)
    const width = isNum(o.width) ? o.width : 0.28
    const thickness = isNum(o.thickness) ? o.thickness : 0.35
    if (!isPositiveSize(width) || !isPositiveSize(thickness)) {
      return { ok: false, error: 'Ramp width/thickness must be positive and within limits.' }
    }
    base.width = width
    base.thickness = thickness
  } else if (o.kind === 'ball') {
    if (!isVec3(o.position)) return { ok: false, error: 'Ball missing position.' }
    if (!isWithinWorldBounds(o.position)) {
      return { ok: false, error: `Object coordinates must be within ±${MAX_WORLD_COORDINATE} world units.` }
    }
    const radius = isNum(o.radius) ? o.radius : 0.35
    if (!isPositiveSize(radius)) {
      return { ok: false, error: 'Ball radius must be positive and within limits.' }
    }
    base.position = vec3(o.position)
    base.radius = radius
    base.dynamic = typeof o.dynamic === 'boolean' ? o.dynamic : false
  } else {
    if (!isVec3(o.center) || !isVec3(o.halfExtents)) {
      return { ok: false, error: 'Platform missing center/halfExtents.' }
    }
    if (!isWithinWorldBounds(o.center)) {
      return { ok: false, error: `Object coordinates must be within ±${MAX_WORLD_COORDINATE} world units.` }
    }
    base.center = vec3(o.center)
    const he = o.halfExtents
    if (!isPositiveSize(he.x) || !isPositiveSize(he.y) || !isPositiveSize(he.z)) {
      return { ok: false, error: 'Platform halfExtents must be positive and within limits.' }
    }
    base.halfExtents = vec3(he)
    base.rotationZ = isNum(o.rotationZ) ? o.rotationZ : 0
  }

  return { ok: true, object: base }
}

export function serializeScene(
  name: string,
  objects: SerializedObject[],
  physics: PhysicsParams = DEFAULT_PHYSICS,
): string {
  const file: AirForgeSceneFile = {
    format: 'airforge-scene',
    version: SCENE_FORMAT_VERSION,
    name,
    exportedAt: new Date().toISOString(),
    physics: { ...physics },
    objects,
  }
  return JSON.stringify(file, null, 2)
}
