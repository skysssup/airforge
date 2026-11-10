// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoreSheet } from './MoreSheet'
import { appStore } from '../store/appStore'
import { EXAMPLES, loadExampleScene } from '../examples'

beforeEach(() => appStore._resetForTests())
afterEach(cleanup)

function renderSheet() {
  const onClose = vi.fn()
  const onOpenWorld = vi.fn()
  const onOpenHelp = vi.fn()
  render(<MoreSheet onClose={onClose} onOpenWorld={onOpenWorld} onOpenHelp={onOpenHelp} />)
  return { onClose, onOpenWorld, onOpenHelp }
}

it('names every row with its visible word and closes after an action', async () => {
  const user = userEvent.setup()
  const { onClose, onOpenWorld } = renderSheet()
  for (const name of ['Open', 'Save', 'Copy link', 'Webcam', 'Help', 'Freeze', 'Motion', 'World', 'Add ball', 'Clear']) {
    const row = screen.getByRole('button', { name })
    expect(row.textContent).toBe(name)
  }
  expect(screen.getByRole('button', { name: 'Switch to dark theme' }).textContent).toBe('Dark theme')
  await user.click(screen.getByRole('button', { name: 'World' }))
  expect(onOpenWorld).toHaveBeenCalled()
  expect(onClose).toHaveBeenCalled()
})

it('runs the run and edit controls the phone bar has no room for', async () => {
  const user = userEvent.setup()
  renderSheet()
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Clear' }).disabled).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Add ball' }))
  expect(appStore.getState().objects).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: 'Motion' }))
  expect(appStore.getState().motion).toBe(true)
})

it('closes on Escape', async () => {
  const user = userEvent.setup()
  appStore.loadScene(loadExampleScene(EXAMPLES[0]!), { message: 'opened' })
  const { onClose } = renderSheet()
  await user.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalled()
})
