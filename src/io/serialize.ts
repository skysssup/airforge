import type { SceneObject } from '../scene/objects'
import type { PhysicsParams } from '../physics/params'
import {
  serializeScene,
  validateSceneJson,
  type AirForgeSceneFile,
  type SerializedObject,
} from './schema'

export function objectsToSerialized(objects: SceneObject[]): SerializedObject[] {
  return objects.map((o) => {
    if (o.kind === 'ramp') {
      return {
        id: o.id,
        kind: 'ramp',
        createdAt: o.createdAt,
        start: { ...o.start },
        end: { ...o.end },
        width: o.width,
        thickness: o.thickness,
      }
    }
    if (o.kind === 'ball') {
      return {
        id: o.id,
        kind: 'ball',
        createdAt: o.createdAt,
        position: { ...o.position },
        radius: o.radius,
        dynamic: o.dynamic,
      }
    }
    return {
      id: o.id,
      kind: 'platform',
      createdAt: o.createdAt,
      center: { ...o.center },
      halfExtents: { ...o.halfExtents },
      rotationZ: o.rotationZ,
    }
  })
}

export function serializedToObjects(file: AirForgeSceneFile): SceneObject[] {
  return file.objects.map((o) => {
    if (o.kind === 'ramp') {
      return {
        id: o.id,
        kind: 'ramp' as const,
        createdAt: o.createdAt,
        start: o.start!,
        end: o.end!,
        width: o.width ?? 0.28,
        thickness: o.thickness ?? 0.35,
      }
    }
    if (o.kind === 'ball') {
      return {
        id: o.id,
        kind: 'ball' as const,
        createdAt: o.createdAt,
        position: o.position!,
        radius: o.radius ?? 0.35,
        dynamic: o.dynamic ?? false,
      }
    }
    return {
      id: o.id,
      kind: 'platform' as const,
      createdAt: o.createdAt,
      center: o.center!,
      halfExtents: o.halfExtents!,
      rotationZ: o.rotationZ ?? 0,
    }
  })
}

export function exportSceneJson(
  name: string,
  objects: SceneObject[],
  physics: PhysicsParams,
): string {
  return serializeScene(name, objectsToSerialized(objects), physics)
}

export function importSceneJson(raw: string): {
  ok: true
  name: string
  objects: SceneObject[]
  physics: PhysicsParams
} | { ok: false; error: string } {
  const result = validateSceneJson(raw)
  if (!result.ok) return result
  return {
    ok: true,
    name: result.scene.name,
    objects: serializedToObjects(result.scene),
    physics: result.scene.physics,
  }
}


export interface SceneStats {
  total: number
  ramps: number
  balls: number
  platforms: number
  dynamicBalls: number
}

export function sceneStats(objects: SceneObject[]): SceneStats {
  let ramps = 0
  let balls = 0
  let platforms = 0
  let dynamicBalls = 0
  for (const o of objects) {
    if (o.kind === 'ramp') ramps += 1
    else if (o.kind === 'ball') {
      balls += 1
      if (o.dynamic) dynamicBalls += 1
    } else if (o.kind === 'platform') platforms += 1
  }
  return { total: objects.length, ramps, balls, platforms, dynamicBalls }
}
