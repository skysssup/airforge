import { readFile } from 'node:fs/promises'
import { expect, test as base, type Page } from '@playwright/test'

/** Fails the test on any console error or uncaught exception in the page. */
const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', (error) => errors.push(error.message))
      await use(errors)
      expect(errors).toEqual([])
    },
    { auto: true },
  ],
})

async function open(page: Page, query = '') {
  await page.addInitScript(() => localStorage.setItem('airforge.tutorialDismissed', '1'))
  await page.goto(query)
  await expect(page.locator('canvas')).toBeVisible()
}

async function drawingArea(page: Page) {
  const box = await page.locator('.drawing-overlay').boundingBox()
  if (!box) throw new Error('No drawing area')
  return { at: (fx: number, fy: number): [number, number] => [box.x + box.width * fx, box.y + box.height * fy], box }
}

async function drag(page: Page, points: [number, number][], steps = 8) {
  await page.mouse.move(...points[0]!)
  await page.mouse.down()
  for (const point of points.slice(1)) await page.mouse.move(...point, { steps })
  await page.mouse.up()
}

async function save(page: Page) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save' }).click()
  const file = await download
  return { name: file.suggestedFilename(), json: JSON.parse(await readFile(await file.path(), 'utf8')) }
}

const counts = (page: Page) => page.getByRole('contentinfo')
const status = (page: Page) => page.getByRole('status')

test('first visit shows the welcome dialog over a working WebGL scene', async ({ page }) => {
  await page.goto('')
  const dialog = page.getByRole('dialog', { name: 'Welcome to AirForge' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Start drawing' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('toolbar', { name: 'AirForge controls' })).toBeVisible()
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => !!canvas.getContext('webgl2'))).toBe(true)
  await page.reload()
  await expect(dialog).toBeHidden()
})

test('draws, selects, deletes, undoes, and redoes shapes', async ({ page }) => {
  await open(page)
  const { at } = await drawingArea(page)

  await drag(page, [at(0.2, 0.25), at(0.6, 0.6)], 3)
  await expect(status(page)).toHaveText('Added a ramp.')

  const [cx, cy] = at(0.82, 0.3)
  const circle: [number, number][] = Array.from({ length: 41 }, (_, i) => [cx + Math.cos((i / 40) * 2 * Math.PI) * 50, cy + Math.sin((i / 40) * 2 * Math.PI) * 50])
  await drag(page, circle, 1)
  await expect(status(page)).toHaveText('Added a ball.')

  await drag(page, [at(0.1, 0.8), at(0.4, 0.8), at(0.4, 0.88), at(0.1, 0.88), at(0.1, 0.8)])
  await expect(status(page)).toHaveText('Added a platform.')
  await expect(counts(page)).toContainText('1 ramp · 1 ball · 1 platform (3/40)')

  await page.mouse.click(...at(0.5, 0.1))
  await expect(status(page)).toHaveText('Drag to draw. Click a shape to select it.')
  await expect(page.getByRole('region', { name: /Choose a shape/ })).toBeHidden()

  await page.mouse.click(...at(0.4, 0.425))
  await expect(status(page)).toHaveText('Selected ramp. Press Delete to remove it.')
  await page.keyboard.press('Delete')
  await expect(counts(page)).toContainText('0 ramps · 1 ball · 1 platform')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(counts(page)).toContainText('1 ramp · 1 ball · 1 platform')
  await page.keyboard.press('Shift+Z')
  await expect(counts(page)).toContainText('0 ramps · 1 ball · 1 platform')
})

test('asks about an unclear stroke and shows it until a choice is made', async ({ page }) => {
  await open(page)
  const { at } = await drawingArea(page)
  await drag(page, [at(0.3, 0.3), at(0.35, 0.5), at(0.4, 0.3), at(0.45, 0.5), at(0.5, 0.3), at(0.55, 0.5)], 4)
  const picker = page.getByRole('region', { name: 'Choose a shape for the dashed stroke' })
  await expect(picker).toBeVisible()
  await expect(page.locator('.ink.pending')).toBeVisible()
  await picker.getByRole('button', { name: 'Platform' }).click()
  await expect(picker).toBeHidden()
  await expect(counts(page)).toContainText('1 platform')
})

test('Ramp & Ball runs in the browser: the ball lands in the cup and Restart puts it back', async ({ page }) => {
  await open(page, '?example=ramp-and-ball')
  await expect(page.getByRole('complementary', { name: 'About the Ramp & Ball example' })).toBeVisible()
  const { json: before } = await save(page)
  const start = before.objects.find((o: { kind: string }) => o.kind === 'ball').position

  await page.keyboard.press('d')
  await expect(status(page)).toHaveText('Dropped 1 ball.')
  await page.waitForTimeout(9000)
  const { name, json: after } = await save(page)
  expect(name).toBe('ramp-ball.json')
  const ball = after.objects.find((o: { kind: string }) => o.kind === 'ball')
  expect(ball.dynamic).toBe(true)
  expect(ball.position.x).toBeGreaterThan(2.8 + 0.12 + 0.35)
  expect(ball.position.x).toBeLessThan(6 - 0.12 - 0.35)
  expect(ball.position.y).toBeCloseTo(-3 + 0.12 + 0.35, 1)

  await page.keyboard.press('r')
  await expect(status(page)).toHaveText('Restarted 1 ball. Press Drop to run again.')
  const { json: restarted } = await save(page)
  expect(restarted.objects.find((o: { kind: string }) => o.kind === 'ball')).toMatchObject({ dynamic: false, position: start })
})

test('saves a scene file and opens it again; rejects a malformed file', async ({ page }) => {
  await open(page, '?example=zigzag')
  const { name, json } = await save(page)
  expect(name).toBe('zigzag.json')
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(counts(page)).toContainText('(0/40)')
  await expect(page).toHaveURL(/\/airforge\/$/)

  const input = page.locator('input[type=file]')
  await input.setInputFiles({ name: 'zigzag.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) })
  await expect(status(page)).toHaveText('Opened “Zigzag” from zigzag.json.')
  await expect(counts(page)).toContainText('3 ramps · 1 ball · 4 platforms (8/40)')

  await input.setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"format": "airforge-scene", "version": 1') })
  await expect(status(page)).toHaveText('Could not open broken.json: Malformed JSON.')
  await expect(counts(page)).toContainText('(8/40)')
})

test('every example opens from the menu and from its link', async ({ page }) => {
  await open(page)
  const menu = page.getByRole('combobox', { name: 'Open an example' })
  const ids = await menu.locator('option:not([disabled])').evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value))
  expect(ids).toEqual(['ramp-and-ball', 'zigzag', 'staircase', 'bounce-test', 'moon-jump', 'funnel'])
  for (const id of ids) {
    await menu.selectOption(id)
    await expect(page).toHaveURL(new RegExp(`\\?example=${id}$`))
    await expect(status(page)).toHaveText(/^Opened “.+”\. Press Drop \(D\) to start\.$/)
  }
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Scene name' })).toHaveValue('Funnel')

  await page.goto('?example=no-such-example')
  await expect(status(page)).toHaveText('There is no example called “no-such-example”. Pick one from the Examples menu.')
})

test('keeps working on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, '?example=funnel')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const { box } = await drawingArea(page)
  expect(box.height).toBeGreaterThan(300)
  await page.getByRole('button', { name: 'Drop (12)' }).click()
  await expect(status(page)).toHaveText('Dropped 12 balls.')
})
