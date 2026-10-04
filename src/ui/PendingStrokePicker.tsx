import type { JSX } from 'react'
import { appStore, type ShapeChoice } from '../store/appStore'
import { useAppState } from './hooks'
import { shapeToObjectKind } from '../shapes/recognize'
import { BallGlyph, CloseIcon, CurveGlyph, PlatformGlyph, RampGlyph } from './icons'

const CHOICES: { kind: ShapeChoice; label: string; Glyph: () => JSX.Element }[] = [
  { kind: 'ramp', label: 'Ramp', Glyph: RampGlyph },
  { kind: 'ball', label: 'Ball', Glyph: BallGlyph },
  { kind: 'platform', label: 'Platform', Glyph: PlatformGlyph },
  { kind: 'curve', label: 'Curve', Glyph: CurveGlyph },
]

/** Asks what an unclear stroke (shown dashed on the canvas) should become. */
export function PendingStrokePicker() {
  const pending = useAppState((s) => s.pending)
  if (!pending) return null
  const suggested = pending.primary ? shapeToObjectKind(pending.primary.kind) : null

  return (
    <div className="panel picker" role="region" aria-label="Choose a shape for the dashed stroke">
      <div className="panel-head">Unclear stroke</div>
      <p className="panel-body">
        {suggested
          ? `The dashed stroke looks most like a ${suggested}, but it is not a clear match.`
          : 'The dashed stroke is not a clear line, circle, rectangle, or smooth curve.'}{' '}
        What should it become?
      </p>
      <div className="choices">
        {CHOICES.map(({ kind, label, Glyph }) => (
          <button key={kind} type="button" className={`btn${kind === suggested ? ' primary' : ''}`} onClick={() => appStore.resolvePending(kind)}>
            <Glyph />
            {label}
          </button>
        ))}
        <button type="button" className="btn" onClick={() => appStore.resolvePending('discard')}>
          <CloseIcon />
          Discard
        </button>
      </div>
    </div>
  )
}
