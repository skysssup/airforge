/**
 * MediaPipe HandLandmarker wrapper (@mediapipe/tasks-vision).
 * The WASM runtime comes from jsDelivr at the same version as the npm
 * package, and the float16 v1 hand model from Google Cloud Storage.
 */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Landmark } from './gestures'

/** Pinned CDN assets — bump both together when upgrading. */
export const MEDIAPIPE_VERSION = '1.0.1'
export const WASM_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export class HandTracker {
  private landmarker: HandLandmarker | null = null
  /** Which MediaPipe delegate succeeded during init. */
  delegate: 'GPU' | 'CPU' | null = null

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
    const shared = {
      runningMode: 'VIDEO' as const,
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }

    try {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        ...shared,
      })
      this.delegate = 'GPU'
    } catch {
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
        ...shared,
      })
      this.delegate = 'CPU'
    }
  }

  /** Landmarks of the first detected hand, or null when no hand is visible. */
  detect(video: HTMLVideoElement, timestampMs: number): Landmark[] | null {
    return this.landmarker?.detectForVideo(video, timestampMs).landmarks[0] ?? null
  }

  close(): void {
    this.landmarker?.close()
    this.landmarker = null
    this.delegate = null
  }
}
