import { useAppState } from './hooks'
import { worldToScreen } from '../coords/transforms'
import { GROUND_TOP_Y, WALL_HALF_WIDTH, WALL_X } from '../physics/params'
import { boxFor } from '../physics/world'
import { SHADOW_BLUR, SHADOW_OFFSET } from '../render/shadows'

const MAJOR_EVERY = 4

/**
 * The drawing sheet behind the 3D canvas: a grid in world units (major lines
 * every 4), the hatched floor and side walls the physics world collides with,
 * and the soft shadows of ramps and platforms.
 */
export function SheetBackdrop() {
  const view = useAppState((s) => s.view)
  const objects = useAppState((s) => s.objects)
  const { width, height } = view
  if (width <= 0 || height <= 0) return null

  const left = -view.worldHalfWidth
  const right = view.worldHalfWidth
  const bottom = view.centerY - view.worldHalfHeight
  const top = view.centerY + view.worldHalfHeight
  const px = (x: number, y: number) => worldToScreen({ x, y }, view)

  const minor: string[] = []
  const major: string[] = []
  for (let x = Math.ceil(left); x <= right; x++) {
    const sx = Math.round(px(x, 0).x) + 0.5
    ;(x % MAJOR_EVERY === 0 ? major : minor).push(`M${sx} 0V${height}`)
  }
  for (let y = Math.ceil(bottom); y <= top; y++) {
    const sy = Math.round(px(0, y).y) + 0.5
    ;(y % MAJOR_EVERY === 0 ? major : minor).push(`M0 ${sy}H${width}`)
  }

  const groundTop = Math.round(px(0, GROUND_TOP_Y).y) + 0.5
  const scale = width / (2 * view.worldHalfWidth)
  const shadows = objects.flatMap((o) => {
    if (o.kind === 'ball') return []
    const { center, rotationZ, halfExtents } = boxFor(o)
    const at = px(center.x + SHADOW_OFFSET.x, center.y + SHADOW_OFFSET.y)
    const w = halfExtents.x * 2 * scale
    const h = halfExtents.y * 2 * scale
    return [{ id: o.id, at, w, h, degrees: (-rotationZ * 180) / Math.PI }]
  })
  // Inner faces of the side walls; they may lie outside a narrow viewport.
  const rightWall = Math.round(px(WALL_X - WALL_HALF_WIDTH, 0).x) + 0.5
  const leftWall = width - rightWall
  const solids = [
    { x: 0, y: groundTop, w: width, h: height - groundTop },
    ...(rightWall < width ? [{ x: rightWall, y: 0, w: width - rightWall, h: groundTop }] : []),
    ...(leftWall > 0 ? [{ x: 0, y: 0, w: leftWall, h: groundTop }] : []),
  ]
  const edge = [
    rightWall < width ? `M${rightWall} 0V${groundTop}` : `M${width} ${groundTop}`,
    `H${Math.max(leftWall, 0)}`,
    leftWall > 0 ? `V0` : '',
  ].join('')

  return (
    <svg className="sheet" width={width} height={height} aria-hidden="true">
      <defs>
        <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={SHADOW_BLUR * scale} />
        </filter>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path className="hatch-line" d="M0 0V6" strokeWidth="1" />
        </pattern>
      </defs>
      <path className="minor" d={minor.join('')} strokeWidth="1" />
      <path className="major" d={major.join('')} strokeWidth="1" />
      {solids.map((r) => (
        <g key={`${r.x},${r.y}`}>
          <rect className="ground" x={r.x} y={r.y} width={r.w} height={r.h} />
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#hatch)" />
        </g>
      ))}
      <path className="ground-edge" d={edge} strokeWidth="1" fill="none" />
      <g className="shadows" filter="url(#soft-shadow)">
        {shadows.map(({ id, at, w, h, degrees }) => (
          <rect key={id} x={-w / 2} y={-h / 2} width={w} height={h} rx={Math.min(4, h / 2)} transform={`translate(${at.x} ${at.y}) rotate(${degrees})`} />
        ))}
      </g>
    </svg>
  )
}
