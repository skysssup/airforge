import { describe, expect, it } from 'vitest'
import { importSceneJson } from './serialize'
import { WORLD_HALF_HEIGHT, WORLD_HALF_WIDTH } from '../physics/params'

const examples = import.meta.glob<string>('../../public/examples/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
})

it('finds the bundled example files', () => {
  expect(Object.keys(examples)).toHaveLength(2)
})

describe.each(Object.entries(examples))('%s', (_path, raw) => {

  it('imports without losing objects', () => {
    const result = importSceneJson(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.objects).toHaveLength(JSON.parse(raw).objects.length)
  })

  it('stays inside the world bounds', () => {
    const result = importSceneJson(raw)
    if (!result.ok) throw new Error(result.error)
    for (const o of result.objects) {
      const points = o.kind === 'ramp' ? [o.start, o.end] : [o.kind === 'ball' ? o.position : o.center]
      for (const p of points) {
        expect(Math.abs(p.x)).toBeLessThanOrEqual(WORLD_HALF_WIDTH)
        expect(p.y).toBeLessThanOrEqual(WORLD_HALF_HEIGHT)
      }
    }
  })
})
