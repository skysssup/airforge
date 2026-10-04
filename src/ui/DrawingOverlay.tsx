import { useAppState, useMouseDrawing } from './hooks'
import { appStore } from '../store/appStore'
import { screenToWorld } from '../coords/transforms'
import { pointerStore } from './pointer'
import type { Vec2 } from '../events/types'

const toPolyline = (points: Vec2[]) => points.map((p) => `${p.x},${p.y}`).join(' ')

/** Transparent layer above the 3D canvas that captures pointer strokes in screen space. */
export function DrawingOverlay({ enabled }: { enabled: boolean }) {
  const refCallback = useMouseDrawing(enabled)
  const liveStroke = useAppState((s) => s.liveStroke)
  const pending = useAppState((s) => s.pending)

  return (
    <div
      ref={refCallback}
      className="drawing-overlay"
      role="application"
      aria-label="Drawing area. Drag to draw a line, circle, rectangle, or curve; click a shape to select it, then drag it to move it."
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        const { view, liveStroke } = appStore.getState()
        pointerStore.set(screenToWorld(point, view))
        // A pointer cursor over shapes says a click selects instead of drawing; a move cursor, that a drag moves it.
        const hit = liveStroke.length === 0 ? appStore.objectAt(point) : null
        const selected = hit !== null && hit.id === appStore.getState().selectedId
        e.currentTarget.toggleAttribute('data-over-shape', hit !== null && !selected)
        e.currentTarget.toggleAttribute('data-over-selected', selected)
      }}
      onPointerLeave={(e) => {
        pointerStore.set(null)
        e.currentTarget.removeAttribute('data-over-shape')
        e.currentTarget.removeAttribute('data-over-selected')
      }}
    >
      <svg className="ink-svg" aria-hidden="true">
        {pending && pending.points.length > 1 && <polyline className="ink pending" points={toPolyline(pending.points)} />}
        {liveStroke.length > 1 && <polyline className="ink" points={toPolyline(liveStroke)} />}
      </svg>
    </div>
  )
}
