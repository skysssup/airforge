import { describe, expect, it } from 'vitest'
import {
  classifyRawGesture,
  createGestureMachine,
  fingersUp,
  isIndexOnly,
  isOpenPalm,
  isPinch,
  MODE_STABLE_FRAMES,
  MAX_LOST_FRAMES,
  stepGestureMachine,
  type Landmark,
} from './gestures'

/** Build 21 landmarks; override tips/pips for gestures. */
function makeHand(opts: {
  indexUp?: boolean
  middleUp?: boolean
  ringUp?: boolean
  pinkyUp?: boolean
  pinch?: boolean
}): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  // wrist
  lm[0] = { x: 0.5, y: 0.8 }
  // thumb
  lm[4] = opts.pinch ? { x: 0.5, y: 0.4 } : { x: 0.35, y: 0.55 }
  // index tip 8 / pip 6
  lm[6] = { x: 0.5, y: 0.5 }
  lm[8] = { x: 0.5, y: opts.indexUp === false ? 0.6 : 0.3 }
  // middle 12 / 10
  lm[10] = { x: 0.55, y: 0.5 }
  lm[12] = { x: 0.55, y: opts.middleUp ? 0.3 : 0.6 }
  // ring 16 / 14
  lm[14] = { x: 0.6, y: 0.5 }
  lm[16] = { x: 0.6, y: opts.ringUp ? 0.3 : 0.6 }
  // pinky 20 / 18
  lm[18] = { x: 0.65, y: 0.5 }
  lm[20] = { x: 0.65, y: opts.pinkyUp ? 0.3 : 0.6 }

  if (opts.pinch) {
    lm[8] = { x: 0.5, y: 0.4 }
    lm[4] = { x: 0.5, y: 0.4 }
  }
  return lm
}

describe('gesture classification', () => {
  it('detects index-only draw', () => {
    const hand = makeHand({ indexUp: true })
    expect(isIndexOnly(hand)).toBe(true)
    expect(classifyRawGesture(hand)).toBe('draw')
  })

  it('detects pinch as pen up', () => {
    const hand = makeHand({ pinch: true, indexUp: true })
    expect(isPinch(hand)).toBe(true)
    expect(classifyRawGesture(hand)).toBe('pen_up')
  })

  it('detects open palm erase', () => {
    const hand = makeHand({
      indexUp: true,
      middleUp: true,
      ringUp: true,
      pinkyUp: true,
    })
    expect(isOpenPalm(hand)).toBe(true)
    expect(fingersUp(hand).every(Boolean)).toBe(true)
    expect(classifyRawGesture(hand)).toBe('erase')
  })
})

describe('gesture hysteresis + hand loss', () => {
  it('requires MODE_STABLE_FRAMES before switching', () => {
    const m = createGestureMachine()
    let stable = null as ReturnType<typeof stepGestureMachine>['stable']
    for (let i = 0; i < MODE_STABLE_FRAMES - 1; i++) {
      ;({ stable } = stepGestureMachine(m, 'draw', true))
      expect(stable).not.toBe('draw')
    }
    ;({ stable } = stepGestureMachine(m, 'draw', true))
    expect(stable).toBe('draw')
  })

  it('cancels stroke after MAX_LOST_FRAMES when was drawing', () => {
    const m = createGestureMachine()
    for (let i = 0; i < MODE_STABLE_FRAMES; i++) {
      stepGestureMachine(m, 'draw', true)
    }
    expect(m.prevStable).toBe('draw')

    // lose hand for MAX_LOST_FRAMES — still holding
    for (let i = 0; i < MAX_LOST_FRAMES; i++) {
      const r = stepGestureMachine(m, null, false)
      expect(r.cancelStroke).toBe(false)
    }
    // one more → cancel
    const r = stepGestureMachine(m, null, false)
    expect(r.cancelStroke).toBe(true)
    expect(r.handLost).toBe(true)
    expect(m.prevStable).toBeNull()
  })

  it('does not cancel if never drawing', () => {
    const m = createGestureMachine()
    for (let i = 0; i < MODE_STABLE_FRAMES; i++) {
      stepGestureMachine(m, 'pen_up', true)
    }
    for (let i = 0; i <= MAX_LOST_FRAMES; i++) {
      stepGestureMachine(m, null, false)
    }
    const r = stepGestureMachine(m, null, false)
    expect(r.cancelStroke).toBe(false)
  })
})
