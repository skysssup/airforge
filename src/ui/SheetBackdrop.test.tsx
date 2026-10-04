// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { SheetBackdrop } from './SheetBackdrop'
import { appStore } from '../store/appStore'
import { viewBoundsFor } from '../coords/camera'
import { worldToScreen } from '../coords/transforms'
import { GROUND_TOP_Y } from '../physics/params'
import { EXAMPLES, loadExampleScene } from '../examples'

beforeEach(() => appStore._resetForTests())
afterEach(cleanup)

it('draws the floor and both walls where the colliders are', () => {
  const view = viewBoundsFor(1280, 720)
  appStore.setView(view)
  const { container } = render(<SheetBackdrop />)
  const floor = Math.round(worldToScreen({ x: 0, y: GROUND_TOP_Y }, view).y) + 0.5
  expect(container.querySelector('.ground-edge')!.getAttribute('d')).toMatch(new RegExp(`V${floor}H\\d`))
  expect(container.querySelectorAll('rect.ground')).toHaveLength(3)
})

it('leaves out walls that are outside a narrow view', () => {
  appStore.setView({ ...viewBoundsFor(1280, 720), worldHalfWidth: 6 })
  const { container } = render(<SheetBackdrop />)
  expect(container.querySelectorAll('rect.ground')).toHaveLength(1)
})

it('casts soft shadows for ramps and platforms but not for balls', () => {
  appStore.setView(viewBoundsFor(1280, 720))
  const { container } = render(<SheetBackdrop />)
  expect(container.querySelectorAll('.shadows rect')).toHaveLength(0)
  const scene = loadExampleScene(EXAMPLES[0]!)
  act(() => appStore.loadScene(scene, { message: 'opened' }))
  const solids = scene.objects.filter((o) => o.kind !== 'ball').length
  expect(container.querySelectorAll('.shadows rect')).toHaveLength(solids)
})

it('casts a round-ended shadow along a curve', () => {
  appStore.setView(viewBoundsFor(1280, 720))
  const { container } = render(<SheetBackdrop />)
  const scene = loadExampleScene(EXAMPLES.find((e) => e.id === 'half-pipe')!)
  act(() => appStore.loadScene(scene, { message: 'opened' }))
  const shadow = container.querySelector('.shadows path.curve-shadow')!
  const pipe = scene.objects.find((o) => o.kind === 'curve')!
  expect(shadow.getAttribute('d')!.split('L')).toHaveLength(pipe.kind === 'curve' ? pipe.points.length : 0)
  expect(container.querySelectorAll('.shadows rect')).toHaveLength(0)
})

it('draws a grid line for every world unit, with heavier lines every four', () => {
  const view = viewBoundsFor(1280, 720)
  appStore.setView(view)
  const { container } = render(<SheetBackdrop />)
  const segments = (selector: string) => container.querySelector(selector)!.getAttribute('d')!.split('M').length - 1
  const columns = Math.floor(view.worldHalfWidth) * 2 + 1
  const rows = Math.floor(view.centerY + view.worldHalfHeight) - Math.ceil(view.centerY - view.worldHalfHeight) + 1
  expect(segments('.minor') + segments('.major')).toBe(columns + rows)
  expect(segments('.major')).toBe(5 + 3)
})
