import { useAppState, useMouseDrawing } from './hooks'
import type { Vec2 } from '../events/types'

const toPolyline = (points: Vec2[]) => points.map((p) => `${p.x},${p.y}`).join(' ')

/** Transparent layer above the 3D canvas that captures pointer strokes in screen space. */
export function DrawingOverlay({ enabled }: { enabled: boolean }) {
  const refCallback = useMouseDrawing(enabled)
  const liveStroke = useAppState((s) => s.liveStroke)
  const pending = useAppState((s) => s.pending)
  const gestureLabel = useAppState((s) => s.gestureLabel)
  const webcamEnabled = useAppState((s) => s.webcamEnabled)

  return (
    <div
      ref={refCallback}
      className="drawing-overlay"
      role="application"
      aria-label="Drawing area. Drag to draw a line, circle, or rectangle; click a shape to select it."
    >
      <svg className="ink-svg" aria-hidden>
        <defs>
          <linearGradient id="inkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        {pending && pending.points.length > 1 && (
          <polyline className="ink pending" points={toPolyline(pending.points)} />
        )}
        {liveStroke.length > 1 && <polyline className="ink" points={toPolyline(liveStroke)} />}
      </svg>
      <div className="gesture-chip">
        <span className={`dot ${webcamEnabled ? 'cam' : 'mouse'}`} />
        {gestureLabel}
      </div>
    </div>
  )
}
