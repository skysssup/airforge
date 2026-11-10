import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import {
  AddBallIcon,
  ClearIcon,
  FreezeIcon,
  MoreIcon,
  MotionIcon,
  PauseIcon,
  PlayIcon,
  RedoIcon,
  RestartIcon,
  SlidersIcon,
  UndoIcon,
} from './icons'
import { clearScene, useControlState } from './controlState'

/**
 * Drop, Restart, Pause, Freeze, and Motion: the controls for running and watching the scene.
 * On a phone Freeze and Motion move into the More sheet (`.wide-only`).
 */
export function RunControls() {
  const paused = useAppState((s) => s.physics.paused)
  const motion = useAppState((s) => s.motion)
  const { waiting, moving, released } = useControlState()

  return (
    <div className="group run-controls" role="toolbar" aria-label="Simulation">
      <button
        type="button"
        className="btn primary drop"
        aria-label={waiting > 0 ? `Drop (${waiting})` : 'Drop'}
        title="Release the waiting balls, or drop a new one (D)"
        onClick={() => appStore.drop()}
      >
        <PlayIcon />
        <span className="label">Drop</span>
        {waiting > 0 && <span className="count" aria-hidden="true">{waiting}</span>}
        <kbd aria-hidden="true">D</kbd>
      </button>
      <button type="button" className="btn stack" aria-label="Restart" onClick={() => appStore.restart()} disabled={!released} title="Put released balls back where they started (R)">
        <RestartIcon />
        <span className="label">Restart</span>
        <kbd aria-hidden="true">R</kbd>
      </button>
      <button type="button" className="btn stack" aria-label="Pause" aria-pressed={paused} title="Pause or resume the simulation (Space)" onClick={() => appStore.togglePause()}>
        <PauseIcon />
        <span className="label">Pause</span>
      </button>
      <button type="button" className="btn stack wide-only" aria-label="Freeze" onClick={() => appStore.freezeBalls()} disabled={moving === 0} title="Stop moving balls where they are (F)">
        <FreezeIcon />
        <span className="label">Freeze</span>
        <kbd aria-hidden="true">F</kbd>
      </button>
      <button type="button" className="btn stack wide-only" aria-label="Motion" aria-pressed={motion} title="Dots every 0.1 s behind moving balls, with speed and height (M)" onClick={() => appStore.toggleMotion()}>
        <MotionIcon />
        <span className="label">Motion</span>
        <kbd aria-hidden="true">M</kbd>
      </button>
    </div>
  )
}

/** Undo, Redo, Add ball, and Clear. Delete lives on the selection bar beside the shape. */
export function EditControls() {
  const { canUndo, canRedo, empty, full } = useControlState()

  return (
    <div className="group edit-controls" role="toolbar" aria-label="Edit">
      <button type="button" className="btn square" aria-label="Undo" title="Undo (Z)" onClick={() => appStore.undo()} disabled={!canUndo}>
        <UndoIcon />
      </button>
      <button type="button" className="btn square redo" aria-label="Redo" title="Redo (Shift+Z)" onClick={() => appStore.redo()} disabled={!canRedo}>
        <RedoIcon />
      </button>
      <button type="button" className="btn stack wide-only" aria-label="Add ball" title="Add a waiting ball" onClick={() => appStore.addBall()} disabled={full}>
        <AddBallIcon />
        <span className="label">Add ball</span>
      </button>
      <button type="button" className="btn stack wide-only" aria-label="Clear" title="Remove everything (can be undone)" onClick={clearScene} disabled={empty}>
        <ClearIcon />
        <span className="label">Clear</span>
      </button>
    </div>
  )
}

/** Opens the World panel with Gravity, Bounce, and Friction. */
export function WorldButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="btn stack world-button wide-only"
      aria-label="World"
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

/** Opens the More sheet on a phone; hidden on wider screens, where every control has a place in the bars. */
export function MoreButton({ open, onToggle, className = '' }: { open: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      className={`btn stack more-button compact-only ${className}`}
      aria-label="More"
      aria-expanded={open}
      aria-controls="more-sheet"
      title="More controls"
      onClick={onToggle}
    >
      <MoreIcon />
      <span className="label">More</span>
    </button>
  )
}
