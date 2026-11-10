import { useEffect, useRef, useState } from 'react'
import { useAppState } from './hooks'
import { followedBall, readBall, type MotionReading } from '../physics/motion'
import { MotionRecording } from '../physics/recording'
import { appStore } from '../store/appStore'

const REFRESH_MS = 100

/** Time, speed, and height of one ball while motion marks are on, refreshed ten times a second. */
export function MotionReadout() {
  const motion = useAppState((s) => s.motion)
  const objects = useAppState((s) => s.objects)
  const selectedId = useAppState((s) => s.selectedId)
  const webcam = useAppState((s) => s.webcamEnabled)
  const ball = motion ? followedBall(objects, selectedId) : null
  const [reading, setReading] = useState<MotionReading | null>(null)
  const recording = useRef(new MotionRecording())
  const [recordingBall, setRecordingBall] = useState<string | null>(null)
  const [samples, setSamples] = useState<MotionReading[]>([])
  const sampleCount = samples.length
  const [details, setDetails] = useState(false)

  useEffect(() => {
    const update = () => {
      if (recordingBall && (!motion || ball?.id !== recordingBall)) {
        setRecordingBall(null)
        appStore.setStatus('Recording stopped because the followed ball changed. The measurements are ready to export.')
      }
      if (!ball) return
      const next = readBall(ball)
      setReading(next)
      if (recordingBall === ball.id) {
        if (recording.current.add(next)) setSamples([...recording.current.samples])
        if (recording.current.stopped) {
          setRecordingBall(null)
          appStore.setStatus(recording.current.stopped === 'limit' ? 'Recording stopped at 3,000 samples. Export CSV to keep the measurements.' : 'The simulation restarted. The previous recording is ready to export.')
        }
      }
    }
    update()
    const timer = setInterval(update, REFRESH_MS)
    return () => clearInterval(timer)
  }, [ball, recordingBall, motion])

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([recording.current.csv()], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'airforge-motion.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    appStore.setStatus(`Exported ${sampleCount} motion measurements. Units: seconds and grid squares.`)
  }

  if (!motion) return null

  const recordButton = (
    <button
      type="button"
      className="btn"
      disabled={!ball}
      aria-pressed={!!recordingBall}
      aria-label={recordingBall ? 'Stop recording' : 'Record motion'}
      onClick={() => {
        if (recordingBall) setRecordingBall(null)
        else if (ball) {
          recording.current = new MotionRecording()
          setSamples([])
          setRecordingBall(ball.id)
        }
      }}
    >
      <span className={`dot${recordingBall ? '' : ' hollow'}`} aria-hidden="true" />
      <span className="label">{recordingBall ? 'Stop recording' : 'Record motion'}</span>
    </button>
  )

  // On a phone the readout is a strip (time, speed, height, record); Details opens the rest as a drawer.
  return (
    <section className={`panel motion-readout${webcam ? ' below-webcam' : ''}${details ? ' details-open' : ''}`} aria-label="Motion">
      <div className="panel-head">
        <h2>Motion</h2>
        <span className="muted unit-note">1 u = 1 grid square</span>
        <button
          type="button"
          className="btn details-button compact-only"
          aria-label="Details"
          aria-expanded={details}
          aria-controls="motion-details"
          onClick={() => setDetails((open) => !open)}
        >
          <span className="label">Details</span>
        </button>
      </div>
      {ball && reading ? (
        <dl className="readings" data-passthrough>
          <div>
            <dt>Time</dt>
            <dd>{reading.seconds.toFixed(2)} s</dd>
          </div>
          <div>
            <dt>Speed</dt>
            <dd>{reading.speed.toFixed(2)} u/s</dd>
          </div>
          <div>
            <dt>Height</dt>
            <dd>{reading.height.toFixed(2)} u</dd>
          </div>
          <div className="detail">
            <dt>Highest</dt>
            <dd>{reading.highest.toFixed(2)} u</dd>
          </div>
        </dl>
      ) : (
        <p className="panel-body" data-passthrough>
          Select a ball to read its time, speed, and height.
        </p>
      )}
      <div className="motion-recording">
        <div className="motion-recording-actions">
          {recordButton}
          <button type="button" className="btn detail" aria-label="Export CSV" disabled={!sampleCount || !!recordingBall} onClick={exportCsv}>
            <span className="label">Export CSV</span>
          </button>
        </div>
        <div className="detail" id="motion-details">
          <p className="muted">
            {recordingBall ? 'Recording · ' : ''}
            {sampleCount} samples · simulation time
          </p>
          {sampleCount > 1 && <MotionPlot samples={samples} />}
        </div>
      </div>
    </section>
  )
}

/** The shape of the measured trajectory, with a zero height reference. */
function MotionPlot({ samples }: { samples: MotionReading[] }) {
  const first = samples[0]!.seconds
  const span = Math.max(0.01, samples.at(-1)!.seconds - first)
  const min = Math.min(0, ...samples.map((s) => s.height))
  const max = Math.max(0.01, ...samples.map((s) => s.height))
  const y = (h: number) => 55 - (h - min) / (max - min) * 50
  const points = samples.map((s) => `${5 + (s.seconds - first) / span * 230},${y(s.height)}`).join(' ')
  return <svg className="motion-plot" viewBox="0 0 240 65" role="img" aria-label={`Measured height over ${(span).toFixed(2)} seconds of simulation`}>
    <line x1="5" x2="235" y1={y(0)} y2={y(0)} stroke="currentColor" opacity="0.25" />
    <polyline points={points} fill="none" stroke="var(--accent-mark)" strokeWidth="1.5" />
  </svg>
}
