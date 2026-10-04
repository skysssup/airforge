/**
 * Rapier world built from the same layout as render/PhysicsWorld and stepped
 * at the same fixed rate, so tests can check what a scene does after Drop.
 */

import RAPIER from '@dimforge/rapier3d-compat'
import type { SceneObject } from '../scene/objects'
import type { PhysicsParams } from '../physics/params'
import type { Vec3 } from '../events/types'
import { BALL_DAMPING, BOUNDARY, TIME_STEP, boxFor, capsulesFor, type Box, type Capsule } from '../physics/world'

export interface HeadlessWorld {
  run(seconds: number): void
  position(id: string): Vec3
  free(): void
}

export async function createHeadlessWorld(objects: SceneObject[], physics: PhysicsParams): Promise<HeadlessWorld> {
  await RAPIER.init()
  const world = new RAPIER.World({ x: 0, y: -physics.gravity, z: 0 })
  world.timestep = TIME_STEP

  const addBox = (box: Box) => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
      .setTranslation(box.center.x, box.center.y, box.center.z)
      .setRotation({ x: 0, y: 0, z: Math.sin(box.rotationZ / 2), w: Math.cos(box.rotationZ / 2) }))
    world.createCollider(RAPIER.ColliderDesc.cuboid(box.halfExtents.x, box.halfExtents.y, box.halfExtents.z)
      .setFriction(physics.friction)
      .setRestitution(physics.bounce), body)
  }

  const addCapsule = (capsule: Capsule) => {
    const angle = capsule.rotationZ - Math.PI / 2
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
      .setTranslation(capsule.center.x, capsule.center.y, capsule.center.z)
      .setRotation({ x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) }))
    world.createCollider(RAPIER.ColliderDesc.capsule(capsule.halfLength, capsule.radius)
      .setFriction(physics.friction)
      .setRestitution(physics.bounce), body)
  }

  BOUNDARY.forEach(addBox)
  const balls = new Map<string, RAPIER.RigidBody>()
  for (const object of objects) {
    if (object.kind === 'curve') {
      capsulesFor(object).forEach(addCapsule)
      continue
    }
    if (object.kind !== 'ball') {
      addBox(boxFor(object))
      continue
    }
    const desc = object.dynamic ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.kinematicPositionBased()
    const body = world.createRigidBody(desc
      .setTranslation(object.position.x, object.position.y, object.position.z)
      .setLinearDamping(BALL_DAMPING)
      .setAngularDamping(BALL_DAMPING)
      .enabledTranslations(true, true, false))
    world.createCollider(RAPIER.ColliderDesc.ball(object.radius)
      .setFriction(physics.friction)
      .setRestitution(physics.bounce), body)
    balls.set(object.id, body)
  }

  return {
    run(seconds) {
      for (let i = Math.round(seconds / TIME_STEP); i > 0; i--) world.step()
    },
    position(id) {
      const body = balls.get(id)
      if (!body) throw new Error(`No ball with id ${id}`)
      const { x, y, z } = body.translation()
      return { x, y, z }
    },
    free() {
      world.free()
    },
  }
}
