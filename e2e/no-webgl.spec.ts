import { expect, test } from '@playwright/test'

test.skip(({ browserName }) => browserName !== 'chromium', 'Uses Chromium launch flags to turn WebGL off')
test.use({ launchOptions: { args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] } })

test('explains what the scene needs instead of showing a blank page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('airforge.tutorialDismissed', '1'))
  await page.goto('')
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('AirForge needs WebGL and WebAssembly')
  await expect(alert).toBeVisible()
  // The empty-sheet legend steps aside, and nothing covers the explanation.
  await expect(page.locator('.empty')).toHaveCount(0)
  const panel = (await alert.locator('.panel').boundingBox())!
  const top = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.scene-error, .drawing-overlay'), {
    x: panel.x + panel.width / 2,
    y: panel.y + 12,
  })
  expect(top).toBe(true)
  await expect(page.getByRole('toolbar', { name: 'Simulation' })).toBeVisible()
})
