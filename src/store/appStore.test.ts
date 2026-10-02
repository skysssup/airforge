import { beforeEach, describe, expect, it } from 'vitest'
import { appStore } from './appStore'
import { cleanCircle, cleanDiagonalLine } from '../fixtures/strokes'
import { rampAndBall } from '../fixtures/scenes'
import { MAX_OBJECTS } from '../physics/params'

describe('reset / undo', () => {
  beforeEach(() => {
    appStore._resetForTests()
  })

  it('undo restores previous objects', () => {
    appStore.loadRampAndBall()
    expect(appStore.getState().objects.length).toBeGreaterThan(0)
    appStore.resetScene()
    expect(appStore.getState().objects).toHaveLength(0)
    appStore.undo()
    expect(appStore.getState().objects.length).toBe(rampAndBall.objects.length)
  })

  it('reset clears scene', () => {
    appStore.loadRampAndBall()
    appStore.resetScene()
    expect(appStore.getState().objects).toHaveLength(0)
  })
})

describe('mouse hero-demo path (logic-level)', () => {
  beforeEach(() => {
    appStore._resetForTests()
  })

  it('diagonal stroke → ramp, circle → ball, drop → dynamic', () => {
    // 1. Draw diagonal → ramp
    appStore.endStroke('mouse', cleanDiagonalLine())
    let objects = appStore.getState().objects
    expect(objects.some((o) => o.kind === 'ramp')).toBe(true)

    // 2. Draw circle OR add ball
    appStore.endStroke('mouse', cleanCircle())
    objects = appStore.getState().objects
    const balls = objects.filter((o) => o.kind === 'ball')
    expect(balls.length).toBeGreaterThanOrEqual(1)
    expect(balls.every((b) => !b.dynamic)).toBe(true)

    // 3. Drop ball → dynamic
    appStore.dropBall()
    const after = appStore.getState().objects.filter((o) => o.kind === 'ball')
    expect(after.some((b) => b.dynamic)).toBe(true)

    // 4. Reset / undo available
    appStore.resetScene()
    expect(appStore.getState().objects).toHaveLength(0)
    appStore.undo()
    expect(appStore.getState().objects.length).toBeGreaterThan(0)
  })

  it('Add ball + Drop ball works without drawing circle', () => {
    appStore.endStroke('mouse', cleanDiagonalLine())
    appStore.addBall()
    expect(appStore.getState().objects.some((o) => o.kind === 'ball')).toBe(true)
    appStore.dropBall()
    expect(appStore.getState().objects.some((o) => o.kind === 'ball' && o.dynamic)).toBe(true)
  })

  it('load Ramp & Ball example then drop', () => {
    appStore.loadRampAndBall()
    expect(appStore.getState().sceneName).toBe('Ramp & Ball')
    appStore.dropBall()
    expect(appStore.getState().objects.some((o) => o.kind === 'ball' && o.dynamic)).toBe(true)
  })
})

describe('object limit flag', () => {
  beforeEach(() => {
    appStore._resetForTests()
  })

  it('clears objectLimitHit after undo brings scene under the cap', () => {
    for (let i = 0; i < MAX_OBJECTS; i++) {
      appStore.addBall()
    }
    expect(appStore.getState().objects).toHaveLength(MAX_OBJECTS)

    // Next add attempt flips the sticky flag
    appStore.addBall()
    expect(appStore.getState().objectLimitHit).toBe(true)
    expect(appStore.getState().objects).toHaveLength(MAX_OBJECTS)

    // Undo the last successful add → under the cap; flag must clear
    appStore.undo()
    expect(appStore.getState().objects.length).toBe(MAX_OBJECTS - 1)
    expect(appStore.getState().objectLimitHit).toBe(false)
  })
})

describe('dropBall history', () => {
  beforeEach(() => {
    appStore._resetForTests()
  })

  it('does not push history when spawn is blocked at the object limit', () => {
    for (let i = 0; i < MAX_OBJECTS; i++) {
      appStore.addBall()
    }
    // Make every ball dynamic so dropBall cannot flip a static one
    appStore.dropAllBalls()
    const historyLen = appStore.getState().history.length

    appStore.dropBall()
    expect(appStore.getState().history.length).toBe(historyLen)
    expect(appStore.getState().objects).toHaveLength(MAX_OBJECTS)
    expect(appStore.getState().objectLimitHit).toBe(true)
  })
})

describe('rename + freeze', () => {
  beforeEach(() => {
    appStore._resetForTests()
  })

  it('setSceneName trims and updates status', () => {
    appStore.setSceneName('  Cascade Demo  ')
    expect(appStore.getState().sceneName).toBe('Cascade Demo')
  })

  it('freezeBalls turns dynamic balls static and is undoable', () => {
    appStore.loadRampAndBall()
    appStore.dropBall()
    expect(appStore.getState().objects.some((o) => o.kind === 'ball' && o.dynamic)).toBe(true)
    appStore.freezeBalls()
    expect(appStore.getState().objects.filter((o) => o.kind === 'ball').every((b) => !b.dynamic)).toBe(true)
    appStore.undo()
    expect(appStore.getState().objects.some((o) => o.kind === 'ball' && o.dynamic)).toBe(true)
  })
})

describe('undo restores name + physics', () => {
  beforeEach(() => {
    appStore._resetForTests()
  })

  it('undo after import restores previous sceneName and physics', () => {
    appStore.setSceneName('Before')
    appStore.setPhysics({ gravity: 5, bounce: 0.1, friction: 0.2 })
    const before = {
      name: appStore.getState().sceneName,
      gravity: appStore.getState().physics.gravity,
    }
    appStore.replaceObjects(rampAndBall.objects, rampAndBall.name, rampAndBall.physics)
    expect(appStore.getState().sceneName).toBe(rampAndBall.name)
    expect(appStore.getState().physics.gravity).toBe(rampAndBall.physics.gravity)
    appStore.undo()
    expect(appStore.getState().sceneName).toBe(before.name)
    expect(appStore.getState().physics.gravity).toBe(before.gravity)
    expect(appStore.getState().objects).toHaveLength(0)
  })
})

describe('freeze uses synced poses', () => {
  beforeEach(() => {
    appStore._resetForTests()
  })

  it('freezeBalls keeps an injected live pose instead of the spawn position', async () => {
    const { setLiveBallPose, clearAllLiveBallPoses } = await import('../physics/livePoses')
    appStore.loadRampAndBall()
    appStore.dropBall()
    const ball = appStore.getState().objects.find((o) => o.kind === 'ball')!
    expect(ball.kind).toBe('ball')
    if (ball.kind !== 'ball') return
    const spawnY = ball.position.y
    setLiveBallPose(ball.id, { x: 1.25, y: -1.5, z: 0 })
    appStore.freezeBalls()
    const frozen = appStore.getState().objects.find((o) => o.id === ball.id)!
    expect(frozen.kind).toBe('ball')
    if (frozen.kind !== 'ball') return
    expect(frozen.dynamic).toBe(false)
    expect(frozen.position.x).toBe(1.25)
    expect(frozen.position.y).toBe(-1.5)
    expect(frozen.position.y).not.toBe(spawnY)
    clearAllLiveBallPoses()
  })
})


it('clamps physics changes and ignores nonfinite values', () => {
  appStore._resetForTests()
  const gravity = appStore.getState().physics.gravity
  appStore.setPhysics({ gravity: NaN, bounce: 99, friction: -1 })
  expect(appStore.getState().physics).toMatchObject({ gravity, bounce: 1, friction: 0 })
})
