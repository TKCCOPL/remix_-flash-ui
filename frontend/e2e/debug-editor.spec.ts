import { test, expect } from '@playwright/test';

test('debug editor page', async ({ page }) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });

  // Capture page errors
  const pageErrors: string[] = [];
  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  // Login
  await page.goto('/login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin', { timeout: 10000 });

  // Go to edit page
  await page.goto('/admin/edit');
  await page.waitForTimeout(5000);

  // Log results
  console.log('Console messages:', consoleMessages);
  console.log('Page errors:', pageErrors);

  // Check what's on the page
  const body = await page.locator('body').innerHTML();
  console.log('Body contains ProseMirror:', body.includes('ProseMirror'));
  console.log('Body contains tiptap:', body.includes('tiptap'));

  // Check if editor is visible
  const editor = page.locator('.ProseMirror');
  const isVisible = await editor.isVisible().catch(() => false);
  console.log('Editor visible:', isVisible);
});
