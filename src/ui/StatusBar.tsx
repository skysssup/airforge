import { useAppState } from './hooks'
import { count } from '../store/appStore'
import { MAX_OBJECTS } from '../physics/params'

export function StatusBar() {
  const statusMessage = useAppState((s) => s.statusMessage)
  const objects = useAppState((s) => s.objects)
  const ramps = objects.filter((o) => o.kind === 'ramp').length
  const balls = objects.filter((o) => o.kind === 'ball').length
  const platforms = objects.length - ramps - balls

  return (
    <footer className="status-bar">
      <span role="status">{statusMessage}</span>
      <span className="muted">
        {count(ramps, 'ramp')} · {count(balls, 'ball')} · {count(platforms, 'platform')} ({objects.length}/{MAX_OBJECTS})
      </span>
    </footer>
  )
}
