import { appStore } from '../store/appStore'

export function Tutorial() {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="modal tutorial">
        <h2 id="tutorial-title">Welcome to AirForge</h2>
        <p className="lede">
          Draw shapes in the air — or with a mouse — and forge them into Rapier physics bodies.
        </p>
        <ol>
          <li>
            Draw a <strong>diagonal</strong> on the canvas with the mouse → forges a <em>ramp</em>.
            Webcam is optional — use <strong>Enable webcam</strong> later if you want.
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
            Optional: enable webcam — index draws, pinch = pen up, open palm = cancel stroke. Mouse always works.
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
      </div>
    </div>
  )
}
