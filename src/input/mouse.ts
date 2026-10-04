/** Pointer (mouse, pen, touch) adapter that turns drags on an element into strokes. */

import type { Vec2 } from '../events/types'
import { addRawPoint, cancelStroke, createStroke, endStroke, type StrokeState } from '../stroke/capture'

/** Handlers for dragging an existing shape instead of drawing a new one. */
export interface GrabHandlers {
  move(point: Vec2, event: PointerEvent): void
  end(): void
  cancel(): void
}

export interface StrokeHandlers {
  start(point: Vec2): void
  move(points: Vec2[]): void
  end(points: Vec2[]): void
  cancel(): void
  /** Asked on every press; returning handlers turns the drag into a move of an existing shape. */
  grab?(point: Vec2): GrabHandlers | null
}

/** A grab moves nothing until the pointer travels this many pixels, so a click stays a click. */
export const GRAB_SLOP = 6

export class MouseStrokeAdapter {
  private stroke: StrokeState | null = null
  private grab: { handlers: GrabHandlers; from: Vec2; moved: boolean } | null = null
  private pointerId: number | null = null
  private element: HTMLElement | null = null

  constructor(private readonly handlers: StrokeHandlers) {}

  attach(el: HTMLElement): void {
    this.detach()
    this.element = el
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onCancel)
    el.addEventListener('lostpointercapture', this.onCancel)
  }

  detach(): void {
    if (!this.element) return
    this.onCancel()
    this.element.removeEventListener('pointerdown', this.onDown)
    this.element.removeEventListener('pointermove', this.onMove)
    this.element.removeEventListener('pointerup', this.onUp)
    this.element.removeEventListener('pointercancel', this.onCancel)
    this.element.removeEventListener('lostpointercapture', this.onCancel)
    this.element = null
  }

  isDrawing(): boolean {
    return this.stroke !== null
  }

  private pointFromEvent(e: PointerEvent): Vec2 {
    const rect = this.element!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  private onDown = (e: PointerEvent): void => {
    if (e.button !== 0 || this.stroke || this.grab) return
    e.preventDefault()
    this.element?.setPointerCapture(e.pointerId)
    const point = this.pointFromEvent(e)
    this.pointerId = e.pointerId
    const grab = this.handlers.grab?.(point)
    if (grab) {
      this.grab = { handlers: grab, from: point, moved: false }
      return
    }
    this.stroke = createStroke('mouse')
    addRawPoint(this.stroke, point)
    this.handlers.start(point)
  }

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return
    if (this.grab) {
      const point = this.pointFromEvent(e)
      if (!this.grab.moved && Math.hypot(point.x - this.grab.from.x, point.y - this.grab.from.y) <= GRAB_SLOP) return
      this.grab.moved = true
      this.grab.handlers.move(point, e)
      return
    }
    if (!this.stroke) return
    if (addRawPoint(this.stroke, this.pointFromEvent(e))) this.handlers.move(this.stroke.points.slice())
  }

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return
    if (this.grab) {
      const { handlers } = this.grab
      this.grab = null
      handlers.end()
      return
    }
    if (!this.stroke) return
    const points = endStroke(this.stroke)
    this.stroke = null
    this.handlers.end(points)
  }

  private onCancel = (e?: PointerEvent): void => {
    if (e && e.pointerId !== this.pointerId) return
    if (this.grab) {
      const { handlers } = this.grab
      this.grab = null
      handlers.cancel()
      return
    }
    if (!this.stroke) return
    cancelStroke(this.stroke)
    this.stroke = null
    this.handlers.cancel()
  }
}
