/**
 * Shape accuracy + timing measurement harness.
 * Run against synthetic fixtures — gesture accuracy is NOT evaluated here
 * (no webcam on CI / this machine).
 */

import { recognizeStroke } from '../shapes/recognize'
import {
  ambiguousScribble,
  cleanCircle,
  cleanDiagonalLine,
  cleanRectangle,
  cleanSquare,
  noisyCircle,
  noisyLine,
  openArc,
  tinyStroke,
} from '../fixtures/strokes'

export interface EvalCase {
  name: string
  expect: 'line' | 'circle' | 'rectangle' | 'square' | null
  points: ReturnType<typeof cleanDiagonalLine>
}

export const EVAL_CASES: EvalCase[] = [
  { name: 'clean-line', expect: 'line', points: cleanDiagonalLine() },
  { name: 'noisy-line', expect: 'line', points: noisyLine() },
  { name: 'clean-circle', expect: 'circle', points: cleanCircle() },
  { name: 'noisy-circle', expect: 'circle', points: noisyCircle() },
  { name: 'clean-rect', expect: 'rectangle', points: cleanRectangle() },
  { name: 'clean-square', expect: 'square', points: cleanSquare() },
  { name: 'tiny', expect: null, points: tinyStroke() },
  { name: 'open-arc', expect: null, points: openArc() },
  { name: 'scribble', expect: null, points: ambiguousScribble() },
]

export interface EvalReport {
  total: number
  passed: number
  failed: { name: string; expected: string; got: string }[]
  timingsMs: { name: string; ms: number }[]
  meanMs: number
}

export function runShapeEval(): EvalReport {
  const failed: EvalReport['failed'] = []
  const timingsMs: EvalReport['timingsMs'] = []
  let passed = 0

  for (const c of EVAL_CASES) {
    const t0 = performance.now()
    const result = recognizeStroke(c.points)
    const t1 = performance.now()
    timingsMs.push({ name: c.name, ms: t1 - t0 })

    const got = result.primary?.kind ?? null
    if (got === c.expect) {
      passed += 1
    } else {
      failed.push({
        name: c.name,
        expected: String(c.expect),
        got: String(got),
      })
    }
  }

  const meanMs =
    timingsMs.reduce((a, b) => a + b.ms, 0) / (timingsMs.length || 1)

  return {
    total: EVAL_CASES.length,
    passed,
    failed,
    timingsMs,
    meanMs,
  }
}
