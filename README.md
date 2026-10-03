# AirForge

![AirForge playground](docs/screenshot.png)

Draw ramps, balls, and platforms with the mouse and simulate them with Rapier. Optional webcam mode uses MediaPipe hand landmarks as the pen. Built with TypeScript, React, Three.js (react-three-fiber), and `@react-three/rapier`.

## Run

Requires Node.js `^22.22.2`, `^24.15.0`, or `>=26` (see `engines` in `package.json`).

```bash
npm ci
npm run dev      # http://localhost:5173/airforge/
npm test         # vitest
npm run lint     # oxlint
npm run build    # tsc -b + vite build
npm run preview
```

Production builds use `base: '/airforge/'`. There is no hosted demo; use `dev` or `preview`.

## How it works

- **Drawing.** Pointer or webcam strokes are captured in screen space (`src/stroke`, `src/input`, `src/hand`) and classified as a line, circle, or rectangle (`src/shapes`). Weak or ambiguous fits open a picker with alternatives. Diagonal becomes a ramp, circle a ball, rectangle a platform.
- **Projection.** `src/coords/camera.ts` derives matching draw-plane extents and camera distance from the viewport size. The perspective camera faces the origin along -Z at a 42° field of view. It fits the ±8 × ±4.5 scene region rather than stretching objects when the viewport changes aspect ratio.
- **Scene and physics.** `src/store/appStore.ts` holds objects, undo history, and physics parameters (gravity, bounce, friction, bounded and finite). `src/render` mounts them as Rapier bodies. Live ball positions are read back from Rapier for Freeze, Undo snapshots, replay snapshots, and Save JSON.
- **Scenes.** Save and import JSON (validated and size-limited, no video). Bundled examples: Ramp & Ball, Stairs Drop.

Keys: `Space` pause, `Z` undo, `R` reset, `D` drop, `F` freeze, `?` help, `Esc` closes help and replay. Shortcuts do not fire while typing, while a button or link has focus (Space), with Ctrl/Cmd/Alt held, or behind a dialog.

## Webcam (optional)

Mouse drawing needs no camera. Webcam mode needs a secure context (HTTPS or `localhost`), camera permission, and network access: it downloads the pinned MediaPipe 1.0.1 WASM from jsDelivr and the hand-landmarker model from Google Storage. Frames are processed in the browser and are not uploaded.

| Gesture | Action |
|---------|--------|
| Index only | Draw |
| Pinch (thumb + index) | Pen up |
| Open palm | Cancel stroke (does not erase bodies) |
| Hand lost > 2 frames | Cancel in-progress stroke |

Modes lock after 3 stable frames. Starting the camera, tracker, or detection loop can fail; on failure the tracks and tracker are released and the app returns to mouse mode.

## Limits

- **2.5D, not 3D tracking.** Only the index fingertip's x/y is used; depth is ignored. The normalized video frame is stretched across the canvas rather than cropped to its aspect ratio. Drawing maps to the x/y plane; dynamic balls cannot move along z.
- **Replay is a snapshot viewer.** The last 5,000 events and 250 snapshots are kept. Opening it pauses the live view; Next, Prev, or Restart selects a recorded object state. Scene edits are blocked until it closes, which restores the objects and ball positions saved on entry. Velocities are not recorded, so a remounted ball can lose its momentum. This is not animation or deterministic physics playback. Save JSON exports the currently displayed state, including a selected replay snapshot.
- The main bundle is about 3.4 MB minified (Rapier and three.js dominate); the build warning is expected.
- Automated tests do not exercise WebGL rendering or real webcam hardware.

## License

MIT © 2026 skysssup — [`LICENSE`](./LICENSE) · [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)
