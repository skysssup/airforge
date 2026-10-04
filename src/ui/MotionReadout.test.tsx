// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MotionReadout } from './MotionReadout'
import { appStore } from '../store/appStore'
import { setLiveBallMotion, setLiveBallPose } from '../physics/livePoses'
import { GROUND_TOP_Y } from '../physics/params'
import type { BallObject } from '../scene/objects'

const ball: BallObject = { id: 'b', kind: 'ball', createdAt: 0, position: { x: 0, y: 2, z: 0 }, radius: 0.35, dynamic: true, releasedFrom: { x: 0, y: 2, z: 0 } }

beforeEach(() => appStore._resetForTests({ motion: true }))
afterEach(cleanup)

it('stays hidden while motion marks are off', () => {
  appStore._resetForTests({ motion: false })
  const { container } = render(<MotionReadout />)
  expect(container.innerHTML).toBe('')
})

it('asks for a ball when it cannot tell which one to follow', () => {
  render(<MotionReadout />)
  expect(screen.getByRole('region', { name: 'Motion' }).textContent).toContain('Select a ball to read its time, speed, and height.')
})

it('shows the time, speed, and heights of the moving ball', () => {
  act(() => appStore.loadScene({ name: 'One ball', objects: [ball], physics: appStore.getState().physics }, { message: 'opened' }))
  setLiveBallPose('b', { x: 1, y: GROUND_TOP_Y + 2.35, z: 0 })
  setLiveBallMotion('b', { velocity: { x: 0, y: -2.5, z: 0 }, seconds: 0.8, highest: GROUND_TOP_Y + 3.35 })
  render(<MotionReadout />)
  const values = Array.from(document.querySelectorAll('.readings div'), (div) => div.textContent)
  expect(values).toEqual(['Time0.80 s', 'Speed2.50 u/s', 'Height2.00 u', 'Highest3.00 u'])
})
