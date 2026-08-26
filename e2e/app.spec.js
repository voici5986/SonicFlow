import { expect, test } from '@playwright/test';
import { installApiFixtures, installDeterministicBrowser } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await installDeterministicBrowser(page);
  await installApiFixtures(page);
  await page.goto('/');
});

test('search results can be favorited and played from a local fixture', async ({ page }) => {
  const searchInput = page.locator('input[placeholder="搜索歌曲、歌手、专辑..."]').first();
  await expect(searchInput).toBeVisible();

  await searchInput.fill('fixture');
  await searchInput.press('Enter');

  const card = page.locator('.music-card').first();
  await expect(card).toContainText('Fixture Song');

  await card.getByRole('button', { name: '收藏' }).click();
  await expect(card.getByRole('button', { name: '取消收藏' })).toBeVisible();

  await page.locator('.nav-item').filter({ hasText: '收藏' }).first().click();
  await expect(page.locator('.favorites-page .music-card').first()).toContainText('Fixture Song');

  await page.locator('.nav-item').filter({ hasText: '搜索' }).first().click();
  await page.locator('.music-card').first().click();
  await expect(page.locator('.audio-player')).toBeVisible();
  await expect(page.locator('.audio-player .track-name')).toHaveText('Fixture Song');
});

test('offline transitions do not call the real music API', async ({ page, context }) => {
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  const searchInput = page.locator('input[placeholder="搜索歌曲、歌手、专辑..."]').first();
  await searchInput.fill('offline');
  await searchInput.press('Enter');
  await expect(page.locator('.music-card')).toHaveCount(0);
});
