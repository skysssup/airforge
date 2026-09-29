import { describe, expect, it } from 'vitest'
import { runShapeEval } from './harness'

describe('shape eval harness', () => {
  it('passes majority of synthetic fixtures and reports timings', () => {
    const report = runShapeEval()
    expect(report.total).toBeGreaterThan(0)
    expect(report.passed).toBeGreaterThanOrEqual(report.total - 2)
    expect(report.meanMs).toBeGreaterThanOrEqual(0)
    if (report.failed.length) {
      // soft log via assertion message
      expect(report.failed, JSON.stringify(report.failed)).toHaveLength(0)
    }
  })
})
