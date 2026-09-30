# AirForge

**[Live demo →](https://skysssup.github.io/airforge/)**

![AirForge playground](docs/screenshot.png)

Draw with the mouse (or optional webcam hand landmarks) → shapes → Rapier rigid bodies. Vite / React / TypeScript. Webcam is optional; toggle it from the toolbar.

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

## Notes

2.5D: screen-space strokes map to world x/y with z thickness; not precise 3D hand tracking.

Diagonal → ramp, circle → ball, rect → platform. Drop balls; gravity / bounce / friction sliders. Save / import JSON scenes (no video). Examples: Ramp & Ball, Stairs Drop. Keys: `Space` `Z` `R` `D` `F` `?`.

## License

MIT © 2026 skysssup — [`LICENSE`](./LICENSE) · [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)
