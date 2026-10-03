// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Toolbar } from './Toolbar'
import { appStore } from '../store/appStore'
import { DEFAULT_PHYSICS, GRAVITY_MAX, GRAVITY_MIN } from '../physics/params'
import { exportSceneJson, importSceneJson } from '../io/serialize'

beforeEach(() => appStore._resetForTests())
afterEach(cleanup)

it('represents and edits the complete supported gravity range', () => {
  const result = importSceneJson(exportSceneJson('Gravity 40', [], { ...DEFAULT_PHYSICS, gravity: 40 }))
  if (!result.ok) throw new Error(result.error)
  appStore.replaceObjects(result.objects, result.name, result.physics)
  render(<Toolbar onToggleWebcam={() => {}} onOpenHelp={() => {}} onOpenReplay={() => {}} />)
  const slider = screen.getByRole<HTMLInputElement>('slider', { name: /Gravity/ })
  expect(slider.value).toBe('40')
  expect(slider.min).toBe(String(GRAVITY_MIN))
  expect(slider.max).toBe(String(GRAVITY_MAX))
  fireEvent.change(slider, { target: { value: String(GRAVITY_MAX) } })
  expect(appStore.getState().physics.gravity).toBe(GRAVITY_MAX)
  fireEvent.change(slider, { target: { value: String(GRAVITY_MIN) } })
  expect(appStore.getState().physics.gravity).toBe(GRAVITY_MIN)
})
