// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { MouseStrokeAdapter } from './mouse'

function pointer(type: string, x: number, y: number, buttons = 1): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, button: 0, buttons, pointerId: 1, bubbles: true, cancelable: true })
}

it('cancels an in-progress stroke when the adapter is detached', () => {
  const el = document.createElement('div')
  el.setPointerCapture = vi.fn()
  el.releasePointerCapture = vi.fn()
  const adapter = new MouseStrokeAdapter()
  const events: Array<{ type: string; reason?: string }> = []
  adapter.onEvent((e) => events.push(e))
  adapter.attach(el)

  el.dispatchEvent(pointer('pointerdown', 10, 10))
  el.dispatchEvent(pointer('pointermove', 40, 40))
  expect(adapter.isDrawing()).toBe(true)

  adapter.detach()
  expect(adapter.isDrawing()).toBe(false)
  expect(events.at(-1)).toMatchObject({ type: 'STROKE_CANCELLED', reason: 'mode_change' })

  const count = events.length
  el.dispatchEvent(pointer('pointerup', 40, 40, 0))
  adapter.detach()
  expect(events).toHaveLength(count)
  expect(events.some((e) => e.type === 'STROKE_ENDED')).toBe(false)
})
