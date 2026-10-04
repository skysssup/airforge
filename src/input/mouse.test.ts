// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { MouseStrokeAdapter } from './mouse'

function pointer(type: string, x: number, y: number, pointerId = 1): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, button: 0, pointerId, bubbles: true, cancelable: true })
}

const handlers = { start: vi.fn(), move: vi.fn(), end: vi.fn(), cancel: vi.fn() }
let el: HTMLDivElement
let adapter: MouseStrokeAdapter

beforeEach(() => {
  vi.clearAllMocks()
  el = document.createElement('div')
  el.setPointerCapture = vi.fn()
  adapter = new MouseStrokeAdapter(handlers)
  adapter.attach(el)
})

it('reports a drag as start, moves, and end with every drawn point', () => {
  el.dispatchEvent(pointer('pointerdown', 10, 10))
  el.dispatchEvent(pointer('pointermove', 300, 10))
  el.dispatchEvent(pointer('pointerup', 300, 10))
  expect(handlers.start).toHaveBeenCalledWith({ x: 10, y: 10 })
  expect(handlers.move).toHaveBeenLastCalledWith([{ x: 10, y: 10 }, { x: 300, y: 10 }])
  expect(handlers.end).toHaveBeenCalledWith([{ x: 10, y: 10 }, { x: 300, y: 10 }])
  expect(adapter.isDrawing()).toBe(false)
})

it('ignores a second pointer while the first one is drawing', () => {
  el.dispatchEvent(pointer('pointerdown', 10, 10, 1))
  el.dispatchEvent(pointer('pointerdown', 50, 50, 2))
  el.dispatchEvent(pointer('pointermove', 400, 400, 2))
  el.dispatchEvent(pointer('pointerup', 400, 400, 2))
  expect(handlers.start).toHaveBeenCalledTimes(1)
  expect(handlers.move).not.toHaveBeenCalled()
  expect(handlers.end).not.toHaveBeenCalled()
  el.dispatchEvent(pointer('pointerup', 10, 10, 1))
  expect(handlers.end).toHaveBeenCalledWith([{ x: 10, y: 10 }])
})

it('cancels when pointer capture is lost without a pointerup', () => {
  el.dispatchEvent(pointer('pointerdown', 10, 10))
  el.dispatchEvent(pointer('lostpointercapture', 10, 10))
  expect(handlers.cancel).toHaveBeenCalledTimes(1)
  el.dispatchEvent(pointer('pointerdown', 20, 20))
  expect(handlers.start).toHaveBeenCalledTimes(2)
})

it('cancels an in-progress stroke when detached and stops listening', () => {
  el.dispatchEvent(pointer('pointerdown', 10, 10))
  el.dispatchEvent(pointer('pointermove', 40, 40))
  adapter.detach()
  expect(adapter.isDrawing()).toBe(false)
  expect(handlers.cancel).toHaveBeenCalledTimes(1)
  el.dispatchEvent(pointer('pointerup', 40, 40))
  el.dispatchEvent(pointer('pointerdown', 10, 10))
  expect(handlers.end).not.toHaveBeenCalled()
  expect(handlers.start).toHaveBeenCalledTimes(1)
})
