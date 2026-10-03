import { beforeEach, describe, expect, it } from 'vitest'
import { appStore } from './appStore'
import { clearAllLiveBallPoses, setLiveBallPose } from '../physics/livePoses'
import type { BallObject } from '../scene/objects'

function ball(): BallObject {
  const found = appStore.getState().objects.find((o): o is BallObject => o.kind === 'ball')
  if (!found) throw new Error('no ball')
  return found
}

describe('replay inspection', () => {
  beforeEach(() => {
    appStore._resetForTests()
    clearAllLiveBallPoses()
  })

  it('restores the live scene, poses, and physics when replay closes', () => {
    appStore.loadRampAndBall()
    appStore.dropBall()
    appStore.setPhysics({ gravity: 3 })
    setLiveBallPose(ball().id, { x: 1.5, y: -2, z: 0 })
    const liveCount = appStore.getState().objects.length

    appStore.setReplayMode(true)
    const first = appStore.getState().timeline.snapshots[0]!
    appStore.applySnapshotObjects([], first.physics)
    expect(appStore.getState().objects).toHaveLength(0)

    appStore.setReplayMode(false)
    const restored = appStore.getState()
    expect(restored.objects).toHaveLength(liveCount)
    expect(ball()).toMatchObject({ dynamic: true, position: { x: 1.5, y: -2 } })
    expect(restored.physics.gravity).toBe(3)
  })

  it('blocks scene edits while replay is open', () => {
    appStore.loadRampAndBall()
    appStore.setReplayMode(true)
    const before = appStore.getState()
    appStore.addBall()
    appStore.dropBall()
    appStore.resetScene()
    appStore.undo()
    appStore.togglePause()
    appStore.setPhysics({ gravity: 1 })
    appStore.setSceneName('Changed during replay')
    appStore.endStroke('mouse', [])
    const after = appStore.getState()
    expect(after.objects).toBe(before.objects)
    expect(after.physics).toBe(before.physics)
    expect(after.history).toBe(before.history)
    expect(after.sceneName).toBe(before.sceneName)
    expect(after.timeline.snapshots).toHaveLength(before.timeline.snapshots.length)
    appStore.setReplayMode(false)
    appStore.addBall()
    expect(appStore.getState().objects).toHaveLength(before.objects.length + 1)
  })

  it('ignores snapshot application outside replay', () => {
    appStore.loadRampAndBall()
    const objects = appStore.getState().objects
    appStore.applySnapshotObjects([], appStore.getState().physics)
    expect(appStore.getState().objects).toBe(objects)
  })

  it('records live ball poses in timeline snapshots', () => {
    appStore.loadRampAndBall()
    appStore.dropBall()
    setLiveBallPose(ball().id, { x: 2, y: 0.5, z: 0 })
    appStore.addBall()
    const latest = appStore.getState().timeline.snapshots.at(-1)!
    const recorded = latest.objects.find((o): o is BallObject => o.id === ball().id)!
    expect(recorded.position).toMatchObject({ x: 2, y: 0.5 })
  })
})
