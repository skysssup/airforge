// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { appStore } from '../store/appStore'

vi.mock('../render/SceneCanvas', () => ({ SceneCanvas: () => null }))
vi.mock('./WebcamPanel', () => ({ WebcamPanel: ({ active }: { active: boolean }) => active ? <div>Camera active</div> : null }))

beforeEach(() => {
  appStore._resetForTests()
  window.history.replaceState(null, '', '/airforge/')
})
afterEach(cleanup)

it('focuses the welcome dialog, keeps Tab inside it, and blocks scene shortcuts behind it', async () => {
  const user = userEvent.setup()
  appStore._resetForTests({ tutorialDismissed: false })
  const { container } = render(<StrictMode><App /></StrictMode>)
  const start = screen.getByRole('button', { name: 'Start drawing' })
  const example = screen.getByRole('button', { name: 'Open the Ramp & Ball example' })
  expect(document.activeElement).toBe(start)
  expect(container.querySelector('.app')!.hasAttribute('inert')).toBe(true)
  expect(screen.queryAllByRole('toolbar')).toHaveLength(0)

  await user.tab({ shift: true })
  expect(document.activeElement).toBe(example)
  await user.tab()
  expect(document.activeElement).toBe(start)
  await user.keyboard('drfz')
  expect(appStore.getState().objects).toHaveLength(0)

  await user.keyboard('{Enter}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(container.querySelector('.app')!.hasAttribute('inert')).toBe(false)
  expect(screen.getByRole('toolbar', { name: 'Simulation' })).toBeTruthy()
  expect(localStorage.getItem('airforge.tutorialDismissed')).toBe('1')
})

it('opens the first example from the welcome dialog', async () => {
  const user = userEvent.setup()
  appStore._resetForTests({ tutorialDismissed: false })
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Open the Ramp & Ball example' }))
  expect(appStore.getState()).toMatchObject({ sceneName: 'Ramp & Ball', tutorialDismissed: true })
  expect(screen.getByRole('complementary', { name: 'About the Ramp & Ball example' }).textContent).toMatch(/settles in the cup/)
  expect(window.location.search).toBe('?example=ramp-and-ball')
})

it('closes the welcome dialog with Escape', async () => {
  const user = userEvent.setup()
  appStore._resetForTests({ tutorialDismissed: false })
  render(<App />)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
})

it.each(['{Escape}', '{Enter}', ' '])('restores focus to the Help button when Help closes with %s', async (key) => {
  const user = userEvent.setup()
  const { container } = render(<StrictMode><App /></StrictMode>)
  const help = screen.getByRole('button', { name: 'Help' })
  await user.click(help)
  const close = screen.getByRole('button', { name: 'Close' })
  expect(document.activeElement).toBe(close)
  expect(container.querySelector('.app')!.hasAttribute('inert')).toBe(true)
  await user.tab()
  expect(document.activeElement).toBe(close)
  expect(screen.getByRole('dialog').textContent).toMatch(/Restart: put released balls back/)

  act(() => help.focus())
  expect(document.activeElement).toBe(close)
  await user.keyboard('drz')
  expect(appStore.getState().objects).toHaveLength(0)
  await user.keyboard(key)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(help)
  expect(container.querySelector('.app')!.hasAttribute('inert')).toBe(false)
  expect(appStore.getState().physics.paused).toBe(false)
})

it('toggles Help with ? and suspends webcam input while it is open', async () => {
  const user = userEvent.setup()
  appStore.setWebcamEnabled(true)
  render(<App />)
  expect(screen.getByText('Camera active')).toBeTruthy()
  await user.keyboard('?')
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(screen.queryByText('Camera active')).toBeNull()
  await user.keyboard('?')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText('Camera active')).toBeTruthy()
})

it('closes the example notes', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Examples' }))
  await user.click(screen.getByRole('menuitem', { name: 'Zigzag' }))
  expect(screen.getByRole('complementary', { name: 'About the Zigzag example' }).textContent).toMatch(/^Example 02\/06Zigzag Three ramps/)
  await user.click(screen.getByRole('button', { name: 'Close example notes' }))
  expect(screen.queryByRole('complementary', { name: /About the/ })).toBeNull()
  expect(appStore.getState().sceneName).toBe('Zigzag')
})
