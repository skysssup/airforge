// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from './Toolbar'
import { useGlobalShortcuts } from './useGlobalShortcuts'
import { appStore } from '../store/appStore'

const onToggleHelp = vi.fn()
const onEscape = vi.fn()

function Harness({ dialogOpen = false }: { dialogOpen?: boolean }) {
  useGlobalShortcuts({ dialogOpen, onToggleHelp, onEscape })
  return <Toolbar onToggleWebcam={() => {}} onOpenHelp={() => {}} onOpenReplay={() => {}} />
}

beforeEach(() => {
  vi.clearAllMocks()
  appStore._resetForTests()
})
afterEach(cleanup)

describe('global shortcuts', () => {
  it('lets Space activate a focused button instead of pausing', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Add ball' }))
    expect(appStore.getState().objects).toHaveLength(1)
    await user.keyboard(' ')
    expect(appStore.getState().objects).toHaveLength(2)
    expect(appStore.getState().physics.paused).toBe(false)
  })

  it('lets Enter activate a focused button', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Add ball' }))
    await user.keyboard('{Enter}')
    expect(appStore.getState().objects).toHaveLength(2)
  })

  it('still pauses on Space and drops on D from non-interactive focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.keyboard(' ')
    expect(appStore.getState().physics.paused).toBe(true)
    await user.keyboard('d')
    expect(appStore.getState().objects.some((o) => o.kind === 'ball')).toBe(true)
  })

  it('still runs letter shortcuts while a button has focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Add ball' }))
    await user.keyboard('z')
    expect(appStore.getState().objects).toHaveLength(0)
  })

  it('leaves browser modifier shortcuts alone', async () => {
    const user = userEvent.setup()
    appStore.loadRampAndBall()
    render(<Harness />)
    const before = appStore.getState().objects
    const keydown = vi.fn((e: KeyboardEvent) => e.defaultPrevented)
    window.addEventListener('keydown', keydown)
    await user.keyboard('{Control>}r{/Control}{Meta>}z{/Meta}{Alt>}d{/Alt}')
    window.removeEventListener('keydown', keydown)
    expect(appStore.getState().objects).toBe(before)
    expect(keydown.mock.results.every((r) => r.value === false)).toBe(true)
  })

  it('ignores shortcuts while typing in the scene name', async () => {
    const user = userEvent.setup()
    appStore.loadRampAndBall()
    render(<Harness />)
    const before = appStore.getState().objects
    await user.click(screen.getByRole('textbox', { name: 'Scene name' }))
    await user.keyboard('r d z f ?')
    expect(appStore.getState().objects).toBe(before)
    expect(onToggleHelp).not.toHaveBeenCalled()
  })

  it('blocks scene shortcuts while a dialog is open but keeps help and Escape', async () => {
    const user = userEvent.setup()
    render(<Harness dialogOpen />)
    await user.keyboard(' d')
    expect(appStore.getState().physics.paused).toBe(false)
    expect(appStore.getState().objects).toHaveLength(0)
    await user.keyboard('?{Escape}')
    expect(onToggleHelp).toHaveBeenCalledTimes(1)
    expect(onEscape).toHaveBeenCalledTimes(1)
  })
})

describe('scene name input', () => {
  it('keeps spaces while typing and normalizes on commit', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Scene name' })
    await user.clear(input)
    await user.type(input, 'Ramp and Ball ')
    expect(input.value).toBe('Ramp and Ball ')
    await user.keyboard('{Enter}')
    expect(appStore.getState().sceneName).toBe('Ramp and Ball')
    expect(input.value).toBe('Ramp and Ball')
  })

  it('commits on blur, reverts on Escape, and never commits an empty name', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Scene name' })
    await user.clear(input)
    await user.type(input, 'Cascade')
    await user.tab()
    expect(appStore.getState().sceneName).toBe('Cascade')

    await user.click(input)
    await user.type(input, ' draft{Escape}')
    expect(input.value).toBe('Cascade')
    await user.tab()
    expect(appStore.getState().sceneName).toBe('Cascade')

    await user.clear(input)
    await user.tab()
    expect(appStore.getState().sceneName).toBe('Untitled')
  })
})
