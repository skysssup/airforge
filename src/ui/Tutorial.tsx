import { appStore } from '../store/appStore'
import { EXAMPLES, openExample } from '../examples'
import { Dialog } from './Dialog'

export function Tutorial() {
  return (
    <Dialog labelledBy="tutorial-title">
      <div className="panel-head">
        <span>Welcome</span>
        <span className="muted">AirForge</span>
      </div>
      <div className="modal-body">
        <h2 id="tutorial-title">Draw a machine, then drop a ball</h2>
        <p className="lede">Every stroke on the sheet becomes a solid body in a Rapier physics world.</p>
        <ol className="steps">
          <li>
            <span className="idx">01</span>
            <span>
              Drag a <strong>line</strong> for a ramp, a <strong>circle</strong> for a ball, or a <strong>rectangle</strong> for a platform.
            </span>
          </li>
          <li>
            <span className="idx">02</span>
            <span>
              Press <strong>Drop</strong> <kbd>D</kbd> to release the balls and <strong>Restart</strong> <kbd>R</kbd> to put them back.
            </span>
          </li>
          <li>
            <span className="idx">03</span>
            <span>
              Click a shape to select it, then press <kbd>Delete</kbd>. <kbd>Z</kbd> undoes and <kbd>Shift</kbd> <kbd>Z</kbd> redoes.
            </span>
          </li>
        </ol>
        <p className="aside muted">
          The Examples menu has six scenes that show what you can build. Press <kbd>?</kbd> for every control.
        </p>
      </div>
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
