// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from './Toolbar'
import { appStore } from '../store/appStore'
import { DEFAULT_PHYSICS, GRAVITY_MAX, GRAVITY_MIN } from '../physics/params'
import { exportSceneJson } from '../io/serialize'
import { EXAMPLES, loadExampleScene } from '../examples'

const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name })

beforeEach(() => {
  appStore._resetForTests()
  window.history.replaceState(null, '', '/airforge/')
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderToolbar() {
  return render(<Toolbar onToggleWebcam={() => {}} onOpenHelp={() => {}} />)
}

it('represents and edits the complete supported gravity range', () => {
  appStore.loadScene({ name: 'Gravity 40', objects: [], physics: { ...DEFAULT_PHYSICS, gravity: 40 } }, { message: 'opened' })
  renderToolbar()
  const slider = screen.getByRole<HTMLInputElement>('slider', { name: /Gravity/ })
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
  renderToolbar()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Open an example' }), 'funnel')
  expect(appStore.getState()).toMatchObject({ sceneName: 'Funnel', exampleId: 'funnel' })
  expect(window.location.search).toBe('?example=funnel')
  expect(button('Drop (12)')).toBeTruthy()
  await user.click(button('Clear'))
  expect(window.location.search).toBe('')
})

it('enables actions only when they can do something', async () => {
  const user = userEvent.setup()
  renderToolbar()
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

it('saves the scene as a JSON download named after the scene', async () => {
  const user = userEvent.setup()
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:scene')
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('ramp-ball.json')
    expect(this.isConnected).toBe(true)
  })
  appStore.loadScene(loadExampleScene(EXAMPLES[0]!), { message: 'opened' })
  renderToolbar()
  await user.click(button('Save'))
  expect(click).toHaveBeenCalledTimes(1)
  const saved = JSON.parse(await createObjectURL.mock.calls[0]![0].text())
  expect(saved).toMatchObject({ format: 'airforge-scene', version: 1, name: 'Ramp & Ball' })
  expect(appStore.getState().statusMessage).toBe('Saved ramp-ball.json.')
})

it('opens a scene file and reports files it cannot use', async () => {
  const user = userEvent.setup()
  const { container } = renderToolbar()
  const input = container.querySelector<HTMLInputElement>('input[type=file]')!
  const scene = exportSceneJson('From disk', loadExampleScene(EXAMPLES[0]!).objects, DEFAULT_PHYSICS)
  await user.upload(input, new File([scene], 'saved.json', { type: 'application/json' }))
  await waitFor(() => expect(appStore.getState().sceneName).toBe('From disk'))
  expect(appStore.getState().statusMessage).toBe('Opened “From disk” from saved.json.')

  await user.upload(input, new File(['{"format":"other"}'], 'broken.json', { type: 'application/json' }))
  await waitFor(() => expect(appStore.getState().statusMessage).toMatch(/^Could not open broken.json: Missing or invalid format/))
  expect(appStore.getState().sceneName).toBe('From disk')
})
