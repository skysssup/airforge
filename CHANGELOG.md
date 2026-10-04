# Changelog

## 1.2.0 (2026-10-04)

A redesign of the interface and of how the scene is drawn. Scene files (format version 1) and the physics are unchanged.

### Changed

- The interface follows a drafting-sheet design: paper and ink colors with one accent, hairline borders, Instrument Sans for text and Fragment Mono for labels and numbers. Buttons have icons and show their keyboard shortcuts.
- The layout gives the scene the whole width. The top bar holds the scene name, the **Examples** menu, **Open**, **Save**, **Webcam**, the theme switch, and **Help**. The bottom bar holds the edit and simulation controls and a status line with the input mode, the pointer's position in world units, and the latest message.
- The **Examples** menu lists each example with a one-line description, and an open example's notes appear in a strip under the top bar.
- **Gravity**, **Bounce**, and **Friction** moved into a **World** panel, which also counts the scene's ramps, balls, and platforms. Escape or a click elsewhere closes it.
- The scene is drawn as a sheet: a grid in world units, a hatched floor and side walls, ink-colored ramps and platforms with rounded edges and soft shadows, and balls in the accent color. The view now frames both walls and the floor, so balls stay on screen.
- A ball waiting for **Drop** is drawn flat, as a circle with a center mark. A released ball is a solid sphere with a line across it that shows its spin, and it leaves a short fading trail.
- The selected shape gets an accent outline, and the pointer turns into a hand over shapes that a click would select.
- Webcam mode shows the mirrored camera image faintly behind the sheet with a ring at the index fingertip, instead of a small preview panel.
- The welcome and help dialogs were redesigned.

### Added

- Light and dark themes. AirForge follows the system setting until you pick one, then remembers your choice.
- An empty sheet shows what each stroke becomes: line to ramp, circle to ball, rectangle to platform.
- Browser tests for the theme switch, the World panel, and webcam mode with a simulated camera.

## 1.1.0 (2026-10-04)

Scene files are unchanged (format version 1). Files saved by 1.0.x open in 1.1.0, and files saved by 1.1.0 open in 1.0.x.

### Added

- Six examples: Ramp & Ball, Zigzag, Staircase, Bounce Test, Moon Jump, and Funnel. Each shows what it demonstrates and what to try in a bar above the canvas, and each opens from a `?example=<id>` link. The scene files are in `public/examples/`.
- **Restart** (`R`) puts released balls back where Drop released them.
- Redo with `Shift+Z` or `Ctrl/⌘+Shift+Z`. `Ctrl/⌘+Z` now also undoes.
- Selection: click or tap a shape to select it, then press **Delete**, `Delete`, or `Backspace` to remove it.
- An unclear stroke stays on screen, dashed, while you choose what it becomes.
- A drawn circle sets the ball's radius (0.15–1.5 units).
- If WebGL or WebAssembly cannot start, a message explains the requirement instead of a blank page. A loading message shows while the app downloads.
- Tests: headless Rapier simulations check that every example does what its description says, and Playwright browser tests cover drawing, selection, undo/redo, examples, Save/Open, touch, and the no-WebGL message.
- A GitHub Actions workflow that tests, builds, and deploys the demo to GitHub Pages from `main`.

### Changed

- Physics runs at a fixed 1/60 s step instead of using each frame's duration, so results no longer depend on frame rate and a slow frame cannot cause one huge step.
- **Drop** releases every waiting ball at once instead of one per press.
- `R` now restarts the run. Emptying the scene moved to the **Clear** button, which can be undone.
- Bounce and Friction now apply at their full value to every surface. Previously, ramps, platforms, and the floor used 30–40% of the Bounce value.
- The floor and side walls are drawn, and shadows are gone. The camera's field of view is narrower (24°), so balls near the screen edges no longer look stretched. On tall screens the floor stays at the bottom.
- The toolbar, help, welcome dialog, and status messages were rewritten in plainer language. Scene counts appear in the status bar.

### Fixed

- Fast mouse strokes were cancelled when two pointer events were more than 160 px apart. That limit now applies only to webcam tracking, and it compares raw positions so smoothing lag no longer counts as a jump.
- Mouse strokes were smoothed, which rounded their corners: thin rectangles often went unrecognized and squares could turn into balls.
- A single click opened the "shape unclear" picker, whose choices then failed.
- A quick flick that produced only a few pointer events was not recognized as a line.
- The old examples did not do what they described: in Ramp & Ball the ball overshot the catch platform, in Double Ramp it fell through the gap between the ramps, and in Stairs Drop it never left the top step.
- Webcam: a hand tracker that finished loading after the webcam was turned off was never closed, and the gesture label re-rendered the whole app on every video frame.
- Tests imported `@dimforge/rapier3d-compat` without declaring it; it is now a pinned dev dependency at the version `@react-three/rapier` uses.

### Removed

- The Replay snapshot viewer and the internal event log it displayed. Restart reruns a drop, and Undo/Redo step through edits.
- The Double Ramp, Flat Table, and Stairs Drop examples, replaced by the six above.
- The unused `@react-three/drei` dependency.

## 1.0.0 and 1.0.1 (2026-09-29, 2026-09-30)

Initial versions: mouse and webcam drawing, Rapier simulation, undo, the Replay snapshot viewer, and JSON scene files. They were not tagged or published as GitHub releases.
