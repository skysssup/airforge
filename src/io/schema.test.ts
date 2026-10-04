import { describe, expect, it } from 'vitest'
import { exportSceneJson, importSceneJson } from './serialize'
import {
  validateSceneJson,
  MAX_JSON_BYTES,
  SCENE_FORMAT_VERSION,
} from './schema'
import { EXAMPLES, loadExampleScene } from '../examples'
import {
  DEFAULT_PHYSICS,
  FRICTION_MAX,
  MAX_WORLD_COORDINATE,
} from '../physics/params'

const rampAndBall = loadExampleScene(EXAMPLES[0]!)

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

  it('preserves offscreen ball positions without moving them above the ground', () => {
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
    expect(ball.position).toEqual({ x: 999, y: -999, z: 50 })
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

  it.each(['x', 'y', 'z'])('rejects excessive %s coordinates instead of clamping them', axis => {
    const objects = [{
      id: 'outside', kind: 'ball', createdAt: 0,
      position: { x: 0, y: 0, z: 0, [axis]: MAX_WORLD_COORDINATE + 1 }, radius: 0.35,
    }]
    const result = validateSceneJson(JSON.stringify(scene({ objects })))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(`±${MAX_WORLD_COORDINATE} world units`)
  })

  const ramp = rampAndBall.objects.find((o) => o.kind === 'ramp')!
  const platform = rampAndBall.objects.find((o) => o.kind === 'platform')!
  it.each([
    { ...ramp, start: { x: -MAX_WORLD_COORDINATE - 1, y: 0, z: 0 } },
    { ...ramp, end: { x: MAX_WORLD_COORDINATE + 1, y: 0, z: 0 } },
    { ...platform, center: { x: 0, y: MAX_WORLD_COORDINATE + 1, z: 0 } },
  ])('rejects excessive coordinates in a $kind', object => {
    const result = validateSceneJson(JSON.stringify(scene({ objects: [object] })))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(`±${MAX_WORLD_COORDINATE} world units`)
  })

  it.each(['1e999', '-1e999', 'null'])('rejects nonfinite or nonnumeric coordinates: %s', value => {
    const raw = JSON.stringify(scene({ objects: [{
      id: 'invalid', kind: 'ball', createdAt: 0,
      position: { x: 'COORDINATE', y: 0, z: 0 }, radius: 0.35,
    }] })).replace('"COORDINATE"', value)
    expect(validateSceneJson(raw).ok).toBe(false)
  })
})

it('drops unknown keys inside coordinates', () => {
  const r = validateSceneJson(JSON.stringify(scene({ objects: [{
    id: 'b', kind: 'ball', createdAt: 0, radius: 0.35, position: { x: 1, y: 2, z: 0, note: 'extra' },
  }] })))
  expect(r.ok && r.scene.objects[0]!.position).toEqual({ x: 1, y: 2, z: 0 })
})

it('fills in documented defaults for optional fields', () => {
  const result = importSceneJson(JSON.stringify(scene({ objects: [
    { id: 'r', kind: 'ramp', createdAt: 0, start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 1, z: 0 } },
    { id: 'b', kind: 'ball', createdAt: 0, position: { x: 0, y: 2, z: 0 } },
    { id: 'p', kind: 'platform', createdAt: 0, center: { x: 0, y: -1, z: 0 }, halfExtents: { x: 1, y: 0.1, z: 0.2 } },
  ] })))
  if (!result.ok) throw new Error(result.error)
  expect(result.objects).toEqual([
    expect.objectContaining({ width: 0.28, thickness: 0.35 }),
    expect.objectContaining({ radius: 0.35, dynamic: false }),
    expect.objectContaining({ rotationZ: 0 }),
  ])
})
