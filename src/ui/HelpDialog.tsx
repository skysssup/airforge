import { Dialog } from './Dialog'
import { CloseIcon } from './icons'

const KEYS: [string[], string][] = [
  [['D'], 'Drop: release waiting balls, or drop a new one'],
  [['R'], 'Restart: put released balls back'],
  [['Space'], 'Pause or resume'],
  [['F'], 'Freeze moving balls where they are'],
  [['Z'], 'Undo (also Ctrl+Z or Cmd+Z)'],
  [['Shift', 'Z'], 'Redo (also Ctrl+Shift+Z or Cmd+Shift+Z)'],
  [['Delete'], 'Delete the selected shape'],
  [['Esc'], 'Discard an unclear stroke, deselect, or close this dialog'],
  [['?'], 'Open or close this help'],
]

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog labelledBy="help-title" className="wide">
      <div className="panel-head">
        <h2 id="help-title">Controls</h2>
        <button type="button" className="btn square" onClick={onClose} aria-label="Close" title="Close (Esc)">
          <CloseIcon />
        </button>
      </div>
      <div className="help-grid">
        <section>
          <h3 className="t-label">Drawing</h3>
          <ul>
            <li>Drag a line for a ramp, a circle for a ball, or a rectangle for a platform. Ball size and platform tilt follow your drawing.</li>
            <li>If a stroke is unclear it stays dashed and you choose what it becomes.</li>
            <li>Click a shape to select it.</li>
            <li>Gravity, Bounce, and Friction apply to the whole scene and are saved with it.</li>
          </ul>
          <h3 className="t-label">Saving and sharing</h3>
          <ul>
            <li>Save downloads the scene as a JSON file, and Open loads one.</li>
            <li>Copy link puts the whole scene into a link. Opening the link loads the scene; nothing is uploaded.</li>
          </ul>
          <h3 className="t-label">Webcam (optional)</h3>
          <ul>
            <li>
              <strong>Index finger up</strong> draws. <strong>Pinch</strong> thumb and index to lift the pen and finish the shape.{' '}
              <strong>Open palm</strong> cancels the stroke.
            </li>
            <li>A gesture counts after 3 steady frames. Losing the hand for more than 2 frames cancels the stroke.</li>
            <li>The preview is mirrored. Only the fingertip's x and y are used; depth is ignored.</li>
          </ul>
        </section>
        <section>
          <h3 className="t-label">Keyboard</h3>
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
        </section>
      </div>
    </Dialog>
  )
}
