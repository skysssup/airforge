/** Interaction & scene events shared by mouse, webcam, and UI controls. */

export type Vec2 = { x: number; y: number }
export type Vec3 = { x: number; y: number; z: number }

export type ObjectKind = 'ramp' | 'ball' | 'platform'

export type InteractionEventType =
  | 'STROKE_STARTED'
  | 'POINT_ADDED'
  | 'STROKE_ENDED'
  | 'STROKE_CANCELLED'
  | 'OBJECT_CREATED'
  | 'BALL_DROPPED'
  | 'SCENE_RESET'
  | 'UNDO'
  | 'PHYSICS_PAUSED'
  | 'PHYSICS_RESUMED'
  | 'PARAMS_CHANGED'
  | 'SUGGESTION_RESOLVED'
  | 'SCENE_LOADED'
  | 'REPLAY_TICK'

export interface BaseEvent {
  type: InteractionEventType
  t: number
  id: string
}

export interface StrokeStartedEvent extends BaseEvent {
  type: 'STROKE_STARTED'
  source: 'mouse' | 'webcam'
  point: Vec2
}

export interface PointAddedEvent extends BaseEvent {
  type: 'POINT_ADDED'
  source: 'mouse' | 'webcam'
  point: Vec2
}

export interface StrokeEndedEvent extends BaseEvent {
  type: 'STROKE_ENDED'
  source: 'mouse' | 'webcam'
  points: Vec2[]
}

export interface StrokeCancelledEvent extends BaseEvent {
  type: 'STROKE_CANCELLED'
  source: 'mouse' | 'webcam'
  reason: 'hand_lost' | 'user' | 'mode_change'
}

export interface ObjectCreatedEvent extends BaseEvent {
  type: 'OBJECT_CREATED'
  objectId: string
  kind: ObjectKind
  /** Screen-space points used for recognition (if any). */
  strokePoints?: Vec2[]
}

export interface BallDroppedEvent extends BaseEvent {
  type: 'BALL_DROPPED'
  objectId: string
}

export interface SceneResetEvent extends BaseEvent {
  type: 'SCENE_RESET'
}

export interface UndoEvent extends BaseEvent {
  type: 'UNDO'
}

export interface PhysicsPausedEvent extends BaseEvent {
  type: 'PHYSICS_PAUSED'
}

export interface PhysicsResumedEvent extends BaseEvent {
  type: 'PHYSICS_RESUMED'
}

export interface ParamsChangedEvent extends BaseEvent {
  type: 'PARAMS_CHANGED'
  gravity: number
  bounce: number
  friction: number
}

export interface SuggestionResolvedEvent extends BaseEvent {
  type: 'SUGGESTION_RESOLVED'
  choice: ObjectKind | 'discard'
  strokeId: string
}

export interface SceneLoadedEvent extends BaseEvent {
  type: 'SCENE_LOADED'
  name: string
}

export interface ReplayTickEvent extends BaseEvent {
  type: 'REPLAY_TICK'
  index: number
}

export type InteractionEvent =
  | StrokeStartedEvent
  | PointAddedEvent
  | StrokeEndedEvent
  | StrokeCancelledEvent
  | ObjectCreatedEvent
  | BallDroppedEvent
  | SceneResetEvent
  | UndoEvent
  | PhysicsPausedEvent
  | PhysicsResumedEvent
  | ParamsChangedEvent
  | SuggestionResolvedEvent
  | SceneLoadedEvent
  | ReplayTickEvent

let _seq = 0
export function makeEventId(prefix = 'ev'): string {
  _seq += 1
  return `${prefix}_${Date.now().toString(36)}_${_seq}`
}

export function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}
