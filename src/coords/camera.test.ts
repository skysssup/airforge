import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import {
  CAMERA_FAR,
  CAMERA_FOV_DEG,
  CAMERA_NEAR,
  cameraDistanceFor,
  viewBoundsFor,
} from './camera'
import { DEFAULT_VIEW, screenToWorld, worldToScreen } from './transforms'
import { WORLD_HALF_HEIGHT, WORLD_HALF_WIDTH } from '../physics/params'

const SIZES: Array<[number, number]> = [
  [1280, 720],
  [1920, 1080],
  [2560, 720],
  [1000, 1000],
  [800, 720],
  [390, 844],
]

/** Same placement as SceneCanvas: looking down -Z from (0, centerY, distance). */
function renderCamera(width: number, height: number): PerspectiveCamera {
  const view = viewBoundsFor(width, height)
  const camera = new PerspectiveCamera(CAMERA_FOV_DEG, width / height, CAMERA_NEAR, CAMERA_FAR)
  camera.position.set(0, view.centerY, cameraDistanceFor(view))
  camera.updateMatrixWorld(true)
  return camera
}

function projectToPixels(camera: PerspectiveCamera, x: number, y: number, width: number, height: number) {
  const ndc = new Vector3(x, y, 0).project(camera)
  return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height }
}

describe('draw-plane camera', () => {
  it('matches the default view at 1280x720', () => {
    expect(viewBoundsFor(1280, 720)).toEqual(DEFAULT_VIEW)
  })

  it.each(SIZES)('projects screenToWorld back onto the same pixel at %ix%i', (width, height) => {
    const view = viewBoundsFor(width, height)
    const camera = renderCamera(width, height)
    const points = [
      { x: width / 2, y: height / 2 },
      { x: 0, y: 0 },
      { x: width, y: height },
      { x: width * 0.25, y: height * 0.8 },
      { x: width * 0.9, y: height * 0.1 },
    ]
    for (const p of points) {
      const world = screenToWorld(p, view)
      const px = projectToPixels(camera, world.x, world.y, width, height)
      expect(px.x).toBeCloseTo(p.x, 3)
      expect(px.y).toBeCloseTo(p.y, 3)
      const back = worldToScreen(world, view)
      expect(back.x).toBeCloseTo(p.x, 6)
      expect(back.y).toBeCloseTo(p.y, 6)
    }
  })

  it('puts the world origin at the center of a landscape viewport', () => {
    const px = projectToPixels(renderCamera(1280, 720), 0, 0, 1280, 720)
    expect(px.x).toBeCloseTo(640, 6)
    expect(px.y).toBeCloseTo(360, 6)
  })

  it.each(SIZES)('keeps the bottom of the world region at the bottom edge at %ix%i', (width, height) => {
    const camera = renderCamera(width, height)
    expect(projectToPixels(camera, 0, -WORLD_HALF_HEIGHT, width, height).y).toBeCloseTo(height, 3)
  })

  it.each(SIZES)('keeps the whole world region visible at %ix%i', (width, height) => {
    const camera = renderCamera(width, height)
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const ndc = new Vector3(sx * WORLD_HALF_WIDTH, sy * WORLD_HALF_HEIGHT, 0).project(camera)
        expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1 + 1e-9)
        expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1 + 1e-9)
      }
    }
    const view = viewBoundsFor(width, height)
    expect(view.worldHalfWidth / view.worldHalfHeight).toBeCloseTo(width / height, 9)
    expect(cameraDistanceFor(view)).toBeLessThan(CAMERA_FAR)
  })
})
