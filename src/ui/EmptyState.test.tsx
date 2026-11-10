// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { EmptyState } from './EmptyState'
import { appStore } from '../store/appStore'
import { sceneErrorStore } from './sceneError'

beforeEach(() => {
  appStore._resetForTests()
  sessionStorage.clear()
  sceneErrorStore.set(null)
})
afterEach(() => {
  cleanup()
  sceneErrorStore.set(null)
})

it('draws the legend once per session', () => {
  const first = render(<EmptyState />)
  expect(first.container.querySelector('.legend.demo')).not.toBeNull()
  first.unmount()
  const second = render(<EmptyState />)
  expect(second.container.querySelector('.legend')).not.toBeNull()
  expect(second.container.querySelector('.legend.demo')).toBeNull()
})

it('steps aside while the scene error explains the blank sheet', () => {
  const { container } = render(<EmptyState />)
  expect(container.querySelector('.empty')).not.toBeNull()
  act(() => sceneErrorStore.set('WebGL is not available'))
  expect(container.querySelector('.empty')).toBeNull()
})
