// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopBar } from './TopBar'
import { EditControls, RunControls } from './Controls'
import { WorldPanel } from './WorldPanel'
import { appStore } from '../store/appStore'
import { DEFAULT_PHYSICS, GRAVITY_MAX, GRAVITY_MIN } from '../physics/params'
import { exportSceneJson } from '../io/serialize'
import { EXAMPLES, loadExampleScene } from '../examples'

const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name })

beforeEach(() => {
  appStore._resetForTests()
  localStorage.clear()
  window.history.replaceState(null, '', '/airforge/')
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderControls() {
  return render(
    <>
      <TopBar onOpenHelp={() => {}} />
      <EditControls />
      <RunControls />
      <WorldPanel onClose={() => {}} />
    </>,
  )
}

it('represents and edits the complete supported gravity range', () => {
  appStore.loadScene({ name: 'Gravity 40', objects: [], physics: { ...DEFAULT_PHYSICS, gravity: 40 } }, { message: 'opened' })
  renderControls()
  const slider = screen.getByRole<HTMLInputElement>('slider', { name: 'Gravity' })
  expect(slider.value).toBe('40')
  expect(slider.min).toBe(String(GRAVITY_MIN))
  expect(slider.max).toBe(String(GRAVITY_MAX))
  fireEvent.change(slider, { target: { value: String(GRAVITY_MAX) } })
  expect(appStore.getState().physics.gravity).toBe(GRAVITY_MAX)
  fireEvent.change(slider, { target: { value: String(GRAVITY_MIN) } })
  expect(appStore.getState().physics.gravity).toBe(GRAVITY_MIN)
})

it('opens an example from the menu and records it in the address bar', async () => {
  const user = userEvent.setup()
  renderControls()
  await user.click(button('Examples'))
  await user.click(screen.getByRole('menuitem', { name: 'Funnel' }))
  expect(screen.queryByRole('menu')).toBeNull()
  expect(appStore.getState()).toMatchObject({ sceneName: 'Funnel', exampleId: 'funnel' })
  expect(window.location.search).toBe('?example=funnel')
  expect(button('Drop (12)')).toBeTruthy()
  await user.click(button('Clear'))
  expect(window.location.search).toBe('')
})

it('describes each example in the menu and marks the open one', async () => {
  const user = userEvent.setup()
  appStore.loadScene(loadExampleScene(EXAMPLES[1]!), { exampleId: EXAMPLES[1]!.id, message: 'opened' })
  renderControls()
  await user.click(button('Examples'))
  const items = screen.getAllByRole('menuitem')
  expect(items).toHaveLength(EXAMPLES.length)
  expect(items[0]!.getAttribute('aria-describedby')).toBeTruthy()
  expect(screen.getByRole('menuitem', { name: 'Ramp & Ball', description: EXAMPLES[0]!.shows })).toBeTruthy()
  expect(items[1]!.getAttribute('aria-current')).toBe('true')
  expect(document.activeElement).toBe(items[1])
})

it('moves through the examples menu with the keyboard and returns focus on Escape', async () => {
  const user = userEvent.setup()
  renderControls()
  const examples = button('Examples')
  examples.focus()
  await user.keyboard('{ArrowDown}')
  const items = screen.getAllByRole('menuitem')
  expect(document.activeElement).toBe(items[0])
  await user.keyboard('{ArrowUp}')
  expect(document.activeElement).toBe(items.at(-1))
  await user.keyboard('{Home}{ArrowDown}')
  expect(document.activeElement).toBe(items[1])
  await user.keyboard('{End}')
  expect(document.activeElement).toBe(items.at(-1))
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('menu')).toBeNull()
  expect(document.activeElement).toBe(examples)
  expect(examples.getAttribute('aria-expanded')).toBe('false')
})

it('closes the examples menu on an outside click', async () => {
  const user = userEvent.setup()
  renderControls()
  await user.click(button('Examples'))
  expect(screen.getByRole('menu')).toBeTruthy()
  await user.click(document.body)
  expect(screen.queryByRole('menu')).toBeNull()
})

it('enables actions only when they can do something', async () => {
  const user = userEvent.setup()
  renderControls()
  for (const name of ['Restart', 'Freeze', 'Undo', 'Redo', 'Delete', 'Clear']) expect(button(name).disabled, name).toBe(true)
  await user.click(button('Add ball'))
  expect(button('Undo').disabled).toBe(false)
  expect(button('Clear').disabled).toBe(false)
  await user.click(button('Drop (1)'))
  expect(button('Restart').disabled).toBe(false)
  expect(button('Freeze').disabled).toBe(false)
  await user.click(button('Restart'))
  expect(button('Drop (1)')).toBeTruthy()
  await user.click(button('Undo'))
  expect(button('Redo').disabled).toBe(false)
})

it('shows Pause as a toggle', async () => {
  const user = userEvent.setup()
  renderControls()
  const pause = button('Pause')
  expect(pause.getAttribute('aria-pressed')).toBe('false')
  await user.click(pause)
  expect(appStore.getState().physics.paused).toBe(true)
  expect(pause.getAttribute('aria-pressed')).toBe('true')
})

it('turns motion marks on and off from the Simulation toolbar and remembers the choice', async () => {
  const user = userEvent.setup()
  appStore._resetForTests({ motion: false })
  renderControls()
  const motion = button('Motion')
  expect(motion.getAttribute('aria-pressed')).toBe('false')
  await user.click(motion)
  expect(motion.getAttribute('aria-pressed')).toBe('true')
  expect(localStorage.getItem('airforge.motion')).toBe('1')
  expect(appStore.getState().statusMessage).toMatch(/^Motion marks on/)
  await user.click(motion)
  expect(appStore.getState().motion).toBe(false)
  expect(localStorage.getItem('airforge.motion')).toBe('0')
})

it('switches the theme and remembers the choice', async () => {
  const user = userEvent.setup()
  appStore._resetForTests({ theme: 'light' })
  renderControls()
  await user.click(button('Switch to dark theme'))
  expect(appStore.getState().theme).toBe('dark')
  expect(localStorage.getItem('airforge.theme')).toBe('dark')
  await user.click(button('Switch to light theme'))
  expect(appStore.getState().theme).toBe('light')
  expect(localStorage.getItem('airforge.theme')).toBe('light')
})

it('lists what the scene contains in the World panel', () => {
  const rampAndBall = loadExampleScene(EXAMPLES[0]!)
  appStore.loadScene({ ...rampAndBall, objects: rampAndBall.objects.filter((o) => o.kind !== 'platform') }, { message: 'opened' })
  appStore.addBall()
  renderControls()
  const counts = Array.from(document.querySelectorAll('.counts div'), (div) => div.textContent)
  expect(counts).toEqual(['Ramp1', 'Balls2', 'Platforms0', 'Curves0', 'Limit3/40'])
})

it('saves the scene as a JSON download named after the scene', async () => {
  const user = userEvent.setup()
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:scene')
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('ramp-ball.json')
    expect(this.isConnected).toBe(true)
  })
  appStore.loadScene(loadExampleScene(EXAMPLES[0]!), { message: 'opened' })
  renderControls()
  await user.click(button('Save'))
  expect(click).toHaveBeenCalledTimes(1)
  const saved = JSON.parse(await createObjectURL.mock.calls[0]![0].text())
  expect(saved).toMatchObject({ format: 'airforge-scene', version: 1, name: 'Ramp & Ball' })
  expect(appStore.getState().statusMessage).toBe('Saved ramp-ball.json.')
})

it('opens a scene file and reports files it cannot use', async () => {
  const user = userEvent.setup()
  const { container } = renderControls()
  const input = container.querySelector<HTMLInputElement>('input[type=file]')!
  const scene = exportSceneJson('From disk', loadExampleScene(EXAMPLES[0]!).objects, DEFAULT_PHYSICS)
  await user.upload(input, new File([scene], 'saved.json', { type: 'application/json' }))
  await waitFor(() => expect(appStore.getState().sceneName).toBe('From disk'))
  expect(appStore.getState().statusMessage).toBe('Opened “From disk” from saved.json.')

  await user.upload(input, new File(['{"format":"other"}'], 'broken.json', { type: 'application/json' }))
  await waitFor(() => expect(appStore.getState().statusMessage).toMatch(/^Could not open broken.json: Missing or invalid format/))
  expect(appStore.getState().sceneName).toBe('From disk')
})
