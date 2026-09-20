// @ts-check
const { test, expect } = require('@playwright/test');
const { goToApp } = require('./helpers');

test.describe('Offline Game Flow (VS AI)', () => {
  test.beforeEach(async ({ page }) => {
    await goToApp(page);
    // Ensure VS AI tab is active
    const cls = await page.locator('#mode-tab-single').getAttribute('class');
    if (!cls?.includes('active')) {
      await page.locator('#mode-tab-single').scrollIntoViewIfNeeded();
      await page.locator('#mode-tab-single').click();
      await page.waitForFunction(
        () => !document.querySelector('#section-single-name')?.classList.contains('hidden'),
        { timeout: 10_000 }
      );
    }
  });

  test('player name input accepts text', async ({ page }) => {
    await page.locator('#player-name-input').fill('TestPlayer');
    await expect(page.locator('#player-name-input')).toHaveValue('TestPlayer');
  });

  test('player name is limited to 14 characters', async ({ page }) => {
    const input = page.locator('#player-name-input');
    await input.fill('ABCDEFGHIJKLMNOPQRSTU'); // 21 chars
    const value = await input.inputValue();
    expect(value.length).toBeLessThanOrEqual(14);
  });

  test('clicking PLAY MATCH without a name still starts a game', async ({ page }) => {
    await page.locator('#start-game-btn').scrollIntoViewIfNeeded();
    await page.locator('#start-game-btn').click();
    await page.waitForFunction(
      () => !document.querySelector('#menu-screen')?.classList.contains('active'),
      { timeout: 10_000 }
    );
    const menuActive = await page.locator('#menu-screen').getAttribute('class');
    expect(menuActive).not.toContain('active');
  });

  test('clicking PLAY MATCH with a name transitions to toss or game screen', async ({ page }) => {
    await page.locator('#player-name-input').fill('Ashay');
    await page.locator('#start-game-btn').scrollIntoViewIfNeeded();
    await page.locator('#start-game-btn').click();
    await page.waitForFunction(
      () => !document.querySelector('#menu-screen')?.classList.contains('active'),
      { timeout: 10_000 }
    );
    const tossActive = await page.locator('#toss-screen').getAttribute('class').catch(() => '');
    const gameActive = await page.locator('#game-screen').getAttribute('class').catch(() => '');
    const transitioned =
      (tossActive || '').includes('active') || (gameActive || '').includes('active');
    expect(transitioned).toBeTruthy();
  });
});

test.describe('Local 2-Player Mode', () => {
  test.beforeEach(async ({ page }) => {
    await goToApp(page);
    await page.locator('#mode-tab-local2p').scrollIntoViewIfNeeded();
    await page.locator('#mode-tab-local2p').click();
    await page.waitForFunction(
      () => !document.querySelector('#section-local-names')?.classList.contains('hidden'),
      { timeout: 10_000 }
    );
  });

  test('P1 and P2 name inputs are visible', async ({ page }) => {
    await expect(page.locator('#p1-name-input')).toBeVisible();
    await expect(page.locator('#p2-name-input')).toBeVisible();
  });

  test('P1 and P2 names accept input', async ({ page }) => {
    await page.locator('#p1-name-input').fill('Alice');
    await page.locator('#p2-name-input').fill('Bob');
    await expect(page.locator('#p1-name-input')).toHaveValue('Alice');
    await expect(page.locator('#p2-name-input')).toHaveValue('Bob');
  });

  test('clicking PLAY MATCH starts local 2P game', async ({ page }) => {
    await page.locator('#p1-name-input').fill('Alice');
    await page.locator('#p2-name-input').fill('Bob');
    await page.locator('#start-game-btn').scrollIntoViewIfNeeded();
    await page.locator('#start-game-btn').click();
    await page.waitForFunction(
      () => !document.querySelector('#menu-screen')?.classList.contains('active'),
      { timeout: 10_000 }
    );
    const menuActive = await page.locator('#menu-screen').getAttribute('class');
    expect(menuActive).not.toContain('active');
  });
});
