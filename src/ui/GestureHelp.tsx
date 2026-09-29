interface Props {
  open: boolean
  onClose: () => void
}

export function GestureHelp({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div className="modal">
        <h2 id="help-title">Gestures &amp; calibration</h2>
        <div className="help-grid">
          <div>
            <h3>Webcam</h3>
            <ul>
              <li>
                <strong>Index only</strong> — draw
              </li>
              <li>
                <strong>Pinch</strong> (thumb + index) — pen up
              </li>
              <li>
                <strong>Open palm</strong> — cancel stroke
              </li>
              <li>Mode locks after 3 stable frames (hysteresis)</li>
              <li>Hand lost &gt; 2 frames → stroke cancelled (no teleport lines)</li>
            </ul>
            <p className="muted">
              Sit ~0.5–1.5 m from the camera, good lighting, plain background. Mirrored selfie view.
              Webcam is <em>not</em> precise 3D tracking — drawing maps to a 2.5D plane.
            </p>
          </div>
          <div>
            <h3>Mouse</h3>
            <ul>
              <li>Drag on the overlay to draw</li>
              <li>Diagonal → ramp · Circle → ball · Rect → platform</li>
              <li>Ambiguous strokes open a picker</li>
            </ul>
            <h3>Keyboard</h3>
            <ul>
              <li>
                <kbd>D</kbd> Drop ball
              </li>
              <li>
                <kbd>Z</kbd> Undo
              </li>
              <li>
                <kbd>R</kbd> Reset
              </li>
              <li>
                <kbd>Space</kbd> Pause / resume
              </li>
              <li>
                <kbd>?</kbd> This help
              </li>
            </ul>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
