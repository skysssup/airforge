/**
 * Side-channel for live Rapier ball translations.
 * Updated from BallBody each frame; read into the store on Freeze / Save JSON
 * so remounted bodies and exports match what the user saw.
 */
import type { Vec3 } from '../events/types'

const poses = new Map<string, Vec3>()

export function setLiveBallPose(id: string, position: Vec3): void {
  poses.set(id, { x: position.x, y: position.y, z: position.z })
}

export function clearLiveBallPose(id: string): void {
  poses.delete(id)
}

export function clearAllLiveBallPoses(): void {
  poses.clear()
}

/** Snapshot copy for store merge. */
export function snapshotLiveBallPoses(): Record<string, Vec3> {
  const out: Record<string, Vec3> = {}
  for (const [id, p] of poses) {
    out[id] = { x: p.x, y: p.y, z: p.z }
  }
  return out
}
