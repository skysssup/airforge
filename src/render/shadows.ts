import { DataTexture, LinearFilter, RGBAFormat } from 'three'

/**
 * Solids seem to sit just above the sheet: each casts a soft shadow offset
 * down and to the right, as if lit from the upper left. Offsets and blur are
 * in world units so shadows scale with the drawing.
 */
export const SHADOW_OFFSET = { x: 0.07, y: -0.12 }
export const SHADOW_BLUR = 0.08
/**
 * Ball shadows lie just behind the plane through ball centers. Deeper planes
 * would shift with perspective toward the middle of the screen and stop
 * matching the shadows the sheet draws for ramps and platforms.
 */
export const SHADOW_Z = -0.01
/** A ball's shadow texture spans this many radii from its center. */
export const BALL_SHADOW_SPAN = 1.6

let blob: DataTexture | null = null

/** A white disc whose alpha falls off smoothly toward the edge; tinted and faded by the material. */
export function ballShadowTexture(): DataTexture {
  if (blob) return blob
  const size = 64
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2)
      const t = Math.min(1, Math.max(0, (d - 0.42) / (1 - 0.42)))
      const i = (y * size + x) * 4
      data[i] = data[i + 1] = data[i + 2] = 255
      data[i + 3] = Math.round(255 * (1 - t * t * (3 - 2 * t)))
    }
  }
  blob = new DataTexture(data, size, size, RGBAFormat)
  blob.magFilter = LinearFilter
  blob.minFilter = LinearFilter
  blob.needsUpdate = true
  return blob
}
