import { useAppState } from './hooks'

export function StatusBar() {
  const { statusMessage, objects } = useAppState()
  const ramps = objects.filter((o) => o.kind === 'ramp').length
  const balls = objects.filter((o) => o.kind === 'ball').length
  const platforms = objects.filter((o) => o.kind === 'platform').length

  return (
    <footer className="status-bar" role="status" aria-live="polite">
      <span>{statusMessage}</span>
      <span className="muted">
        {ramps} ramp · {balls} ball · {platforms} platform
      </span>
    </footer>
  )
}
