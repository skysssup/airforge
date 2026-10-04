/** Moving, rotating, and copying scene objects. Pure functions over world coordinates. */

import type { Vec3 } from '../events/types'
import { makeObjectId, type SceneObject } from './objects'

export interface Transform {
  /** World-unit offset. */
  dx: number
  dy: number
  /** Counterclockwise rotation in radians around the object's pivot. */
  angle: number
}

/** The point an object rotates around: a ramp's midpoint, a platform's or ball's center. */
export function pivotOf(object: SceneObject): Vec3 {
  if (object.kind === 'ramp') {
    return { x: (object.start.x + object.end.x) / 2, y: (object.start.y + object.end.y) / 2, z: 0 }
  }
  return object.kind === 'ball' ? object.position : object.center
}

function rotateAbout(p: Vec3, pivot: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const x = p.x - pivot.x
  const y = p.y - pivot.y
  return { x: pivot.x + x * cos - y * sin, y: pivot.y + x * sin + y * cos, z: p.z }
}

const shift = (p: Vec3, dx: number, dy: number): Vec3 => ({ x: p.x + dx, y: p.y + dy, z: p.z })

/** The object rotated around its pivot, then moved. Balls only move. */
export function transformObject(object: SceneObject, { dx, dy, angle }: Transform): SceneObject {
  if (object.kind === 'ball') return { ...object, position: shift(object.position, dx, dy) }
  if (object.kind === 'platform') return { ...object, center: shift(object.center, dx, dy), rotationZ: object.rotationZ + angle }
  const pivot = pivotOf(object)
  return {
    ...object,
    start: shift(rotateAbout(object.start, pivot, angle), dx, dy),
    end: shift(rotateAbout(object.end, pivot, angle), dx, dy),
  }
}

/** Snap a move so the object's pivot lands on the nearest multiple of `step`. */
export function snapMove(object: SceneObject, dx: number, dy: number, step: number): { dx: number; dy: number } {
  const pivot = pivotOf(object)
  return {
    dx: Math.round((pivot.x + dx) / step) * step - pivot.x,
    dy: Math.round((pivot.y + dy) / step) * step - pivot.y,
  }
}

/** A copy with a new id, offset by (dx, dy). A copied ball waits for Drop. */
export function copyOf(object: SceneObject, dx: number, dy: number): SceneObject {
  const moved = transformObject(structuredClone(object), { dx, dy, angle: 0 })
  const copy = { ...moved, id: makeObjectId(object.kind), createdAt: Date.now() }
  if (copy.kind === 'ball') {
    const { releasedFrom: _released, ...ball } = copy
    return { ...ball, dynamic: false }
  }
  return copy
}
