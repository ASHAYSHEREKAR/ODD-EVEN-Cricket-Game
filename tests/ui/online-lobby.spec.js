// @ts-check
const { test, expect } = require('@playwright/test');
const { goToApp, switchToOnlineMode, goToHostLobby } = require('./helpers');

test.describe('Online Lobby — Setup', () => {
  test.beforeEach(async ({ page }) => {
    await goToApp(page);
    await switchToOnlineMode(page);
  });

  test('online name input is visible when ONLINE tab is selected', async ({ page }) => {
    await expect(page.locator('#online-name-input')).toBeVisible();
  });

  test('CREATE ROOM and JOIN ROOM buttons are visible', async ({ page }) => {
    await expect(page.locator('#host-room-btn')).toBeVisible();
    await expect(page.locator('#open-join-card-btn')).toBeVisible();
  });

  test('clicking JOIN ROOM reveals room code input card', async ({ page }) => {
    await page.locator('#open-join-card-btn').click();
    await page.waitForFunction(
      () => !document.querySelector('#join-room-card')?.classList.contains('hidden'),
      { timeout: 8_000 }
    );
    await expect(page.locator('#join-room-code-input')).toBeVisible();
    await expect(page.locator('#join-room-confirm-btn')).toBeVisible();
  });

  test('join room code input is limited to 5 chars', async ({ page }) => {
    await page.locator('#open-join-card-btn').click();
    await page.waitForFunction(
      () => !document.querySelector('#join-room-card')?.classList.contains('hidden'),
      { timeout: 8_000 }
    );
    await page.locator('#join-room-code-input').fill('abcdef');
    const value = await page.locator('#join-room-code-input').inputValue();
    expect(value.length).toBeLessThanOrEqual(5);
  });
});

test.describe('Online Lobby — Room Screen', () => {
  test.beforeEach(async ({ page }) => {
    await goToApp(page);
    await switchToOnlineMode(page);
    await goToHostLobby(page, 'HostPlayer');
  });

  test('clicking CREATE ROOM navigates to online room lobby screen', async ({ page }) => {
    await expect(page.locator('#online-room-screen')).toHaveClass(/active/);
  });

  test('online room screen shows a real Room ID', async ({ page }) => {
    const roomCode = page.locator('#room-screen-code');
    await expect(roomCode).toBeVisible();
    const codeText = await roomCode.textContent();
    expect(codeText?.trim()).toBeTruthy();
    expect(codeText).not.toBe('CRIC-XXXX');
  });

  test('HOST LOBBY badge is visible in room screen', async ({ page }) => {
    await expect(page.locator('#online-room-role-badge')).toBeVisible();
    await expect(page.locator('#online-room-role-badge')).toContainText('HOST');
  });

  test('host name is displayed in roster', async ({ page }) => {
    await expect(page.locator('#room-host-name')).toContainText('HostPlayer');
  });

  test('guest slot shows "Waiting for opponent" when alone', async ({ page }) => {
    await expect(page.locator('#room-guest-name')).toContainText('Waiting');
  });

  test('Start match button is disabled until opponent joins', async ({ page }) => {
    await expect(page.locator('#room-start-match-btn')).toBeDisabled();
  });

  test('COPY CODE button is visible', async ({ page }) => {
    await expect(page.locator('#room-screen-copy-btn')).toBeVisible();
  });

  test('LEAVE ROOM button is visible', async ({ page }) => {
    await page.locator('#room-leave-btn').scrollIntoViewIfNeeded();
    await expect(page.locator('#room-leave-btn')).toBeVisible();
  });

  test('clicking LEAVE ROOM returns to the menu screen', async ({ page }) => {
    // The leave button triggers window.confirm() — accept it
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('#room-leave-btn').scrollIntoViewIfNeeded();
    await page.locator('#room-leave-btn').click();
    await expect(page.locator('#menu-screen')).toHaveClass(/active/, { timeout: 8_000 });
  });

  test('overs/balls selector is visible in room settings', async ({ page }) => {
    await page.locator('#room-overs-selector').scrollIntoViewIfNeeded();
    await expect(page.locator('#room-overs-selector')).toBeVisible();
    const activeBallBtn = page.locator('#room-overs-selector .btn-ball-count.active');
    await expect(activeBallBtn).toBeVisible();
  });
});
