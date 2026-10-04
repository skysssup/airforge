# Third-party notices

AirForge bundles or loads the following open-source software. Each package's
own license file in `node_modules` (or its repository) is the authoritative text.

## Bundled into the app

| Package | Version | Role | License |
|---------|---------|------|---------|
| `react`, `react-dom`, `scheduler` | 19.x | UI | MIT |
| `three` | 0.186 | WebGL rendering | MIT |
| `@react-three/fiber` (with `its-fine`, `zustand`, `suspend-react`) | 9.x | React renderer for three.js | MIT |
| `@react-three/rapier` | 2.2 | React bindings for Rapier | MIT (stated in the pmndrs/react-three-rapier repository; the npm package ships no license file) |
| `@dimforge/rapier3d-compat` | 0.19.2 | Rapier physics engine compiled to WebAssembly | Apache-2.0 |
| `three-stdlib` | 2.x | three.js helpers used by `@react-three/rapier` | MIT |
| `@mediapipe/tasks-vision` | 1.0.1 | Hand landmark detection (loaded only when the webcam is turned on) | Apache-2.0 |

## Downloaded at runtime (webcam mode only)

- MediaPipe Tasks Vision WebAssembly files, version 1.0.1, from
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm` (Apache-2.0).
- Google's MediaPipe `hand_landmarker` float16 v1 model from `https://storage.googleapis.com/mediapipe-models/`.
  Its terms are in the model card linked from the
  [Hand Landmarker guide](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker).

## Development only

Vite, Vitest, TypeScript, oxlint, Testing Library, jsdom, and Playwright are used to build
and test AirForge and are not shipped to users.
