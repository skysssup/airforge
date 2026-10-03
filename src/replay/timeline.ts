/**
 * Event timeline + state snapshots for replay.
 *
 * Honesty note: Rapier physics is not bit-exact across runs/devices.
 * Replay steps through recorded object snapshots; it neither re-simulates
 * dynamics nor interpolates between snapshots, and velocities are not recorded.
 */

import type { InteractionEvent } from '../events/types'
import type { SceneObject } from '../scene/objects'
import type { PhysicsParams } from '../physics/params'
import { cloneObjects } from '../scene/objects'

export interface SceneSnapshot {
  t: number
  objects: SceneObject[]
  physics: PhysicsParams
  label?: string
}

export interface ReplayTimeline {
  events: InteractionEvent[]
  snapshots: SceneSnapshot[]
}

export const MAX_REPLAY_EVENTS = 5000
export const MAX_REPLAY_SNAPSHOTS = 250

export function createTimeline(): ReplayTimeline {
  return { events: [], snapshots: [] }
}

export function recordEvent(tl: ReplayTimeline, event: InteractionEvent): void {
  tl.events.push(structuredClone(event))
  if (tl.events.length > MAX_REPLAY_EVENTS) tl.events.splice(0, tl.events.length - MAX_REPLAY_EVENTS)
}

export function recordSnapshot(
  tl: ReplayTimeline,
  t: number,
  objects: SceneObject[],
  physics: PhysicsParams,
  label?: string,
): void {
  tl.snapshots.push({
    t,
    objects: cloneObjects(objects),
    physics: { ...physics },
    label,
  })
  if (tl.snapshots.length > MAX_REPLAY_SNAPSHOTS) tl.snapshots.splice(0, tl.snapshots.length - MAX_REPLAY_SNAPSHOTS)
}

export interface ReplayControllerState {
  index: number
}

export function createReplayController(): ReplayControllerState {
  return { index: 0 }
}

/** Advance to snapshot index; clamp to bounds. */
export function seekSnapshot(
  tl: ReplayTimeline,
  state: ReplayControllerState,
  index: number,
): SceneSnapshot | null {
  if (tl.snapshots.length === 0) return null
  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0
  const i = Math.max(0, Math.min(tl.snapshots.length - 1, safeIndex))
  state.index = i
  return tl.snapshots[i]!
}

export function stepReplay(
  tl: ReplayTimeline,
  state: ReplayControllerState,
  direction: 1 | -1 = 1,
): SceneSnapshot | null {
  return seekSnapshot(tl, state, state.index + direction)
}

export function restartReplay(
  tl: ReplayTimeline,
  state: ReplayControllerState,
): SceneSnapshot | null {
  return seekSnapshot(tl, state, 0)
}
