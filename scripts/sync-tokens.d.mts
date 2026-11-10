/** Types for scripts/sync-tokens.mjs, so the vitest gate in src/styles/tokens.test.ts type-checks. */
export interface ThemeTokens {
  [name: string]: string
}
export interface Tokens {
  light: ThemeTokens
  dark: ThemeTokens
}
export function oklchToHex(L: number, C: number, H: number): string
export function readTokens(css?: string): Tokens
export function generatedTs(tokens: Tokens): string
export function htmlBlock(tokens: Tokens): string
export function syncedHtml(html: string, tokens: Tokens): string
export function paletteBlock(tokens: Tokens): string
export function syncedPalette(src: string, tokens: Tokens): string
