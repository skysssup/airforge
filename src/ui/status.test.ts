// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { appStore } from '../store/appStore'
import { rampAndBall } from '../fixtures/scenes'
import { StatusBar } from './StatusBar'

beforeEach(() => appStore._resetForTests())
afterEach(cleanup)

describe('object count wording', () => {
  it('uses singular and plural correctly', () => {
    appStore.loadExample(rampAndBall.objects.filter((o) => o.kind !== 'platform'), 'Counts')
    appStore.addBall()
    render(createElement(StatusBar))
    const status = screen.getByRole('status').textContent
    expect(status).toContain('1 ramp')
    expect(status).toContain('2 balls')
    expect(status).toContain('0 platforms')
  })
})
