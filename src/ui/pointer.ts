/** World position under the pointer, shared by the drawing layer and the status line. */

import type { Vec3 } from '../events/types'

let position: Vec3 | null = null
const listeners = new Set<() => void>()

export const pointerStore = {
  get: (): Vec3 | null => position,
  set(next: Vec3 | null): void {
    position = next
    for (const listener of listeners) listener()
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
