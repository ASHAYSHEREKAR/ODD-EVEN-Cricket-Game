// @ts-check
const { test, expect } = require('@playwright/test');
const { goToApp, switchToOnlineMode, goToHostLobby } = require('./helpers');

test.describe('Mobile Viewport — Home Screen', () => {
  test.beforeEach(async ({ page }) => {
    await goToApp(page);
  });

  test('game title is visible on mobile without scrolling', async ({ page }) => {
    await expect(page.locator('.game-title')).toBeVisible();
  });

  test('PLAY MATCH button is visible on mobile', async ({ page }) => {
    await page.locator('#start-game-btn').scrollIntoViewIfNeeded();
    await expect(page.locator('#start-game-btn')).toBeVisible();
  });

  test('mode tabs are visible on mobile', async ({ page }) => {
    await expect(page.locator('#mode-tab-single')).toBeVisible();
    await expect(page.locator('#mode-tab-local2p')).toBeVisible();
    await expect(page.locator('#mode-tab-online')).toBeVisible();
  });

  test('player name input is visible on mobile', async ({ page }) => {
    await expect(page.locator('#player-name-input')).toBeVisible();
  });

  test('menu-screen does not overflow its container horizontally', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      const menu = document.querySelector('#menu-screen');
      if (!menu) return false;
      return menu.scrollWidth > menu.clientWidth + 5; // 5px tolerance
    });
    expect(overflow).toBe(false);
  });

  test('body does not have significant horizontal overflow', async ({ page }) => {
    const bodyOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth + 5;
    });
    expect(bodyOverflow).toBe(false);
  });
});

test.describe('Mobile Viewport — Online Lobby Setup', () => {
  test.beforeEach(async ({ page }) => {
    await goToApp(page);
    await switchToOnlineMode(page);
  });

  test('CREATE ROOM button is visible on mobile', async ({ page }) => {
    await expect(page.locator('#host-room-btn')).toBeVisible();
  });

  test('JOIN ROOM button is visible on mobile', async ({ page }) => {
    await page.locator('#open-join-card-btn').scrollIntoViewIfNeeded();
    await expect(page.locator('#open-join-card-btn')).toBeVisible();
  });
});

test.describe('Mobile Viewport — Online Room Screen', () => {
  test.beforeEach(async ({ page }) => {
    await goToApp(page);
    await switchToOnlineMode(page);
    await goToHostLobby(page, 'MobileHost');
  });

  test('online room lobby screen has the screen class (overflow-y: auto)', async ({ page }) => {
    // The .screen CSS class guarantees overflow-y: auto
    const hasScreenClass = await page.evaluate(() =>
      document.querySelector('#online-room-screen')?.classList.contains('screen') ?? false
    );
    expect(hasScreenClass).toBe(true);
    const isActive = await page.evaluate(() =>
      document.querySelector('#online-room-screen')?.classList.contains('active') ?? false
    );
    expect(isActive).toBe(true);
  });

  test('LEAVE ROOM button is visible and accessible on mobile', async ({ page }) => {
    const leaveBtn = page.locator('#room-leave-btn');
    await leaveBtn.scrollIntoViewIfNeeded();
    await expect(leaveBtn).toBeVisible();
    const box = await leaveBtn.boundingBox();
    expect(box).not.toBeNull();
  });

  test('clicking LEAVE ROOM on mobile returns to menu', async ({ page }) => {
    // The leave button triggers window.confirm() — accept it
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('#room-leave-btn').scrollIntoViewIfNeeded();
    await page.locator('#room-leave-btn').click();
    await expect(page.locator('#menu-screen')).toHaveClass(/active/, { timeout: 8_000 });
  });
});

test.describe('Mobile Viewport — Game Start Regression', () => {
  test('starting VS AI game on mobile transitions away from menu', async ({ page }) => {
    await goToApp(page);
    await page.locator('#player-name-input').fill('MobileUser');
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
