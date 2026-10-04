// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { createElement } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { appStore } from '../store/appStore'
import { EXAMPLES, loadExampleScene } from '../examples'
import { StatusBar } from './StatusBar'

beforeEach(() => appStore._resetForTests())
afterEach(cleanup)

it('counts shapes with correct singular and plural wording', () => {
  const rampAndBall = loadExampleScene(EXAMPLES[0]!)
  appStore.loadScene({ ...rampAndBall, objects: rampAndBall.objects.filter((o) => o.kind !== 'platform') }, { message: 'opened' })
  appStore.addBall()
  render(createElement(StatusBar))
  expect(screen.getByRole('contentinfo').textContent).toContain('1 ramp · 2 balls · 0 platforms (3/40)')
})

it('announces status messages politely', () => {
  render(createElement(StatusBar))
  act(() => appStore.setStatus('Dropped 3 balls.'))
  expect(screen.getByRole('status').textContent).toBe('Dropped 3 balls.')
})
