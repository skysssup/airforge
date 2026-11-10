/** The scene's startup error, shared by the error boundary and the layers it must not hide behind (the empty legend). */
let error: string | null = null
const listeners = new Set<() => void>()

export const sceneErrorStore = {
  get: (): string | null => error,
  set(next: string | null): void {
    if (next === error) return
    error = next
    for (const listener of listeners) listener()
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
