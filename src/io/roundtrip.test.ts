import { beforeEach, expect, it } from 'vitest'
import RAPIER from '@dimforge/rapier3d-compat'
import { appStore } from '../store/appStore'
import { viewBoundsFor } from '../coords/camera'
import { setLiveBallPose } from '../physics/livePoses'
import { GROUND_HALF_HEIGHT, GROUND_Y } from '../physics/params'
import { rampPose } from '../scene/objects'
import { exportSceneJson, importSceneJson } from './serialize'

beforeEach(() => appStore._resetForTests())

it.each([[2560, 720], [390, 844], [320, 1600], [4096, 256]])(
  'preserves drawn geometry through save/import at %ix%i',
  (width, height) => {
    appStore.setView(viewBoundsFor(width, height))
    appStore.createFromCandidate({
      kind: 'line', quality: 1, metrics: {},
      params: { x1: width * 0.8, y1: height * 0.2, x2: width * 0.95, y2: height * 0.2 },
    })
    appStore.createFromCandidate({
      kind: 'circle', quality: 1, metrics: {},
      params: { cx: width * 0.1, cy: height * 0.1, radius: 30 },
    })
    appStore.createFromCandidate({
      kind: 'rectangle', quality: 1, metrics: {},
      params: { corners: [
        { x: width * 0.8, y: height * 0.6 },
        { x: width * 0.9, y: height * 0.6 },
        { x: width * 0.9, y: height * 0.7 },
        { x: width * 0.8, y: height * 0.7 },
      ] },
    })
    const { objects, physics, sceneName } = appStore.getState()
    expect(objects).toHaveLength(3)
    const result = importSceneJson(exportSceneJson(sceneName, objects, physics))
    if (!result.ok) throw new Error(result.error)
    expect(result.objects).toEqual(objects)
    expect(result.physics).toEqual(physics)
  },
)

it.each([120, 600])('preserves a frozen ball after %i real physics steps', async steps => {
  await RAPIER.init()
  appStore.loadRampAndBall()
  appStore.dropBall()
  const { objects, physics } = appStore.getState()
  const world = new RAPIER.World({ x: 0, y: -physics.gravity, z: 0 })
  try {
    const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, GROUND_Y, 0))
    world.createCollider(RAPIER.ColliderDesc.cuboid(20, GROUND_HALF_HEIGHT, 4).setFriction(physics.friction).setRestitution(physics.bounce * 0.3), ground)
    for (const object of objects) {
      if (object.kind === 'ball') continue
      const pose = object.kind === 'ramp' ? rampPose(object) : object
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(pose.center.x, pose.center.y, pose.center.z)
        .setRotation({ x: 0, y: 0, z: Math.sin(pose.rotationZ / 2), w: Math.cos(pose.rotationZ / 2) }))
      const half = object.kind === 'ramp'
        ? { x: rampPose(object).length / 2, y: object.width, z: object.thickness / 2 }
        : object.halfExtents
      world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z)
        .setFriction(physics.friction).setRestitution(physics.bounce * (object.kind === 'ramp' ? 0.4 : 0.35)), body)
    }
    const ball = objects.find(o => o.kind === 'ball')!
    if (ball.kind !== 'ball') throw new Error('Expected a ball')
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(ball.position.x, ball.position.y, ball.position.z)
      .setLinearDamping(0.05).setAngularDamping(0.05).enabledTranslations(true, true, false))
    world.createCollider(RAPIER.ColliderDesc.ball(ball.radius).setMass(1)
      .setFriction(physics.friction).setRestitution(physics.bounce), body)
    for (let i = 0; i < steps; i++) world.step()
    expect(body.translation().y).toBeLessThan(ball.position.y)
    setLiveBallPose(ball.id, body.translation())
    appStore.freezeBalls()
    const frozen = appStore.getState()
    const result = importSceneJson(exportSceneJson(frozen.sceneName, frozen.objects, frozen.physics))
    if (!result.ok) throw new Error(result.error)
    expect(result.objects).toEqual(frozen.objects)
  } finally {
    world.free()
  }
})
