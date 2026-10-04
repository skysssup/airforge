import { Dialog } from './Dialog'

const KEYS: [string[], string][] = [
  [['D'], 'Drop: release waiting balls, or drop a new one'],
  [['R'], 'Restart: put released balls back'],
  [['Space'], 'Pause or resume'],
  [['F'], 'Freeze moving balls where they are'],
  [['Z'], 'Undo (also Ctrl+Z or ⌘Z)'],
  [['Shift', 'Z'], 'Redo (also Ctrl+Shift+Z or ⌘⇧Z)'],
  [['Delete'], 'Delete the selected shape'],
  [['Esc'], 'Discard an unclear stroke, deselect, or close this dialog'],
  [['?'], 'Open or close this help'],
]

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog labelledBy="help-title" className="wide">
      <h2 id="help-title">Controls</h2>
      <div className="help-grid">
        <section>
          <h3>Drawing</h3>
          <ul>
            <li>Drag a line for a ramp, a circle for a ball, or a rectangle for a platform. Ball size and platform tilt follow your drawing.</li>
            <li>If a stroke is unclear it stays dashed and you choose what it becomes.</li>
            <li>Click a shape to select it.</li>
            <li>Gravity, Bounce, and Friction apply to the whole scene and are saved with it.</li>
          </ul>
          <h3>Webcam (optional)</h3>
          <ul>
            <li>
              <strong>Index finger up</strong>: draw. <strong>Pinch</strong> thumb and index: lift the pen and finish the shape.
              <strong> Open palm</strong>: cancel the stroke.
            </li>
            <li>A gesture counts after 3 steady frames. Losing the hand for more than 2 frames cancels the stroke.</li>
            <li>The preview is mirrored. Only the fingertip's x and y are used; depth is ignored.</li>
          </ul>
        </section>
        <section>
          <h3>Keyboard</h3>
          <ul className="key-list">
            {KEYS.map(([keys, action]) => (
              <li key={action}>
                <span>
                  {keys.map((key, i) => (
                    <span key={key}>
                      {i > 0 && '+'}
                      <kbd>{key}</kbd>
                    </span>
                  ))}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="button-row">
        <button type="button" className="btn primary" onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  )
}
