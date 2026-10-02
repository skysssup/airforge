# AirForge

![AirForge playground](docs/screenshot.png)

Draw ramps, balls, and platforms with the mouse, then simulate them with Rapier. Optional webcam gestures use MediaPipe hand landmarks. Built with TypeScript, React, and Three.js.

## Run

Requires Node.js 22.12 or later. Run these commands from the cloned repository.

```bash
npm ci
npm run dev      # http://localhost:5173/airforge/
npm test
npm run build
npm run preview
```

Production builds use `base: '/airforge/'`. Preview locally; no hosted demo is currently available. Webcam mode downloads the pinned MediaPipe 1.0.1 WASM assets from jsDelivr and the hand-landmarker model from Google Storage. Frames are processed in the browser. Mouse input does not require camera access.

## Gestures (webcam)

| Gesture | Action |
|---------|--------|
| Index only | Draw |
| Pinch (thumb + index) | Pen up |
| Open palm | **Cancel stroke** (does not erase bodies) |
| Hand lost > 2 frames | Cancel in-progress stroke |

Mouse drawing always works. Mode locks after 3 stable frames.


## Notes

2.5D: screen-space strokes map to world x/y with z thickness; not precise 3D hand tracking.

Diagonal → ramp, circle → ball, rect → platform. Weak / ambiguous circles open a confirmation picker with alternatives when fit quality is low. Drop balls; gravity / bounce / friction sliders. Save / import JSON scenes (no video). Examples: Ramp & Ball, Stairs Drop. Keys: `Space` `Z` `R` `D` `F` `?`.

## License

MIT © 2026 skysssup — [`LICENSE`](./LICENSE) · [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)
