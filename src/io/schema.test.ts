import { describe, expect, it } from 'vitest'
import { exportSceneJson, importSceneJson } from './serialize'
import { validateSceneJson, MAX_JSON_BYTES, SCENE_FORMAT_VERSION } from './schema'
import { rampAndBall } from '../fixtures/scenes'
import { DEFAULT_PHYSICS } from '../physics/params'

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
    const r = validateSceneJson(
      JSON.stringify({
        format: 'other',
        version: SCENE_FORMAT_VERSION,
        name: 'x',
        exportedAt: 't',
        physics: DEFAULT_PHYSICS,
        objects: [],
      }),
    )
    expect(r.ok).toBe(false)
  })

  it('rejects wrong version', () => {
    const r = validateSceneJson(
      JSON.stringify({
        format: 'airforge-scene',
        version: 999,
        name: 'x',
        exportedAt: 't',
        physics: DEFAULT_PHYSICS,
        objects: [],
      }),
    )
    expect(r.ok).toBe(false)
  })

  it('rejects oversized payload', () => {
    const huge = 'x'.repeat(MAX_JSON_BYTES + 10)
    const r = validateSceneJson(huge)
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
      JSON.stringify({
        format: 'airforge-scene',
        version: 1,
        name: 'x',
        exportedAt: 't',
        physics: { gravity: 999, bounce: 0.3, friction: 0.5, paused: false },
        objects: [],
      }),
    )
    expect(r.ok).toBe(false)
  })

  it('rejects unknown object kinds', () => {
    const r = validateSceneJson(
      JSON.stringify({
        format: 'airforge-scene',
        version: 1,
        name: 'x',
        exportedAt: 't',
        physics: DEFAULT_PHYSICS,
        objects: [{ id: '1', kind: 'missile', createdAt: 0 }],
      }),
    )
    expect(r.ok).toBe(false)
  })
})
