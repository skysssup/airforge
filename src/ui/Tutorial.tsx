import { appStore } from '../store/appStore'
import { Dialog } from './Dialog'

export function Tutorial() {
  return (
    <Dialog labelledBy="tutorial-title" className="tutorial">
        <h2 id="tutorial-title">Welcome to AirForge</h2>
        <p className="lede">
          Draw shapes in the air — or with a mouse — and forge them into Rapier physics bodies.
        </p>
        <ol>
          <li>
            Draw a <strong>diagonal</strong> on the canvas with the mouse → forges a <em>ramp</em>.
            Mouse drawing works immediately; webcam is optional from the toolbar.
          </li>
          <li>
            Draw a <strong>circle</strong> or press <strong>Add ball</strong>.
          </li>
          <li>
            Press <strong>Drop ball</strong> — watch it roll and collide.
          </li>
          <li>
            Tweak gravity / bounce / friction. Use <strong>Reset</strong> or <strong>Undo</strong>.
          </li>
          <li>
            Toolbar webcam: index draws, pinch = pen up, palm cancels.
          </li>
        </ol>
        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={() => appStore.dismissTutorial()}>
            Start forging
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              appStore.dismissTutorial()
              appStore.loadRampAndBall()
            }}
          >
            Load Ramp &amp; Ball demo
          </button>
        </div>
    </Dialog>
  )
}
