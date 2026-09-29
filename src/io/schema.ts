/**
 * Versioned JSON scene export/import.
 * No video. Size limits + validation reject malicious / oversized payloads.
 */

import type { ObjectKind } from '../events/types'
import type { PhysicsParams } from '../physics/params'
import { DEFAULT_PHYSICS, MAX_OBJECTS } from '../physics/params'

export const SCENE_FORMAT_VERSION = 1 as const
export const MAX_JSON_BYTES = 512_000 // 512 KB
export const MAX_STROKE_EXPORT_POINTS = 2000

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

function isVec3(v: unknown): v is SerializedVec3 {
  return (
    typeof v === 'object' &&
    v !== null &&
    isNum((v as SerializedVec3).x) &&
    isNum((v as SerializedVec3).y) &&
    isNum((v as SerializedVec3).z)
  )
}

export function validateSceneJson(raw: string): ValidationResult {
  if (raw.length > MAX_JSON_BYTES) {
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
  for (const item of obj.objects) {
    const parsed = parseObject(item)
    if (!parsed.ok) return parsed
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
  if (!isNum(p.gravity) || p.gravity < 0 || p.gravity > 50) {
    return { ok: false, error: 'physics.gravity out of range.' }
  }
  if (!isNum(p.bounce) || p.bounce < 0 || p.bounce > 1) {
    return { ok: false, error: 'physics.bounce out of range.' }
  }
  if (!isNum(p.friction) || p.friction < 0 || p.friction > 5) {
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
    base.start = o.start
    base.end = o.end
    base.width = isNum(o.width) ? o.width : 0.28
    base.thickness = isNum(o.thickness) ? o.thickness : 0.35
  } else if (o.kind === 'ball') {
    if (!isVec3(o.position)) return { ok: false, error: 'Ball missing position.' }
    base.position = o.position
    base.radius = isNum(o.radius) ? o.radius : 0.35
    base.dynamic = typeof o.dynamic === 'boolean' ? o.dynamic : false
  } else {
    if (!isVec3(o.center) || !isVec3(o.halfExtents)) {
      return { ok: false, error: 'Platform missing center/halfExtents.' }
    }
    base.center = o.center
    base.halfExtents = o.halfExtents
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
