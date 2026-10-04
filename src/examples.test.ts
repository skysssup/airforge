import { describe, expect, it } from 'vitest'
import { EXAMPLES, loadExampleScene } from './examples'
import { createHeadlessWorld } from './test/headlessWorld'
import { boxFor } from './physics/world'
import { WORLD_HALF_HEIGHT, WORLD_HALF_WIDTH, type PhysicsParams } from './physics/params'
import type { BallObject, PlatformObject, SceneObject } from './scene/objects'

const files = import.meta.glob<string>('../public/examples/*.json', { query: '?raw', import: 'default', eager: true })

function dropAll(objects: SceneObject[]): SceneObject[] {
  return objects.map((o) => (o.kind === 'ball' ? { ...o, dynamic: true } : o))
}

/** Range of ball-center x between two upright platforms; a ball resting against either wall counts as inside. */
function between(objects: SceneObject[], leftId: string, rightId: string, radius: number) {
  const wall = (id: string) => objects.find((o): o is PlatformObject => o.id === id)!
  const contact = 0.01
  return {
    min: wall(leftId).center.x + wall(leftId).halfExtents.y + radius - contact,
    max: wall(rightId).center.x - wall(rightId).halfExtents.y - radius + contact,
  }
}

/** The scene as saved, plus copies with every ball nudged by up to ±0.02 units, to check outcomes are not knife-edge. */
function variants(objects: SceneObject[], count = 8): SceneObject[][] {
  let seed = 1
  const nudge = () => {
    seed = (seed * 16807) % 2147483647
    return (seed / 2147483647 - 0.5) * 0.04
  }
  const nudged = () => objects.map((o) =>
    o.kind === 'ball' ? { ...o, position: { ...o.position, x: o.position.x + nudge(), y: o.position.y + nudge() } } : o,
  )
  return [objects, ...Array.from({ length: count }, nudged)]
}

async function simulate(objects: SceneObject[], physics: PhysicsParams, seconds: number) {
  const dropped = dropAll(objects)
  const world = await createHeadlessWorld(dropped, physics)
  world.run(seconds)
  const balls = dropped.filter((o): o is BallObject => o.kind === 'ball').map((b) => ({ ...b, position: world.position(b.id) }))
  world.free()
  return balls
}

it('lists every example file exactly once', () => {
  expect(Object.keys(files).map((path) => path.split('/').at(-1)).sort())
    .toEqual(EXAMPLES.map((e) => `${e.id}.json`).sort())
  for (const example of EXAMPLES) expect(files[`../public/examples/${example.id}.json`]).toBe(example.json)
})

describe.each(EXAMPLES)('$title', (example) => {
  const scene = loadExampleScene(example)

  it('validates, matches its title, and starts with every ball waiting', () => {
    expect(scene.name).toBe(example.title)
    expect(scene.objects.filter((o) => o.kind === 'ball').every((b) => b.kind === 'ball' && !b.dynamic)).toBe(true)
  })

  it('fits in the region that is always visible', () => {
    for (const o of scene.objects) {
      const reach = o.kind === 'ball'
        ? { x: Math.abs(o.position.x) + o.radius, y: Math.abs(o.position.y) + o.radius }
        : o.kind === 'curve'
        ? {
            x: Math.max(...o.points.map((p) => Math.abs(p.x))) + o.radius,
            y: Math.max(...o.points.map((p) => Math.abs(p.y))) + o.radius,
          }
        : (() => {
            const { center, rotationZ, halfExtents } = boxFor(o)
            const cos = Math.abs(Math.cos(rotationZ))
            const sin = Math.abs(Math.sin(rotationZ))
            return {
              x: Math.abs(center.x) + halfExtents.x * cos + halfExtents.y * sin,
              y: Math.abs(center.y) + halfExtents.x * sin + halfExtents.y * cos,
            }
          })()
      expect(reach.x, o.id).toBeLessThanOrEqual(WORLD_HALF_WIDTH)
      expect(reach.y, o.id).toBeLessThanOrEqual(WORLD_HALF_HEIGHT)
    }
  })
})

describe('what each example does after Drop', () => {
  const scene = (id: string) => loadExampleScene(EXAMPLES.find((e) => e.id === id)!)

  it('Ramp & Ball: the ball settles in the cup', async () => {
    const { objects, physics } = scene('ramp-and-ball')
    const cup = between(objects, 'cup-left', 'cup-right', 0.35)
    for (const variant of variants(objects)) {
      const [ball] = await simulate(variant, physics, 10)
      expect(ball!.position.x).toBeGreaterThan(cup.min)
      expect(ball!.position.x).toBeLessThan(cup.max)
      expect(ball!.position.y).toBeCloseTo(-3 + 0.12 + 0.35, 1)
    }
  })

  it('Zigzag: the ball reaches the bin after about 11 seconds and stays there', async () => {
    const { objects, physics } = scene('zigzag')
    const inBin = (x: number, y: number) => {
      const bin = between(objects, 'bin-left', 'bin-right', 0.35)
      return x > bin.min && x < bin.max && y < -3.2
    }
    for (const variant of variants(objects)) {
      const [early] = await simulate(variant, physics, 9)
      expect(inBin(early!.position.x, early!.position.y)).toBe(false)
      const [late] = await simulate(variant, physics, 30)
      expect(inBin(late!.position.x, late!.position.y)).toBe(true)
    }
  })

  it('Staircase: the ball goes down every step into the bin', async () => {
    const { objects, physics } = scene('staircase')
    const bin = between(objects, 'bin-left', 'bin-right', 0.35)
    for (const variant of variants(objects)) {
      const [ball] = await simulate(variant, physics, 30)
      expect(ball!.position.x).toBeGreaterThan(bin.min)
      expect(ball!.position.x).toBeLessThan(bin.max)
    }
  })

  it('Bounce Test: bounces lose about 30% of their height and the balls stay in their lanes', async () => {
    const { objects, physics } = scene('bounce-test')
    const dropped = dropAll(objects)
    const world = await createHeadlessWorld(dropped, physics)
    const peaks: number[] = []
    let previous = [Infinity, Infinity]
    for (let step = 0; step < 6 * 60; step++) {
      world.run(1 / 60)
      const y = world.position('ball-high').y
      if (previous[1]! > previous[0]! && previous[1]! >= y) peaks.push(previous[1]!)
      previous = [previous[1]!, y]
    }
    const lanes = dropped.map((b) => world.position(b.id).x)
    world.free()
    const rest = -4 + 0.35
    const ratios = peaks.slice(0, 4).map((peak, i) => (peak - rest) / ((i === 0 ? 3.6 : peaks[i - 1]!) - rest))
    for (const ratio of ratios) expect(ratio).toBeGreaterThan(0.6)
    for (const ratio of ratios) expect(ratio).toBeLessThan(0.75)
    expect(lanes).toEqual([-4, 0, 4].map((x) => expect.closeTo(x, 3)))
  })

  it('Moon Jump: the ball lands in the bin at low gravity, and at Earth gravity in less than half the time', async () => {
    const { objects, physics } = scene('moon-jump')
    const bin = between(objects, 'bin-left', 'bin-right', 0.35)
    const landing = async (gravity: number) => {
      const world = await createHeadlessWorld(dropAll(objects), { ...physics, gravity })
      for (let step = 1; step <= 20 * 60; step++) {
        world.run(1 / 60)
        const { x, y } = world.position('ball')
        if (y < -3.5) {
          world.free()
          return { x, seconds: step / 60 }
        }
      }
      world.free()
      throw new Error('ball never reached the floor')
    }
    const moon = await landing(physics.gravity)
    const earth = await landing(9.81)
    for (const run of [moon, earth]) {
      expect(run.x).toBeGreaterThan(bin.min)
      expect(run.x).toBeLessThan(bin.max)
    }
    expect(moon.seconds).toBeGreaterThan(6)
    expect(moon.seconds).toBeLessThan(10)
    expect(earth.seconds).toBeLessThan(moon.seconds / 2)
    for (const variant of variants(objects)) {
      const [settled] = await simulate(variant, physics, 60)
      expect(settled!.position.x).toBeGreaterThan(bin.min)
      expect(settled!.position.x).toBeLessThan(bin.max)
    }
  })

  it('Half-Pipe: each swing peaks lower than the last, and Moon gravity swings about 2.5 times slower', async () => {
    const { objects, physics } = scene('half-pipe')
    const swing = async (gravity: number) => {
      const world = await createHeadlessWorld(dropAll(objects), { ...physics, gravity })
      const peaks: number[] = []
      const crossings: number[] = []
      let previous = [Infinity, Infinity]
      let lastX = world.position('ball').x
      let highest = -Infinity
      for (let step = 1; step <= 50 * 60; step++) {
        world.run(1 / 60)
        const { x, y } = world.position('ball')
        highest = Math.max(highest, y)
        if (previous[1]! > previous[0]! && previous[1]! >= y && previous[1]! > -2) peaks.push(previous[1]!)
        previous = [previous[1]!, y]
        if (lastX < 0 && x >= 0) crossings.push(step / 60)
        lastX = x
      }
      const rest = world.position('ball')
      world.free()
      return { peaks, period: crossings[1]! - crossings[0]!, highest, rest }
    }
    const earth = await swing(physics.gravity)
    const start = objects.find((o) => o.kind === 'ball')!
    expect(earth.highest).toBeLessThanOrEqual(start.kind === 'ball' ? start.position.y + 0.01 : 0)
    expect(earth.peaks.length).toBeGreaterThanOrEqual(5)
    for (let i = 1; i < earth.peaks.length; i++) expect(earth.peaks[i]!).toBeLessThan(earth.peaks[i - 1]!)
    expect(Math.abs(earth.rest.x)).toBeLessThan(0.5)
    const moon = await swing(1.62)
    expect(moon.period / earth.period).toBeGreaterThan(2.2)
    expect(moon.period / earth.period).toBeLessThan(2.7)
  })

  it('Curve Race: the ball on the curve reaches its post first, rolling or sliding', async () => {
    const { objects, physics } = scene('curve-race')
    const post = (id: string) => objects.find((o): o is PlatformObject => o.id === id)!
    const arrivals = async (variant: SceneObject[], params: PhysicsParams) => {
      const world = await createHeadlessWorld(dropAll(variant), params)
      const at: Record<string, number> = {}
      for (let step = 1; step <= 10 * 60 && Object.keys(at).length < 2; step++) {
        world.run(1 / 60)
        for (const [ball, postId] of [['ball-curve', 'post-curve'], ['ball-ramp', 'post-ramp']] as const) {
          const touching = post(postId).center.x - post(postId).halfExtents.y - 0.35 - 0.05
          if (at[ball] == null && world.position(ball).x >= touching) at[ball] = step / 60
        }
      }
      world.free()
      return at
    }
    for (const variant of variants(objects)) {
      const rolling = await arrivals(variant, physics)
      expect(rolling['ball-curve']! + 0.3).toBeLessThan(rolling['ball-ramp']!)
    }
    const rolling = await arrivals(objects, physics)
    const sliding = await arrivals(objects, { ...physics, friction: 0 })
    expect(sliding['ball-curve']!).toBeLessThan(sliding['ball-ramp']!)
    expect(sliding['ball-curve']!).toBeLessThan(rolling['ball-curve']!)
    expect(sliding['ball-ramp']!).toBeLessThan(rolling['ball-ramp']!)
  })

  it('Funnel: all twelve balls end up in the box', async () => {
    const { objects, physics } = scene('funnel')
    const box = between(objects, 'box-left', 'box-right', 0.35)
    for (const variant of variants(objects, 20)) {
      const balls = await simulate(variant, physics, 15)
      expect(balls).toHaveLength(12)
      for (const ball of balls) {
        expect(ball.position.x, ball.id).toBeGreaterThan(box.min)
        expect(ball.position.x, ball.id).toBeLessThan(box.max)
        expect(ball.position.y, ball.id).toBeLessThan(-1.6)
      }
    }
  })
})
