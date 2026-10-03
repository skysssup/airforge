import { useEffect, useRef, useState } from 'react'
import { openCamera, stopCamera, CameraError, cameraErrorHint } from '../camera/media'
import type { HandTracker } from '../hand/landmarker'
import {
  classifyRawGesture,
  createGestureMachine,
  stepGestureMachine,
  resetGestureMachine,
  type Landmark,
} from '../hand/gestures'
import { landmarkToScreen } from '../coords/transforms'
import { appStore } from '../store/appStore'
import {
  addRawPoint,
  cancelStroke,
  createStroke,
  endStroke,
  type StrokeState,
} from '../stroke/capture'
import { makeEventId } from '../events/types'

interface Props {
  active: boolean
  onClose: () => void
}

export function WebcamPanel({ active, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const strokeRef = useRef<StrokeState | null>(null)
  const machineRef = useRef(createGestureMachine())
  const trackerRef = useRef<HandTracker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const drawingRef = useRef(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let ownedStream: MediaStream | null = null
    let ownedTracker: HandTracker | null = null

    function releaseResources() {
      ownedTracker?.close()
      if (trackerRef.current === ownedTracker) trackerRef.current = null
      ownedTracker = null
      stopCamera(ownedStream)
      if (streamRef.current === ownedStream) streamRef.current = null
      const video = videoRef.current
      if (video && video.srcObject === ownedStream) video.srcObject = null
      ownedStream = null
    }

    async function start() {
      setError(null)
      setReady(false)
      try {
        const stream = await openCamera({ width: 1280, height: 720 })
        if (cancelled) {
          stopCamera(stream)
          return
        }
        ownedStream = stream
        streamRef.current = stream
        const video = videoRef.current
        if (!video) throw new Error('Camera preview is unavailable')
        video.srcObject = stream
        await video.play()
        if (cancelled) { releaseResources(); return }

        // Dynamic import keeps MediaPipe out of the initial bundle
        const { HandTracker: HT } = await import('../hand/landmarker')
        if (cancelled) { releaseResources(); return }
        const tracker = new HT()
        ownedTracker = tracker
        await tracker.init()
        if (cancelled) {
          tracker.close()
          releaseResources()
          return
        }
        trackerRef.current = tracker
        setReady(true)
        appStore.setGestureLabel('Webcam · searching for hand')
        loop()
      } catch (err) {
        fail(err)
      }
    }

    function fail(err: unknown) {
      releaseResources()
      if (cancelled) return
      const ce = err instanceof CameraError ? err : null
      const msg = ce ? `${ce.message} ${cameraErrorHint(ce.code)}` : String(err)
      setError(msg)
      appStore.setWebcamEnabled(false)
      appStore.setStatus(msg)
    }

    function finishActiveStroke(asCancel: boolean, reason: 'hand_lost' | 'mode_change' | 'user') {
      if (!strokeRef.current) {
        drawingRef.current = false
        return
      }
      if (asCancel) {
        cancelStroke(strokeRef.current)
        strokeRef.current = null
        drawingRef.current = false
        appStore.cancelStroke('webcam', reason)
        return
      }
      const pts = endStroke(strokeRef.current)
      strokeRef.current = null
      drawingRef.current = false
      appStore.endStroke('webcam', pts)
    }

    function loop() {
      try {
        step()
        if (!cancelled) rafRef.current = requestAnimationFrame(loop)
      } catch (err) {
        fail(err)
      }
    }

    function step() {
      const video = videoRef.current
      const tracker = trackerRef.current
      if (!video || !tracker || cancelled) return

      const now = performance.now()
      const hand = video.readyState >= 2 ? tracker.detect(video, now) : null
      const machine = machineRef.current

      if (!hand) {
        const { cancelStroke: shouldCancel, handLost } = stepGestureMachine(
          machine,
          null,
          false,
        )
        if (handLost) appStore.setGestureLabel('Webcam · hand lost')
        if (shouldCancel) finishActiveStroke(true, 'hand_lost')
      } else {
        const raw = classifyRawGesture(hand.landmarks as Landmark[])
        const { stable, cancelStroke: shouldCancel } = stepGestureMachine(
          machine,
          raw,
          true,
        )

        const label =
          stable === 'draw'
            ? 'Webcam · DRAW (index)'
            : stable === 'erase'
              ? 'Webcam · CANCEL (palm)'
              : stable === 'pen_up'
                ? 'Webcam · PEN UP (pinch)'
                : 'Webcam · settling…'
        appStore.setGestureLabel(label)

        if (shouldCancel) finishActiveStroke(true, 'hand_lost')

        const tip = hand.landmarks[8]
        if (tip && !shouldCancel) {
          const screen = landmarkToScreen({ x: tip.x, y: tip.y }, appStore.getState().view, true)

          if (stable === 'draw') {
            if (!drawingRef.current) {
              strokeRef.current = createStroke(makeEventId('stroke'), 'webcam')
              addRawPoint(strokeRef.current, screen)
              drawingRef.current = true
              appStore.beginStroke('webcam', screen)
            } else if (strokeRef.current) {
              const smoothed = addRawPoint(strokeRef.current, screen)
              if (strokeRef.current.gapExceeded) {
                // Tracking jump — cancel rather than connect distant points
                finishActiveStroke(true, 'hand_lost')
              } else if (smoothed) {
                appStore.setLiveStroke(strokeRef.current.points.slice(), 'webcam')
              }
            }
          } else if (drawingRef.current) {
            if (stable === 'erase') {
              finishActiveStroke(true, 'mode_change')
            } else {
              finishActiveStroke(false, 'user')
            }
          }
        }
      }
    }

    void start()

    const machine = machineRef.current
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      releaseResources()
      if (strokeRef.current) {
        cancelStroke(strokeRef.current)
        strokeRef.current = null
        drawingRef.current = false
        appStore.cancelStroke('webcam', 'user')
      }
      resetGestureMachine(machine)
    }
    // view is read live via appStore.getState() in the loop — do not restart on resize
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
        <video ref={videoRef} playsInline muted className="webcam-video mirrored" />
        {!ready && !error && <div className="webcam-status">Loading HandLandmarker…</div>}
        {error && <div className="webcam-status error">{error}</div>}
      </div>
      <p className="muted small">
        Mirrored view. Index = draw, pinch = pen up, open palm = cancel stroke. Mouse overlay remains active.
      </p>
    </aside>
  )
}
