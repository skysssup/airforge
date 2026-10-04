import { useEffect, useState } from 'react'
import { useAppState } from './hooks'
import { followedBall, readBall, type MotionReading } from '../physics/motion'

const REFRESH_MS = 100

/** Time, speed, and height of one ball while motion marks are on, refreshed ten times a second. */
export function MotionReadout() {
  const motion = useAppState((s) => s.motion)
  const objects = useAppState((s) => s.objects)
  const selectedId = useAppState((s) => s.selectedId)
  const webcam = useAppState((s) => s.webcamEnabled)
  const ball = motion ? followedBall(objects, selectedId) : null
  const [reading, setReading] = useState<MotionReading | null>(null)

  useEffect(() => {
    if (!ball) return
    const update = () => setReading(readBall(ball))
    update()
    const timer = setInterval(update, REFRESH_MS)
    return () => clearInterval(timer)
  }, [ball])

  if (!motion) return null

  return (
    <section className={`panel motion-readout${webcam ? ' below-webcam' : ''}`} aria-label="Motion">
      <div className="panel-head">
        <span>Motion</span>
        <span className="muted">1 u = 1 grid square</span>
      </div>
      {ball && reading ? (
        <dl className="readings">
          <div>
            <dt className="t-label">Time</dt>
            <dd>{reading.seconds.toFixed(2)} s</dd>
          </div>
          <div>
            <dt className="t-label">Speed</dt>
            <dd>{reading.speed.toFixed(2)} u/s</dd>
          </div>
          <div>
            <dt className="t-label">Height</dt>
            <dd>{reading.height.toFixed(2)} u</dd>
          </div>
          <div>
            <dt className="t-label">Highest</dt>
            <dd>{reading.highest.toFixed(2)} u</dd>
          </div>
        </dl>
      ) : (
        <p className="panel-body muted">Select a ball to read its time, speed, and height.</p>
      )}
    </section>
  )
}
