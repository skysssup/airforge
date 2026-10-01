import { useAppState } from './hooks'

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export function StatusBar() {
  const { statusMessage, objects } = useAppState()
  const ramps = objects.filter((o) => o.kind === 'ramp').length
  const balls = objects.filter((o) => o.kind === 'ball').length
  const platforms = objects.filter((o) => o.kind === 'platform').length

  return (
    <footer className="status-bar" role="status" aria-live="polite">
      <span>{statusMessage}</span>
      <span className="muted">
        {plural(ramps, 'ramp', 'ramps')} · {plural(balls, 'ball', 'balls')} ·{' '}
        {plural(platforms, 'platform', 'platforms')}
      </span>
    </footer>
  )
}
