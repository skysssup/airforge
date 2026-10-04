import { appStore } from '../store/appStore'
import { EXAMPLES, openExample } from '../examples'
import { Dialog } from './Dialog'

export function Tutorial() {
  return (
    <Dialog labelledBy="tutorial-title" className="tutorial">
      <h2 id="tutorial-title">Welcome to AirForge</h2>
      <p className="lede">Sketch on the canvas and each stroke becomes a Rapier physics body.</p>
      <ol>
        <li>
          Drag a <strong>line</strong> for a ramp, a <strong>circle</strong> for a ball, or a <strong>rectangle</strong> for a platform.
        </li>
        <li>
          Press <strong>Drop</strong> (<kbd>D</kbd>) to release the balls, and <strong>Restart</strong> (<kbd>R</kbd>) to put them back.
        </li>
        <li>
          Click a shape to select it and press <kbd>Delete</kbd> to remove it. <kbd>Z</kbd> undoes, <kbd>Shift</kbd>+<kbd>Z</kbd> redoes.
        </li>
      </ol>
      <p className="muted small">The six examples in the Examples menu show what you can build. Press <kbd>?</kbd> for all controls.</p>
      <div className="button-row">
        <button type="button" className="btn primary" onClick={() => appStore.dismissTutorial()}>
          Start drawing
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            appStore.dismissTutorial()
            openExample(EXAMPLES[0]!)
          }}
        >
          Open the Ramp &amp; Ball example
        </button>
      </div>
    </Dialog>
  )
}
