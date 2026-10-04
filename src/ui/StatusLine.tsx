import { useSyncExternalStore } from 'react'
import { useAppState } from './hooks'
import { pointerStore } from './pointer'

const coordinate = (value: number | undefined) => (value === undefined ? '–' : value.toFixed(2))

/** Input mode, pointer position in world units, and the latest message. */
export function StatusLine() {
  const statusMessage = useAppState((s) => s.statusMessage)
  const gestureLabel = useAppState((s) => s.gestureLabel)
  const webcamEnabled = useAppState((s) => s.webcamEnabled)
  const pointer = useSyncExternalStore(pointerStore.subscribe, pointerStore.get, pointerStore.get)

  return (
    <div className="statusline">
      <span className="mode t-ui">
        <span className={`dot${webcamEnabled ? ' live' : ''}`} aria-hidden="true" />
        {gestureLabel}
      </span>
      <span className="coords t-ui" aria-hidden="true" title="Pointer position in world units">
        <span>
          x <span className="value">{coordinate(pointer?.x)}</span>
        </span>
        <span>
          y <span className="value">{coordinate(pointer?.y)}</span>
        </span>
      </span>
      <span className="message" role="status">
        {statusMessage}
      </span>
    </div>
  )
}
