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

test('does not show the update prompt when no new service worker is waiting', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('input[placeholder="搜索歌曲、歌手、专辑..."]').first()).toBeVisible();

  // 等待首个 Service Worker 完成安装与激活
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  // 首次安装不构成"更新"，无 waiting SW 时不应误弹"发现新版本"
  await expect(page.getByText('发现新版本')).toHaveCount(0);
});
