/**
 * Mouse / trackpad adapter emitting the same stroke lifecycle events
 * as the webcam gesture pipeline.
 */

import type { Vec2 } from '../events/types'
import {
  makeEventId,
  nowMs,
  type PointAddedEvent,
  type StrokeCancelledEvent,
  type StrokeEndedEvent,
  type StrokeStartedEvent,
} from '../events/types'
import {
  addRawPoint,
  cancelStroke,
  createStroke,
  endStroke,
  type StrokeState,
} from '../stroke/capture'

export type MouseStrokeListener = (
  event: StrokeStartedEvent | PointAddedEvent | StrokeEndedEvent | StrokeCancelledEvent,
) => void

export class MouseStrokeAdapter {
  private stroke: StrokeState | null = null
  private drawing = false
  private listener: MouseStrokeListener | null = null
  private element: HTMLElement | null = null

  onEvent(listener: MouseStrokeListener): void {
    this.listener = listener
  }

  attach(el: HTMLElement): void {
    this.detach()
    this.element = el
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onCancel)
    el.addEventListener('pointerleave', this.onLeave)
  }

  detach(): void {
    if (!this.element) return
    this.element.removeEventListener('pointerdown', this.onDown)
    this.element.removeEventListener('pointermove', this.onMove)
    this.element.removeEventListener('pointerup', this.onUp)
    this.element.removeEventListener('pointercancel', this.onCancel)
    this.element.removeEventListener('pointerleave', this.onLeave)
    this.element = null
  }

  isDrawing(): boolean {
    return this.drawing
  }

  getCurrentPoints(): Vec2[] {
    return this.stroke?.points.slice() ?? []
  }

  private pointFromEvent(e: PointerEvent): Vec2 {
    const el = this.element!
    const rect = el.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  private onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    e.preventDefault()
    this.element?.setPointerCapture(e.pointerId)
    const point = this.pointFromEvent(e)
    this.stroke = createStroke(makeEventId('stroke'), 'mouse')
    this.drawing = true
    addRawPoint(this.stroke, point)
    this.listener?.({
      type: 'STROKE_STARTED',
      id: makeEventId(),
      t: nowMs(),
      source: 'mouse',
      point,
    })
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.drawing || !this.stroke) return
    const point = this.pointFromEvent(e)
    const smoothed = addRawPoint(this.stroke, point)
    if (!smoothed) return
    this.listener?.({
      type: 'POINT_ADDED',
      id: makeEventId(),
      t: nowMs(),
      source: 'mouse',
      point: smoothed,
    })
  }

  private onUp = (e: PointerEvent): void => {
    if (!this.drawing || !this.stroke) return
    try {
      this.element?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    const points = endStroke(this.stroke)
    this.drawing = false
    this.stroke = null
    this.listener?.({
      type: 'STROKE_ENDED',
      id: makeEventId(),
      t: nowMs(),
      source: 'mouse',
      points,
    })
  }

  private onCancel = (): void => {
    if (!this.stroke) return
    cancelStroke(this.stroke)
    this.drawing = false
    this.stroke = null
    this.listener?.({
      type: 'STROKE_CANCELLED',
      id: makeEventId(),
      t: nowMs(),
      source: 'mouse',
      reason: 'user',
    })
  }

  private onLeave = (e: PointerEvent): void => {
    // Only end if we lost capture mid-draw without pointerup
    if (this.drawing && e.buttons === 0) {
      this.onUp(e)
    }
  }
}
