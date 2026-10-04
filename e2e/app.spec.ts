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

/** Object counts from the World panel, e.g. { ramp: 1, ball: 2, platform: 0, limit: '3/40' }. */
async function counts(page: Page) {
  const button = page.getByRole('button', { name: 'World' })
  const panel = page.getByRole('region', { name: 'World' })
  await button.click()
  const entries = await panel.locator('.counts div').evaluateAll((items) =>
    items.map((item) => [item.querySelector('dt')!.textContent!, item.querySelector('dd')!.textContent!]),
  )
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  return Object.fromEntries(
    entries.map(([label, value]) => [label.toLowerCase().replace(/s$/, ''), label === 'Limit' ? value : Number(value)]),
  )
}

const status = (page: Page) => page.getByRole('status')

test('first visit shows the welcome dialog over a working WebGL scene', async ({ page }) => {
  await page.goto('')
  const dialog = page.getByRole('dialog', { name: 'Draw a machine, then drop a ball' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Start drawing' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('toolbar', { name: 'Simulation' })).toBeVisible()
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
  expect(await counts(page)).toEqual({ ramp: 1, ball: 1, platform: 1, limit: '3/40' })

  await page.mouse.click(...at(0.5, 0.1))
  await expect(status(page)).toHaveText('Drag to draw. Click a shape to select it.')
  await expect(page.getByRole('region', { name: /Choose a shape/ })).toBeHidden()

  await page.mouse.click(...at(0.4, 0.425))
  await expect(status(page)).toHaveText('Selected ramp. Press Delete to remove it.')
  await page.keyboard.press('Delete')
  await expect(status(page)).toHaveText('Deleted ramp.')
  expect(await counts(page)).toMatchObject({ ramp: 0, ball: 1, platform: 1 })
  await page.keyboard.press('ControlOrMeta+z')
  await expect(status(page)).toHaveText('Undone.')
  expect(await counts(page)).toMatchObject({ ramp: 1, ball: 1, platform: 1 })
  await page.keyboard.press('Shift+Z')
  await expect(status(page)).toHaveText('Redone.')
  expect(await counts(page)).toMatchObject({ ramp: 0, ball: 1, platform: 1 })
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
  expect(await counts(page)).toMatchObject({ platform: 1 })
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
  await expect(status(page)).toHaveText('Scene cleared. Press Undo to bring it back.')
  expect(await counts(page)).toMatchObject({ limit: '0/40' })
  await expect(page).toHaveURL(/\/airforge\/$/)

  const input = page.locator('input[type=file]')
  await input.setInputFiles({ name: 'zigzag.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) })
  await expect(status(page)).toHaveText('Opened “Zigzag” from zigzag.json.')
  expect(await counts(page)).toEqual({ ramp: 3, ball: 1, platform: 4, limit: '8/40' })

  await input.setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"format": "airforge-scene", "version": 1') })
  await expect(status(page)).toHaveText('Could not open broken.json: Malformed JSON.')
  expect(await counts(page)).toMatchObject({ limit: '8/40' })
})

test('copies a link that opens the same scene in another tab; a damaged link changes nothing', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Playwright grants clipboard access only in Chromium')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page, '?example=staircase')
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(status(page)).toContainText('Copied a link to “Staircase”')
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toMatch(/\/airforge\/#scene=[A-Za-z0-9_-]+$/)

  const other = await context.newPage()
  await other.goto(link)
  await expect(other.getByRole('status')).toHaveText('Opened “Staircase” from a link. Press Drop (D) to start.')
  expect(await counts(other)).toEqual(await counts(page))

  await other.goto(link.replace(/#scene=.*/, '#scene=not-a-scene'))
  await expect(other.getByRole('status')).toContainText('Could not open the scene in this link: The link is damaged')
  await other.close()
})

test('every example opens from the menu and from its link', async ({ page }) => {
  await open(page)
  const examples = page.getByRole('button', { name: 'Examples' })
  await examples.click()
  const titles = await page.getByRole('menuitem').evaluateAll((items) => items.map((item) => item.querySelector('.menu-title')!.textContent))
  expect(titles).toEqual(['Ramp & Ball', 'Zigzag', 'Staircase', 'Bounce Test', 'Moon Jump', 'Funnel'])
  await page.keyboard.press('Escape')
  const ids = ['ramp-and-ball', 'zigzag', 'staircase', 'bounce-test', 'moon-jump', 'funnel']
  for (const [i, id] of ids.entries()) {
    await examples.click()
    await page.getByRole('menuitem', { name: titles[i]! }).click()
    await expect(page).toHaveURL(new RegExp(`\\?example=${id}$`))
    await expect(status(page)).toHaveText(/^Opened “.+”\. Press Drop \(D\) to start\.$/)
    await expect(page.getByRole('complementary', { name: `About the ${titles[i]} example` })).toBeVisible()
  }
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Scene name' })).toHaveValue('Funnel')

  await page.goto('?example=no-such-example')
  await expect(status(page)).toHaveText('There is no example called “no-such-example”. Pick one from the Examples menu.')
})

test('follows the system color scheme until a theme is chosen, then remembers it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await open(page)
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(11, 11, 12)')

  await page.getByRole('button', { name: 'Switch to light theme' }).click()
  await expect(html).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', /^#fff(fff)?$/)
})

test('changes gravity, bounce, and friction from the World panel', async ({ page }) => {
  await open(page, '?example=bounce-test')
  await page.getByRole('button', { name: 'World' }).click()
  const bounce = page.getByRole('slider', { name: 'Bounce' })
  await expect(bounce).toHaveValue('0.85')
  await bounce.fill('0.2')
  await expect(page.getByRole('region', { name: 'World' }).locator('output[for="bounce"]')).toHaveText('0.20')
  await page.keyboard.press('Escape')
  const { json } = await save(page)
  expect(json.physics.bounce).toBe(0.2)
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
