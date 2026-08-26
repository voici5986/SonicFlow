import { expect, test } from '@playwright/test';

test('production PWA shell remains available after an offline reload', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.locator('input[placeholder="搜索歌曲、歌手、专辑..."]').first()).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('input[placeholder="搜索歌曲、歌手、专辑..."]').first()).toBeVisible();
});
