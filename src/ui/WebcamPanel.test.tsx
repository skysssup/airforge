// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { WebcamPanel } from './WebcamPanel'
import { appStore } from '../store/appStore'
import { pointerStore } from './pointer'
import { landmarkToScreen, screenToWorld } from '../coords/transforms'

const mocks = vi.hoisted(() => ({ open: vi.fn(), stop: vi.fn(), init: vi.fn(), close: vi.fn(), detect: vi.fn() }))
vi.mock('../camera/media', () => ({ openCamera: mocks.open, stopCamera: mocks.stop, CameraError: class extends Error {}, cameraErrorHint: () => '' }))
vi.mock('../hand/landmarker', () => ({ HandTracker: class { init = mocks.init; close = mocks.close; detect = mocks.detect } }))
beforeEach(() => {
  vi.clearAllMocks()
  appStore._resetForTests()
  mocks.detect.mockReturnValue(null)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('stops the camera when tracker initialization fails', async () => {
  const stream = {} as MediaStream
  mocks.open.mockResolvedValue(stream)
  mocks.init.mockRejectedValue(new Error('model unavailable'))
  render(<WebcamPanel active onClose={() => {}} />)
  await waitFor(() => expect(mocks.stop).toHaveBeenCalledWith(stream))
  expect(mocks.close).toHaveBeenCalled()
  expect(appStore.getState().webcamEnabled).toBe(false)
})
it('ignores a late failure after a session is closed', async () => {
  let reject!: (error: Error) => void
  mocks.open.mockResolvedValue({} as MediaStream)
  mocks.init.mockReturnValue(new Promise<void>((_resolve, no) => { reject = no }))
  const panel = render(<WebcamPanel active onClose={() => {}} />)
  await waitFor(() => expect(mocks.init).toHaveBeenCalled())
  panel.unmount()
  appStore.setWebcamEnabled(true)
  await act(async () => { reject(new Error('old session failed')); await Promise.resolve() })
  expect(appStore.getState().webcamEnabled).toBe(true)
})
it('closes a tracker that finishes initialization after unmount', async () => {
  let resolve!: () => void
  mocks.open.mockResolvedValue({} as MediaStream)
  mocks.init.mockReturnValue(new Promise<void>(yes => { resolve = yes }))
  const panel = render(<WebcamPanel active onClose={() => {}} />)
  await waitFor(() => expect(mocks.init).toHaveBeenCalled())
  panel.unmount()
  mocks.close.mockClear()
  await act(async () => { resolve(); await Promise.resolve() })
  expect(mocks.close).toHaveBeenCalled()
})
it('shuts the camera session down when detection fails after startup', async () => {
  const stream = {} as MediaStream
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => frames.push(cb)))
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4)
  mocks.open.mockResolvedValue(stream)
  mocks.init.mockResolvedValue(undefined)
  mocks.detect.mockReturnValueOnce(null).mockImplementation(() => { throw new Error('detector crashed') })
  appStore.setWebcamEnabled(true)
  render(<WebcamPanel active onClose={() => {}} />)
  await waitFor(() => expect(frames).toHaveLength(1))
  act(() => frames[0]!(0))
  expect(frames).toHaveLength(1)
  expect(mocks.stop).toHaveBeenCalledWith(stream)
  expect(mocks.close).toHaveBeenCalled()
  expect(appStore.getState().webcamEnabled).toBe(false)
  expect(appStore.getState().statusMessage).toContain('detector crashed')
})
it('moves the fingertip ring to the tracked index fingertip and reports its position', async () => {
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => frames.push(cb)))
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4)
  mocks.open.mockResolvedValue({} as MediaStream)
  mocks.init.mockResolvedValue(undefined)
  const hand = Array.from({ length: 21 }, (_, i) => ({ x: 0.3 + i * 0.001, y: 0.4, z: 0 }))
  // The first detection runs as soon as the tracker is ready; later ones run on animation frames.
  mocks.detect.mockReturnValueOnce(null).mockReturnValueOnce(hand).mockReturnValue(null)
  appStore.setWebcamEnabled(true)
  const { container } = render(<WebcamPanel active onClose={() => {}} />)
  await waitFor(() => expect(frames).toHaveLength(1))
  const ring = container.querySelector<HTMLElement>('.fingertip')!
  expect(ring.dataset.gesture).toBe('none')

  act(() => frames[0]!(0))
  const { view } = appStore.getState()
  const tip = landmarkToScreen(hand[8]!, view, true)
  expect(ring.style.transform).toBe(`translate(${tip.x}px, ${tip.y}px)`)
  expect(ring.dataset.gesture).toBe('settling')
  expect(pointerStore.get()).toEqual(screenToWorld(tip, view))

  act(() => frames[1]!(16))
  expect(ring.dataset.gesture).toBe('none')
  expect(pointerStore.get()).toBeNull()
})
