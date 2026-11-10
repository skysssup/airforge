import { Dialog } from './Dialog'
import { useCoarsePointer } from './hooks'
import { CloseIcon } from './icons'

const KEYS: [string[], string][] = [
  [['D'], 'Drop: release waiting balls, or drop a new one'],
  [['R'], 'Restart: put released balls back'],
  [['Space'], 'Pause or resume'],
  [['F'], 'Freeze moving balls where they are'],
  [['M'], 'Motion marks: dots every 0.1 s, speed, height, and a velocity arrow'],
  [['Z'], 'Undo (also Ctrl+Z or Cmd+Z)'],
  [['Shift', 'Z'], 'Redo (also Ctrl+Shift+Z or Cmd+Shift+Z)'],
  [['Delete', 'Backspace'], 'Delete the selected shape'],
  [['←', '→', '↑', '↓'], 'Move the selected shape 0.1 units (with Shift, 1 unit)'],
  [['[', ']'], 'Rotate the selected shape 5° (with Shift, 15°)'],
  [['Ctrl', 'D'], 'Duplicate the selected shape (Cmd+D on macOS)'],
  [['Esc'], 'Discard an unclear stroke, deselect, or close this dialog'],
  [['?'], 'Open or close this help'],
]

function KeyList() {
  return (
    <ul className="key-list">
      {KEYS.map(([keys, action]) => (
        <li key={action}>
          <span className="keys">
            {keys.map((key) => (
              <kbd key={key}>{key}</kbd>
            ))}
          </span>
          <span>{action}</span>
        </li>
      ))}
    </ul>
  )
}

function Saving() {
  return (
    <>
      <h3>Saving and sharing</h3>
      <ul>
        <li>Save downloads the scene as a JSON file, and Open loads one.</li>
        <li>Turn on Motion, select a ball, and use Record motion to capture its speed and height. Stop to export CSV. Pausing adds no samples; restarting preserves the previous recording.</li>
        <li>Copy link puts the whole scene into a link. Opening the link loads the scene; nothing is uploaded.</li>
      </ul>
    </>
  )
}

function Webcam() {
  return (
    <>
      <h3>Webcam (optional)</h3>
      <ul>
        <li>
          <strong>Index finger up</strong> draws. <strong>Pinch</strong> thumb and index to lift the pen and finish the shape.{' '}
          <strong>Open palm</strong> cancels the stroke.
        </li>
        <li>A gesture counts after 3 steady frames. Losing the hand for more than 2 frames cancels the stroke.</li>
        <li>The preview is mirrored. Only the fingertip's x and y are used; depth is ignored.</li>
      </ul>
    </>
  )
}

const hasCamera = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const touch = useCoarsePointer()
  const webcam = hasCamera()

  return (
    <Dialog labelledBy="help-title" className={touch ? 'help touch' : 'help wide'}>
      <div className="panel-head">
        <h2 id="help-title">Controls</h2>
        <button type="button" className="btn square" onClick={onClose} aria-label="Close" title="Close (Esc)">
          <CloseIcon />
        </button>
      </div>
      {touch ? (
        <div className="help-grid single">
          <section>
            <h3>Touch</h3>
            <ul>
              <li>Drag a line for a ramp, a circle for a ball, a rectangle for a platform, or a smooth bend for a curved track.</li>
              <li>If a stroke is unclear it stays dashed and you choose what it becomes.</li>
              <li>Tap a shape to select it, then drag it to move it. The bar beside it rotates, copies, or deletes it.</li>
              <li>Tap Drop to release the balls, Restart to put them back, and Pause to stop time. Freeze, Motion, World, Add ball, and Clear are in More.</li>
            </ul>
            <Saving />
            {webcam && <Webcam />}
            <details className="keys-details">
              <summary>Keyboard shortcuts</summary>
              <KeyList />
            </details>
          </section>
        </div>
      ) : (
        <div className="help-grid">
          <section>
            <h3>Draw and edit</h3>
            <ul>
              <li>Drag a line for a ramp, a circle for a ball, a rectangle for a platform, or a smooth bend or wave for a curved track. Ball size, platform tilt, and the curve's shape follow your drawing.</li>
              <li>If a stroke is unclear it stays dashed and you choose what it becomes.</li>
              <li>Click a shape to select it, then drag it to move it; hold Shift to snap its center to the half-unit grid. The bar beside it rotates, duplicates, or deletes it.</li>
              <li>Gravity, Bounce, and Friction apply to the whole scene and are saved with it.</li>
            </ul>
            <Saving />
            {webcam && <Webcam />}
          </section>
          <section>
            <h3>Keyboard</h3>
            <KeyList />
          </section>
        </div>
      )}
    </Dialog>
  )
}
