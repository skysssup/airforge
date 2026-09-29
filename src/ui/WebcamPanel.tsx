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
import { useAppState } from './hooks'
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
  const { view } = useAppState()
  const strokeRef = useRef<StrokeState | null>(null)
  const machineRef = useRef(createGestureMachine())
  const trackerRef = useRef<HandTracker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const drawingRef = useRef(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false

    async function start() {
      setError(null)
      setReady(false)
      try {
        const stream = await openCamera({ width: 1280, height: 720 })
        if (cancelled) {
          stopCamera(stream)
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()

        // Dynamic import keeps MediaPipe out of the initial bundle
        const { HandTracker: HT } = await import('../hand/landmarker')
        const tracker = new HT()
        await tracker.init()
        if (cancelled) {
          tracker.close()
          return
        }
        trackerRef.current = tracker
        setReady(true)
        appStore.setGestureLabel('Webcam · searching for hand')
        loop()
      } catch (err) {
        const ce = err instanceof CameraError ? err : null
        const msg = ce ? `${ce.message} ${cameraErrorHint(ce.code)}` : String(err)
        setError(msg)
        appStore.setStatus(msg)
        appStore.setWebcamEnabled(false)
      }
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
              ? 'Webcam · ERASE (palm)'
              : 'Webcam · PEN UP (pinch)'
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
              if (smoothed) {
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

      rafRef.current = requestAnimationFrame(loop)
    }

    void start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      trackerRef.current?.close()
      trackerRef.current = null
      stopCamera(streamRef.current)
      streamRef.current = null
      if (strokeRef.current) {
        cancelStroke(strokeRef.current)
        strokeRef.current = null
        drawingRef.current = false
        appStore.cancelStroke('webcam', 'user')
      }
      resetGestureMachine(machineRef.current)
    }
  }, [active, view.width, view.height])

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
        Mirrored view. Index = draw, pinch = pen up. Mouse overlay remains active.
      </p>
    </aside>
  )
}
