import { describe, expect, it } from 'vitest'
import { MAX_MOTION_SAMPLES, MotionRecording } from './recording'

const sample = (seconds: number) => ({ seconds, speed: 2.5, height: 3, highest: 4 })
describe('motion experiment recording', () => {
  it('records simulation times without adding samples while paused', () => {
    const capture = new MotionRecording()
    const reading = sample(0)
    capture.add(reading)
    reading.height = 999
    capture.add(sample(0))
    capture.add(sample(0.1))
    expect(capture.samples).toHaveLength(2)
    expect(capture.samples[0]!.height).toBe(3)
    expect(capture.csv()).toBe('time_s,speed_u_per_s,height_u,highest_u\n0,2.5,3,4\n0.1,2.5,3,4\n')
  })
  it('preserves a completed experiment when the simulation restarts', () => {
    const capture = new MotionRecording()
    capture.add(sample(5))
    expect(capture.add(sample(0))).toBe(false)
    expect(capture.stopped).toBe('restart')
    expect(capture.samples).toEqual([sample(5)])
  })
  it('bounds memory and ignores invalid measurements', () => {
    const capture = new MotionRecording()
    expect(capture.add(sample(NaN))).toBe(false)
    for (let i = 0; i <= MAX_MOTION_SAMPLES; i++) capture.add(sample(i))
    expect(capture.samples).toHaveLength(MAX_MOTION_SAMPLES)
    expect(capture.stopped).toBe('limit')
  })
})
