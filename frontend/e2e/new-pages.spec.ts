import { test, expect } from '@playwright/test'

test.describe('New Pages', () => {
  test('archive page loads and displays posts', async ({ page }) => {
    await page.goto('/archive')
    await expect(page.locator('h1')).toContainText('文章归档')
    await page.waitForSelector('[data-testid="timeline-card"]', { timeout: 5000 })
  })

  test('categories page loads and displays tag cloud', async ({ page }) => {
    await page.goto('/categories')
    await expect(page.locator('h1')).toContainText('文章分类')
    await page.waitForSelector('[data-testid="tag-cloud"]', { timeout: 5000 })
  })

  test('search page loads and performs search', async ({ page }) => {
    await page.goto('/search')
    await expect(page.locator('h1')).toContainText('搜索文章')

    await page.fill('input[placeholder="输入关键词搜索..."]', 'React')
    await page.click('button:has-text("搜索")')

    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 })
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
  })

  test('navigation links work correctly', async ({ page }) => {
    await page.goto('/')

    // Test archive link
    await page.click('a:has-text("归档")')
    await expect(page).toHaveURL('/archive')

    // Go back and test categories link
    await page.goBack()
    await page.click('a:has-text("分类")')
    await expect(page).toHaveURL('/categories')

    // Go back and test search link
    await page.goBack()
    await page.click('a:has-text("搜索")')
    await expect(page).toHaveURL('/search')
  })
})