import { beforeEach, expect, it } from 'vitest'
import { appStore } from '../store/appStore'
import { viewBoundsFor } from '../coords/camera'
import { clearAllLiveBallPoses, setLiveBallPose } from '../physics/livePoses'
import { EXAMPLES, loadExampleScene } from '../examples'
import { createHeadlessWorld } from '../test/headlessWorld'
import { cleanCircle, cleanDiagonalLine, cleanRectangle } from '../test/strokes'
import { exportSceneJson, importSceneJson } from './serialize'
import type { BallObject } from '../scene/objects'

beforeEach(() => {
  appStore._resetForTests()
  clearAllLiveBallPoses()
})

function saveAndReopen() {
  const { name, objects, physics } = appStore.exportState()
  const result = importSceneJson(exportSceneJson(name, objects, physics))
  if (!result.ok) throw new Error(result.error)
  return result
}

it.each([[2560, 720], [390, 844], [320, 1600], [1280, 720]])(
  'preserves drawn geometry through Save and Open at %ix%i',
  (width, height) => {
    appStore.setView(viewBoundsFor(width, height))
    const scale = Math.min(width / 1280, height / 720)
    const fit = (points: { x: number; y: number }[]) => points.map((p) => ({ x: p.x * scale, y: p.y * scale }))
    appStore.endStroke(fit(cleanDiagonalLine()))
    appStore.endStroke(fit(cleanCircle(900, 200, 60)))
    appStore.endStroke(fit(cleanRectangle(200, 520, 320, 60)))
    const { objects, physics, sceneName } = appStore.getState()
    expect(objects.map((o) => o.kind)).toEqual(['ramp', 'ball', 'platform'])
    const reopened = saveAndReopen()
    expect(reopened.objects).toEqual(objects)
    expect(reopened.physics).toEqual(physics)
    expect(reopened.name).toBe(sceneName)
  },
)

it('saves a ball frozen after real physics steps exactly where Rapier left it', async () => {
  const scene = loadExampleScene(EXAMPLES[0]!)
  appStore.loadScene(scene, { message: 'opened' })
  appStore.drop()
  const { objects, physics } = appStore.getState()
  const world = await createHeadlessWorld(objects, physics)
  world.run(2)
  const ball = objects.find((o): o is BallObject => o.kind === 'ball')!
  const live = world.position(ball.id)
  world.free()
  expect(live.x).toBeGreaterThan(ball.position.x + 1)
  setLiveBallPose(ball.id, live)
  appStore.freezeBalls()
  const reopened = saveAndReopen()
  expect(reopened.objects.find((o) => o.id === ball.id)).toEqual({ ...ball, position: live, dynamic: false, releasedFrom: undefined })
  expect(reopened.objects).toEqual(appStore.getState().objects.map((o) => (o.kind === 'ball' ? { ...o, releasedFrom: undefined } : o)))
})

it('saves the live position of a ball that is still moving', () => {
  appStore.loadScene(loadExampleScene(EXAMPLES[0]!), { message: 'opened' })
  appStore.drop()
  const ball = appStore.getState().objects.find((o) => o.kind === 'ball')!
  setLiveBallPose(ball.id, { x: 3.5, y: -2.4, z: 0 })
  const saved = saveAndReopen().objects.find((o) => o.id === ball.id)
  expect(saved).toMatchObject({ dynamic: true, position: { x: 3.5, y: -2.4, z: 0 } })
})
