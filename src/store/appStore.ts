/**
 * Central app state — kept outside a god App.tsx.
 * Plain React useSyncExternalStore-friendly store.
 */

import type { Vec2 } from '../events/types'
import type { SceneObject, BallObject } from '../scene/objects'
import {
  cloneObjects,
  createBallAt,
  objectFromRecognition,
} from '../scene/objects'
import type { PhysicsParams } from '../physics/params'
import { DEFAULT_PHYSICS, MAX_OBJECTS, GRAVITY_MIN, GRAVITY_MAX, BOUNCE_MIN, BOUNCE_MAX, FRICTION_MIN, FRICTION_MAX } from '../physics/params'
import { recognizeStroke, shapeToObjectKind, type ShapeCandidate } from '../shapes/recognize'
import type { ViewBounds } from '../coords/transforms'
import { DEFAULT_VIEW } from '../coords/transforms'
import {
  createTimeline,
  recordEvent,
  recordSnapshot,
  type ReplayTimeline,
} from '../replay/timeline'
import { makeEventId, nowMs, type InteractionEvent } from '../events/types'
import { rampAndBall } from '../fixtures/scenes'
import { snapshotLiveBallPoses, clearAllLiveBallPoses } from '../physics/livePoses'

export interface AmbiguousSuggestion {
  strokeId: string
  points: Vec2[]
  primary: ShapeCandidate | null
  alternatives: ShapeCandidate[]
}

/** Undo unit: objects + scene name + physics as one snapshot. */
export interface SceneSnapshot {
  objects: SceneObject[]
  physics: PhysicsParams
  sceneName: string
}

export interface AppState {
  objects: SceneObject[]
  physics: PhysicsParams
  view: ViewBounds
  liveStroke: Vec2[]
  strokeSource: 'mouse' | 'webcam' | null
  history: SceneSnapshot[]
  suggestion: AmbiguousSuggestion | null
  tutorialDismissed: boolean
  webcamEnabled: boolean
  gestureLabel: string
  objectLimitHit: boolean
  timeline: ReplayTimeline
  replayMode: boolean
  statusMessage: string
  sceneName: string
}

type Listener = () => void

const TUTORIAL_KEY = 'airforge.tutorialDismissed'

function loadTutorialDismissed(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1'
  } catch {
    return false
  }
}

function createInitialState(): AppState {
  return {
    objects: [],
    physics: { ...DEFAULT_PHYSICS },
    view: { ...DEFAULT_VIEW },
    liveStroke: [],
    strokeSource: null,
    history: [],
    suggestion: null,
    tutorialDismissed: loadTutorialDismissed(),
    webcamEnabled: false,
    gestureLabel: 'Mouse',
    objectLimitHit: false,
    timeline: createTimeline(),
    replayMode: false,
    statusMessage: 'Draw a diagonal to forge a ramp — or load Ramp & Ball.',
    sceneName: 'Untitled',
  }
}

let state: AppState = createInitialState()
let liveScene: { objects: SceneObject[]; physics: PhysicsParams } | null = null
const listeners = new Set<Listener>()

function emit(): void {
  for (const l of listeners) l()
}

function setState(partial: Partial<AppState>): void {
  state = { ...state, ...partial }
  emit()
}

function pushHistory(): void {
  const entry: SceneSnapshot = {
    objects: cloneObjects(mergeLiveBallPoses(state.objects)),
    physics: { ...state.physics },
    sceneName: state.sceneName,
  }
  const history = [...state.history, entry].slice(-50)
  setState({ history })
}

/** Copy live Rapier ball translations into store object positions. */
function mergeLiveBallPoses(objects: SceneObject[]): SceneObject[] {
  if (state.replayMode) return objects
  const poses = snapshotLiveBallPoses()
  if (Object.keys(poses).length === 0) return objects
  return objects.map((o) => {
    if (o.kind !== 'ball') return o
    const pos = poses[o.id]
    if (!pos) return o
    return { ...o, position: { x: pos.x, y: pos.y, z: pos.z } }
  })
}

function logEvent(event: InteractionEvent): void {
  recordEvent(state.timeline, event)
}

function snap(label?: string): void {
  recordSnapshot(state.timeline, nowMs(), mergeLiveBallPoses(state.objects), state.physics, label)
}

function replayLocked(): boolean {
  if (!state.replayMode) return false
  setState({ statusMessage: 'Close replay to edit the scene.' })
  return true
}

export const appStore = {
  getState(): AppState {
    return state
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  setView(view: Partial<ViewBounds>): void {
    setState({ view: { ...state.view, ...view } })
  },

  setLiveStroke(points: Vec2[], source: 'mouse' | 'webcam' | null): void {
    setState({ liveStroke: points, strokeSource: source })
  },

  beginStroke(source: 'mouse' | 'webcam', point: Vec2): void {
    logEvent({
      type: 'STROKE_STARTED',
      id: makeEventId(),
      t: nowMs(),
      source,
      point,
    })
    setState({ liveStroke: [point], strokeSource: source, suggestion: null })
  },

  addStrokePoint(source: 'mouse' | 'webcam', point: Vec2): void {
    logEvent({
      type: 'POINT_ADDED',
      id: makeEventId(),
      t: nowMs(),
      source,
      point,
    })
    setState({ liveStroke: [...state.liveStroke, point] })
  },

  endStroke(source: 'mouse' | 'webcam', points: Vec2[]): void {
    logEvent({
      type: 'STROKE_ENDED',
      id: makeEventId(),
      t: nowMs(),
      source,
      points,
    })
    setState({ liveStroke: [], strokeSource: null })
    this.forgeFromStroke(points)
  },

  cancelStroke(source: 'mouse' | 'webcam', reason: 'hand_lost' | 'user' | 'mode_change'): void {
    logEvent({
      type: 'STROKE_CANCELLED',
      id: makeEventId(),
      t: nowMs(),
      source,
      reason,
    })
    setState({
      liveStroke: [],
      strokeSource: null,
      statusMessage:
        reason === 'hand_lost'
          ? 'Hand lost — stroke cancelled (points not connected across gap).'
          : 'Stroke cancelled.',
    })
  },

  forgeFromStroke(points: Vec2[]): void {
    if (replayLocked()) return
    const result = recognizeStroke(points)
    if (!result.primary) {
      setState({
        suggestion: {
          strokeId: makeEventId('stroke'),
          points,
          primary: null,
          alternatives: result.alternatives,
        },
        statusMessage: 'Shape unclear — pick ramp, ball, or platform, or keep drawing.',
      })
      return
    }

    if (result.ambiguous) {
      setState({
        suggestion: {
          strokeId: makeEventId('stroke'),
          points,
          primary: result.primary,
          alternatives: result.alternatives,
        },
        statusMessage: `Ambiguous shape (quality ${result.primary.quality.toFixed(2)}) — confirm or choose another.`,
      })
      return
    }

    this.createFromCandidate(result.primary, points)
  },

  createFromCandidate(candidate: ShapeCandidate, points?: Vec2[]): void {
    if (replayLocked()) return
    if (state.objects.length >= MAX_OBJECTS) {
      setState({
        objectLimitHit: true,
        statusMessage: `Object limit (${MAX_OBJECTS}) reached.`,
        suggestion: null,
      })
      return
    }
    pushHistory()
    const obj = objectFromRecognition(candidate, state.view, false, state.objects)
    if (!obj) {
      setState({ statusMessage: 'Could not create object.', suggestion: null })
      return
    }
    const objects = [...state.objects, obj]
    const kind = shapeToObjectKind(candidate.kind)
    logEvent({
      type: 'OBJECT_CREATED',
      id: makeEventId(),
      t: nowMs(),
      objectId: obj.id,
      kind,
      strokePoints: points,
    })
    setState({
      objects,
      suggestion: null,
      objectLimitHit: false,
      statusMessage: `Forged ${kind} (quality ${candidate.quality.toFixed(2)}).`,
    })
    snap(`create:${kind}`)
  },

  resolveSuggestion(choice: 'ramp' | 'ball' | 'platform' | 'discard'): void {
    const sug = state.suggestion
    if (!sug) return
    logEvent({
      type: 'SUGGESTION_RESOLVED',
      id: makeEventId(),
      t: nowMs(),
      choice,
      strokeId: sug.strokeId,
    })
    if (choice === 'discard') {
      setState({ suggestion: null, statusMessage: 'Stroke kept as ink only — discarded forge.' })
      return
    }
    // Force kind via synthetic candidate when primary mismatches
    if (sug.primary && shapeToObjectKind(sug.primary.kind) === choice) {
      this.createFromCandidate(sug.primary, sug.points)
      return
    }
    const alt = sug.alternatives.find((a) => shapeToObjectKind(a.kind) === choice)
    if (alt) {
      this.createFromCandidate(alt, sug.points)
      return
    }
    // Manual force: build minimal candidate from stroke bounds
    this.forceCreateKind(choice, sug.points)
  },

  forceCreateKind(kind: 'ramp' | 'ball' | 'platform', points: Vec2[]): void {
    if (points.length < 2) {
      setState({ suggestion: null, statusMessage: 'Not enough points.' })
      return
    }
    const start = points[0]!
    const end = points[points.length - 1]!
    if (kind === 'ramp') {
      this.createFromCandidate(
        {
          kind: 'line',
          params: { x1: start.x, y1: start.y, x2: end.x, y2: end.y },
          quality: 0.5,
          metrics: {},
        },
        points,
      )
      return
    }
    if (kind === 'ball') {
      const xs = points.map((p) => p.x)
      const ys = points.map((p) => p.y)
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2
      const radius = Math.max(
        20,
        (Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys)) / 4,
      )
      this.createFromCandidate(
        { kind: 'circle', params: { cx, cy, radius }, quality: 0.5, metrics: {} },
        points,
      )
      return
    }
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    this.createFromCandidate(
      {
        kind: 'rectangle',
        params: {
          corners: [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
          ],
        },
        quality: 0.5,
        metrics: {},
      },
      points,
    )
  },

  addBall(): void {
    if (replayLocked()) return
    if (state.objects.length >= MAX_OBJECTS) {
      setState({ objectLimitHit: true, statusMessage: `Object limit (${MAX_OBJECTS}) reached.` })
      return
    }
    pushHistory()
    const ball = createBallAt({ x: -3, y: 3.5, z: 0 }, state.objects, false)
    if (!ball) return
    const objects = [...state.objects, ball]
    logEvent({
      type: 'OBJECT_CREATED',
      id: makeEventId(),
      t: nowMs(),
      objectId: ball.id,
      kind: 'ball',
    })
    setState({
      objects,
      statusMessage: 'Ball added (static until Drop). Spawn offset clears colliders.',
    })
    snap('add-ball')
  },

  dropBall(): void {
    if (replayLocked()) return
    const staticBall = state.objects.find((o) => o.kind === 'ball' && !o.dynamic)
    if (staticBall) {
      pushHistory()
      const objects = state.objects.map((o): SceneObject => {
        if (o.id === staticBall.id && o.kind === 'ball') {
          return { ...o, dynamic: true }
        }
        return o
      })
      logEvent({
        type: 'BALL_DROPPED',
        id: makeEventId(),
        t: nowMs(),
        objectId: staticBall.id,
      })
      setState({ objects, statusMessage: 'Ball dropped — watch the physics.' })
      snap('drop-ball')
      return
    }

    // No static ball — spawn one already dynamic (if under the object cap)
    if (state.objects.length >= MAX_OBJECTS) {
      setState({
        objectLimitHit: true,
        statusMessage: `Object limit (${MAX_OBJECTS}) reached — cannot spawn a ball to drop.`,
      })
      return
    }

    const ball = createBallAt({ x: -3, y: 3.5, z: 0 }, state.objects, true)
    if (!ball) {
      setState({ statusMessage: 'No ball to drop.' })
      return
    }

    pushHistory()
    logEvent({
      type: 'BALL_DROPPED',
      id: makeEventId(),
      t: nowMs(),
      objectId: ball.id,
    })
    setState({
      objects: [...state.objects, ball],
      objectLimitHit: false,
      statusMessage: 'Ball dropped — watch the physics.',
    })
    snap('drop-ball')
  },

  dropAllBalls(): void {
    if (replayLocked()) return
    pushHistory()
    const objects = state.objects.map((o) =>
      o.kind === 'ball' ? ({ ...o, dynamic: true } satisfies BallObject) : o,
    )
    setState({ objects, statusMessage: 'All balls set dynamic.' })
    snap('drop-all')
  },

  resetScene(): void {
    if (replayLocked()) return
    pushHistory()
    logEvent({ type: 'SCENE_RESET', id: makeEventId(), t: nowMs() })
    clearAllLiveBallPoses()
    setState({
      objects: [],
      liveStroke: [],
      suggestion: null,
      objectLimitHit: false,
      statusMessage: 'Scene reset.',
      sceneName: 'Untitled',
    })
    snap('reset')
  },

  undo(): void {
    if (replayLocked()) return
    if (state.history.length === 0) {
      setState({ statusMessage: 'Nothing to undo.' })
      return
    }
    const history = state.history.slice()
    const prev = history.pop()!
    logEvent({ type: 'UNDO', id: makeEventId(), t: nowMs() })
    clearAllLiveBallPoses()
    setState({
      objects: prev.objects,
      physics: { ...prev.physics },
      sceneName: prev.sceneName,
      history,
      suggestion: null,
      objectLimitHit: prev.objects.length >= MAX_OBJECTS,
      statusMessage: 'Undo.',
    })
    snap('undo')
  },

  setPhysics(partial: Partial<PhysicsParams>): void {
    if (replayLocked()) return
    const physics = { ...state.physics }
    for (const [key, min, max] of [['gravity', GRAVITY_MIN, GRAVITY_MAX], ['bounce', BOUNCE_MIN, BOUNCE_MAX], ['friction', FRICTION_MIN, FRICTION_MAX]] as const) {
      const value = partial[key]
      if (typeof value === 'number' && Number.isFinite(value)) physics[key] = Math.max(min, Math.min(max, value))
    }
    if (typeof partial.paused === 'boolean') physics.paused = partial.paused
    logEvent({
      type: 'PARAMS_CHANGED',
      id: makeEventId(),
      t: nowMs(),
      gravity: physics.gravity,
      bounce: physics.bounce,
      friction: physics.friction,
    })
    setState({ physics })
  },

  togglePause(): void {
    if (replayLocked()) return
    const paused = !state.physics.paused
    setState({
      physics: { ...state.physics, paused },
      statusMessage: paused ? 'Paused.' : 'Resumed.',
    })
    logEvent({
      type: paused ? 'PHYSICS_PAUSED' : 'PHYSICS_RESUMED',
      id: makeEventId(),
      t: nowMs(),
    })
  },

  loadExample(objects: SceneObject[], name: string, physics?: PhysicsParams): void {
    if (replayLocked()) return
    pushHistory()
    clearAllLiveBallPoses()
    const cloned = cloneObjects(objects)
    setState({
      objects: cloned,
      physics: physics ? { ...physics } : state.physics,
      sceneName: name,
      suggestion: null,
      liveStroke: [],
      objectLimitHit: cloned.length >= MAX_OBJECTS,
      statusMessage: `Loaded “${name}”. Press Drop ball.`,
    })
    logEvent({
      type: 'SCENE_LOADED',
      id: makeEventId(),
      t: nowMs(),
      name,
    })
    snap(`load:${name}`)
  },

  loadRampAndBall(): void {
    this.loadExample(rampAndBall.objects, rampAndBall.name, rampAndBall.physics)
  },

  replaceObjects(objects: SceneObject[], name: string, physics: PhysicsParams): void {
    if (replayLocked()) return
    pushHistory()
    clearAllLiveBallPoses()
    const cloned = cloneObjects(objects)
    setState({
      objects: cloned,
      physics: { ...physics },
      sceneName: name,
      suggestion: null,
      objectLimitHit: cloned.length >= MAX_OBJECTS,
      statusMessage: `Imported “${name}”.`,
    })
    snap(`import:${name}`)
  },

  dismissTutorial(): void {
    try {
      localStorage.setItem(TUTORIAL_KEY, '1')
    } catch {
      /* ignore */
    }
    setState({ tutorialDismissed: true })
  },

  showTutorial(): void {
    try {
      localStorage.removeItem(TUTORIAL_KEY)
    } catch {
      /* ignore */
    }
    setState({ tutorialDismissed: false })
  },

  setWebcamEnabled(on: boolean): void {
    setState({
      webcamEnabled: on,
      gestureLabel: on ? 'Webcam starting…' : 'Mouse',
      statusMessage: on
        ? 'Webcam on — index draws, pinch pens up.'
        : 'Mouse mode.',
    })
  },

  setGestureLabel(label: string): void {
    setState({ gestureLabel: label })
  },

  setStatus(msg: string): void {
    setState({ statusMessage: msg })
  },

  setSceneName(name: string): void {
    if (replayLocked()) return
    const trimmed = name.trim().slice(0, 80) || 'Untitled'
    setState({ sceneName: trimmed, statusMessage: `Scene renamed to "${trimmed}".` })
  },

  /** Soft-reset dynamics: freeze every ball without clearing the scene. */
  freezeBalls(): void {
    if (replayLocked()) return
    const balls = state.objects.filter((o) => o.kind === 'ball' && o.dynamic)
    if (balls.length === 0) {
      setState({ statusMessage: 'No moving balls to freeze.' })
      return
    }
    // Persist live Rapier poses into store before remounting as kinematic.
    const withPoses = mergeLiveBallPoses(state.objects)
    state = { ...state, objects: withPoses }
    pushHistory()
    const objects = withPoses.map((o) =>
      o.kind === 'ball' && o.dynamic ? { ...o, dynamic: false } : o,
    )
    clearAllLiveBallPoses()
    setState({
      objects,
      statusMessage: `Froze ${balls.length} ball${balls.length === 1 ? '' : 's'}.`,
    })
  },

  /** Merge live Rapier poses into store (call before JSON export). */
  syncLiveBallPoses(): void {
    const objects = mergeLiveBallPoses(state.objects)
    if (objects !== state.objects) setState({ objects })
  },

  setReplayMode(on: boolean): void {
    if (on === state.replayMode) return
    if (on) {
      liveScene = {
        objects: cloneObjects(mergeLiveBallPoses(state.objects)),
        physics: { ...state.physics },
      }
      setState({ replayMode: true })
      return
    }
    const live = liveScene
    liveScene = null
    clearAllLiveBallPoses()
    setState({
      replayMode: false,
      ...(live && {
        objects: live.objects,
        physics: live.physics,
        statusMessage: 'Replay closed — live scene restored.',
      }),
    })
  },

  applySnapshotObjects(objects: SceneObject[], physics: PhysicsParams): void {
    if (!state.replayMode) return
    clearAllLiveBallPoses()
    setState({ objects: cloneObjects(objects), physics: { ...physics } })
  },

  /** Test helper */
  _resetForTests(): void {
    clearAllLiveBallPoses()
    liveScene = null
    state = createInitialState()
    state.tutorialDismissed = true
    emit()
  },
}
