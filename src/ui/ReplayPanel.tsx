import { useEffect, useState } from 'react'
import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import {
  createReplayController,
  restartReplay,
  seekSnapshot,
  stepReplay,
} from '../replay/timeline'

interface Props {
  onClose: () => void
}

export function ReplayPanel({ onClose }: Props) {
  const { timeline } = useAppState()
  const [ctrl, setCtrl] = useState(() => ({ ...createReplayController(), index: -1 }))

  useEffect(() => {
    appStore.setReplayMode(true)
    return () => appStore.setReplayMode(false)
  }, [])

  const snap = timeline.snapshots[ctrl.index] ?? null
  const total = timeline.snapshots.length

  function applyIndex(index: number) {
    const next = { ...ctrl }
    const s = seekSnapshot(timeline, next, index)
    setCtrl({ ...next })
    if (s) {
      appStore.applySnapshotObjects(s.objects, s.physics)
      appStore.setStatus(`Replay snapshot ${next.index + 1}/${total}${s.label ? ` — ${s.label}` : ''}`)
    }
  }

  return (
    <div className="replay-panel" role="region" aria-label="Replay controls">
      <div className="replay-inner">
        <strong>Replay</strong>
        <span className="muted">
          {total === 0
            ? 'No snapshots yet — forge something first.'
            : ctrl.index < 0
              ? `Live scene paused · ${total} snapshots`
              : `Snapshot ${ctrl.index + 1} / ${total} · ${timeline.events.length} events`}
        </span>
        <p className="muted small">
          Snapshot-based playback. Rapier is not bit-exact across devices — we restore recorded
          object states rather than claiming deterministic re-simulation.
        </p>
        <div className="suggestion-actions">
          <button
            type="button"
            className="btn"
            disabled={total === 0}
            onClick={() => {
              const next = { ...ctrl }
              restartReplay(timeline, next)
              setCtrl({ ...next })
              applyIndex(0)
            }}
          >
            Restart
          </button>
          <button
            type="button"
            className="btn"
            disabled={total === 0}
            onClick={() => {
              const next = { ...ctrl }
              stepReplay(timeline, next, -1)
              setCtrl({ ...next })
              applyIndex(next.index)
            }}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn"
            disabled={total === 0}
            onClick={() => {
              const next = { ...ctrl }
              stepReplay(timeline, next, 1)
              setCtrl({ ...next })
              applyIndex(next.index)
            }}
          >
            Next
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
        {snap?.label && <p className="muted">Label: {snap.label}</p>}
      </div>
    </div>
  )
}
