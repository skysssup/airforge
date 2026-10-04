import { beforeEach, describe, expect, it } from 'vitest'
import { appStore } from './appStore'
import { cleanCircle, cleanDiagonalLine, cleanRectangle, ambiguousScribble } from '../test/strokes'
import { EXAMPLES, loadExampleScene } from '../examples'
import { MAX_OBJECTS, MAX_WORLD_COORDINATE, DEFAULT_PHYSICS } from '../physics/params'
import { clearAllLiveBallPoses, setLiveBallPose } from '../physics/livePoses'
import { worldToScreen } from '../coords/transforms'
import type { BallObject, SceneObject } from '../scene/objects'

const rampAndBall = loadExampleScene(EXAMPLES[0]!)
const state = () => appStore.getState()
const balls = () => state().objects.filter((o): o is BallObject => o.kind === 'ball')
const kinds = () => state().objects.map((o) => o.kind)

function openRampAndBall() {
  appStore.loadScene(rampAndBall, { exampleId: 'ramp-and-ball', message: 'opened' })
}

/** Screen point at the center of an object in the default view. */
function screenPointOf(object: SceneObject) {
  if (object.kind === 'ball') return worldToScreen(object.position, state().view)
  if (object.kind === 'platform') return worldToScreen(object.center, state().view)
  return worldToScreen({ x: (object.start.x + object.end.x) / 2, y: (object.start.y + object.end.y) / 2 }, state().view)
}

beforeEach(() => {
  appStore._resetForTests()
  clearAllLiveBallPoses()
})

describe('drawing', () => {
  it('turns a line, circle, and rectangle into a ramp, ball, and platform', () => {
    appStore.endStroke(cleanDiagonalLine())
    appStore.endStroke(cleanCircle(900, 200))
    appStore.endStroke(cleanRectangle(200, 500, 300, 60))
    expect(kinds()).toEqual(['ramp', 'ball', 'platform'])
    expect(balls()[0]!.dynamic).toBe(false)
    expect(state().undoStack).toHaveLength(3)
  })

  it('treats a click as selection instead of opening the shape picker', () => {
    openRampAndBall()
    appStore.endStroke([{ x: 3, y: 3 }])
    expect(state().pending).toBeNull()
    expect(state().objects).toHaveLength(rampAndBall.objects.length)
    expect(state().statusMessage).toMatch(/Click a shape to select it/)
  })

  it('asks what an unclear stroke should become and builds the chosen shape from it', () => {
    appStore.endStroke(ambiguousScribble())
    expect(state().pending).not.toBeNull()
    expect(state().objects).toHaveLength(0)
    appStore.resolvePending('platform')
    expect(kinds()).toEqual(['platform'])
    expect(state().pending).toBeNull()
  })

  it('discards an unclear stroke without recording an edit', () => {
    appStore.endStroke(ambiguousScribble())
    appStore.resolvePending('discard')
    expect(state().pending).toBeNull()
    expect(state().undoStack).toHaveLength(0)
  })

  it('does not record an edit for a drawing outside the supported coordinates', () => {
    appStore.setView({ ...state().view, worldHalfWidth: MAX_WORLD_COORDINATE * 2 })
    appStore.endStroke([{ x: 0, y: 100 }, { x: 50, y: 150 }, { x: 100, y: 200 }, { x: 150, y: 250 }, { x: 200, y: 300 }])
    expect(state().objects).toHaveLength(0)
    expect(state().undoStack).toHaveLength(0)
  })

  it('stops adding objects at the limit and allows adding again after undo', () => {
    for (let i = 0; i < MAX_OBJECTS; i++) appStore.addBall()
    expect(state().objects).toHaveLength(MAX_OBJECTS)
    appStore.addBall()
    appStore.drop()
    appStore.endStroke(cleanDiagonalLine())
    expect(state().objects).toHaveLength(MAX_OBJECTS)
    expect(state().statusMessage).toMatch(/limited to 40 objects/)
    appStore.undo()
    appStore.undo()
    appStore.addBall()
    expect(state().objects).toHaveLength(MAX_OBJECTS)
  })
})

describe('selection', () => {
  it('selects the clicked shape and deletes it as an undoable edit', () => {
    openRampAndBall()
    const ramp = state().objects.find((o) => o.kind === 'ramp')!
    appStore.endStroke([screenPointOf(ramp)])
    expect(state().selectedId).toBe(ramp.id)
    appStore.deleteSelected()
    expect(state().objects.some((o) => o.id === ramp.id)).toBe(false)
    expect(state().selectedId).toBeNull()
    appStore.undo()
    expect(state().objects.some((o) => o.id === ramp.id)).toBe(true)
  })

  it('selects a moving ball where Rapier reports it, not where it started', () => {
    openRampAndBall()
    appStore.drop()
    const ball = balls()[0]!
    setLiveBallPose(ball.id, { x: 4, y: -2.5, z: 0 })
    appStore.selectAt(worldToScreen({ x: 4, y: -2.5 }, state().view))
    expect(state().selectedId).toBe(ball.id)
  })

  it('finds the shape under a point without selecting it', () => {
    openRampAndBall()
    const ball = balls()[0]!
    expect(appStore.objectAt(screenPointOf(ball))?.id).toBe(ball.id)
    expect(appStore.objectAt({ x: 1, y: 1 })).toBeNull()
    expect(state().selectedId).toBeNull()
  })

  it('clears the selection when clicking empty space', () => {
    openRampAndBall()
    appStore.endStroke([screenPointOf(balls()[0]!)])
    expect(state().selectedId).not.toBeNull()
    appStore.endStroke([{ x: 1, y: 1 }])
    expect(state().selectedId).toBeNull()
  })
})

describe('running the simulation', () => {
  it('drops every waiting ball at once and remembers where each was released', () => {
    appStore.loadScene(loadExampleScene(EXAMPLES.find((e) => e.id === 'bounce-test')!), { message: 'opened' })
    const start = balls().map((b) => b.position)
    appStore.drop()
    expect(balls().every((b) => b.dynamic)).toBe(true)
    expect(balls().map((b) => b.releasedFrom)).toEqual(start)
  })

  it('drops a new ball when none are waiting', () => {
    appStore.drop()
    expect(balls()).toHaveLength(1)
    expect(balls()[0]!.dynamic).toBe(true)
  })

  it('restarts released balls from their release points, even after they moved', () => {
    openRampAndBall()
    const start = balls()[0]!.position
    appStore.drop()
    setLiveBallPose(balls()[0]!.id, { x: 4.4, y: -2.5, z: 0 })
    appStore.restart()
    expect(balls()[0]).toMatchObject({ dynamic: false, position: start })
    expect(balls()[0]!.releasedFrom).toBeUndefined()
    appStore.undo()
    expect(balls()[0]).toMatchObject({ dynamic: true, position: { x: 4.4, y: -2.5 } })
  })

  it('freezes moving balls at their live positions and restarts them from the original release point', () => {
    openRampAndBall()
    const start = balls()[0]!.position
    appStore.drop()
    setLiveBallPose(balls()[0]!.id, { x: 1.25, y: -1.5, z: 0 })
    appStore.freezeBalls()
    expect(balls()[0]).toMatchObject({ dynamic: false, position: { x: 1.25, y: -1.5 } })
    appStore.drop()
    appStore.restart()
    expect(balls()[0]!.position).toEqual(start)
  })

  it('ignores stale live poses for balls that are no longer moving', () => {
    openRampAndBall()
    appStore.drop()
    const id = balls()[0]!.id
    setLiveBallPose(id, { x: 2, y: 0, z: 0 })
    appStore.restart()
    expect(appStore.exportState().objects.find((o) => o.id === id)).toMatchObject({ position: balls()[0]!.position })
  })

  it('exports moving balls at their live positions', () => {
    openRampAndBall()
    appStore.drop()
    setLiveBallPose(balls()[0]!.id, { x: 2, y: 0.5, z: 0 })
    const exported = appStore.exportState().objects.find((o) => o.kind === 'ball')
    expect(exported).toMatchObject({ position: { x: 2, y: 0.5 }, dynamic: true })
    expect(balls()[0]!.position).not.toEqual({ x: 2, y: 0.5, z: 0 })
  })
})

describe('undo and redo', () => {
  it('undoes and redoes edits in order', () => {
    appStore.endStroke(cleanDiagonalLine())
    appStore.addBall()
    appStore.undo()
    expect(kinds()).toEqual(['ramp'])
    appStore.undo()
    expect(kinds()).toEqual([])
    appStore.redo()
    appStore.redo()
    expect(kinds()).toEqual(['ramp', 'ball'])
    appStore.redo()
    expect(state().statusMessage).toBe('Nothing to redo.')
  })

  it('drops the redo history after a new edit', () => {
    appStore.addBall()
    appStore.undo()
    appStore.endStroke(cleanDiagonalLine())
    expect(state().redoStack).toHaveLength(0)
  })

  it('rebuilds the physics world on undo, redo, clear, and load, but not on ordinary edits', () => {
    const revision = () => state().sceneRevision
    let last = revision()
    appStore.addBall()
    appStore.drop()
    expect(revision()).toBe(last)
    for (const action of [() => appStore.undo(), () => appStore.redo(), () => appStore.clearScene(), openRampAndBall]) {
      action()
      expect(revision()).toBeGreaterThan(last)
      last = revision()
    }
  })

  it('restores the scene name and physics of an earlier scene', () => {
    appStore.setSceneName('Before')
    appStore.setPhysics({ gravity: 5 })
    openRampAndBall()
    expect(state()).toMatchObject({ sceneName: 'Ramp & Ball', exampleId: 'ramp-and-ball' })
    appStore.undo()
    expect(state().sceneName).toBe('Before')
    expect(state().physics.gravity).toBe(5)
    expect(state().objects).toHaveLength(0)
  })

  it('brings a cleared scene back', () => {
    openRampAndBall()
    appStore.clearScene()
    expect(state()).toMatchObject({ objects: [], sceneName: 'Untitled', exampleId: null })
    appStore.undo()
    expect(state().objects).toHaveLength(rampAndBall.objects.length)
  })
})

describe('settings', () => {
  it('clamps physics changes and ignores non-finite values', () => {
    appStore.setPhysics({ gravity: NaN, bounce: 99, friction: -1 })
    expect(state().physics).toMatchObject({ gravity: DEFAULT_PHYSICS.gravity, bounce: 1, friction: 0 })
  })

  it('trims scene names and falls back to Untitled', () => {
    appStore.setSceneName('  Cascade Demo  ')
    expect(state().sceneName).toBe('Cascade Demo')
    appStore.setSceneName('   ')
    expect(state().sceneName).toBe('Untitled')
  })

  it('marks balls that load already moving so Restart can put them back', () => {
    const moving = rampAndBall.objects.map((o) => (o.kind === 'ball' ? { ...o, dynamic: true } : o))
    appStore.loadScene({ ...rampAndBall, objects: moving }, { message: 'opened' })
    expect(balls()[0]!.releasedFrom).toEqual(balls()[0]!.position)
  })
})

describe('editing a selected shape', () => {
  const select = (kind: SceneObject['kind']) => {
    const object = state().objects.find((o) => o.kind === kind)!
    appStore.selectAt(screenPointOf(object))
    expect(state().selectedId).toBe(object.id)
    return object
  }
  const current = (id: string) => state().objects.find((o) => o.id === id)!

  it('drags a shape as one undoable edit, and Undo puts it back', () => {
    openRampAndBall()
    const ramp = select('ramp')
    const before = state().undoStack.length
    expect(appStore.beginMove()).toBe(true)
    appStore.moveBy(0.5, 0.2)
    appStore.moveBy(1, -0.5)
    appStore.endMove()
    expect(current(ramp.id)).toMatchObject({ start: { x: ramp.kind === 'ramp' ? ramp.start.x + 1 : 0 } })
    expect(state().undoStack).toHaveLength(before + 1)
    expect(state().statusMessage).toBe('Moved ramp.')
    appStore.undo()
    expect(current(ramp.id)).toEqual(ramp)
  })

  it('snaps the dragged shape to the half-unit grid with Shift, and a drag that ends where it began is no edit', () => {
    openRampAndBall()
    const platform = select('platform')
    appStore.beginMove()
    appStore.moveBy(0.13, 0.31, true)
    const moved = current(platform.id)
    expect(moved.kind === 'platform' && moved.center.x * 2).toBeCloseTo(Math.round(moved.kind === 'platform' ? moved.center.x * 2 : 0))
    appStore.moveBy(0, 0)
    const before = state().undoStack.length
    appStore.endMove()
    expect(state().undoStack).toHaveLength(before)
  })

  it('cancels a drag without leaving a trace, and refuses to move a released ball', () => {
    openRampAndBall()
    const platform = select('platform')
    appStore.beginMove()
    appStore.moveBy(2, 2)
    appStore.cancelMove()
    expect(current(platform.id)).toEqual(platform)
    appStore.drop()
    select('ball')
    expect(appStore.beginMove()).toBe(false)
    appStore.nudgeSelected(1, 0)
    expect(state().statusMessage).toMatch(/Freeze or Restart to move it/)
  })

  it('lifts a ball dragged into a platform just clear of it', () => {
    openRampAndBall()
    const ball = select('ball')
    const cupFloor = state().objects.find((o) => o.id === 'cup-floor')!
    if (cupFloor.kind !== 'platform' || ball.kind !== 'ball') throw new Error('unexpected scene')
    appStore.beginMove()
    appStore.moveBy(cupFloor.center.x - ball.position.x, cupFloor.center.y - ball.position.y)
    appStore.endMove()
    const placed = current(ball.id)
    if (placed.kind !== 'ball') throw new Error('expected a ball')
    expect(placed.position.x).toBeCloseTo(cupFloor.center.x)
    expect(placed.position.y).toBeGreaterThan(cupFloor.center.y + cupFloor.halfExtents.y + ball.radius)
    expect(placed.position.y).toBeLessThan(cupFloor.center.y + cupFloor.halfExtents.y + ball.radius + 0.3)
  })

  it('nudges, rotates, and duplicates, one undo step each', () => {
    openRampAndBall()
    const platform = select('platform')
    if (platform.kind !== 'platform') throw new Error('expected a platform')
    const before = state().undoStack.length
    appStore.nudgeSelected(0.1, 0)
    appStore.rotateSelected(Math.PI / 12)
    expect(current(platform.id)).toMatchObject({ center: { x: platform.center.x + 0.1 }, rotationZ: platform.rotationZ + Math.PI / 12 })
    expect(state().statusMessage).toBe('Rotated platform 15° counterclockwise.')
    appStore.duplicateSelected()
    expect(state().objects).toHaveLength(rampAndBall.objects.length + 1)
    expect(state().selectedId).not.toBe(platform.id)
    expect(state().undoStack).toHaveLength(before + 3)
    select('ball')
    appStore.rotateSelected(0.5)
    expect(state().statusMessage).toBe('Balls have no orientation to change.')
  })

  it('will not duplicate past the object limit', () => {
    openRampAndBall()
    select('platform')
    while (state().objects.length < MAX_OBJECTS) appStore.duplicateSelected()
    appStore.duplicateSelected()
    expect(state().objects).toHaveLength(MAX_OBJECTS)
    expect(state().statusMessage).toMatch(/limited to 40 objects/)
  })
})

