// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { Children, isValidElement, useEffect, useState, type ReactNode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RAPIER from '@dimforge/rapier3d-compat'
import { PerspectiveCamera } from 'three'
import { SceneCanvas } from './SceneCanvas'
import { ReplayPanel } from '../ui/ReplayPanel'
import { appStore } from '../store/appStore'
import { setLiveBallPose } from '../physics/livePoses'
import type { SceneObject } from '../scene/objects'
import type { PhysicsParams } from '../physics/params'

const simulation = vi.hoisted(() => ({
  world: null as RAPIER.World | null,
  ball: null as RAPIER.RigidBody | null,
  paused: false,
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) => Children.toArray(children).filter(child =>
    isValidElement(child) && typeof child.type !== 'string',
  ),
  useThree: (select: (state: unknown) => unknown) => select({ camera: new PerspectiveCamera(), size: { width: 1280, height: 720 } }),
}))
vi.mock('@react-three/drei', () => ({ Grid: () => null }))
vi.mock('./InkOverlay', () => ({ InkOverlay: () => null }))
vi.mock('./PhysicsWorld', () => ({
  PhysicsWorld: ({ objects, physics }: { objects: SceneObject[]; physics: PhysicsParams }) => {
    simulation.paused = physics.paused
    const [initial] = useState({ objects, gravity: physics.gravity })
    useEffect(() => {
      const world = new RAPIER.World({ x: 0, y: -initial.gravity, z: 0 })
      const ball = initial.objects.find(o => o.kind === 'ball')!
      if (ball.kind !== 'ball') throw new Error('Expected a ball')
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(ball.position.x, ball.position.y, ball.position.z))
      world.createCollider(RAPIER.ColliderDesc.ball(ball.radius), body)
      simulation.world = world
      simulation.ball = body
      return () => { world.free() }
    }, [initial])
    return null
  },
}))

function Viewer() {
  const [open, setOpen] = useState(false)
  return <>
    <SceneCanvas />
    <button onClick={() => setOpen(true)}>Open replay</button>
    {open && <ReplayPanel onClose={() => setOpen(false)} />}
  </>
}

beforeAll(async () => { await RAPIER.init() })
beforeEach(() => {
  appStore._resetForTests()
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('recreates the physical world when snapshot positions equal stale render props', async () => {
  const user = userEvent.setup()
  appStore.dropBall()
  const ball = appStore.getState().objects[0]!
  if (ball.kind !== 'ball') throw new Error('Expected a ball')
  render(<Viewer />)
  const firstBody = simulation.ball!
  for (let i = 0; i < 30; i++) simulation.world!.step()
  const livePosition = { ...firstBody.translation() }
  expect(livePosition.y).toBeLessThan(ball.position.y)
  expect(appStore.getState().objects[0]).toBe(ball)
  setLiveBallPose(ball.id, livePosition)

  await user.click(screen.getByRole('button', { name: 'Open replay' }))
  expect(simulation.paused).toBe(true)
  expect(appStore.getState().objects[0]).toBe(ball)
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(simulation.ball).not.toBe(firstBody)
  expect({ ...simulation.ball!.translation() }).toEqual(ball.position)
  expect(simulation.paused).toBe(true)

  const snapshotBody = simulation.ball
  await user.click(screen.getByRole('button', { name: 'Restart' }))
  expect(simulation.ball).not.toBe(snapshotBody)
  expect({ ...simulation.ball!.translation() }).toEqual(ball.position)

  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect({ ...simulation.ball!.translation() }).toEqual(livePosition)
  expect(simulation.paused).toBe(false)
  act(() => appStore.setStatus('Unrelated UI update'))
  expect({ ...simulation.ball!.translation() }).toEqual(livePosition)
})
