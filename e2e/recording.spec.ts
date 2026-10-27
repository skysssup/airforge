import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
test.use({ viewport: { width: 1440, height: 900 } })

test('records simulated motion, plots height, and exports a numeric CSV', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('airforge.tutorialDismissed', '1')
    localStorage.setItem('airforge.motion', '1')
  })
  await page.goto('?example=ramp-and-ball')
  await expect(page.locator('canvas')).toBeVisible()
  await page.getByRole('button', { name: /^Drop/ }).click()
  const record = page.getByRole('button', { name: 'Record motion', exact: true })
  await expect(record).toBeEnabled()
  await record.click()
  await expect(page.getByRole('img', { name: /^Measured height over/ })).toBeVisible()
  await expect.poll(async () => Number((await page.locator('.motion-recording p').innerText()).match(/(\d+) samples/)?.[1] ?? 0)).toBeGreaterThan(10)
  await page.screenshot({ path: 'test-results/motion-recording.png' })
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click()
  const file = await download
  const rows = (await readFile((await file.path())!, 'utf8')).trim().split('\n')
  expect(rows[0]).toBe('time_s,speed_u_per_s,height_u,highest_u')
  expect(rows.length).toBeGreaterThan(2)
  const times = rows.slice(1).map(row => Number(row.split(',')[0]))
  expect(times.every((time, i) => i === 0 || time > times[i - 1]!)).toBe(true)
  expect(rows.slice(1).every(row => row.split(',').every(value => Number.isFinite(Number(value))))).toBe(true)
});
