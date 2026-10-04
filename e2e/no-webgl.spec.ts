import { expect, test } from '@playwright/test'

test.skip(({ browserName }) => browserName !== 'chromium', 'Uses Chromium launch flags to turn WebGL off')
test.use({ launchOptions: { args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] } })

test('explains what the scene needs instead of showing a blank page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('airforge.tutorialDismissed', '1'))
  await page.goto('')
  await expect(page.getByRole('alert')).toContainText('AirForge needs WebGL and WebAssembly')
  await expect(page.getByRole('toolbar', { name: 'Simulation' })).toBeVisible()
})
