/** Bundled example scenes (including ramp-and-ball hero). */

import type { SceneObject } from '../scene/objects'
import type { PhysicsParams } from '../physics/params'
import { DEFAULT_PHYSICS } from '../physics/params'
import { serializeScene, type SerializedObject } from '../io/schema'
import { objectsToSerialized } from '../io/serialize'

export interface ExampleScene {
  id: string
  name: string
  description: string
  physics: PhysicsParams
  objects: SceneObject[]
}

export const rampAndBall: ExampleScene = {
  id: 'ramp-and-ball',
  name: 'Ramp & Ball',
  description: 'Classic hero demo: diagonal ramp with a ball ready to drop.',
  physics: { ...DEFAULT_PHYSICS },
  objects: [
    {
      id: 'ramp_demo_1',
      kind: 'ramp',
      createdAt: 0,
      start: { x: -5, y: 2.2, z: 0 },
      end: { x: 3.5, y: -2.5, z: 0 },
      width: 0.28,
      thickness: 0.35,
    },
    {
      id: 'ball_demo_1',
      kind: 'ball',
      createdAt: 0,
      position: { x: -4.2, y: 3.2, z: 0 },
      radius: 0.35,
      dynamic: false,
    },
    {
      id: 'platform_demo_catch',
      kind: 'platform',
      createdAt: 0,
      center: { x: 4.5, y: -3.2, z: 0 },
      halfExtents: { x: 1.8, y: 0.12, z: 0.2 },
      rotationZ: 0,
    },
  ],
}

export const doubleRamp: ExampleScene = {
  id: 'double-ramp',
  name: 'Double Ramp',
  description: 'Two ramps forming a valley with a ball at the top.',
  physics: { ...DEFAULT_PHYSICS, bounce: 0.45 },
  objects: [
    {
      id: 'ramp_l',
      kind: 'ramp',
      createdAt: 0,
      start: { x: -6, y: 1.5, z: 0 },
      end: { x: -0.5, y: -2, z: 0 },
      width: 0.28,
      thickness: 0.35,
    },
    {
      id: 'ramp_r',
      kind: 'ramp',
      createdAt: 0,
      start: { x: 6, y: 1.5, z: 0 },
      end: { x: 0.5, y: -2, z: 0 },
      width: 0.28,
      thickness: 0.35,
    },
    {
      id: 'ball_top',
      kind: 'ball',
      createdAt: 0,
      position: { x: -5.2, y: 2.8, z: 0 },
      radius: 0.35,
      dynamic: false,
    },
  ],
}

export const flatTable: ExampleScene = {
  id: 'flat-table',
  name: 'Flat Table',
  description: 'A wide platform — drop balls and tweak bounce/friction.',
  physics: { ...DEFAULT_PHYSICS, friction: 0.8 },
  objects: [
    {
      id: 'table_1',
      kind: 'platform',
      createdAt: 0,
      center: { x: 0, y: -1.5, z: 0 },
      halfExtents: { x: 5, y: 0.15, z: 0.25 },
      rotationZ: 0,
    },
    {
      id: 'ball_table',
      kind: 'ball',
      createdAt: 0,
      position: { x: -2, y: 2, z: 0 },
      radius: 0.35,
      dynamic: false,
    },
  ],
}

export const EXAMPLE_SCENES: ExampleScene[] = [rampAndBall, doubleRamp, flatTable]

export function exampleToJson(scene: ExampleScene): string {
  const serialized: SerializedObject[] = objectsToSerialized(scene.objects)
  return serializeScene(scene.name, serialized, scene.physics)
}
