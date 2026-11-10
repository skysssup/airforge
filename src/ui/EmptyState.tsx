import { useState, useSyncExternalStore } from 'react'
import { useAppState, useCoarsePointer } from './hooks'
import { sceneErrorStore } from './sceneError'

/** The legend draws itself once per session (SPEC-v3 §6.4); after that it is shown already drawn. */
const DEMO_KEY = 'airforge.legendDrawn'

function claimDemo(): boolean {
  try {
    if (sessionStorage.getItem(DEMO_KEY)) return false
    sessionStorage.setItem(DEMO_KEY, '1')
    return true
  } catch {
    return false
  }
}

/** Shown on an empty sheet: what each kind of stroke becomes. Hidden while the scene error explains a blank sheet. */
export function EmptyState() {
  const empty = useAppState((s) => s.objects.length === 0 && s.liveStroke.length === 0 && !s.pending)
  const sceneError = useSyncExternalStore(sceneErrorStore.subscribe, sceneErrorStore.get, sceneErrorStore.get)
  const touch = useCoarsePointer()
  if (!empty || sceneError) return null

  return (
    <div className="empty">
      <div className="empty-card">
        <Legend />
        <p className="empty-hint">
          {touch ? (
            <>Drag on the sheet to draw. Tap Drop to release a ball, or open an example.</>
          ) : (
            <>
              Drag on the sheet to draw. Press Drop <kbd>D</kbd> to release a ball, or open an example.
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function Legend() {
  const [demo] = useState(claimDemo)
  return (
    <div className={`legend${demo ? ' demo' : ''}`}>
      <figure>
        <svg viewBox="0 0 96 40" aria-hidden="true">
          <path className="stroke" d="M6 32 36 10" pathLength={1} />
          <path className="arrow" d="M44 21h10m-3-3 3 3-3 3" />
          <path className="solid" d="M62.4 34.9 88.6 13.4l2.5 3.1-26.2 21.5z" />
        </svg>
        <figcaption>Line → ramp</figcaption>
      </figure>
      <figure>
        <svg viewBox="0 0 96 40" aria-hidden="true">
          <path className="stroke" d="M21 8a12 12 0 1 1-.1 0z" pathLength={1} />
          <path className="arrow" d="M44 21h10m-3-3 3 3-3 3" />
          <circle className="solid" cx="75" cy="21" r="10" />
        </svg>
        <figcaption>Circle → ball</figcaption>
      </figure>
      <figure>
        <svg viewBox="0 0 96 40" aria-hidden="true">
          <path className="stroke" d="M5 15h31v11H5z" pathLength={1} />
          <path className="arrow" d="M44 21h10m-3-3 3 3-3 3" />
          <rect className="solid" x="60" y="16" width="32" height="10" />
        </svg>
        <figcaption>Rectangle → platform</figcaption>
      </figure>
      <figure>
        <svg viewBox="0 0 96 40" aria-hidden="true">
          <path className="stroke" d="M4 10c6 28 26 28 32 4" pathLength={1} />
          <path className="arrow" d="M44 21h10m-3-3 3 3-3 3" />
          <path className="solid curve" d="M62 12c5 25 25 25 30 4" />
        </svg>
        <figcaption>Curve → track</figcaption>
      </figure>
    </div>
  )
}
