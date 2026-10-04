# AirForge

AirForge is a browser sandbox for rigid-body physics. You sketch with a mouse, a finger, or (optionally) your index finger in front of a webcam. Lines become ramps, circles become balls, and rectangles become platforms. Press **Drop** and [Rapier](https://rapier.rs/) simulates the scene. It suits trying out marble-run ideas, showing how gravity and bounciness change motion, or seeing how Rapier, react-three-fiber, and MediaPipe hand tracking fit together in a small app.

**Demo:** https://skysssup.github.io/airforge/

![The Funnel example mid-run: twelve balls pouring through a funnel into a box](docs/screenshot.png)

## Try it

1. Open the demo, or run it locally (see [Run locally](#run-locally)).
2. Drag a diagonal line on the canvas. It becomes a ramp.
3. Draw a circle above the ramp to make a ball, or press **Add ball**.
4. Press **Drop** (`D`). Waiting balls start to fall.
5. Press **Restart** (`R`) to put the balls back where they were dropped from, change something, and drop again.

If a stroke isn't clearly a line, circle, or rectangle, it stays on screen as a dashed line and you choose what it becomes. A circle's size sets the ball's radius (0.15–1.5 units), and a rectangle drawn at an angle stays tilted.

## Examples

Each example opens from the **Examples** menu or from its link. A bar above the canvas says what to expect and what to try next. The headless tests in [`src/examples.test.ts`](src/examples.test.ts) check every outcome listed below.

![The six examples after pressing Drop](docs/examples.png)

| Example | What it shows | After Drop |
|---|---|---|
| [Ramp & Ball](https://skysssup.github.io/airforge/?example=ramp-and-ball) | The basic loop: one ramp, one ball, and a cup built from three platforms. | The ball rolls down, clears the cup's low wall, and settles inside. |
| [Zigzag](https://skysssup.github.io/airforge/?example=zigzag) | Chaining shapes: three ramps and two upright stops. | The ball runs back and forth and drops into the bin after about 11 seconds. |
| [Staircase](https://skysssup.github.io/airforge/?example=staircase) | Tilted platforms: four steps, each tilted 3.4° downhill. | The ball rolls off each step onto the next and lands in the bin. |
| [Bounce Test](https://skysssup.github.io/airforge/?example=bounce-test) | The Bounce setting (0.85) and dropping several balls at once. | Three balls bounce in place; each bounce peaks at roughly 70% of the one before. |
| [Moon Jump](https://skysssup.github.io/airforge/?example=moon-jump) | The Gravity setting (1.62, close to the Moon's). | The ball skis off a kicker and lands in the bin after about 8 seconds. At gravity 10 the same jump takes about 3 seconds. |
| [Funnel](https://skysssup.github.io/airforge/?example=funnel) | Ball-to-ball collisions with twelve balls. | The balls pour through the funnel and pile up in the box. |

The example files live in [`public/examples/`](public/examples/). They are ordinary scene files, so you can also download one and load it with **Open**.

## Controls

| Action | Mouse, touch, or keyboard |
|---|---|
| Draw a shape | Drag on the canvas |
| Select a shape | Click or tap it |
| Delete the selected shape | **Delete** button, `Delete`, or `Backspace` |
| Release waiting balls (or drop a new one) | **Drop**, `D` |
| Put released balls back | **Restart**, `R` |
| Pause or resume the simulation | **Pause**, `Space` |
| Stop moving balls where they are | **Freeze**, `F` |
| Undo / redo | **Undo** / **Redo**, `Z` / `Shift+Z`, `Ctrl+Z` / `Ctrl+Shift+Z` (`⌘` on macOS) |
| Discard an unclear stroke, or deselect | `Esc` |
| Show all controls | **Help**, `?` |

**Gravity**, **Bounce**, and **Friction** apply to the whole scene and are saved with it. **Clear** removes everything and can be undone. You can rename the scene in the box under the AirForge title.

**Webcam (optional).** Press **Webcam**. Raise your index finger to draw, then pinch thumb and index (or close your hand) to finish the shape. An open palm cancels the stroke. A gesture takes effect after 3 steady frames, and losing the hand for more than 2 frames cancels the stroke. The preview is mirrored, and only the fingertip's x and y are used. Webcam mode needs HTTPS or `localhost` and camera permission. It also needs network access, because it downloads MediaPipe Tasks Vision 1.0.1 from jsDelivr and the hand model from Google Cloud Storage. Video frames are processed in the browser and are not uploaded.

## Scene files

**Save** downloads the scene as JSON. **Open** loads one. A file stores the scene name, the gravity, bounce, and friction settings, and every shape's position and size. A ball that is moving when you save is stored at its current position, but its velocity is not stored. Files use format version 1 (`"format": "airforge-scene", "version": 1`), the same format AirForge 1.0.x saved. Files larger than 512 KB are refused, as are files with more than 40 objects or coordinates beyond ±10,000 units, and the status bar says why.

## Run locally

Requires Node.js `^22.22.2`, `^24.15.0`, or `>=26`.

```bash
npm ci
npm run dev        # http://localhost:5173/airforge/
npm test           # unit, component, and headless physics tests (Vitest)
npm run lint       # oxlint
npm run build      # type-check, then production build into dist/
npm run preview    # serve dist/ at http://localhost:4173/airforge/
```

Browser tests use Playwright and run against the production build:

```bash
npx playwright install chromium   # first run only
npm run test:e2e                  # Chromium
npx playwright test --project=webkit
npx playwright test --project=firefox   # needs WebGL; on a Linux machine without a GPU, add --headed under a display server
```

CI runs `npm test`, `npm run lint`, `npm run build`, and the Chromium browser tests on pushes to `main` and on pull requests. Each push to `main` also runs the unit tests again, builds the app, and deploys `dist/` to GitHub Pages.

## How it works

- **Input.** [`src/input/mouse.ts`](src/input/mouse.ts) turns pointer drags into strokes. Mouse and touch points are kept as drawn. Webcam fingertip points are smoothed, and a stroke is cancelled if tracking jumps more than 160 px between frames ([`src/stroke/capture.ts`](src/stroke/capture.ts), [`src/ui/WebcamPanel.tsx`](src/ui/WebcamPanel.tsx)).
- **Recognition.** [`src/shapes/recognize.ts`](src/shapes/recognize.ts) fits a line, then a circle, then a rectangle, using geometric checks (deviation from a line, radius spread, corner angles) rather than a trained model.
- **Scene.** [`src/store/appStore.ts`](src/store/appStore.ts) holds the shapes, settings, undo/redo history (50 steps), and selection. A click selects instead of drawing.
- **Physics.** [`src/physics/world.ts`](src/physics/world.ts) describes the collider layout used both by the rendered world ([`src/render/PhysicsWorld.tsx`](src/render/PhysicsWorld.tsx), via `@react-three/rapier`) and by the headless world in the tests. Rapier steps at a fixed 60 Hz. A floor and two side walls keep balls from leaving the scene.
- **View.** A perspective camera looks at the drawing plane and always shows the region ±8 × ±4.5 units. On tall screens the extra space goes above the scene ([`src/coords/camera.ts`](src/coords/camera.ts)).

## Limitations

- **2.5D only.** Shapes lie in one plane. Balls move in x and y but not in depth. Ramps and platforms never move.
- **Repeatability.** Physics runs at a fixed 60 Hz step. In Chromium, three runs of Ramp & Ball came to rest at the same point, (3.61, −2.53), which is where the headless test puts it. Scenes with many colliding balls, such as Funnel, end in a different arrangement each run.
- **Velocities are not kept.** Undo and scene files keep positions but not velocities, so a ball restored mid-flight starts again from rest.
- **Scene size.** A scene holds at most 40 objects.
- **Webcam.** The webcam path was tested with Chrome's simulated camera playing MediaPipe's sample hand photos, not with physical webcams. Hand tracking runs on the main thread. On slow machines, fast hand movement can lose tracking and cancel the stroke.
- **Download size.** The JavaScript bundle is about 3.5 MB (1.2 MB gzipped), mostly Rapier's WebAssembly and three.js, so the build prints a chunk-size warning.
- **Browser support.** AirForge needs WebGL 2 and WebAssembly. If WebGL is unavailable it shows a message instead of the scene. The browser tests pass in Chromium, Firefox, and WebKit (Playwright) at desktop and phone sizes, and touch drawing was tested in Chromium's mobile emulation.

## License

MIT © 2026 skysssup. See [`LICENSE`](LICENSE) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
