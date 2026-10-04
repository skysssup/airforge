/** Where a shape sits on screen, for placing controls beside it. */

import { worldToScreen, type ViewBounds } from './transforms'
import { boxFor } from '../physics/world'
import type { SceneObject } from '../scene/objects'
import { pivotOf } from '../scene/transform'

/**
 * The shape's center on screen, and how far its outline reaches above and below that center within
 * `halfWidth` pixels to either side, in CSS pixels: room enough for a bar of that width.
 */
export function screenAnchor(object: SceneObject, view: ViewBounds, halfWidth = 0): { x: number; y: number; reach: number } {
  const pixels = view.height / (2 * view.worldHalfHeight)
  if (object.kind === 'ball') {
    const c = worldToScreen(object.position, view)
    return { x: c.x, y: c.y, reach: object.radius * pixels }
  }
  if (object.kind === 'curve') {
    const c = worldToScreen(pivotOf(object), view)
    const ys = object.points.map((p) => p.y)
    return { x: c.x, y: c.y, reach: ((Math.max(...ys) - Math.min(...ys)) / 2 + object.radius) * pixels }
  }
  const { center, rotationZ, halfExtents: h } = boxFor(object)
  const cos = Math.abs(Math.cos(rotationZ))
  const sin = Math.abs(Math.sin(rotationZ))
  const c = worldToScreen(center, view)
  // A tilted box's top edge sits h.y / cos above its center and climbs by tan θ per unit sideways,
  // but never past the top of the whole box.
  const side = halfWidth / pixels
  const reach = Math.min(h.x * sin + h.y * cos, (h.y + side * sin) / Math.max(cos, 1e-6)) * pixels
  return { x: c.x, y: c.y, reach }
}
