import { beforeEach, describe, expect, it } from 'vitest'
import { appStore } from './appStore'
import { cleanCircle, cleanDiagonalLine } from '../fixtures/strokes'
import { rampAndBall } from '../fixtures/scenes'

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
