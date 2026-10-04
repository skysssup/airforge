import { expect, test } from '@playwright/test'

test.skip(({ browserName }) => browserName !== 'chromium', 'Uses Chromium-only touch emulation and launch flags')

test.describe('touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('draws a ramp with a finger', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('airforge.tutorialDismissed', '1'))
    await page.goto('')
    const box = (await page.locator('.drawing-overlay').boundingBox())!
    const client = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
    await touch('touchStart', box.x + 60, box.y + 120)
    for (let i = 1; i <= 12; i++) await touch('touchMove', box.x + 60 + i * 20, box.y + 120 + i * 15)
    await touch('touchEnd', 0, 0)
    await expect(page.getByRole('status')).toHaveText('Added a ramp.')
  })
})
