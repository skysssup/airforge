import type { Theme } from '../store/appStore'

/** Scene colors and light levels per theme. Paper, ink, and accent mirror the tokens in styles/app.css. */
export interface ScenePalette {
  paper: string
  /** Ramps and platforms. */
  ink: string
  /** Balls, the selection outline, and motion trails. */
  accent: string
  /** Fill of a ball that is waiting for Drop: the accent faintly over paper. */
  waitingFill: string
  roughness: number
  keyLight: number
  fillLight: number
  ambientLight: number
  /** Opacity of ball shadows; the sheet draws solid shadows with the --shadow token. */
  shadowOpacity: number
}

export const SCENE_PALETTES: Record<Theme, ScenePalette> = {
  light: {
    paper: '#ffffff',
    ink: '#17171a',
    accent: '#1f3bff',
    waitingFill: '#e9ebff',
    roughness: 0.55,
    keyLight: 2.2,
    fillLight: 0.5,
    ambientLight: 0.3,
    shadowOpacity: 0.2,
  },
  dark: {
    paper: '#0b0b0c',
    ink: '#dcdad5',
    accent: '#8796ff',
    waitingFill: '#1c1f2e',
    roughness: 0.6,
    keyLight: 1.8,
    fillLight: 0.35,
    ambientLight: 0.25,
    shadowOpacity: 0.6,
  },
}
