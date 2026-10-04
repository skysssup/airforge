/**
 * Gesture classification + hysteresis state machine.
 * - Index-only = draw
 * - Pinch = pen up
 * - Open palm = cancel stroke (internal mode name remains "erase")
 * - Mode hysteresis: 3 stable frames
 * - Max lost frames: 2 → cancel stroke (never connect distant points)
 */

export type RawGesture = 'draw' | 'pen_up' | 'erase' | null
export type StableGesture = 'draw' | 'pen_up' | 'erase' | null

export const MODE_STABLE_FRAMES = 3
export const MAX_LOST_FRAMES = 2
export const PINCH_THRESHOLD = 0.05

/** MediaPipe-style landmark: x,y in [0,1], optionally z. */
export interface Landmark {
  x: number
  y: number
  z?: number
}

/** Tip/PIP landmark indices: index, middle, ring, pinky. */
const TIP = [8, 12, 16, 20] as const
const PIP = [6, 10, 14, 18] as const
const WRIST = 0
const THUMB_TIP = 4
const INDEX_TIP = 8

function dist2d(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Finger extended if tip is farther from the wrist than the PIP joint.
 * Orientation-robust vs tip.y < pip.y (which fails when the hand is tilted).
 */
export function fingersUp(landmarks: Landmark[]): boolean[] {
  const wrist = landmarks[WRIST]!
  return TIP.map((tipIdx, i) => {
    const pipIdx = PIP[i]!
    const tip = landmarks[tipIdx]!
    const pip = landmarks[pipIdx]!
    return dist2d(wrist, tip) > dist2d(wrist, pip)
  })
}

export function isIndexOnly(landmarks: Landmark[]): boolean {
  const f = fingersUp(landmarks)
  return f[0] === true && !f[1] && !f[2] && !f[3]
}

export function isOpenPalm(landmarks: Landmark[]): boolean {
  return fingersUp(landmarks).every(Boolean)
}

export function isPinch(landmarks: Landmark[], threshold = PINCH_THRESHOLD): boolean {
  const a = landmarks[INDEX_TIP]!
  const b = landmarks[THUMB_TIP]!
  return Math.hypot(a.x - b.x, a.y - b.y) < threshold
}

export function classifyRawGesture(landmarks: Landmark[]): RawGesture {
  if (isOpenPalm(landmarks)) return 'erase'
  if (isPinch(landmarks)) return 'pen_up'
  if (isIndexOnly(landmarks)) return 'draw'
  return 'pen_up'
}

export interface GestureMachineState {
  prevStable: StableGesture
  rawPrev: RawGesture
  stableCount: number
  lostFrames: number
}

export function createGestureMachine(): GestureMachineState {
  return {
    prevStable: null,
    rawPrev: null,
    stableCount: 0,
    lostFrames: 0,
  }
}

/**
 * Feed one frame. Returns stable gesture and whether hand was lost long enough
 * to cancel the current stroke.
 */
export function stepGestureMachine(
  state: GestureMachineState,
  raw: RawGesture,
  handPresent: boolean,
): { stable: StableGesture; cancelStroke: boolean; handLost: boolean } {
  if (!handPresent) {
    state.lostFrames += 1
    if (state.lostFrames > MAX_LOST_FRAMES) {
      const wasDrawing = state.prevStable === 'draw'
      state.prevStable = null
      state.rawPrev = null
      state.stableCount = 0
      return { stable: null, cancelStroke: wasDrawing, handLost: true }
    }
    // Brief loss: keep previous stable mode, do not add points (caller must skip)
    return { stable: state.prevStable, cancelStroke: false, handLost: true }
  }

  state.lostFrames = 0

  if (raw === state.rawPrev) {
    state.stableCount = Math.min(state.stableCount + 1, MODE_STABLE_FRAMES)
  } else {
    state.rawPrev = raw
    state.stableCount = 1
  }

  let stable = state.prevStable
  if (state.stableCount >= MODE_STABLE_FRAMES) {
    stable = raw
    state.prevStable = raw
  }

  return { stable, cancelStroke: false, handLost: false }
}
