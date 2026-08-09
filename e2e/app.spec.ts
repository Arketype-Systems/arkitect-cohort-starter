import { expect, test } from '@playwright/test'

test('real routes, deep links, history, and navigation work', async ({ page }) => {
  await page.goto('/athletes/ath-a')
  await expect(page.getByRole('heading', { name: 'Jordan Ellis', level: 1 })).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/\/athletes\/ath-a$/)
  if ((page.viewportSize()?.width ?? 1000) <= 800) await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Testing' }).click()
  await expect(page).toHaveURL(/\/testing$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/athletes\/ath-a$/)
})

test('live result autosaves to IndexedDB and survives reload', async ({ page }) => {
  await page.goto('/testing/session-draft/live')
  const input = page.getByLabel('Countermovement Vertical Jump attempt 1')
  await input.fill('24.5')
  await page.waitForTimeout(100)
  await page.reload()
  await expect(input).toHaveValue('24.5')
})

test('required pages have no viewport overflow', async ({ page }, testInfo) => {
  const routes = ['/', '/athletes', '/testing', '/testing/new', '/testing/session-draft/live', '/testing/session-complete/review', '/database', '/standards', '/reporting', '/reporting/ath-a']
  for (const route of routes) {
    await page.goto(route)
    await expect(page.locator('body')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(overflow, `horizontal overflow at ${route}`).toBe(false)
  }
  await page.goto('/testing/session-draft/live')
  await page.screenshot({ path: `screenshots/live-${testInfo.project.name}.png`, fullPage: true })
  await page.goto('/')
  await page.screenshot({ path: `screenshots/dashboard-${testInfo.project.name}.png`, fullPage: true })
})
