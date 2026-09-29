# Third-party notices

AirForge includes ideas and heuristics inspired by third-party software, and
depends on libraries with their own licenses. This file preserves required
attribution.

## WritingOnAir (inspiration — heuristics reimplemented in TypeScript)

- Project: [WritingOnAir](https://github.com/CodeItAlone/WritingOnAir)
- Author: CodeItAlone / Subrato Kundu
- Upstream license file: `Backend/LICENSE`
- License: MIT

```
MIT License

Copyright (c) 2025 CodeItAlone

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**What AirForge took as inspiration (not copied as Python):**

- Gesture mapping: index-only = draw, pinch = pen up, open palm = erase/cancel
- Mode hysteresis (3 frames), point smoothing window (4), max lost frames (2)
- Shape priority: line → circle → rectangle/square
- Line deviation ratios; circle min-enclosing + angular coverage; rect convexHull + approxPolyDP-style simplification

AirForge reimplements these as a **pure TypeScript** module for the browser.
There is no Python OpenCV server.

## MediaPipe Tasks Vision

- Package: `@mediapipe/tasks-vision` (pinned `1.0.1`)
- WASM CDN: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm`
- Model: Google `hand_landmarker` float16 v1
- License: Apache License 2.0 (see MediaPipe / Google project notices)

## Other runtime dependencies

| Package | Role | License (typical) |
|---------|------|-------------------|
| `react` / `react-dom` | UI | MIT |
| `three` | WebGL renderer | MIT |
| `@react-three/fiber` | React renderer for three | MIT |
| `@react-three/drei` | Helpers (Grid) | MIT |
| `@react-three/rapier` | Physics bindings to Rapier | MIT |
| `vite` / `vitest` / `typescript` | Build & test | MIT |

Consult each package’s LICENSE file in `node_modules` for the authoritative text.
