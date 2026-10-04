/**
 * Built-in example scenes. Each scene is a regular scene file in
 * public/examples/, so the app and the downloadable copies stay identical.
 */

import { importSceneJson } from './io/serialize'
import { appStore, type LoadedScene } from './store/appStore'
import rampAndBall from '../public/examples/ramp-and-ball.json?raw'
import zigzag from '../public/examples/zigzag.json?raw'
import staircase from '../public/examples/staircase.json?raw'
import bounceTest from '../public/examples/bounce-test.json?raw'
import moonJump from '../public/examples/moon-jump.json?raw'
import funnel from '../public/examples/funnel.json?raw'
import halfPipe from '../public/examples/half-pipe.json?raw'
import curveRace from '../public/examples/curve-race.json?raw'

export interface Example {
  id: string
  title: string
  /** One line for the Examples menu: the capability it demonstrates. */
  shows: string
  /** What happens after Drop. */
  summary: string
  /** Something to try next. */
  tryNext: string
  json: string
}

export const EXAMPLES: Example[] = [
  {
    id: 'ramp-and-ball',
    title: 'Ramp & Ball',
    shows: 'The basic loop: a ramp, a ball, and a cup.',
    summary: 'Press Drop: the ball rolls down the ramp, flies over the low wall, and settles in the cup.',
    tryNext: 'Draw a second ramp under the first one, then press Restart and Drop.',
    json: rampAndBall,
  },
  {
    id: 'zigzag',
    title: 'Zigzag',
    shows: 'Chained ramps with upright stops.',
    summary: 'Three ramps and two upright stops send the ball left and right until it drops into the bin, after about 11 seconds.',
    tryNext: 'Select the upper stop on the right and press Delete, then Restart and Drop: the ball flies off the ramp.',
    json: zigzag,
  },
  {
    id: 'staircase',
    title: 'Staircase',
    shows: 'Platforms keep the tilt you draw.',
    summary: 'Four platforms tilted slightly downhill. The ball rolls off each step onto the next and lands in the bin at the bottom right.',
    tryNext: 'Draw a rectangle at a steeper angle; platforms keep the tilt you draw.',
    json: staircase,
  },
  {
    id: 'bounce-test',
    title: 'Bounce Test',
    shows: 'Bounce at 0.85 with three balls at once.',
    summary: 'Bounce is set to 0.85. Drop releases all three balls; each bounce peaks at roughly 70% of the one before.',
    tryNext: 'Set Bounce to 0.2, press Restart, then Drop: the balls stop almost at once.',
    json: bounceTest,
  },
  {
    id: 'moon-jump',
    title: 'Moon Jump',
    shows: 'Low gravity runs the same jump slower.',
    summary: 'Gravity is set to 1.62, close to the Moon. The ball takes about 8 seconds to ski off the kicker and land in the bin.',
    tryNext: 'Drag Gravity to about 10, then Restart and Drop: the ball follows nearly the same path into the bin in about 3 seconds.',
    json: moonJump,
  },
  {
    id: 'funnel',
    title: 'Funnel',
    shows: 'Twelve balls colliding with each other.',
    summary: 'Drop releases twelve balls at once. They knock into each other, pour through the funnel, and pile up in the box below.',
    tryNext: 'Select one side of the box and press Delete, then Restart and Drop: the balls spill across the floor.',
    json: funnel,
  },
  {
    id: 'half-pipe',
    title: 'Half-Pipe',
    shows: 'A curved track trades height for speed and back.',
    summary: 'Drop sends the ball down one side and up the other, a little lower on each swing, until it settles at the bottom.',
    tryNext: 'Drag Gravity down to 1.62, then Restart and Drop: the ball swings about 2.5 times slower, like a pendulum on the Moon.',
    json: halfPipe,
  },
  {
    id: 'curve-race',
    title: 'Curve Race',
    shows: 'A curve beats a straight ramp to the bottom.',
    summary: 'Both balls drop the same height. The one on the curve plunges early, picks up speed sooner, and reaches its post about half a second first, though its path is longer.',
    tryNext: 'Set Friction to 0, then Restart and Drop: both balls slide instead of rolling and arrive sooner, and the curve still wins.',
    json: curveRace,
  },
]

export function findExample(id: string): Example | undefined {
  return EXAMPLES.find((example) => example.id === id)
}

export function loadExampleScene(example: Example): LoadedScene {
  const result = importSceneJson(example.json)
  if (!result.ok) throw new Error(`Example ${example.id} is invalid: ${result.error}`)
  return result
}

/** Open an example as an undoable edit and record it in the address bar so the link can be shared. */
export function openExample(example: Example): void {
  appStore.loadScene(loadExampleScene(example), {
    exampleId: example.id,
    message: `Opened “${example.title}”. Press Drop (D) to start.`,
  })
  setExampleParam(example.id)
}

/** Record the open example in the address bar. A shared scene in the fragment no longer describes what is on screen, so it goes. */
export function setExampleParam(id: string | null): void {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('example', id)
  else url.searchParams.delete('example')
  url.hash = ''
  window.history.replaceState(window.history.state, '', url)
}

/** Handle a ?example=<id> link on startup. */
export function openExampleFromUrl(): void {
  const id = new URLSearchParams(window.location.search).get('example')
  if (!id) return
  const example = findExample(id)
  if (!example) {
    appStore.setStatus(`There is no example called “${id}”. Pick one from the Examples menu.`)
    setExampleParam(null)
    return
  }
  appStore.skipTutorial()
  openExample(example)
}
