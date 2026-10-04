/**
 * Scene links. A link carries the whole scene file in the URL fragment (#scene=…), compressed with
 * deflate-raw and base64url-encoded, so nothing is sent to a server. Opening a link runs the same
 * validation as opening a file; decompression stops as soon as the file would pass MAX_JSON_BYTES.
 */

import { MAX_JSON_BYTES } from './schema'

export const SCENE_PARAM = 'scene'
/** Longest token accepted from a link. Real scenes compress to a few kilobytes. */
export const MAX_TOKEN_LENGTH = 200_000

export type DecodeResult = { ok: true; json: string } | { ok: false; error: string }

export function canShareLinks(): boolean {
  return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null
  try {
    const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(binary, (c) => c.charCodeAt(0))
  } catch {
    return null
  }
}

export async function encodeSceneToken(json: string): Promise<string> {
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()))
}

export async function decodeSceneToken(token: string): Promise<DecodeResult> {
  if (token.length > MAX_TOKEN_LENGTH) return { ok: false, error: 'The link is too long.' }
  const bytes = fromBase64Url(token)
  if (!bytes) return { ok: false, error: 'The link is damaged: it is not valid base64url.' }

  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_JSON_BYTES) {
        await reader.cancel()
        return { ok: false, error: `The scene in the link is larger than ${MAX_JSON_BYTES / 1000} KB.` }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, error: 'The link is damaged: its scene could not be decompressed.' }
  }

  const all = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    all.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return { ok: true, json: new TextDecoder('utf-8', { fatal: true }).decode(all) }
  } catch {
    return { ok: false, error: 'The link is damaged: its scene is not valid text.' }
  }
}

/** The scene token in a URL fragment such as "#scene=…", or null. */
export function sceneTokenFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get(SCENE_PARAM) || null
}
