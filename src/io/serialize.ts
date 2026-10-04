import type { SceneObject } from '../scene/objects'
import type { PhysicsParams } from '../physics/params'
import { serializeScene, validateSceneJson, type AirForgeSceneFile, type SerializedObject } from './schema'

export function objectsToSerialized(objects: SceneObject[]): SerializedObject[] {
  return objects.map((o) => {
    if (o.kind === 'ramp') {
      return { id: o.id, kind: 'ramp', createdAt: o.createdAt, start: { ...o.start }, end: { ...o.end }, width: o.width, thickness: o.thickness }
    }
    if (o.kind === 'ball') {
      return { id: o.id, kind: 'ball', createdAt: o.createdAt, position: { ...o.position }, radius: o.radius, dynamic: o.dynamic }
    }
    if (o.kind === 'curve') {
      return { id: o.id, kind: 'curve', createdAt: o.createdAt, points: o.points.map((p) => ({ ...p })), radius: o.radius }
    }
    return { id: o.id, kind: 'platform', createdAt: o.createdAt, center: { ...o.center }, halfExtents: { ...o.halfExtents }, rotationZ: o.rotationZ }
  })
}

/** Convert a validated file; validateSceneJson guarantees each kind's fields are present. */
export function serializedToObjects(file: AirForgeSceneFile): SceneObject[] {
  return file.objects.map((o): SceneObject => {
    if (o.kind === 'ramp') {
      return { id: o.id, kind: 'ramp', createdAt: o.createdAt, start: o.start!, end: o.end!, width: o.width!, thickness: o.thickness! }
    }
    if (o.kind === 'ball') {
      return { id: o.id, kind: 'ball', createdAt: o.createdAt, position: o.position!, radius: o.radius!, dynamic: o.dynamic! }
    }
    if (o.kind === 'curve') {
      return { id: o.id, kind: 'curve', createdAt: o.createdAt, points: o.points!, radius: o.radius! }
    }
    return { id: o.id, kind: 'platform', createdAt: o.createdAt, center: o.center!, halfExtents: o.halfExtents!, rotationZ: o.rotationZ! }
  })
}

export function exportSceneJson(name: string, objects: SceneObject[], physics: PhysicsParams): string {
  return serializeScene(name, objectsToSerialized(objects), physics)
}

export function importSceneJson(raw: string):
  | { ok: true; name: string; objects: SceneObject[]; physics: PhysicsParams }
  | { ok: false; error: string } {
  const result = validateSceneJson(raw)
  if (!result.ok) return result
  return { ok: true, name: result.scene.name, objects: serializedToObjects(result.scene), physics: result.scene.physics }
}
