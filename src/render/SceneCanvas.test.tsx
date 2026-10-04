// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Children, isValidElement, useEffect, type ReactNode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { PerspectiveCamera } from 'three'
import { SceneCanvas } from './SceneCanvas'
import { appStore } from '../store/appStore'

const world = vi.hoisted(() => ({ mounts: 0, renders: 0, props: null as unknown, canvasError: null as Error | null }))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) => {
    if (world.canvasError) throw world.canvasError
    return Children.toArray(children).filter((child) => isValidElement(child) && typeof child.type !== 'string')
  },
  useThree: (select: (state: unknown) => unknown) => select({ camera: new PerspectiveCamera(), size: { width: 1280, height: 720 } }),
}))
vi.mock('./PhysicsWorld', () => ({
  PhysicsWorld: (props: unknown) => {
    world.renders += 1
    world.props = props
    useEffect(() => {
      world.mounts += 1
    }, [])
    return null
  },
}))

beforeEach(() => {
  appStore._resetForTests()
  Object.assign(world, { mounts: 0, renders: 0, props: null, canvasError: null })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('keeps the physics world running through edits and rebuilds it when the scene is replaced', () => {
  render(<SceneCanvas />)
  expect(world.mounts).toBe(1)

  act(() => {
    appStore.addBall()
    appStore.drop()
    appStore.setStatus('Unrelated message')
    appStore.setLiveStroke([{ x: 1, y: 1 }, { x: 50, y: 50 }])
    appStore.setPhysics({ bounce: 0.9 })
  })
  expect(world.mounts).toBe(1)
  expect(world.props).toMatchObject({ physics: { bounce: 0.9 }, objects: appStore.getState().objects })

  act(() => appStore.undo())
  expect(world.mounts).toBe(2)
  act(() => appStore.redo())
  expect(world.mounts).toBe(3)
})

it('re-renders the 3D scene only for state it draws', () => {
  render(<SceneCanvas />)
  const renders = world.renders
  act(() => {
    appStore.setStatus('Unrelated message')
    appStore.setLiveStroke([{ x: 1, y: 1 }, { x: 50, y: 50 }])
    appStore.setGestureLabel('Webcam · drawing')
  })
  expect(world.renders).toBe(renders)
  act(() => appStore.addBall())
  expect(world.renders).toBe(renders + 1)
})

it('explains what is missing when WebGL cannot start', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  world.canvasError = new Error('Error creating WebGL context.')
  render(<SceneCanvas />)
  expect(screen.getByRole('alert').textContent).toMatch(/needs WebGL and WebAssembly.*Error creating WebGL context/)
})
