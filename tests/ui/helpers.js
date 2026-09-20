// @ts-check
// Shared test helpers for the Odd-Even Cricket Game UI tests

/**
 * Navigate to the app and wait for full JS initialization.
 *
 * Strategy: use the default 'load' waitUntil (ensures all synchronous scripts
 * have executed, including app.js bootstrapCricketApp). Then a brief pause for
 * any micro-task queue to drain, and verify the menu is visible.
 *
 * WHY NOT waitForFunction(cricketGameApp): the Python dev server occasionally
 * fails to serve all JS files fast enough under concurrent workers, causing
 * app.js to silently not run.  Using 'load' event + a fixed delay is more robust.
 */
async function goToApp(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });
  // Wait for cricketGameApp to be fully initialized and menu to be active
  await page.waitForFunction(
    () => typeof window.cricketGameApp !== 'undefined' && document.querySelector('#menu-screen.active') !== null,
    { timeout: 15_000 }
  );
  // Micro-task pause: give any deferred event bindings time to settle
  await page.waitForTimeout(100);
}

/**
 * Switch to ONLINE mode tab and wait for the section to unhide.
 */
async function switchToOnlineMode(page) {
  const onlineTab = page.locator('#mode-tab-online');
  await onlineTab.scrollIntoViewIfNeeded();
  await onlineTab.click();
  await page.waitForFunction(
    () => !document.querySelector('#section-online-lobby')?.classList.contains('hidden'),
    { timeout: 10_000 }
  );
  await page.waitForTimeout(50);
}

/**
 * Create an online room as host and wait for the room lobby screen.
 * Uses deterministic MultiplayerManager hostRoom mock to support all browsers (including WebKit).
 */
async function goToHostLobby(page, name = 'HostPlayer') {
  // Ensure MultiplayerManager hostRoom works deterministically in headless test environment
  await page.evaluate((hostName) => {
    const mgr = window.MultiplayerManager || (typeof MultiplayerManager !== 'undefined' ? MultiplayerManager : null);
    if (mgr) {
      mgr.hostRoom = function(playerName, onReady) {
        this.isHost = true;
        this.localPlayerName = playerName || hostName || 'Host';
        this.roomCode = 'TEST9';
        this.isConnected = true;
        if (onReady) onReady('TEST9');
      };
      mgr.closeRoom = function() {
        this.isConnected = false;
        this.isHost = false;
        this.roomCode = '';
      };
    }
  }, name);

  await page.locator('#online-name-input').fill(name);
  const hostBtn = page.locator('#host-room-btn');
  await hostBtn.scrollIntoViewIfNeeded();
  await hostBtn.click();
  await page.waitForSelector('#online-room-screen.active', { timeout: 10_000 });
}

module.exports = { goToApp, switchToOnlineMode, goToHostLobby };

