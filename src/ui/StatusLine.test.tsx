// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { appStore } from '../store/appStore'
import { StatusLine } from './StatusLine'
import { DrawingOverlay } from './DrawingOverlay'
import { pointerStore } from './pointer'
import { worldToScreen } from '../coords/transforms'

beforeEach(() => {
  appStore._resetForTests()
  pointerStore.set(null)
})
afterEach(cleanup)

it('announces status messages politely', () => {
  render(<StatusLine />)
  act(() => appStore.setStatus('Dropped 3 balls.'))
  expect(screen.getByRole('status').textContent).toBe('Dropped 3 balls.')
})

it('shows the input mode and marks the webcam as live', () => {
  const { container } = render(<StatusLine />)
  expect(container.querySelector('.mode')!.textContent).toBe('Mouse')
  act(() => appStore.setWebcamEnabled(true))
  expect(container.querySelector('.mode')!.textContent).toBe('Webcam · starting')
  expect(container.querySelector('.dot.live')).not.toBeNull()
})

it('reads out the pointer position in world units while it is over the sheet', () => {
  const { container } = render(
    <>
      <DrawingOverlay enabled />
      <StatusLine />
    </>,
  )
  const coords = () => Array.from(container.querySelectorAll('.coords .value'), (v) => v.textContent)
  expect(coords()).toEqual(['–', '–'])

  const overlay = container.querySelector<HTMLElement>('.drawing-overlay')!
  const { view } = appStore.getState()
  const at = worldToScreen({ x: 2.5, y: -1.25 }, view)
  // jsdom lays nothing out, so the overlay's box starts at the origin.
  fireEvent.pointerMove(overlay, { clientX: at.x, clientY: at.y })
  expect(coords()).toEqual(['2.50', '-1.25'])
  fireEvent.pointerLeave(overlay)
  expect(coords()).toEqual(['–', '–'])
})

it('shows a pointer cursor over shapes, where a click selects', () => {
  appStore.addBall()
  const { container } = render(<DrawingOverlay enabled />)
  const overlay = container.querySelector<HTMLElement>('.drawing-overlay')!
  const ball = appStore.getState().objects[0]
  if (ball?.kind !== 'ball') throw new Error('Expected a ball')
  const at = worldToScreen(ball.position, appStore.getState().view)
  fireEvent.pointerMove(overlay, { clientX: at.x, clientY: at.y })
  expect(overlay.hasAttribute('data-over-shape')).toBe(true)
  fireEvent.pointerMove(overlay, { clientX: 1, clientY: 1 })
  expect(overlay.hasAttribute('data-over-shape')).toBe(false)
})
