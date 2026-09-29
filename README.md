# AirForge

**[Live demo →](https://skysssup.github.io/airforge/)**

![AirForge playground](docs/screenshot.png)

Draw shapes in air (or with a mouse) → forge them into Rapier rigid bodies.

Browser physics playground: dark theme, real collisions. Works fully **without a webcam**.

## Stack

| Dep | Why |
|-----|-----|
| **Vite + React 19 + TypeScript** | SPA tooling |
| **three / R3F / drei / rapier** | WebGL scene + rigid bodies |
| **@mediapipe/tasks-vision@1.0.1** | Optional webcam HandLandmarker |
| **vitest** | Unit tests |

## Run

```bash
npm install
npm run dev      # http://localhost:5173/airforge/
npm test
npm run build
npm run preview
```

Production builds use `base: '/airforge/'` for GitHub Pages.

## Gestures (webcam)

| Gesture | Action |
|---------|--------|
| Index only | Draw |
| Pinch (thumb + index) | Pen up |
| Open palm | **Cancel stroke** (does not erase bodies) |
| Hand lost > 2 frames | Cancel in-progress stroke |

Mouse drawing always works. Mode locks after 3 stable frames.

## Features

- Mouse forge: diagonal → ramp, circle → ball, rect → platform
- Drop balls with Rapier collisions; gravity / bounce / friction sliders
- Optional webcam HandLandmarker (GPU, falls back to CPU)
- Save / import versioned JSON scenes (no video)
- Example: Ramp & Ball · Keyboard: `Space` `Z` `R` `D` `?`

## Architecture

```
src/
  camera/  hand/  input/  events/  stroke/  shapes/
  coords/  scene/  physics/  render/  io/  replay/
  ui/  fixtures/  eval/  store/
```

2.5D: draw in screen space → world x/y; meshes get z thickness; gravity on −y. Webcam is mirrored selfie view — not precise 3D tracking.

## CI

Workflow definition: [`docs/ci.workflow.yml`](./docs/ci.workflow.yml) (`npm ci && npm run lint && npm test && npm run build`).

Could not push `.github/workflows/ci.yml` — the repo PAT lacks the `workflow` scope. Copy the file into `.github/workflows/ci.yml` with a token that has `workflow` to enable Actions.

## License

MIT © 2026 skysssup — [`LICENSE`](./LICENSE) · [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)
