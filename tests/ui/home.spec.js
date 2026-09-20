// @ts-check
const { test, expect } = require('@playwright/test');
const { goToApp } = require('./helpers');

test.describe('Home Screen', () => {
  test.beforeEach(async ({ page }) => {
    await goToApp(page);
  });

  test('page loads without console errors', async ({ page }) => {
    // The page was already loaded by beforeEach (goToApp).
    // Evaluate the page for any non-network JS errors.
    const jsErrors = await page.evaluate(() => {
      // Check for any explicit error markers the app might have set
      return typeof window.__CRICKET_INIT_ERROR__ !== 'undefined'
        ? [window.__CRICKET_INIT_ERROR__]
        : [];
    });
    // Also verify cricketGameApp initialised (if not, it indicates a JS crash)
    const appInit = await page.evaluate(() => typeof window.cricketGameApp !== 'undefined');
    expect(appInit).toBe(true);
    expect(jsErrors).toHaveLength(0);
  });

  test('game title is visible', async ({ page }) => {
    await expect(page.locator('.game-title')).toBeVisible();
    await expect(page.locator('.game-title')).toContainText('EVEN');
  });

  test('logo badge is visible', async ({ page }) => {
    await expect(page.locator('.game-logo-badge')).toBeVisible();
    await expect(page.locator('.game-logo-badge')).toContainText('CRICKET');
  });

  test('VS AI mode tab is present and active by default', async ({ page }) => {
    const tab = page.locator('#mode-tab-single');
    await expect(tab).toBeVisible();
    await expect(tab).toHaveClass(/active/);
  });

  test('LOCAL 2P mode tab is present', async ({ page }) => {
    await expect(page.locator('#mode-tab-local2p')).toBeVisible();
  });

  test('ONLINE mode tab is present', async ({ page }) => {
    await expect(page.locator('#mode-tab-online')).toBeVisible();
  });

  test('PLAY MATCH button is visible', async ({ page }) => {
    await page.locator('#start-game-btn').scrollIntoViewIfNeeded();
    await expect(page.locator('#start-game-btn')).toBeVisible();
  });

  test('RULES & GUIDE button is visible', async ({ page }) => {
    await page.locator('#how-to-play-btn').scrollIntoViewIfNeeded();
    await expect(page.locator('#how-to-play-btn')).toBeVisible();
  });

  test('SETTINGS button is visible', async ({ page }) => {
    await page.locator('#settings-btn').scrollIntoViewIfNeeded();
    await expect(page.locator('#settings-btn')).toBeVisible();
  });

  test('player name input is visible in VS AI mode', async ({ page }) => {
    await expect(page.locator('#player-name-input')).toBeVisible();
  });

  test('clicking RULES & GUIDE shows how-to-play screen', async ({ page }) => {
    await page.locator('#how-to-play-btn').scrollIntoViewIfNeeded();
    await page.locator('#how-to-play-btn').click();
    await expect(page.locator('#how-to-play-screen')).toHaveClass(/active/, { timeout: 5_000 });
    await expect(page.locator('#back-from-help-btn')).toBeVisible();
  });

  test('clicking BACK from rules returns to menu', async ({ page }) => {
    await page.locator('#how-to-play-btn').scrollIntoViewIfNeeded();
    await page.locator('#how-to-play-btn').click();
    await expect(page.locator('#how-to-play-screen')).toHaveClass(/active/, { timeout: 5_000 });
    await page.locator('#back-from-help-btn').click();
    await expect(page.locator('#menu-screen')).toHaveClass(/active/, { timeout: 5_000 });
  });

  test('clicking SETTINGS shows settings screen', async ({ page }) => {
    await page.locator('#settings-btn').scrollIntoViewIfNeeded();
    await page.locator('#settings-btn').click();
    await expect(page.locator('#settings-screen')).toHaveClass(/active/, { timeout: 5_000 });
  });

  test('switching to ONLINE mode reveals host/join buttons', async ({ page }) => {
    await page.locator('#mode-tab-online').scrollIntoViewIfNeeded();
    await page.locator('#mode-tab-online').click();
    await page.waitForFunction(
      () => !document.querySelector('#section-online-lobby')?.classList.contains('hidden'),
      { timeout: 10_000 }
    );
    await expect(page.locator('#host-room-btn')).toBeVisible();
    await expect(page.locator('#open-join-card-btn')).toBeVisible();
  });

  test('switching to LOCAL 2P mode reveals dual name inputs', async ({ page }) => {
    await page.locator('#mode-tab-local2p').scrollIntoViewIfNeeded();
    await page.locator('#mode-tab-local2p').click();
    await page.waitForFunction(
      () => !document.querySelector('#section-local-names')?.classList.contains('hidden'),
      { timeout: 10_000 }
    );
    await expect(page.locator('#p1-name-input')).toBeVisible();
    await expect(page.locator('#p2-name-input')).toBeVisible();
  });
});
