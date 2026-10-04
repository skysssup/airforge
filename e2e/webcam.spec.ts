import { expect, test } from '@playwright/test'

test.skip(({ browserName }) => browserName !== 'chromium', 'Uses Chromium launch flags for a fake camera')
test.use({
  permissions: ['camera'],
  launchOptions: {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
})

test('shows the mirrored camera behind the sheet and goes back to the mouse', async ({ page }) => {
  // Never answer the hand-tracker downloads, so the session stays in its loading state without the network.
  await page.route(/cdn\.jsdelivr\.net|storage\.googleapis\.com/, () => {})
  await page.addInitScript(() => localStorage.setItem('airforge.tutorialDismissed', '1'))
  await page.goto('')
  const webcam = page.getByRole('button', { name: 'Webcam' })
  await webcam.click()
  await expect(webcam).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('complementary', { name: 'Webcam' })).toContainText('Loading the hand tracker')
  const video = page.locator('video.webcam-video')
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.srcObject instanceof MediaStream && v.srcObject.active)).toBe(true)
  expect(await video.evaluate((v) => getComputedStyle(v).transform)).toBe('matrix(-1, 0, 0, 1, 0, 0)')

  await page.getByRole('button', { name: 'Use mouse' }).click()
  await expect(video).toHaveCount(0)
  await expect(webcam).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('status')).toHaveText('Mouse drawing.')
  await page.unrouteAll({ behavior: 'ignoreErrors' })
})
