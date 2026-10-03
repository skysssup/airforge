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
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('focuses Tutorial and contains forward and backward tab navigation', async () => {
  const user = userEvent.setup()
  appStore.showTutorial()
  const { container } = render(<StrictMode><App /></StrictMode>)
  const start = screen.getByRole('button', { name: 'Start forging' })
  const demo = screen.getByRole('button', { name: 'Load Ramp & Ball demo' })
  expect(document.activeElement).toBe(start)
  expect(container.querySelector('.app-shell')!.hasAttribute('inert')).toBe(true)
  expect(screen.queryByRole('toolbar')).toBeNull()

  await user.tab({ shift: true })
  expect(document.activeElement).toBe(demo)
  await user.tab()
  expect(document.activeElement).toBe(start)
  await user.tab()
  expect(document.activeElement).toBe(demo)
  await user.tab()
  expect(document.activeElement).toBe(start)
  await user.keyboard('drfz')
  expect(appStore.getState().objects).toHaveLength(0)

  await user.keyboard('{Enter}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(container.querySelector('.app-shell')!.hasAttribute('inert')).toBe(false)
  expect(screen.getByRole('toolbar')).toBeTruthy()
  expect(document.activeElement).toBe(document.body)
  await user.tab()
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Scene name' }))
})

it.each(['{Escape}', '{Enter}', ' '])('restores the Help opener when closed with %s', async key => {
  const user = userEvent.setup()
  appStore.loadRampAndBall()
  const { container } = render(<StrictMode><App /></StrictMode>)
  const help = screen.getByRole('button', { name: 'Help' })
  await user.click(help)
  const close = screen.getByRole('button', { name: 'Close' })
  expect(document.activeElement).toBe(close)
  expect(container.querySelector('.app-shell')!.hasAttribute('inert')).toBe(true)
  await user.tab()
  expect(document.activeElement).toBe(close)
  await user.tab({ shift: true })
  expect(document.activeElement).toBe(close)
  expect(screen.getByText('F')).toBeTruthy()
  expect(screen.getByText('Esc')).toBeTruthy()

  act(() => help.focus())
  expect(document.activeElement).toBe(close)
  await user.keyboard('rzdf')
  expect(appStore.getState().objects).toHaveLength(3)
  await user.keyboard(key)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(help)
  expect(container.querySelector('.app-shell')!.hasAttribute('inert')).toBe(false)
  expect(appStore.getState().physics.paused).toBe(false)
})

it('suspends webcam input behind Help and resumes it after closing', async () => {
  const user = userEvent.setup()
  appStore.setWebcamEnabled(true)
  render(<App />)
  expect(screen.getByText('Camera active')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Help' }))
  expect(screen.queryByText('Camera active')).toBeNull()
  await user.keyboard('{Escape}')
  expect(screen.getByText('Camera active')).toBeTruthy()
})
