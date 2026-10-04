import { appStore, type ShapeChoice } from '../store/appStore'
import { useAppState } from './hooks'
import { shapeToObjectKind } from '../shapes/recognize'

const CHOICES: { kind: ShapeChoice; label: string }[] = [
  { kind: 'ramp', label: 'Ramp' },
  { kind: 'ball', label: 'Ball' },
  { kind: 'platform', label: 'Platform' },
]

/** Asks what an unclear stroke (shown dashed on the canvas) should become. */
export function PendingStrokePicker() {
  const pending = useAppState((s) => s.pending)
  if (!pending) return null
  const suggested = pending.primary ? shapeToObjectKind(pending.primary.kind) : null

  return (
    <div className="bottom-panel" role="region" aria-label="Choose a shape for the dashed stroke">
      <p>
        {suggested
          ? `The dashed stroke looks most like a ${suggested}, but it is not a clear match.`
          : 'The dashed stroke is not a clear line, circle, or rectangle.'}{' '}
        What should it become?
      </p>
      <div className="button-row">
        {CHOICES.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            className={`btn ${kind === suggested ? 'primary' : ''}`}
            onClick={() => appStore.resolvePending(kind)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="btn danger" onClick={() => appStore.resolvePending('discard')}>
          Discard
        </button>
      </div>
    </div>
  )
}
