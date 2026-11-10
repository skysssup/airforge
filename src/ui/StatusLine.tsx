import { useSyncExternalStore } from 'react'
import { useAppState } from './hooks'
import { pointerStore } from './pointer'

/** Messages that report a failure get the error treatment: red text and a left rule, never colour alone. */
const ERROR = /^(Could not|There is no|Camera|No webcam|That file|This link)/

const coordinate = (value: number | undefined) => (value === undefined ? '–' : value.toFixed(2))

/** Input mode, pointer position in world units, and the latest message. */
export function StatusLine() {
  const statusMessage = useAppState((s) => s.statusMessage)
  const gestureLabel = useAppState((s) => s.gestureLabel)
  const webcamEnabled = useAppState((s) => s.webcamEnabled)
  const pointer = useSyncExternalStore(pointerStore.subscribe, pointerStore.get, pointerStore.get)

  return (
    <div className="statusline">
      <span className="mode">
        <span className={`dot${webcamEnabled ? '' : ' hollow'}`} aria-hidden="true" />
        {gestureLabel}
      </span>
      <span className="coords" aria-hidden="true" title="Pointer position in world units">
        <span>
          x <span className="value">{coordinate(pointer?.x)}</span>
        </span>
        <span>
          y <span className="value">{coordinate(pointer?.y)}</span>
        </span>
      </span>
      <span className={`message${ERROR.test(statusMessage) ? ' error' : ''}`} role="status">
        {statusMessage}
      </span>
    </div>
  )
}
