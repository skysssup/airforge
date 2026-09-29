import { useMemo } from 'react'
import * as THREE from 'three'
import type { Vec2 } from '../events/types'
import { screenToWorld, type ViewBounds } from '../coords/transforms'

/** Live stroke rendered as a glowing line in world space (ink before matter). */
export function InkOverlay({
  points,
  view,
}: {
  points: Vec2[]
  view: ViewBounds
}) {
  const line = useMemo(() => {
    if (points.length < 2) return null
    const verts = points.map((p) => {
      const w = screenToWorld(p, view, false)
      return new THREE.Vector3(w.x, w.y, 0.05)
    })
    const geom = new THREE.BufferGeometry().setFromPoints(verts)
    const mat = new THREE.LineBasicMaterial({
      color: '#f472b6',
      transparent: true,
      opacity: 0.95,
    })
    return new THREE.Line(geom, mat)
  }, [points, view])

  if (!line) return null
  return <primitive object={line} />
}
