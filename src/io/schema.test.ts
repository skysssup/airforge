import { describe, expect, it } from 'vitest'
import { exportSceneJson, importSceneJson } from './serialize'
import {
  clampWorldVec,
  validateSceneJson,
  MAX_JSON_BYTES,
  SCENE_FORMAT_VERSION,
} from './schema'
import { rampAndBall } from '../fixtures/scenes'
import {
  DEFAULT_PHYSICS,
  FRICTION_MAX,
  WORLD_HALF_HEIGHT,
  WORLD_HALF_WIDTH,
  ballMinY,
} from '../physics/params'

function scene(extra: Record<string, unknown> = {}) {
  return {
    format: 'airforge-scene',
    version: SCENE_FORMAT_VERSION,
    name: 'x',
    exportedAt: 't',
    physics: DEFAULT_PHYSICS,
    objects: [],
    ...extra,
  }
}

describe('export/import', () => {
  it('roundtrips ramp-and-ball scene', () => {
    const json = exportSceneJson(rampAndBall.name, rampAndBall.objects, rampAndBall.physics)
    const result = importSceneJson(json)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.name).toBe(rampAndBall.name)
    expect(result.objects).toHaveLength(rampAndBall.objects.length)
    expect(result.objects.map((o) => o.kind).sort()).toEqual(
      rampAndBall.objects.map((o) => o.kind).sort(),
    )
    expect(result.physics.gravity).toBe(rampAndBall.physics.gravity)
  })

  it('rejects malformed JSON', () => {
    const r = validateSceneJson('{not json')
    expect(r.ok).toBe(false)
  })

  it('rejects wrong format', () => {
    const r = validateSceneJson(JSON.stringify(scene({ format: 'other' })))
    expect(r.ok).toBe(false)
  })

  it('rejects wrong version', () => {
    const r = validateSceneJson(JSON.stringify(scene({ version: 999 })))
    expect(r.ok).toBe(false)
  })

  it('rejects oversized payload by UTF-8 byte length', () => {
    const huge = 'x'.repeat(MAX_JSON_BYTES + 10)
    const r = validateSceneJson(huge)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/too large/i)
  })

  it('rejects multi-byte payload that exceeds bytes but not string.length', () => {
    // '€' is 3 UTF-8 bytes; build a string whose .length is under the cap
    // but whose UTF-8 byte length is over.
    const euro = '€'
    const targetBytes = MAX_JSON_BYTES + 3
    const count = Math.ceil(targetBytes / 3)
    const raw = euro.repeat(count)
    expect(raw.length).toBeLessThanOrEqual(MAX_JSON_BYTES)
    expect(new TextEncoder().encode(raw).length).toBeGreaterThan(MAX_JSON_BYTES)
    const r = validateSceneJson(raw)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/too large/i)
  })

  it('rejects malicious prototype keys', () => {
    const raw = `{"format":"airforge-scene","version":1,"name":"x","exportedAt":"t","physics":{"gravity":9.8,"bounce":0.3,"friction":0.5,"paused":false},"objects":[],"__proto__":{"polluted":true}}`
    const r = validateSceneJson(raw)
    expect(r.ok).toBe(false)
  })

  it('rejects out-of-range physics', () => {
    const r = validateSceneJson(
      JSON.stringify(scene({ physics: { gravity: 999, bounce: 0.3, friction: 0.5, paused: false } })),
    )
    expect(r.ok).toBe(false)
  })

  it('rejects friction above FRICTION_MAX', () => {
    const r = validateSceneJson(
      JSON.stringify(
        scene({
          physics: { gravity: 9.8, bounce: 0.3, friction: FRICTION_MAX + 0.01, paused: false },
        }),
      ),
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/friction/i)
  })

  it('rejects unknown object kinds', () => {
    const r = validateSceneJson(
      JSON.stringify(scene({ objects: [{ id: '1', kind: 'missile', createdAt: 0 }] })),
    )
    expect(r.ok).toBe(false)
  })

  it('rejects non-positive ball radius', () => {
    const r = validateSceneJson(
      JSON.stringify(
        scene({
          objects: [
            {
              id: 'b1',
              kind: 'ball',
              createdAt: 0,
              position: { x: 0, y: 1, z: 0 },
              radius: 0,
            },
          ],
        }),
      ),
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/radius/i)
  })

  it('rejects negative ramp width', () => {
    const r = validateSceneJson(
      JSON.stringify(
        scene({
          objects: [
            {
              id: 'r1',
              kind: 'ramp',
              createdAt: 0,
              start: { x: -1, y: 0, z: 0 },
              end: { x: 1, y: -1, z: 0 },
              width: -0.5,
              thickness: 0.35,
            },
          ],
        }),
      ),
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/width|thickness/i)
  })

  it('clamps off-world ball position into visible bounds / above ground collider', () => {
    const r = validateSceneJson(
      JSON.stringify(
        scene({
          objects: [
            {
              id: 'b1',
              kind: 'ball',
              createdAt: 0,
              position: { x: 999, y: -999, z: 50 },
              radius: 0.35,
            },
          ],
        }),
      ),
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const ball = r.scene.objects[0]!
    expect(ball.position!.x).toBe(WORLD_HALF_WIDTH)
    expect(ball.position!.y).toBe(ballMinY(0.35))
    expect(ball.position!.z).toBe(1)
  })

  it('rejects duplicate object ids', () => {
    const r = validateSceneJson(
      JSON.stringify(
        scene({
          objects: [
            {
              id: 'dup',
              kind: 'ball',
              createdAt: 0,
              position: { x: 0, y: 1, z: 0 },
              radius: 0.35,
            },
            {
              id: 'dup',
              kind: 'ball',
              createdAt: 1,
              position: { x: 1, y: 1, z: 0 },
              radius: 0.35,
            },
          ],
        }),
      ),
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/duplicate/i)
  })

  it('clampWorldVec respects shared world constants', () => {
    const c = clampWorldVec({ x: -100, y: WORLD_HALF_HEIGHT + 5, z: 0 })
    expect(c.x).toBe(-WORLD_HALF_WIDTH)
    expect(c.y).toBe(WORLD_HALF_HEIGHT)
  })
})

import { sceneStats } from './serialize'
import { stairsDrop } from '../fixtures/scenes'

describe('sceneStats', () => {
  it('counts kinds for stairs example', () => {
    const s = sceneStats(stairsDrop.objects)
    expect(s.platforms).toBe(4)
    expect(s.balls).toBe(1)
    expect(s.ramps).toBe(0)
    expect(s.total).toBe(5)
    expect(s.dynamicBalls).toBe(0)
  })
})
