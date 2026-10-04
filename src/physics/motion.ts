/** What the motion readout shows: time since release, speed, and height above the floor. */

import { liveBallMotion, liveBallPose } from './livePoses'
import { GROUND_TOP_Y } from './params'
import type { BallObject, SceneObject } from '../scene/objects'

export interface MotionReading {
  /** Seconds since the ball was released. */
  seconds: number
  speed: number
  /** Height of the bottom of the ball above the floor, now and at its highest. */
  height: number
  highest: number
}

/** The numbers the readout shows for a ball; a waiting ball reads as still, at its current height. */
export function readBall(ball: BallObject): MotionReading {
  const motion = ball.dynamic ? liveBallMotion(ball.id) : undefined
  const y = (ball.dynamic ? liveBallPose(ball.id)?.y : undefined) ?? ball.position.y
  const above = (centerY: number) => centerY - ball.radius - GROUND_TOP_Y
  return {
    seconds: motion?.seconds ?? 0,
    speed: motion ? Math.hypot(motion.velocity.x, motion.velocity.y) : 0,
    height: above(y),
    highest: above(Math.max(motion?.highest ?? y, y)),
  }
}

/** The ball the readout follows: the selected ball, or else the only moving one. */
export function followedBall(objects: SceneObject[], selectedId: string | null): BallObject | null {
  const selected = objects.find((o) => o.id === selectedId)
  if (selected?.kind === 'ball') return selected
  const moving = objects.filter((o): o is BallObject => o.kind === 'ball' && o.dynamic)
  return moving.length === 1 ? moving[0]! : null
}
