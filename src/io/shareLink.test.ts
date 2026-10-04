import { describe, expect, it } from 'vitest'
import { MAX_TOKEN_LENGTH, decodeSceneToken, encodeSceneToken, sceneTokenFromHash } from './shareLink'
import { MAX_JSON_BYTES } from './schema'
import { importSceneJson } from './serialize'
import { EXAMPLES } from '../examples'

describe('scene links', () => {
  it('round-trips every example through a URL-safe token shorter than 1,000 characters', async () => {
    for (const example of EXAMPLES) {
      const token = await encodeSceneToken(example.json)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(token.length).toBeLessThan(Math.min(1000, example.json.length))
      const decoded = await decodeSceneToken(token)
      expect(decoded).toEqual({ ok: true, json: example.json })
      expect(importSceneJson(decoded.ok ? decoded.json : '').ok).toBe(true)
    }
  })

  it('keeps non-ASCII scene names intact', async () => {
    const json = EXAMPLES[0]!.json.replace('"Ramp & Ball"', '"Rampe & Kugel – ü 😀"')
    expect(await decodeSceneToken(await encodeSceneToken(json))).toEqual({ ok: true, json })
  })

  it('rejects tokens that are not base64url, too long, or not deflate data', async () => {
    expect(await decodeSceneToken('abc+def')).toMatchObject({ ok: false, error: expect.stringMatching(/base64url/) })
    expect(await decodeSceneToken('a'.repeat(MAX_TOKEN_LENGTH + 1))).toMatchObject({ ok: false, error: expect.stringMatching(/too long/) })
    expect(await decodeSceneToken('bm90LWRlZmxhdGU')).toMatchObject({ ok: false, error: expect.stringMatching(/decompressed/) })
  })

  it('stops decompressing once the scene would pass the file size limit', async () => {
    const bomb = await encodeSceneToken(' '.repeat(MAX_JSON_BYTES * 4))
    expect(bomb.length).toBeLessThan(5_000)
    expect(await decodeSceneToken(bomb)).toMatchObject({ ok: false, error: expect.stringMatching(/larger than 512 KB/) })
  })

  it('reads the token from the URL fragment', () => {
    expect(sceneTokenFromHash('#scene=abc_-1')).toBe('abc_-1')
    expect(sceneTokenFromHash('#x=1&scene=abc')).toBe('abc')
    expect(sceneTokenFromHash('#scene=')).toBeNull()
    expect(sceneTokenFromHash('')).toBeNull()
  })
})
