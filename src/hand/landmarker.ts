/**
 * MediaPipe HandLandmarker wrapper (@mediapipe/tasks-vision).
 * WASM + model loaded from pinned CDN URLs (documented in README).
 *
 * Pin: @mediapipe/tasks-vision@1.0.1 (npm) with matching jsDelivr wasm.
 * Model: hand_landmarker.task float16 v1 from Google storage.
 */

import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type { Landmark } from './gestures'

/** Pinned CDN assets — bump both together when upgrading. */
export const MEDIAPIPE_VERSION = '1.0.1'
export const WASM_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export interface HandFrame {
  landmarks: Landmark[]
  handedness: string
}

export class HandTracker {
  private landmarker: HandLandmarker | null = null
  private ready = false

  async init(): Promise<void> {
    if (this.ready) return
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    this.ready = true
  }

  isReady(): boolean {
    return this.ready
  }

  detect(video: HTMLVideoElement, timestampMs: number): HandFrame | null {
    if (!this.landmarker) return null
    const result: HandLandmarkerResult = this.landmarker.detectForVideo(
      video,
      timestampMs,
    )
    if (!result.landmarks || result.landmarks.length === 0) return null
    const lm = result.landmarks[0]!
    const handedness = result.handednesses?.[0]?.[0]?.categoryName ?? 'Unknown'
    return {
      landmarks: lm.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      handedness,
    }
  }

  close(): void {
    this.landmarker?.close()
    this.landmarker = null
    this.ready = false
  }
}
