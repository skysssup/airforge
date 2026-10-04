// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectionBar } from './SelectionBar'
import { appStore } from '../store/appStore'
import { EXAMPLES, loadExampleScene } from '../examples'

beforeEach(() => {
  appStore._resetForTests()
  appStore.loadScene(loadExampleScene(EXAMPLES[0]!), { message: 'opened' })
})
afterEach(cleanup)

const select = (id: string) => appStore._resetForTests({ ...appStore.getState(), selectedId: id })

it('offers rotation and a copy for a selected platform, inside the stage', async () => {
  const user = userEvent.setup()
  select('cup-floor')
  render(<SelectionBar />)
  const bar = screen.getByRole('toolbar', { name: 'Selected platform' })
  const { left, top } = bar.style
  expect(parseFloat(left)).toBeGreaterThan(0)
  expect(parseFloat(top)).toBeGreaterThan(0)
  await user.click(screen.getByRole('button', { name: 'Rotate counterclockwise' }))
  expect(appStore.getState().objects.find((o) => o.id === 'cup-floor')).toMatchObject({ rotationZ: (15 * Math.PI) / 180 })
  await user.click(screen.getByRole('button', { name: 'Duplicate' }))
  expect(appStore.getState().objects).toHaveLength(EXAMPLES[0] ? loadExampleScene(EXAMPLES[0]).objects.length + 1 : 0)
})

it('offers only a copy for a waiting ball, and nothing for a released one', () => {
  select('ball')
  const { rerender } = render(<SelectionBar />)
  expect(screen.getByRole('toolbar', { name: 'Selected ball' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Rotate/ })).toBeNull()
  appStore.drop()
  rerender(<SelectionBar />)
  expect(screen.queryByRole('toolbar')).toBeNull()
})
