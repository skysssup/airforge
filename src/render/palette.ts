import type { Theme } from '../store/appStore'

/**
 * Scene colors and light levels per theme. The colors come from src/styles/tokens.css: scripts/sync-tokens.mjs
 * rewrites the marked block below on every build. Only the light levels and the roughness live here.
 */
// sync-tokens:scene (generated from src/styles/tokens.css: run npm run sync-tokens)
const SCENE_COLORS = {
  light: { paper: '#fbfaf7', ink: '#1c1b16', accent: '#f4ce23', selection: '#9d7b19', waitingFill: '#faf1c4' },
  dark: { paper: '#1a1917', ink: '#eeede9', accent: '#f4ce23', selection: '#f4ce23', waitingFill: '#3c3207' },
} as const
// /sync-tokens:scene

export interface ScenePalette {
  paper: string
  /** Ramps and platforms. */
  ink: string
  /** Ball bodies: cadmium, the one accent. */
  accent: string
  /** Thin cadmium marks: the selection outline, motion trails, a waiting ball's ring (brass on light paper). */
  selection: string
  /** Fill of a ball that is waiting for Drop: cadmium faintly over paper. */
  waitingFill: string
  roughness: number
  keyLight: number
  fillLight: number
  ambientLight: number
  /** Opacity of ball shadows; the sheet draws solid shadows with the --shadow token. */
  shadowOpacity: number
}

const colors = (theme: Theme) => ({ ...SCENE_COLORS[theme] })

export const SCENE_PALETTES: Record<Theme, ScenePalette> = {
  light: { ...colors('light'), roughness: 0.55, keyLight: 2.2, fillLight: 0.5, ambientLight: 0.3, shadowOpacity: 0.2 },
  dark: { ...colors('dark'), roughness: 0.6, keyLight: 1.8, fillLight: 0.35, ambientLight: 0.25, shadowOpacity: 0.6 },
}
