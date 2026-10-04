/**
 * Live positions of moving balls, written by BallBody every frame. The store
 * reads them for Freeze, Save, selection, and undo snapshots so those match
 * what is on screen rather than where each ball started.
 */
import type { Vec3 } from '../events/types'

/** How a moving ball moves: its velocity, seconds since release, and the highest its center has been. */
export interface BallMotion {
  velocity: Vec3
  seconds: number
  highest: number
}

const poses = new Map<string, Vec3>()
const motions = new Map<string, BallMotion>()

export function setLiveBallPose(id: string, position: Vec3): void {
  poses.set(id, { x: position.x, y: position.y, z: position.z })
}

export function liveBallPose(id: string): Vec3 | undefined {
  return poses.get(id)
}

export function setLiveBallMotion(id: string, motion: BallMotion): void {
  motions.set(id, motion)
}

export function liveBallMotion(id: string): BallMotion | undefined {
  return motions.get(id)
}

export function clearLiveBallPose(id: string): void {
  poses.delete(id)
  motions.delete(id)
}

export function clearAllLiveBallPoses(): void {
  poses.clear()
  motions.clear()
}

/** Snapshot copy for store merge. */
export function snapshotLiveBallPoses(): Record<string, Vec3> {
  const out: Record<string, Vec3> = {}
  for (const [id, p] of poses) {
    out[id] = { x: p.x, y: p.y, z: p.z }
  }
  return out
}
