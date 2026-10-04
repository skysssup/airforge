import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import { MAX_OBJECTS } from '../physics/params'
import {
  AddBallIcon,
  ClearIcon,
  DeleteIcon,
  FreezeIcon,
  PauseIcon,
  PlayIcon,
  RedoIcon,
  RestartIcon,
  SlidersIcon,
  UndoIcon,
} from './icons'
import { setExampleParam } from '../examples'

/** Drop, Restart, Pause, and Freeze: the controls for running the scene. */
export function RunControls() {
  const objects = useAppState((s) => s.objects)
  const paused = useAppState((s) => s.physics.paused)
  const balls = objects.filter((o) => o.kind === 'ball')
  const waiting = balls.filter((b) => !b.dynamic).length
  const moving = balls.length - waiting
  const released = balls.some((b) => b.releasedFrom)

  return (
    <div className="group run-controls" role="toolbar" aria-label="Simulation">
      <button
        type="button"
        className="btn primary"
        aria-label={waiting > 0 ? `Drop (${waiting})` : 'Drop'}
        title="Release the waiting balls, or drop a new one (D)"
        onClick={() => appStore.drop()}
      >
        <PlayIcon />
        <span className="label">Drop</span>
        {waiting > 0 && <span className="count" aria-hidden="true">{waiting}</span>}
        <kbd aria-hidden="true">D</kbd>
      </button>
      <button type="button" className="btn" onClick={() => appStore.restart()} disabled={!released} title="Put released balls back where they started (R)">
        <RestartIcon />
        <span className="label">Restart</span>
        <kbd aria-hidden="true">R</kbd>
      </button>
      <button type="button" className="btn" aria-pressed={paused} title="Pause or resume the simulation (Space)" onClick={() => appStore.togglePause()}>
        <PauseIcon />
        <span className="label">Pause</span>
      </button>
      <button type="button" className="btn" onClick={() => appStore.freezeBalls()} disabled={moving === 0} title="Stop moving balls where they are (F)">
        <FreezeIcon />
        <span className="label">Freeze</span>
        <kbd aria-hidden="true">F</kbd>
      </button>
    </div>
  )
}

/** Undo, Redo, Add ball, Delete, and Clear. */
export function EditControls() {
  const objects = useAppState((s) => s.objects)
  const selectedId = useAppState((s) => s.selectedId)
  const canUndo = useAppState((s) => s.undoStack.length > 0)
  const canRedo = useAppState((s) => s.redoStack.length > 0)

  return (
    <div className="group" role="toolbar" aria-label="Edit">
      <button type="button" className="btn square" aria-label="Undo" title="Undo (Z)" onClick={() => appStore.undo()} disabled={!canUndo}>
        <UndoIcon />
      </button>
      <button type="button" className="btn square" aria-label="Redo" title="Redo (Shift+Z)" onClick={() => appStore.redo()} disabled={!canRedo}>
        <RedoIcon />
      </button>
      <button
        type="button"
        className="btn square"
        aria-label="Add ball"
        title="Add a waiting ball"
        onClick={() => appStore.addBall()}
        disabled={objects.length >= MAX_OBJECTS}
      >
        <AddBallIcon />
      </button>
      <button
        type="button"
        className="btn square"
        aria-label="Delete"
        title="Delete the selected shape (Delete)"
        onClick={() => appStore.deleteSelected()}
        disabled={!selectedId}
      >
        <DeleteIcon />
      </button>
      <button
        type="button"
        className="btn square"
        aria-label="Clear"
        title="Remove everything (can be undone)"
        onClick={() => {
          setExampleParam(null)
          appStore.clearScene()
        }}
        disabled={objects.length === 0}
      >
        <ClearIcon />
      </button>
    </div>
  )
}

/** Opens the World panel with Gravity, Bounce, and Friction. */
export function WorldButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="btn world-button"
      aria-expanded={open}
      aria-controls="world-panel"
      title="Gravity, bounce, and friction"
      onClick={onToggle}
    >
      <SlidersIcon />
      <span className="label">World</span>
    </button>
  )
}
