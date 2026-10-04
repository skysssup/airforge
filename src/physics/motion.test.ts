import { beforeEach, expect, it } from 'vitest'
import { followedBall, readBall } from './motion'
import { clearAllLiveBallPoses, setLiveBallMotion, setLiveBallPose } from './livePoses'
import { GROUND_TOP_Y } from './params'
import type { BallObject, RampObject } from '../scene/objects'

const waiting: BallObject = { id: 'w', kind: 'ball', createdAt: 0, position: { x: 0, y: GROUND_TOP_Y + 3.35, z: 0 }, radius: 0.35, dynamic: false }
const moving: BallObject = { ...waiting, id: 'm', dynamic: true, releasedFrom: waiting.position }
const ramp: RampObject = { id: 'r', kind: 'ramp', createdAt: 0, start: { x: -1, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, width: 0.28, thickness: 0.35 }

beforeEach(clearAllLiveBallPoses)

it('reads a waiting ball as still, at the height of its bottom above the floor', () => {
  expect(readBall(waiting)).toEqual({ seconds: 0, speed: 0, height: expect.closeTo(3, 9), highest: expect.closeTo(3, 9) })
})

it('reads a moving ball from where Rapier last put it', () => {
  setLiveBallPose('m', { x: 2, y: GROUND_TOP_Y + 1.35, z: 0 })
  setLiveBallMotion('m', { velocity: { x: 3, y: -4, z: 0 }, seconds: 1.25, highest: GROUND_TOP_Y + 4.35 })
  expect(readBall(moving)).toEqual({ seconds: 1.25, speed: 5, height: expect.closeTo(1, 9), highest: expect.closeTo(4, 9) })
})

it('follows the selected ball, or else the only moving one', () => {
  expect(followedBall([ramp, waiting, moving], 'w')).toBe(waiting)
  expect(followedBall([ramp, waiting, moving], 'r')).toBe(moving)
  expect(followedBall([ramp, waiting, moving], null)).toBe(moving)
  expect(followedBall([moving, { ...moving, id: 'm2' }], null)).toBeNull()
  expect(followedBall([waiting], null)).toBeNull()
})
