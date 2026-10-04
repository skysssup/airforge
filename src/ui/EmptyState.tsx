import { useAppState } from './hooks'

/** Shown on an empty sheet: what each kind of stroke becomes. */
export function EmptyState() {
  const empty = useAppState((s) => s.objects.length === 0 && s.liveStroke.length === 0 && !s.pending)
  if (!empty) return null

  return (
    <div className="empty">
      <div className="empty-card">
        <div className="legend">
          <figure>
            <svg viewBox="0 0 96 40" aria-hidden="true">
              <path className="stroke" d="M6 32 36 10" pathLength={1} />
              <path className="arrow" d="M44 21h10m-3-3 3 3-3 3" />
              <path className="solid" d="M62.4 34.9 88.6 13.4l2.5 3.1-26.2 21.5z" />
            </svg>
            <figcaption className="t-label">Line → ramp</figcaption>
          </figure>
          <figure>
            <svg viewBox="0 0 96 40" aria-hidden="true">
              <path className="stroke" d="M21 8a12 12 0 1 1-.1 0z" pathLength={1} />
              <path className="arrow" d="M44 21h10m-3-3 3 3-3 3" />
              <circle className="solid" cx="75" cy="21" r="10" />
            </svg>
            <figcaption className="t-label">Circle → ball</figcaption>
          </figure>
          <figure>
            <svg viewBox="0 0 96 40" aria-hidden="true">
              <path className="stroke" d="M5 15h31v11H5z" pathLength={1} />
              <path className="arrow" d="M44 21h10m-3-3 3 3-3 3" />
              <rect className="solid" x="60" y="16" width="32" height="10" />
            </svg>
            <figcaption className="t-label">Rectangle → platform</figcaption>
          </figure>
          <figure>
            <svg viewBox="0 0 96 40" aria-hidden="true">
              <path className="stroke" d="M4 10c6 28 26 28 32 4" pathLength={1} />
              <path className="arrow" d="M44 21h10m-3-3 3 3-3 3" />
              <path className="solid curve" d="M62 12c5 25 25 25 30 4" />
            </svg>
            <figcaption className="t-label">Curve → track</figcaption>
          </figure>
        </div>
        <p className="empty-hint">
          Drag on the sheet to draw. Press <kbd>D</kbd> to drop a ball, or open an example.
        </p>
      </div>
    </div>
  )
}
