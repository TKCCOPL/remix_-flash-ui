import { test, expect } from '@playwright/test';

// Helper to login
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin', { timeout: 10000 });
}

test.describe('Tiptap Editor', () => {
  test('AdminEdit page loads with Tiptap editor', async ({ page }) => {
    await login(page);
    await page.goto('/admin/edit');
    await page.waitForSelector('.ProseMirror', { timeout: 30000 });

    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();
  });

  test('can type text in editor', async ({ page }) => {
    await login(page);
    await page.goto('/admin/edit');

    // Wait for editor to load
    await page.waitForTimeout(3000);

    const editor = page.locator('.ProseMirror');
    const isVisible = await editor.isVisible().catch(() => false);

    if (!isVisible) {
      // Try waiting longer
      await page.waitForSelector('.ProseMirror', { timeout: 30000 });
    }

    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('Test Article');

    await editor.click();
    await page.keyboard.type('Hello World');
    await page.waitForTimeout(500);

    await expect(editor).toContainText('Hello World');
  });

  test('source mode toggle works', async ({ page }) => {
    await login(page);
    await page.goto('/admin/edit');

    // Wait for editor to load
    await page.waitForTimeout(3000);

    const editor = page.locator('.ProseMirror');
    const isVisible = await editor.isVisible().catch(() => false);

    if (!isVisible) {
      await page.waitForSelector('.ProseMirror', { timeout: 30000 });
    }

    await editor.click();
    await page.keyboard.type('Test content');
    await page.waitForTimeout(500);

    const sourceButton = page.locator('button[title*="源码"], button[title*="Source"]');
    await sourceButton.click();
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
  });
});
