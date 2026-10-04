import type { Vec2 } from '../events/types'
import { cloneObjects, createBallAt, hitTest, objectFromRecognition, type SceneObject } from '../scene/objects'
import type { PhysicsParams } from '../physics/params'
import {
  BOUNCE_MAX,
  BOUNCE_MIN,
  DEFAULT_PHYSICS,
  FRICTION_MAX,
  FRICTION_MIN,
  GRAVITY_MAX,
  GRAVITY_MIN,
  MAX_OBJECTS,
} from '../physics/params'
import { recognizeStroke, shapeToObjectKind, type ShapeCandidate } from '../shapes/recognize'
import { DEFAULT_VIEW, screenToWorld, type ViewBounds } from '../coords/transforms'
import { clearAllLiveBallPoses, snapshotLiveBallPoses } from '../physics/livePoses'

export type ShapeChoice = 'ramp' | 'ball' | 'platform'

/** A finished stroke the recognizer could not classify with confidence. */
export interface PendingStroke {
  points: Vec2[]
  primary: ShapeCandidate | null
  alternatives: ShapeCandidate[]
}

/** Undo unit: everything an edit can change. */
export interface SceneSnapshot {
  objects: SceneObject[]
  physics: PhysicsParams
  sceneName: string
}

export interface LoadedScene {
  name: string
  objects: SceneObject[]
  physics: PhysicsParams
}

export interface AppState {
  objects: SceneObject[]
  physics: PhysicsParams
  sceneName: string
  /** Example whose notes card is showing. */
  exampleId: string | null
  selectedId: string | null
  view: ViewBounds
  liveStroke: Vec2[]
  pending: PendingStroke | null
  undoStack: SceneSnapshot[]
  redoStack: SceneSnapshot[]
  /** Bumped when the whole scene is replaced so the physics world is rebuilt. */
  sceneRevision: number
  tutorialDismissed: boolean
  webcamEnabled: boolean
  gestureLabel: string
  statusMessage: string
}

const TUTORIAL_KEY = 'airforge.tutorialDismissed'
const MAX_HISTORY = 50
/** Strokes whose extent stays within this many pixels are clicks, not drawings. */
const TAP_SLOP = 6
/** Extra world-space margin when clicking thin shapes. */
const HIT_TOLERANCE = 0.15
const SPAWN_POINT = { x: -3, y: 3.5, z: 0 }

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
    sceneName: 'Untitled',
    exampleId: null,
    selectedId: null,
    view: { ...DEFAULT_VIEW },
    liveStroke: [],
    pending: null,
    undoStack: [],
    redoStack: [],
    sceneRevision: 0,
    tutorialDismissed: loadTutorialDismissed(),
    webcamEnabled: false,
    gestureLabel: 'Mouse',
    statusMessage: 'Drag on the canvas to draw a ramp, ball, or platform, or open an example.',
  }
}

let state: AppState = createInitialState()
const listeners = new Set<() => void>()

function setState(partial: Partial<AppState>): void {
  state = { ...state, ...partial }
  for (const listener of listeners) listener()
}

/** Store objects with every moving ball at the position Rapier currently reports. */
function objectsWithLivePoses(): SceneObject[] {
  const poses = snapshotLiveBallPoses()
  return state.objects.map((o) => {
    const pose = o.kind === 'ball' && o.dynamic ? poses[o.id] : undefined
    return pose ? { ...o, position: pose } : o
  })
}

function snapshot(): SceneSnapshot {
  return { objects: cloneObjects(objectsWithLivePoses()), physics: { ...state.physics }, sceneName: state.sceneName }
}

/** Apply an edit and record the previous scene for Undo. */
function commit(partial: Partial<AppState>): void {
  setState({
    ...partial,
    undoStack: [...state.undoStack, snapshot()].slice(-MAX_HISTORY),
    redoStack: [],
  })
}

/** Replace the whole scene; the physics world restarts from the given positions. */
function replaceScene(scene: SceneSnapshot, extra: Partial<AppState>): void {
  clearAllLiveBallPoses()
  setState({
    objects: scene.objects,
    physics: { ...scene.physics },
    sceneName: scene.sceneName,
    selectedId: null,
    pending: null,
    liveStroke: [],
    sceneRevision: state.sceneRevision + 1,
    ...extra,
  })
}

/** "1 ball", "2 balls". */
export function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function addObject(object: SceneObject | null, message: string): void {
  if (state.objects.length >= MAX_OBJECTS) {
    setState({ pending: null, statusMessage: `Scenes are limited to ${MAX_OBJECTS} objects. Delete or undo something first.` })
    return
  }
  if (!object) {
    setState({ pending: null, statusMessage: 'That shape lies outside the supported area, so nothing was added.' })
    return
  }
  commit({ objects: [...state.objects, object], pending: null, selectedId: null, statusMessage: message })
}

function addFromCandidate(candidate: ShapeCandidate): void {
  const kind = shapeToObjectKind(candidate.kind)
  addObject(objectFromRecognition(candidate, state.view, state.objects), `Added a ${kind}.`)
}

/** Build a candidate of the chosen kind from the stroke's bounding box. */
function candidateFromBounds(kind: ShapeChoice, points: Vec2[]): ShapeCandidate {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  if (kind === 'ramp') {
    const start = points[0]!
    const end = points.at(-1)!
    return { kind: 'line', params: { x1: start.x, y1: start.y, x2: end.x, y2: end.y }, quality: 0, metrics: {} }
  }
  if (kind === 'ball') {
    const radius = Math.max(maxX - minX, maxY - minY) / 2
    return { kind: 'circle', params: { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, radius }, quality: 0, metrics: {} }
  }
  const corners = [{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }]
  return { kind: 'rectangle', params: { corners }, quality: 0, metrics: {} }
}

function isTap(points: Vec2[]): boolean {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return Math.max(...xs) - Math.min(...xs) <= TAP_SLOP && Math.max(...ys) - Math.min(...ys) <= TAP_SLOP
}

export const appStore = {
  getState(): AppState {
    return state
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  setView(view: ViewBounds): void {
    setState({ view })
  },

  beginStroke(point: Vec2): void {
    setState({ liveStroke: [point], pending: null })
  },

  setLiveStroke(points: Vec2[]): void {
    setState({ liveStroke: points })
  },

  cancelStroke(message = 'Stroke cancelled.'): void {
    if (state.liveStroke.length === 0) return
    setState({ liveStroke: [], statusMessage: message })
  },

  /** Finish a stroke: a click selects, anything else becomes a shape. */
  endStroke(points: Vec2[]): void {
    setState({ liveStroke: [] })
    if (points.length === 0) return
    if (isTap(points)) {
      appStore.selectAt(points[0]!)
      return
    }
    const result = recognizeStroke(points)
    if (result.primary && !result.ambiguous) {
      addFromCandidate(result.primary)
      return
    }
    setState({
      pending: { points, primary: result.primary, alternatives: result.alternatives },
      selectedId: null,
      statusMessage: result.primary
        ? 'That stroke could be more than one shape. Choose what to add.'
        : 'That stroke did not match a line, circle, or rectangle. Choose what to add, or discard it.',
    })
  },

  resolvePending(choice: ShapeChoice | 'discard'): void {
    const pending = state.pending
    if (!pending) return
    if (choice === 'discard') {
      setState({ pending: null, statusMessage: 'Stroke discarded.' })
      return
    }
    const candidate = [pending.primary, ...pending.alternatives]
      .find((c) => c && shapeToObjectKind(c.kind) === choice)
    addFromCandidate(candidate ?? candidateFromBounds(choice, pending.points))
  },

  selectAt(screenPoint: Vec2): void {
    const world = screenToWorld(screenPoint, state.view)
    const hit = hitTest(objectsWithLivePoses(), world, HIT_TOLERANCE)
    if (!hit) {
      setState({
        selectedId: null,
        statusMessage: 'Drag to draw. Click a shape to select it.',
      })
      return
    }
    setState({ selectedId: hit.id, statusMessage: `Selected ${hit.kind}. Press Delete to remove it.` })
  },

  clearSelection(): void {
    if (state.selectedId) setState({ selectedId: null })
  },

  deleteSelected(): void {
    const target = state.objects.find((o) => o.id === state.selectedId)
    if (!target) {
      setState({ selectedId: null, statusMessage: 'Click a shape to select it, then press Delete.' })
      return
    }
    commit({
      objects: state.objects.filter((o) => o !== target),
      selectedId: null,
      statusMessage: `Deleted ${target.kind}.`,
    })
  },

  addBall(): void {
    addObject(createBallAt(SPAWN_POINT, state.objects), 'Added a ball. Press Drop to release it.')
  },

  /** Release every waiting ball, or drop a new one when none are waiting. */
  drop(): void {
    const waiting = state.objects.filter((o) => o.kind === 'ball' && !o.dynamic)
    if (waiting.length === 0) {
      addObject(createBallAt(SPAWN_POINT, state.objects, true), 'Dropped a new ball.')
      return
    }
    commit({
      objects: state.objects.map((o) =>
        o.kind === 'ball' && !o.dynamic ? { ...o, dynamic: true, releasedFrom: o.releasedFrom ?? { ...o.position } } : o,
      ),
      statusMessage: `Dropped ${count(waiting.length, 'ball')}.`,
    })
  },

  /** Put every released ball back where Drop released it, waiting again. */
  restart(): void {
    const released = state.objects.filter((o) => o.kind === 'ball' && o.releasedFrom)
    if (released.length === 0) {
      setState({ statusMessage: 'Nothing to restart. Press Drop first.' })
      return
    }
    commit({
      objects: state.objects.map((o) => {
        if (o.kind !== 'ball' || !o.releasedFrom) return o
        const { releasedFrom, ...ball } = o
        return { ...ball, position: releasedFrom, dynamic: false }
      }),
      statusMessage: `Restarted ${count(released.length, 'ball')}. Press Drop to run again.`,
    })
  },

  /** Stop every moving ball where it is. */
  freezeBalls(): void {
    const live = objectsWithLivePoses()
    const moving = live.filter((o) => o.kind === 'ball' && o.dynamic).length
    if (moving === 0) {
      setState({ statusMessage: 'No moving balls to freeze.' })
      return
    }
    commit({
      objects: live.map((o) => (o.kind === 'ball' && o.dynamic ? { ...o, dynamic: false } : o)),
      statusMessage: `Froze ${count(moving, 'ball')}.`,
    })
  },

  clearScene(): void {
    if (state.objects.length === 0) {
      setState({ statusMessage: 'The scene is already empty.' })
      return
    }
    const previous = snapshot()
    replaceScene({ ...previous, objects: [], sceneName: 'Untitled' }, {
      exampleId: null,
      undoStack: [...state.undoStack, previous].slice(-MAX_HISTORY),
      redoStack: [],
      statusMessage: 'Scene cleared. Press Undo to bring it back.',
    })
  },

  undo(): void {
    const previous = state.undoStack.at(-1)
    if (!previous) {
      setState({ statusMessage: 'Nothing to undo.' })
      return
    }
    replaceScene(previous, {
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, snapshot()],
      statusMessage: 'Undone.',
    })
  },

  redo(): void {
    const next = state.redoStack.at(-1)
    if (!next) {
      setState({ statusMessage: 'Nothing to redo.' })
      return
    }
    replaceScene(next, {
      undoStack: [...state.undoStack, snapshot()],
      redoStack: state.redoStack.slice(0, -1),
      statusMessage: 'Redone.',
    })
  },

  /** Load an example or imported file as an undoable edit. */
  loadScene(scene: LoadedScene, options: { exampleId?: string; message: string }): void {
    const objects = cloneObjects(scene.objects).map((o) =>
      o.kind === 'ball' && o.dynamic ? { ...o, releasedFrom: { ...o.position } } : o,
    )
    replaceScene({ objects, physics: scene.physics, sceneName: scene.name }, {
      exampleId: options.exampleId ?? null,
      undoStack: [...state.undoStack, snapshot()].slice(-MAX_HISTORY),
      redoStack: [],
      statusMessage: options.message,
    })
  },

  closeExampleNotes(): void {
    setState({ exampleId: null })
  },

  setPhysics(partial: Partial<Omit<PhysicsParams, 'paused'>>): void {
    const physics = { ...state.physics }
    if (Number.isFinite(partial.gravity)) physics.gravity = clamp(partial.gravity!, GRAVITY_MIN, GRAVITY_MAX)
    if (Number.isFinite(partial.bounce)) physics.bounce = clamp(partial.bounce!, BOUNCE_MIN, BOUNCE_MAX)
    if (Number.isFinite(partial.friction)) physics.friction = clamp(partial.friction!, FRICTION_MIN, FRICTION_MAX)
    setState({ physics })
  },

  togglePause(): void {
    const paused = !state.physics.paused
    setState({ physics: { ...state.physics, paused }, statusMessage: paused ? 'Paused.' : 'Running.' })
  },

  setSceneName(name: string): void {
    const sceneName = name.trim().slice(0, 80) || 'Untitled'
    if (sceneName !== state.sceneName) setState({ sceneName, statusMessage: `Renamed the scene to “${sceneName}”.` })
  },

  /** Scene as currently displayed, for saving. */
  exportState(): LoadedScene {
    return { name: state.sceneName, objects: objectsWithLivePoses(), physics: state.physics }
  },

  dismissTutorial(): void {
    try {
      localStorage.setItem(TUTORIAL_KEY, '1')
    } catch {
      // Storage can be unavailable (private mode); the tutorial then shows again next visit.
    }
    setState({ tutorialDismissed: true })
  },

  /** Hide the tutorial for this visit without remembering it (example links). */
  skipTutorial(): void {
    setState({ tutorialDismissed: true })
  },

  setWebcamEnabled(on: boolean): void {
    setState({
      webcamEnabled: on,
      gestureLabel: on ? 'Webcam starting…' : 'Mouse',
      statusMessage: on ? 'Starting the webcam…' : 'Mouse drawing.',
    })
  },

  setGestureLabel(label: string): void {
    if (label !== state.gestureLabel) setState({ gestureLabel: label })
  },

  setStatus(statusMessage: string): void {
    setState({ statusMessage })
  },

  /** Test helper */
  _resetForTests(overrides: Partial<AppState> = {}): void {
    clearAllLiveBallPoses()
    state = { ...createInitialState(), tutorialDismissed: true, ...overrides }
    for (const listener of listeners) listener()
  },
}
