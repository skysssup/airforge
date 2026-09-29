import { useMouseDrawing } from './hooks'
import { useAppState } from './hooks'

/** Transparent overlay capturing mouse strokes in screen space. */
export function DrawingOverlay({ enabled }: { enabled: boolean }) {
  const refCallback = useMouseDrawing(enabled)
  const { liveStroke, gestureLabel, webcamEnabled } = useAppState()

  return (
    <div
      ref={refCallback}
      className={`drawing-overlay ${enabled ? 'active' : ''}`}
      role="application"
      aria-label="Drawing surface. Drag to forge shapes."
      tabIndex={0}
    >
      <svg className="ink-svg" aria-hidden>
        {liveStroke.length > 1 && (
          <polyline
            fill="none"
            stroke="url(#inkGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={liveStroke.map((p) => `${p.x},${p.y}`).join(' ')}
          />
        )}
        <defs>
          <linearGradient id="inkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="gesture-chip" aria-live="polite">
        <span className={`dot ${webcamEnabled ? 'cam' : 'mouse'}`} />
        {gestureLabel}
      </div>
    </div>
  )
}
