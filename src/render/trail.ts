import { BufferAttribute, BufferGeometry, Color } from 'three'

/** How long a moving ball's trail lasts, its width in CSS pixels, and its opacity next to the ball. */
export const TRAIL_SECONDS = 0.6
export const TRAIL_WIDTH = 2
export const TRAIL_OPACITY = 0.5
const MAX_POINTS = 64
/** The ribbon sits just behind the plane through ball centers, so balls cover their own trail. */
const TRAIL_Z = -0.02

/**
 * A fading ribbon along the path a moving ball took over the last TRAIL_SECONDS.
 * Samples are kept oldest first and the geometry is rewritten in place each frame.
 */
export class TrailRibbon {
  readonly geometry = new BufferGeometry()
  private readonly xs: number[] = []
  private readonly ys: number[] = []
  private readonly ts: number[] = []
  private readonly rgb = new Color()
  private time = 0

  constructor() {
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(MAX_POINTS * 2 * 3), 3))
    this.geometry.setAttribute('color', new BufferAttribute(new Float32Array(MAX_POINTS * 2 * 4), 4))
    const index: number[] = []
    for (let i = 0; i < MAX_POINTS - 1; i++) {
      const a = i * 2
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    this.geometry.setIndex(index)
    this.geometry.setDrawRange(0, 0)
  }

  get length(): number {
    return this.xs.length
  }

  setColor(color: string): void {
    this.rgb.set(color)
  }

  /** Record the ball's position after `delta` seconds of simulation; `pixel` is world units per CSS pixel. */
  add(x: number, y: number, delta: number, pixel: number): void {
    this.time += delta
    const last = this.xs.length - 1
    if (last >= 0 && Math.hypot(x - this.xs[last]!, y - this.ys[last]!) < pixel) {
      this.ts[last] = this.time
    } else {
      this.xs.push(x)
      this.ys.push(y)
      this.ts.push(this.time)
    }
    while (this.ts.length > MAX_POINTS || (this.ts.length > 0 && this.time - this.ts[0]! > TRAIL_SECONDS)) {
      this.xs.shift()
      this.ys.shift()
      this.ts.shift()
    }
    this.write(pixel)
  }

  dispose(): void {
    this.geometry.dispose()
  }

  private write(pixel: number): void {
    const { xs, ys, ts, time, rgb } = this
    const n = xs.length
    const positions = this.geometry.getAttribute('position') as BufferAttribute
    const colors = this.geometry.getAttribute('color') as BufferAttribute
    const half = (TRAIL_WIDTH / 2) * pixel
    for (let i = 0; i < n; i++) {
      const prev = Math.max(0, i - 1)
      const next = Math.min(n - 1, i + 1)
      const dx = xs[next]! - xs[prev]!
      const dy = ys[next]! - ys[prev]!
      const length = Math.hypot(dx, dy) || 1
      const age = Math.min(1, (time - ts[i]!) / TRAIL_SECONDS)
      // Full width next to the ball, thinning toward the tail.
      const w = half * (0.35 + 0.65 * (1 - age))
      const nx = (-dy / length) * w
      const ny = (dx / length) * w
      positions.setXYZ(i * 2, xs[i]! + nx, ys[i]! + ny, TRAIL_Z)
      positions.setXYZ(i * 2 + 1, xs[i]! - nx, ys[i]! - ny, TRAIL_Z)
      const alpha = TRAIL_OPACITY * (1 - age) ** 1.5
      colors.setXYZW(i * 2, rgb.r, rgb.g, rgb.b, alpha)
      colors.setXYZW(i * 2 + 1, rgb.r, rgb.g, rgb.b, alpha)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    this.geometry.setDrawRange(0, Math.max(0, n - 1) * 6)
  }
}
