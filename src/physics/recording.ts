import type { MotionReading } from './motion'

/** A bounded capture of observed simulation times, never wall-clock times. */
export const MAX_MOTION_SAMPLES = 3000
export class MotionRecording {
  readonly samples: MotionReading[] = []
  stopped: 'limit' | 'restart' | null = null

  add(reading: MotionReading): boolean {
    if (this.stopped || !Object.values(reading).every(Number.isFinite)) return false
    const last = this.samples.at(-1)
    if (last && reading.seconds < last.seconds) { this.stopped = 'restart'; return false }
    if (last && reading.seconds === last.seconds) return false
    this.samples.push({ ...reading })
    if (this.samples.length >= MAX_MOTION_SAMPLES) this.stopped = 'limit'
    return true
  }

  csv(): string {
    return ['time_s,speed_u_per_s,height_u,highest_u', ...this.samples.map((s) => [s.seconds, s.speed, s.height, s.highest].join(',')), ''].join('\n')
  }
}
