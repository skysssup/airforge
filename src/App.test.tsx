// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { appStore } from './store/appStore'
import { worldToScreen } from './coords/transforms'

vi.mock('./render/SceneCanvas', () => ({ SceneCanvas: () => null }))
vi.mock('./ui/WebcamPanel', () => ({ WebcamPanel: () => null }))

let systemDark = false
const systemListeners = new Set<() => void>()

beforeEach(() => {
  localStorage.clear()
  systemDark = false
  systemListeners.clear()
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('dark') && systemDark
    },
    addEventListener: (_: string, listener: () => void) => systemListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => systemListeners.delete(listener),
  }))
  appStore._resetForTests()
  window.history.replaceState(null, '', '/airforge/')
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.theme
})

function changeSystemTheme(dark: boolean) {
  systemDark = dark
  act(() => systemListeners.forEach((listener) => listener()))
}

it('applies the theme to the document and follows the system until the user picks one', async () => {
  const user = userEvent.setup()
  render(<App />)
  expect(document.documentElement.dataset.theme).toBe('light')
  changeSystemTheme(true)
  expect(document.documentElement.dataset.theme).toBe('dark')

  await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
  expect(document.documentElement.dataset.theme).toBe('light')
  changeSystemTheme(true)
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('opens the World panel above its button and closes it with Escape or an outside click', async () => {
  const user = userEvent.setup()
  render(<App />)
  const world = screen.getByRole('button', { name: 'World' })
  await user.click(world)
  expect(world.getAttribute('aria-expanded')).toBe('true')
  const slider = screen.getByRole('slider', { name: 'Bounce' })
  slider.focus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('region', { name: 'World' })).toBeNull()
  expect(document.activeElement).toBe(world)

  await user.click(world)
  expect(screen.getByRole('region', { name: 'World' })).toBeTruthy()
  fireEvent.pointerDown(document.querySelector('.stage')!)
  expect(screen.queryByRole('region', { name: 'World' })).toBeNull()

  await user.click(world)
  await user.click(screen.getByRole('button', { name: 'Close world settings' }))
  expect(world.getAttribute('aria-expanded')).toBe('false')
})

it('closes the World panel with Escape even when focus is elsewhere, and never under a dialog', async () => {
  const user = userEvent.setup()
  render(<App />)
  const world = screen.getByRole('button', { name: 'World' })
  await user.click(world)
  expect(document.activeElement).toBe(world)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('region', { name: 'World' })).toBeNull()

  await user.click(world)
  await user.keyboard('?')
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'World', hidden: true })).toBeNull()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('keeps the selection when Escape closes the World panel', async () => {
  const user = userEvent.setup()
  appStore.addBall()
  const ball = appStore.getState().objects[0]
  if (ball?.kind !== 'ball') throw new Error('Expected a ball')
  appStore.selectAt(worldToScreen(ball.position, appStore.getState().view))
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'World' }))
  screen.getByRole('slider', { name: 'Gravity' }).focus()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('region', { name: 'World' })).toBeNull()
  expect(appStore.getState().selectedId).toBe(ball.id)
  await user.keyboard('{Escape}')
  expect(appStore.getState().selectedId).toBeNull()
})

it('shows the stroke legend only while the sheet is empty', () => {
  render(<App />)
  expect(screen.getByText('Line → ramp')).toBeTruthy()
  act(() => appStore.addBall())
  expect(screen.queryByText('Line → ramp')).toBeNull()
  act(() => appStore.undo())
  expect(screen.getByText('Line → ramp')).toBeTruthy()
  act(() => appStore.beginStroke({ x: 10, y: 10 }))
  expect(screen.queryByText('Line → ramp')).toBeNull()
})
