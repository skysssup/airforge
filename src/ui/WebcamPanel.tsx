import { useEffect, useRef, useState } from 'react'
import { openCamera, stopCamera, CameraError, cameraErrorHint } from '../camera/media'
import type { HandTracker } from '../hand/landmarker'
import { classifyRawGesture, createGestureMachine, stepGestureMachine, type StableGesture } from '../hand/gestures'
import { landmarkToScreen } from '../coords/transforms'
import { appStore } from '../store/appStore'
import { addRawPoint, cancelStroke, createStroke, endStroke, type StrokeState } from '../stroke/capture'

interface Props {
  active: boolean
  onClose: () => void
}

const GESTURE_LABELS: Record<NonNullable<StableGesture>, string> = {
  draw: 'Webcam · drawing (index finger)',
  pen_up: 'Webcam · pen up (pinch)',
  erase: 'Webcam · cancel (open palm)',
}

const HAND_LOST = 'Hand lost, so the stroke was cancelled.'

export function WebcamPanel({ active, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let frame = 0
    let stream: MediaStream | null = null
    let tracker: HandTracker | null = null
    let stroke: StrokeState | null = null
    const machine = createGestureMachine()

    function release() {
      cancelAnimationFrame(frame)
      tracker?.close()
      tracker = null
      stopCamera(stream)
      const video = videoRef.current
      if (video && video.srcObject === stream) video.srcObject = null
      stream = null
    }

    function stopStroke(finish: boolean, message?: string) {
      if (!stroke) return
      if (finish) {
        appStore.endStroke(endStroke(stroke))
      } else {
        cancelStroke(stroke)
        appStore.cancelStroke(message)
      }
      stroke = null
    }

    function fail(err: unknown) {
      release()
      if (cancelled) return
      const message = err instanceof CameraError ? `${err.message} ${cameraErrorHint(err.code)}` : `Webcam stopped: ${String(err)}`
      appStore.setWebcamEnabled(false)
      appStore.setStatus(message)
    }

    function step() {
      const video = videoRef.current
      if (!video || !tracker) return
      const landmarks = video.readyState >= 2 ? tracker.detect(video, performance.now()) : null

      if (!landmarks) {
        const { cancelStroke: lost, handLost } = stepGestureMachine(machine, null, false)
        if (handLost) appStore.setGestureLabel('Webcam · no hand in view')
        if (lost) stopStroke(false, HAND_LOST)
        return
      }

      const { stable } = stepGestureMachine(machine, classifyRawGesture(landmarks), true)
      appStore.setGestureLabel(stable ? GESTURE_LABELS[stable] : 'Webcam · hold a gesture steady…')
      const tip = landmarks[8]
      if (!tip) return
      const point = landmarkToScreen(tip, appStore.getState().view, true)

      if (stable !== 'draw') {
        stopStroke(stable === 'pen_up', 'Stroke cancelled (open palm).')
        return
      }
      if (!stroke) {
        stroke = createStroke('webcam')
        addRawPoint(stroke, point)
        appStore.beginStroke(point)
        return
      }
      const added = addRawPoint(stroke, point)
      if (stroke.gapExceeded) stopStroke(false, 'Tracking jumped, so the stroke was cancelled.')
      else if (added) appStore.setLiveStroke(stroke.points.slice())
    }

    function loop() {
      try {
        step()
        if (!cancelled) frame = requestAnimationFrame(loop)
      } catch (err) {
        fail(err)
      }
    }

    async function start() {
      setReady(false)
      try {
        const opened = await openCamera({ width: 1280, height: 720 })
        if (cancelled) {
          stopCamera(opened)
          return
        }
        stream = opened
        const video = videoRef.current
        if (!video) throw new Error('Camera preview is unavailable')
        video.srcObject = opened
        await video.play()
        if (cancelled) return release()

        // Loaded on demand so MediaPipe stays out of the main bundle.
        const { HandTracker } = await import('../hand/landmarker')
        if (cancelled) return release()
        const created = new HandTracker()
        tracker = created
        await created.init()
        // Closing during init is a no-op, so close again once the model has loaded.
        if (cancelled) return created.close()
        setReady(true)
        appStore.setGestureLabel('Webcam · looking for a hand')
        appStore.setStatus(`Webcam ready (hand tracking on ${created.delegate}). Raise your index finger to draw; pinch to finish a shape.`)
        loop()
      } catch (err) {
        fail(err)
      }
    }

    void start()

    return () => {
      cancelled = true
      stopStroke(false)
      release()
    }
  }, [active])

  if (!active) return null

  return (
    <aside className="webcam-panel" aria-label="Webcam preview">
      <div className="webcam-header">
        <strong>Webcam</strong>
        <button type="button" className="btn small" onClick={onClose}>
          Use mouse
        </button>
      </div>
      <div className="webcam-frame">
        <video ref={videoRef} playsInline muted className="webcam-video" />
        {!ready && <div className="webcam-status">Loading the hand tracker…</div>}
      </div>
      <p className="muted small">Mirrored view. Index finger draws, pinch finishes, open palm cancels. The mouse still works.</p>
    </aside>
  )
}
