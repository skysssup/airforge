import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import { MAX_OBJECTS } from '../physics/params'
import { setExampleParam } from '../examples'

/** What the run and edit controls can do right now; shared by the bars and the More sheet. */
export function useControlState() {
  const objects = useAppState((s) => s.objects)
  const canUndo = useAppState((s) => s.undoStack.length > 0)
  const canRedo = useAppState((s) => s.redoStack.length > 0)
  const balls = objects.filter((o) => o.kind === 'ball')
  const waiting = balls.filter((b) => !b.dynamic).length
  return {
    waiting,
    moving: balls.length - waiting,
    released: balls.some((b) => b.releasedFrom),
    empty: objects.length === 0,
    full: objects.length >= MAX_OBJECTS,
    canUndo,
    canRedo,
  }
}

export function clearScene() {
  setExampleParam(null)
  appStore.clearScene()
}
