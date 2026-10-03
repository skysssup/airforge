// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { appStore } from '../store/appStore'
import { ReplayPanel } from './ReplayPanel'

function Viewer() {
  const [open, setOpen] = useState(false)
  return <>
    <button onClick={() => setOpen(true)}>Open replay</button>
    {open && <ReplayPanel onClose={() => setOpen(false)} />}
  </>
}

beforeEach(() => appStore._resetForTests())
afterEach(cleanup)

it('labels the live view honestly and restores it after selecting a snapshot', async () => {
  const user = userEvent.setup()
  appStore.loadRampAndBall()
  appStore.addBall()
  const liveObjects = structuredClone(appStore.getState().objects)
  const firstSnapshot = structuredClone(appStore.getState().timeline.snapshots[0]!.objects)
  render(<Viewer />)

  await user.click(screen.getByRole('button', { name: 'Open replay' }))
  expect(screen.getByText('Live scene paused · 2 snapshots')).toBeTruthy()
  expect(appStore.getState().objects).toEqual(liveObjects)
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText(/Snapshot 1 \/ 2/)).toBeTruthy()
  expect(appStore.getState().objects).toEqual(firstSnapshot)
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(appStore.getState().replayMode).toBe(false)
  expect(appStore.getState().objects).toEqual(liveObjects)

  await user.click(screen.getByRole('button', { name: 'Open replay' }))
  expect(screen.getByText('Live scene paused · 2 snapshots')).toBeTruthy()
})
