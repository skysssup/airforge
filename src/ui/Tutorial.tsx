import { appStore } from '../store/appStore'
import { EXAMPLES, openExample } from '../examples'
import { Dialog } from './Dialog'
import { useCoarsePointer } from './hooks'
import { LineGlyph, PlayIcon, PointerIcon } from './icons'

export function Tutorial() {
  const touch = useCoarsePointer()
  return (
    <Dialog labelledBy="tutorial-title" className="welcome">
      <div className="panel-head">
        <span>Welcome to AirForge</span>
      </div>
      <div className="modal-body">
        <h2 id="tutorial-title">Draw a machine, then drop a ball</h2>
        <p className="lede">Every stroke on the sheet becomes a solid body in a Rapier physics world.</p>
        <ul className="steps">
          <li>
            <LineGlyph />
            <span>
              <strong>Draw:</strong> drag a line for a ramp, a circle for a ball, a rectangle for a platform, or a curve for a track.
            </span>
          </li>
          <li>
            <PlayIcon />
            {touch ? (
              <span>
                <strong>Drop:</strong> tap Drop to release the balls, and Restart to put them back.
              </span>
            ) : (
              <span>
                <strong>Drop:</strong> press Drop <kbd>D</kbd> to release the balls, and Restart <kbd>R</kbd> to put them back.
              </span>
            )}
          </li>
          <li>
            <PointerIcon />
            {touch ? (
              <span>
                <strong>Edit:</strong> tap a shape, then drag it to move it. The bar beside it rotates, copies, or deletes it.
              </span>
            ) : (
              <span>
                <strong>Edit:</strong> click a shape to select it, then press <kbd>Delete</kbd>. <kbd>Z</kbd> undoes and <kbd>Shift</kbd> <kbd>Z</kbd> redoes.
              </span>
            )}
          </li>
        </ul>
        <p className="aside">
          {touch ? 'The Examples menu has eight scenes that show what you can build. Help lists every control.' : (
            <>
              The Examples menu has eight scenes that show what you can build. Press <kbd>?</kbd> for every control.
            </>
          )}
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
