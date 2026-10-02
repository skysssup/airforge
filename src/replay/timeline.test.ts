import { expect, it } from 'vitest'
import { createTimeline, recordEvent, recordSnapshot, seekSnapshot, createReplayController, MAX_REPLAY_EVENTS, MAX_REPLAY_SNAPSHOTS } from './timeline'
import { DEFAULT_PHYSICS } from '../physics/params'

it('retains bounded independent replay data and normalizes seeks', () => {
  const timeline = createTimeline()
  const event = { type: 'STROKE_STARTED' as const, id: 'event', t: 1, source: 'mouse' as const, point: { x: 1, y: 2 } }
  recordEvent(timeline, event)
  event.point.x = 99
  expect(timeline.events[0]).toMatchObject({ point: { x: 1 } })
  for (let i = 0; i < MAX_REPLAY_EVENTS + 5; i++) recordEvent(timeline, { type: 'UNDO', id: String(i), t: i })
  expect(timeline.events).toHaveLength(MAX_REPLAY_EVENTS)
  for (let i = 0; i < MAX_REPLAY_SNAPSHOTS + 5; i++) recordSnapshot(timeline, i, [], DEFAULT_PHYSICS)
  expect(timeline.snapshots).toHaveLength(MAX_REPLAY_SNAPSHOTS)
  expect(seekSnapshot(timeline, createReplayController(), NaN)?.t).toBe(5)
  expect(seekSnapshot(timeline, createReplayController(), 1.8)?.t).toBe(6)
})
