// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopBar } from './TopBar'
import { EditControls, RunControls } from './Controls'
import { useGlobalShortcuts } from './useGlobalShortcuts'
import { appStore } from '../store/appStore'
import { EXAMPLES, loadExampleScene } from '../examples'
import { ambiguousScribble } from '../test/strokes'
import { worldToScreen } from '../coords/transforms'

/** Click the most recently added ball and return its id. */
function selectLastBall(): string {
  const ball = state().objects.filter((o) => o.kind === 'ball').at(-1)
  if (ball?.kind !== 'ball') throw new Error('Expected a ball')
  appStore.selectAt(worldToScreen(ball.position, state().view))
  expect(state().selectedId).toBe(ball.id)
  return ball.id
}

const onToggleHelp = vi.fn()
const onEscape = vi.fn()
const state = () => appStore.getState()

function Harness({ dialogOpen = false }: { dialogOpen?: boolean }) {
  useGlobalShortcuts({ dialogOpen, onToggleHelp, onEscape })
  return (
    <>
      <TopBar onOpenHelp={() => {}} />
      <EditControls />
      <RunControls />
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  appStore._resetForTests()
})
afterEach(cleanup)

describe('global shortcuts', () => {
  it('runs the simulation keys: D drops, R restarts, F freezes, Space pauses', async () => {
    const user = userEvent.setup()
    appStore.loadScene(loadExampleScene(EXAMPLES[0]!), { message: 'opened' })
    render(<Harness />)
    await user.keyboard('d')
    expect(state().objects.some((o) => o.kind === 'ball' && o.dynamic)).toBe(true)
    await user.keyboard('f')
    expect(state().objects.some((o) => o.kind === 'ball' && o.dynamic)).toBe(false)
    await user.keyboard('r')
    expect(state().objects.some((o) => o.kind === 'ball' && o.releasedFrom)).toBe(false)
    await user.keyboard(' ')
    expect(state().physics.paused).toBe(true)
  })

  it('undoes with Z, Ctrl+Z, or Cmd+Z and redoes with Shift+Z or Ctrl+Shift+Z', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    for (let i = 0; i < 3; i++) appStore.addBall()
    await user.keyboard('z')
    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Meta>}z{/Meta}')
    expect(state().objects).toHaveLength(0)
    await user.keyboard('{Shift>}z{/Shift}')
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    expect(state().objects).toHaveLength(2)
  })

  it('deletes the selected shape with Delete or Backspace', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    appStore.addBall()
    appStore.addBall()
    for (const key of ['{Delete}', '{Backspace}']) {
      const target = selectLastBall()
      await user.keyboard(key)
      expect(state().objects.some((o) => o.id === target)).toBe(false)
    }
    expect(state().objects).toHaveLength(0)
  })

  it('moves the selected shape with arrows (Shift for ten times as far), turns it with [ ] { }, and copies it with Ctrl or Cmd+D', async () => {
    const user = userEvent.setup()
    appStore.loadScene(loadExampleScene(EXAMPLES[0]!), { message: 'opened' })
    render(<Harness />)
    const platform = state().objects.find((o) => o.id === 'cup-floor')
    if (platform?.kind !== 'platform') throw new Error('expected the cup floor')
    appStore.selectAt(worldToScreen(platform.center, state().view))
    await user.keyboard('{ArrowRight}{Shift>}{ArrowUp}{/Shift}')
    await user.keyboard('[[[[}') // user-event writes a literal [ as [[
    const moved = state().objects.find((o) => o.id === platform.id)
    if (moved?.kind !== 'platform') throw new Error('expected the cup floor')
    expect(moved.center.x).toBeCloseTo(platform.center.x + 0.1)
    expect(moved.center.y).toBeCloseTo(platform.center.y + 1)
    expect(moved.rotationZ).toBeCloseTo(platform.rotationZ + ((5 + 5 - 15) * Math.PI) / 180)
    const count = state().objects.length
    await user.keyboard('{Control>}d{/Control}{Meta>}d{/Meta}')
    expect(state().objects).toHaveLength(count + 2)
    await user.keyboard('d')
    expect(state().objects.some((o) => o.kind === 'ball' && o.dynamic)).toBe(true)
  })

  it('uses Escape to discard an unclear stroke, then to clear the selection', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    appStore.addBall()
    appStore.endStroke(ambiguousScribble())
    expect(state().pending).not.toBeNull()
    await user.keyboard('{Escape}')
    expect(state().pending).toBeNull()
    selectLastBall()
    await user.keyboard('{Escape}')
    expect(state().selectedId).toBeNull()
  })

  it('lets Space and Enter activate a focused button instead of pausing', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Add ball' }))
    await user.keyboard(' ')
    await user.keyboard('{Enter}')
    expect(state().objects).toHaveLength(3)
    expect(state().physics.paused).toBe(false)
  })

  it('leaves other browser shortcuts alone', async () => {
    const user = userEvent.setup()
    appStore.loadScene(loadExampleScene(EXAMPLES[0]!), { message: 'opened' })
    render(<Harness />)
    const before = state().objects
    const keydown = vi.fn((e: KeyboardEvent) => e.defaultPrevented)
    window.addEventListener('keydown', keydown)
    await user.keyboard('{Control>}r{/Control}{Meta>}d{/Meta}{Alt>}z{/Alt}{Control>}f{/Control}')
    window.removeEventListener('keydown', keydown)
    expect(state().objects).toBe(before)
    expect(keydown.mock.results.every((r) => r.value === false)).toBe(true)
  })

  it('ignores shortcuts while typing in the scene name', async () => {
    const user = userEvent.setup()
    appStore.loadScene(loadExampleScene(EXAMPLES[0]!), { message: 'opened' })
    render(<Harness />)
    const before = state().objects
    await user.click(screen.getByRole('textbox', { name: 'Scene name' }))
    await user.keyboard('r d z f ?{Backspace}{Control>}z{/Control}')
    expect(state().objects).toBe(before)
    expect(onToggleHelp).not.toHaveBeenCalled()
  })

  it('blocks scene shortcuts while a dialog is open but keeps help and Escape', async () => {
    const user = userEvent.setup()
    render(<Harness dialogOpen />)
    appStore.addBall()
    await user.keyboard(' dz{Control>}z{/Control}')
    expect(state().physics.paused).toBe(false)
    expect(state().objects).toHaveLength(1)
    await user.keyboard('?{Escape}')
    expect(onToggleHelp).toHaveBeenCalledTimes(1)
    expect(onEscape).toHaveBeenCalledTimes(1)
  })
})

describe('scene name input', () => {
  it('keeps spaces while typing and normalizes on Enter', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Scene name' })
    await user.clear(input)
    await user.type(input, 'Ramp and Ball ')
    expect(input.value).toBe('Ramp and Ball ')
    await user.keyboard('{Enter}')
    expect(state().sceneName).toBe('Ramp and Ball')
    expect(input.value).toBe('Ramp and Ball')
  })

  it('commits on blur, reverts on Escape, and never commits an empty name', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Scene name' })
    await user.clear(input)
    await user.type(input, 'Cascade')
    await user.tab()
    expect(state().sceneName).toBe('Cascade')

    await user.click(input)
    await user.type(input, ' draft{Escape}')
    expect(input.value).toBe('Cascade')
    await user.tab()
    expect(state().sceneName).toBe('Cascade')

    await user.clear(input)
    await user.tab()
    expect(state().sceneName).toBe('Untitled')
  })
})
