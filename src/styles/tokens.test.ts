/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { generatedTs, oklchToHex, readTokens, syncedHtml, syncedPalette } from '../../scripts/sync-tokens.mjs'
import { TOKEN_COLORS } from '../render/palette.generated'

// Vitest runs from the repo root; CSS imported with ?raw is processed by Vite, so read the sources from disk.
const read = (path: string) => readFileSync(path, 'utf8')
const tokensCss = read('src/styles/tokens.css')
const appCss = read('src/styles/app.css')
const generated = read('src/render/palette.generated.ts')
const indexHtml = read('index.html')
const paletteTs = read('src/render/palette.ts')

// The same check as `node scripts/sync-tokens.mjs --check`: tokens.css is the one colour source.
it('keeps the generated palette, palette.ts and index.html in step with tokens.css', () => {
  const tokens = readTokens(tokensCss)
  expect(generatedTs(tokens)).toBe(generated)
  expect(syncedHtml(indexHtml, tokens)).toBe(indexHtml)
  expect(syncedPalette(paletteTs, tokens)).toBe(paletteTs)
})

it('converts the cadmium accent and the dark paper exactly', () => {
  expect(oklchToHex(0.86, 0.17, 95)).toBe('#f4ce23')
  expect(TOKEN_COLORS.light.accent).toBe('#f4ce23')
  expect(TOKEN_COLORS.dark.paper).toBe('#1a1917')
})

it('imports the tokens before any rule and keeps colours, blur and endless motion out of app.css', () => {
  const at = appCss.indexOf("@import './tokens.css';")
  expect(at).toBeGreaterThan(-1)
  expect(at).toBeLessThan(appCss.indexOf('{'))
  expect(appCss).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
  expect(appCss).not.toMatch(/backdrop-filter|infinite/)
})
