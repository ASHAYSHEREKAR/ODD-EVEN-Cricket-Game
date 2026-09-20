// ===================================
// UI CONTROLLER
// Screen transitions, HUD, Scoreboard, Toss, Pause, and Feedback
// ===================================

const UIController = {
    screens: {},

    init() {
        this.cacheElements();
        this.loadSettings();
        this.setupModeTabs();
        this.setupOnlineLobby();
        this.updateMenuProfile();
    },

    setupModeTabs() {
        const tabs = document.querySelectorAll('.mode-tab');
        const singleSec = document.getElementById('section-single-name');
        const localSec = document.getElementById('section-local-names');
        const onlineSec = document.getElementById('section-online-lobby');
        const playBtn = document.getElementById('start-game-btn');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const mode = tab.dataset.mode;
                GameState.gameMode = mode;

                if (mode === 'single') {
                    Utils.show(singleSec);
                    Utils.hide(localSec);
                    Utils.hide(onlineSec);
                    if (playBtn) playBtn.textContent = 'PLAY VS COMPUTER';
                } else if (mode === 'local2p') {
                    Utils.hide(singleSec);
                    Utils.show(localSec);
                    Utils.hide(onlineSec);
                    if (playBtn) playBtn.textContent = 'START 2-PLAYER MATCH';
                } else if (mode === 'online') {
                    Utils.hide(singleSec);
                    Utils.hide(localSec);
                    Utils.show(onlineSec);
                    if (playBtn) playBtn.textContent = 'START ONLINE MATCH';
                }
            });
        });
    },

    setupOnlineLobby() {
        const hostBtn = document.getElementById('host-room-btn');
        const openJoinBtn = document.getElementById('open-join-card-btn');
        const joinCard = document.getElementById('join-room-card');
        const joinInput = document.getElementById('join-room-code-input');
        const joinConfirmBtn = document.getElementById('join-room-confirm-btn');
        const joinStatusElem = document.getElementById('join-status-text');

        if (hostBtn) {
            hostBtn.addEventListener('click', () => {
                const nameInput = document.getElementById('online-name-input');
                const pName = (nameInput?.value || '').trim() || 'Player 1';
                GameState.setStoredPlayerName(pName);
                GameState.localPlayerRole = 'p1';
                const balls = window.cricketGameApp?.selectedBalls || 12;
                GameState.init(balls, 10, GameState.MODE_ONLINE);

                hostBtn.disabled = true;
                hostBtn.textContent = '⌛ CREATING...';

                MultiplayerManager.hostRoom(pName, (code) => {
                    hostBtn.disabled = false;
                    hostBtn.textContent = '🏠 CREATE ROOM';
                    UIController.showScreen('onlineRoom');
                    UIController.updateOnlineRoomUI(code, true, pName, null, false, balls);
                }, (err) => {
                    hostBtn.disabled = false;
                    hostBtn.textContent = '🏠 CREATE ROOM';
                    alert(`Could not create room: ${err}`);
                });
            });
        }

        if (openJoinBtn) {
            openJoinBtn.addEventListener('click', () => {
                Utils.show(joinCard);
                if (joinInput) joinInput.focus();
            });
        }

        if (joinConfirmBtn) {
            joinConfirmBtn.addEventListener('click', () => {
                const code = (joinInput?.value || '').trim().toUpperCase();
                if (!code || code.length < 3) {
                    if (joinStatusElem) joinStatusElem.textContent = '⚠️ Enter a valid Room Code';
                    return;
                }
                const nameInput = document.getElementById('online-name-input');
                const pName = (nameInput?.value || '').trim() || 'Player 2';
                GameState.localPlayerRole = 'p2';
                GameState.init(12, 10, GameState.MODE_ONLINE);

                if (joinStatusElem) joinStatusElem.textContent = 'Connecting to host room...';
                joinConfirmBtn.disabled = true;

                MultiplayerManager.joinRoom(code, pName, () => {
                    joinConfirmBtn.disabled = false;
                    if (joinStatusElem) joinStatusElem.textContent = '';
                    UIController.showScreen('onlineRoom');
                    UIController.updateOnlineRoomUI(code, false, MultiplayerManager.remotePlayerName || 'Host', pName, true, 12);
                }, (err) => {
                    joinConfirmBtn.disabled = false;
                    if (joinStatusElem) joinStatusElem.textContent = `❌ ${err}`;
                });
            });
        }

        this.setupOnlineRoomScreenListeners();
    },

    setupOnlineRoomScreenListeners() {
        const copyBtn = document.getElementById('room-screen-copy-btn');
        const shareBtn = document.getElementById('room-screen-share-btn');
        const kickBtn = document.getElementById('room-kick-guest-btn');
        const leaveBtn = document.getElementById('room-leave-btn');
        const startBtn = document.getElementById('room-start-match-btn');
        const oversSelector = document.getElementById('room-overs-selector');

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const code = MultiplayerManager.roomCode;
                if (code) {
                    navigator.clipboard?.writeText(code);
                    copyBtn.textContent = '✅ COPIED!';
                    setTimeout(() => copyBtn.textContent = '📋 COPY CODE', 2000);
                }
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                const code = MultiplayerManager.roomCode;
                if (!code) return;
                const shareUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: 'Even/Odd Cricket Match Lobby',
                            text: `🏏 Join my Even/Odd Cricket Match room! Room ID: ${code}`,
                            url: shareUrl
                        });
                        return;
                    } catch (e) {
                        // fallback to clipboard
                    }
                }
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(shareUrl);
                    shareBtn.textContent = '✅ LINK COPIED!';
                    setTimeout(() => shareBtn.textContent = '📲 SHARE INVITE', 2500);
                }
            });
        }

        if (kickBtn) {
            kickBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to kick this player from the room?')) {
                    MultiplayerManager.kickPlayer();
                }
            });
        }

        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => {
                const isHost = MultiplayerManager.isHost;
                const msg = isHost ? 'Leaving will terminate and close this room for everyone. Continue?' : 'Leave this match room?';
                if (confirm(msg)) {
                    MultiplayerManager.closeRoom();
                    UIController.showScreen('menu');
                }
            });
        }

        if (oversSelector) {
            oversSelector.querySelectorAll('.btn-ball-count').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if (!MultiplayerManager.isHost) return;
                    const balls = parseInt(e.target.dataset.balls) || 12;
                    if (window.cricketGameApp) {
                        window.cricketGameApp.selectedBalls = balls;
                    }
                    oversSelector.querySelectorAll('.btn-ball-count').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    if (MultiplayerManager.isConnected) {
                        MultiplayerManager.send(MultiplayerManager.EVENTS.SETTINGS_SYNC, { balls });
                    }
                });
            });
        }

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (!MultiplayerManager.isHost || !MultiplayerManager.isConnected) return;
                if (window.cricketGameApp) {
                    window.cricketGameApp.startTossSequence();
                }
            });
        }
    },

    updateMenuProfile() {
        const nameInput = document.getElementById('player-name-input');
        const p1Input = document.getElementById('p1-name-input');
        const p2Input = document.getElementById('p2-name-input');
        const onlineInput = document.getElementById('online-name-input');

        if (nameInput) {
            nameInput.value = GameState.getStoredPlayerName();
            nameInput.addEventListener('input', (e) => {
                GameState.setStoredPlayerName(e.target.value);
            });
        }

        if (p1Input) {
            p1Input.value = GameState.getStoredP1Name();
            p1Input.addEventListener('input', (e) => {
                GameState.setStoredP1Name(e.target.value);
            });
        }

        if (p2Input) {
            p2Input.value = GameState.getStoredP2Name();
            p2Input.addEventListener('input', (e) => {
                GameState.setStoredP2Name(e.target.value);
            });
        }

        if (onlineInput) {
            onlineInput.value = GameState.getStoredPlayerName();
            onlineInput.addEventListener('input', (e) => {
                GameState.setStoredPlayerName(e.target.value);
            });
        }

        const highScore = GameState.getHighScore();
        const highScoreValElem = document.getElementById('menu-high-score-val');
        const highScoreHolderElem = document.getElementById('menu-high-score-holder');

        if (highScoreValElem) {
            highScoreValElem.textContent = `${highScore.runs} Runs`;
        }
        if (highScoreHolderElem) {
            highScoreHolderElem.textContent = highScore.runs > 0 ? `Held by: ${highScore.holder}` : 'No records set yet!';
        }
    },

    cacheElements() {
        this.screens = {
            menu: document.getElementById('menu-screen'),
            howToPlay: document.getElementById('how-to-play-screen'),
            settings: document.getElementById('settings-screen'),
            onlineRoom: document.getElementById('online-room-screen'),
            toss: document.getElementById('toss-screen'),
            inningsBreak: document.getElementById('innings-break-screen'),
            game: document.getElementById('game-screen'),
            pause: document.getElementById('pause-screen'),
            result: document.getElementById('result-screen')
        };
    },

    showScreen(screenName) {
        Object.keys(this.screens).forEach(key => {
            const screen = this.screens[key];
            if (screen) {
                Utils.removeClass(screen, 'active');
            }
        });

        if (this.screens[screenName]) {
            Utils.addClass(this.screens[screenName], 'active');
            if (screenName === 'game' && window.CanvasRenderer) {
                setTimeout(() => {
                    CanvasRenderer.resize();
                }, 30);
            }
        }
    },

    /**
     * Updates Dedicated Online Room UI
     */
    updateOnlineRoomUI(roomCode, isHost, hostName, guestName, isGuestConnected, selectedBalls = 12) {
        const codeElem = document.getElementById('room-screen-code');
        const roleBadge = document.getElementById('online-room-role-badge');
        const hostNameElem = document.getElementById('room-host-name');
        const guestNameElem = document.getElementById('room-guest-name');
        const guestAvatar = document.getElementById('room-guest-avatar');
        const guestStatus = document.getElementById('room-guest-status');
        const kickBtn = document.getElementById('room-kick-guest-btn');
        const startBtn = document.getElementById('room-start-match-btn');
        const statusDesc = document.getElementById('room-status-desc');
        const oversSelector = document.getElementById('room-overs-selector');
        const authorityBadge = document.getElementById('room-settings-authority');

        if (codeElem) codeElem.textContent = roomCode || 'CRIC-XXXX';
        if (roleBadge) roleBadge.textContent = isHost ? '👑 HOST LOBBY' : '🎮 CHALLENGER LOBBY';
        if (hostNameElem) hostNameElem.textContent = hostName || 'Host';

        if (authorityBadge) {
            authorityBadge.textContent = isHost ? 'CONFIGURED BY YOU (HOST)' : `CONFIGURED BY ${(hostName || 'HOST').toUpperCase()}`;
        }

        if (oversSelector) {
            const btns = oversSelector.querySelectorAll('.btn-ball-count');
            btns.forEach(btn => {
                const balls = parseInt(btn.dataset.balls);
                btn.classList.toggle('active', balls === selectedBalls);
                btn.style.pointerEvents = isHost ? 'auto' : 'none';
                btn.style.opacity = isHost ? '1' : (balls === selectedBalls ? '1' : '0.5');
            });
        }

        if (isGuestConnected) {
            if (guestNameElem) guestNameElem.textContent = guestName || 'Player 2';
            if (guestAvatar) guestAvatar.textContent = '🎮';
            if (guestStatus) {
                guestStatus.className = 'slot-status-badge ready-badge';
                guestStatus.textContent = 'READY ✅';
            }
            if (kickBtn) {
                if (isHost) {
                    Utils.show(kickBtn);
                } else {
                    Utils.hide(kickBtn);
                }
            }
            if (statusDesc) statusDesc.textContent = `${guestName || 'Opponent'} is in the room! Ready to play.`;
            if (startBtn) {
                if (isHost) {
                    startBtn.disabled = false;
                    startBtn.textContent = '🚀 START COIN TOSS';
                    startBtn.classList.add('btn-pulse');
                } else {
                    startBtn.disabled = true;
                    startBtn.textContent = '⏳ WAITING FOR HOST TO START...';
                    startBtn.classList.remove('btn-pulse');
                }
            }
        } else {
            if (guestNameElem) guestNameElem.textContent = 'Waiting for opponent...';
            if (guestAvatar) guestAvatar.textContent = '⏳';
            if (guestStatus) {
                guestStatus.className = 'slot-status-badge waiting-badge';
                guestStatus.textContent = 'WAITING';
            }
            if (kickBtn) Utils.hide(kickBtn);
            if (statusDesc) statusDesc.textContent = 'Share the Room Code or Invite Link with a friend...';
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.textContent = isHost ? '⏳ WAITING FOR OPPONENT TO JOIN...' : '⏳ CONNECTING TO HOST...';
                startBtn.classList.remove('btn-pulse');
            }
        }
    },

    /**
     * Updates the full in-game HUD scoreboard
     */
    updateScoreboard() {
        const battingTeam = GameState.getBattingTeamState();
        const bowlingTeam = GameState.getBowlingTeamState();
        const nextBallNumber = battingTeam.deliveriesBowled + 1;
        const preference = battingTeam.preferredType || 'odd';
        const isPref = GameState.isPreferredBall(nextBallNumber, preference);

        // Core score
        const runsElem = document.getElementById('current-runs');
        const wktsElem = document.getElementById('current-wickets');
        const ballsLeftElem = document.getElementById('balls-left');
        const battingTeamElem = document.getElementById('batting-team-name');
        const inningBadgeElem = document.getElementById('inning-badge');

        if (runsElem) runsElem.textContent = battingTeam.runs;
        if (wktsElem) wktsElem.textContent = battingTeam.wickets;
        if (ballsLeftElem) ballsLeftElem.textContent = GameState.match.remainingBalls;
        if (battingTeamElem) battingTeamElem.textContent = battingTeam.name.toUpperCase();
        if (inningBadgeElem) inningBadgeElem.textContent = `INNINGS ${GameState.match.currentInning}`;

        // Determine if local user controls batting this turn
        let isHumanBattingThisTurn = false;
        if (GameState.gameMode === GameState.MODE_LOCAL_2P) {
            isHumanBattingThisTurn = true;
        } else if (GameState.gameMode === GameState.MODE_ONLINE) {
            isHumanBattingThisTurn = (GameState.localPlayerRole === 'p1' ? GameState.player.isBatting : GameState.computer.isBatting);
        } else {
            isHumanBattingThisTurn = GameState.player.isBatting;
        }

        // Mid-pitch indicator overlay
        const aiOverlay = document.getElementById('ai-batting-overlay');
        if (aiOverlay) {
            if (!isHumanBattingThisTurn) {
                const textElem = aiOverlay.querySelector('.ai-text');
                if (textElem) {
                    if (GameState.gameMode === GameState.MODE_ONLINE) {
                        textElem.textContent = `${battingTeam.name.toUpperCase()} IS BATTING...`;
                    } else {
                        textElem.textContent = 'COMPUTER IS PLAYING...';
                    }
                }
                Utils.show(aiOverlay);
            } else {
                Utils.hide(aiOverlay);
            }
        }

        // Ball badge (Preferred vs Non-preferred) with strategic prompt
        const ballBadgeElem = document.getElementById('ball-badge');
        const swingBtn = document.getElementById('swing-bat-btn');
        const defendBtn = document.getElementById('defend-bat-btn');
        const swingTag = document.getElementById('swing-tag');
        const defendTag = document.getElementById('defend-tag');

        if (ballBadgeElem) {
            if (isHumanBattingThisTurn) {
                if (isPref) {
                    ballBadgeElem.className = 'ball-badge preferred pulse-gold';
                    ballBadgeElem.innerHTML = `★ BALL #${nextBallNumber} (PREFERRED: ${preference.toUpperCase()}) — ATTACK FOR +1 BONUS! ★`;
                    
                    if (swingBtn) {
                        swingBtn.classList.add('recommended-glow-gold');
                        swingBtn.classList.remove('recommended-glow-blue');
                    }
                    if (defendBtn) {
                        defendBtn.classList.remove('recommended-glow-gold', 'recommended-glow-blue');
                    }
                    if (swingTag) swingTag.textContent = '+1 BONUS';
                    if (defendTag) defendTag.textContent = 'DOT (-1)';
                } else {
                    ballBadgeElem.className = 'ball-badge not-preferred';
                    ballBadgeElem.innerHTML = `◇ BALL #${nextBallNumber} (NON-PREFERRED) — DEFEND TO PLAY SAFE ◇`;
                    
                    if (defendBtn) {
                        defendBtn.classList.add('recommended-glow-blue');
                        defendBtn.classList.remove('recommended-glow-gold');
                    }
                    if (swingBtn) {
                        swingBtn.classList.remove('recommended-glow-gold', 'recommended-glow-blue');
                    }
                    if (defendTag) defendTag.textContent = 'SAFE (0)';
                    if (swingTag) swingTag.textContent = 'HIT (-1)';
                }
            } else {
                // Non-local batting
                if (isPref) {
                    ballBadgeElem.className = 'ball-badge preferred';
                    ballBadgeElem.innerHTML = `★ BALL #${nextBallNumber}: ${battingTeam.name.toUpperCase()}'S PREFERRED (${preference.toUpperCase()}) ★`;
                } else {
                    ballBadgeElem.className = 'ball-badge not-preferred';
                    ballBadgeElem.innerHTML = `◇ BALL #${nextBallNumber}: ${battingTeam.name.toUpperCase()}'S NON-PREFERRED ◇`;
                }
            }
        }

        // Synchronize Batting Controls Panel visibility & disabled state
        const controlPanel = document.querySelector('.batting-control-panel');
        if (controlPanel) {
            controlPanel.style.display = isHumanBattingThisTurn ? 'flex' : 'none';
        }
        if (swingBtn) swingBtn.disabled = !isHumanBattingThisTurn;
        if (defendBtn) defendBtn.disabled = !isHumanBattingThisTurn;

        // Notify Canvas Renderer for subtle on-crease visual aura
        if (window.CanvasRenderer) {
            CanvasRenderer.state.isPreferredBall = isPref && isHumanBattingThisTurn;
        }

        // Target display (Innings 2)
        const targetDisplayElem = document.getElementById('target-display');
        if (targetDisplayElem) {
            if (GameState.match.currentInning === 2 && GameState.match.target !== null) {
                const needed = Math.max(0, GameState.match.target - battingTeam.runs);
                targetDisplayElem.innerHTML = `<span>Target: <strong>${GameState.match.target}</strong></span> | <span>Need: <strong class="highlight-target">${needed}</strong> off ${GameState.match.remainingBalls}b</span>`;
                Utils.show(targetDisplayElem);
            } else {
                Utils.hide(targetDisplayElem);
            }
        }

        // Stats ticker
        const bonusTicker = document.getElementById('bonus-count');
        const penaltyTicker = document.getElementById('penalty-count');
        if (bonusTicker) bonusTicker.textContent = `+${battingTeam.bonusEarned}`;
        if (penaltyTicker) penaltyTicker.textContent = `-${battingTeam.penaltyLost}`;
    },

    /**
     * Shows a commentary message toast
     */
    showCommentary(message, type = 'info') {
        const commentaryElem = document.getElementById('commentary-text');
        if (commentaryElem) {
            commentaryElem.textContent = message;
            commentaryElem.className = `commentary-text ${type}`;
        }
    },

    /**
     * Animate Toss Coin Flip
     */
    async animateToss(winner, playerPreference, onComplete) {
        const coin = document.getElementById('coin-animation');
        const tossResultElem = document.getElementById('toss-result');
        const tossWinnerText = document.getElementById('toss-winner-text');
        const choiceBtns = document.getElementById('toss-choice-buttons');
        const ballCountSection = document.getElementById('ball-count-selection');

        Utils.hide(tossResultElem);
        Utils.addClass(coin, 'flipping');
        Utils.playSound('coin-flip');

        await Utils.wait(1400);

        Utils.removeClass(coin, 'flipping');
        Utils.show(tossResultElem);

        if (GameState.gameMode === GameState.MODE_LOCAL_2P) {
            const winnerName = winner === 'player' ? GameState.player.name : GameState.computer.name;
            tossWinnerText.innerHTML = `
                <div class="toss-winner-banner user-win">
                    <span class="toss-winner-icon">👑</span>
                    <span class="toss-winner-headline">${winnerName.toUpperCase()} WON THE TOSS!</span>
                </div>
                <div class="toss-details-card">
                    <div class="toss-detail-row">
                        <span class="toss-detail-label">🏏 ACTION:</span>
                        <span class="toss-detail-value">${winnerName.toUpperCase()} BATS FIRST</span>
                    </div>
                    <div class="toss-prompt-lead">CHOOSE YOUR BATTING BALL PREFERENCE:</div>
                </div>
            `;
            Utils.show(choiceBtns);
            Utils.hide(ballCountSection);
        } else if (GameState.gameMode === GameState.MODE_ONLINE) {
            const isLocalWinner = (winner === GameState.localPlayerRole);
            const opponentName = MultiplayerManager.remotePlayerName || 'Opponent';
            tossWinnerText.innerHTML = `
                <div class="toss-winner-banner ${isLocalWinner ? 'user-win' : 'comp-win'}">
                    <span class="toss-winner-icon">${isLocalWinner ? '🎉' : '🪙'}</span>
                    <span class="toss-winner-headline">${isLocalWinner ? 'YOU WON THE TOSS!' : opponentName.toUpperCase() + ' WON THE TOSS!'}</span>
                </div>
                <div class="toss-details-card">
                    <div class="toss-detail-row">
                        <span class="toss-detail-label">🏏 ACTION:</span>
                        <span class="toss-detail-value">${isLocalWinner ? 'YOU WILL BAT FIRST!' : opponentName.toUpperCase() + ' BATS FIRST!'}</span>
                    </div>
                    <div class="toss-prompt-lead">${isLocalWinner ? 'CHOOSE YOUR BATTING BALL PREFERENCE:' : 'WAITING FOR OPPONENT TO CHOOSE PREFERENCE & OVERS...'}</div>
                </div>
            `;
            if (isLocalWinner) {
                Utils.show(choiceBtns);
                Utils.hide(ballCountSection);
            } else {
                Utils.hide(choiceBtns);
                Utils.hide(ballCountSection);
            }
        } else {
            // Single Player (vs Computer)
            if (winner === 'player') {
                tossWinnerText.innerHTML = `
                    <div class="toss-winner-banner user-win">
                        <span class="toss-winner-icon">🎉</span>
                        <span class="toss-winner-headline">YOU WON THE TOSS!</span>
                    </div>
                    <div class="toss-details-card">
                        <div class="toss-detail-row">
                            <span class="toss-detail-label">🏏 ACTION:</span>
                            <span class="toss-detail-value">YOU WILL BAT FIRST</span>
                        </div>
                        <div class="toss-prompt-lead">CHOOSE YOUR BATTING BALL PREFERENCE:</div>
                    </div>
                `;
                Utils.show(choiceBtns);
                Utils.hide(ballCountSection);
            } else {
                const compPref = Math.random() < 0.5 ? 'even' : 'odd';
                const userPref = compPref === 'even' ? 'odd' : 'even';
                if (window.cricketGameApp) {
                    window.cricketGameApp.selectedPreference = compPref;
                }
                tossWinnerText.innerHTML = `
                    <div class="toss-winner-banner comp-win">
                        <span class="toss-winner-icon">🤖</span>
                        <span class="toss-winner-headline">COMPUTER WON THE TOSS!</span>
                    </div>
                    <div class="toss-details-card">
                        <div class="toss-detail-row">
                            <span class="toss-detail-label">🏏 BATTING:</span>
                            <span class="toss-detail-value">COMPUTER BATS 1ST</span>
                        </div>
                        <div class="toss-detail-row">
                            <span class="toss-detail-label">★ COMPUTER PREF:</span>
                            <span class="toss-detail-badge pref-gold">${compPref.toUpperCase()} BALLS (${compPref === 'even' ? '2, 4, 6...' : '1, 3, 5...'})</span>
                        </div>
                        <div class="toss-detail-row">
                            <span class="toss-detail-label">🛡️ YOUR PREF:</span>
                            <span class="toss-detail-badge pref-blue">${userPref.toUpperCase()} BALLS (${userPref === 'even' ? '2, 4, 6...' : '1, 3, 5...'})</span>
                        </div>
                    </div>
                `;
                Utils.hide(choiceBtns);
                Utils.show(ballCountSection);
            }
        }

        if (onComplete) onComplete();
    },

    /**
     * Show Pause Summary
     */
    showPauseMenu() {
        const summaryElem = document.getElementById('pause-match-summary');
        const batting = GameState.getBattingTeamState();
        if (summaryElem) {
            summaryElem.innerHTML = `
                <div class="pause-stat-row"><strong>Innings:</strong> ${GameState.match.currentInning}</div>
                <div class="pause-stat-row"><strong>Batting:</strong> ${batting.name} (${batting.runs}/${batting.wickets})</div>
                <div class="pause-stat-row"><strong>Balls Remaining:</strong> ${GameState.match.remainingBalls}</div>
            `;
        }
        this.showScreen('pause');
    },

    /**
     * Show Innings Break / Target Chase Screen
     */
    showInningsBreakScreen(target, battingTeam, opponentTeam) {
        const titleElem = document.getElementById('break-title');
        const targetScoreElem = document.getElementById('break-target-score');
        const targetContextElem = document.getElementById('break-target-context');
        const prefValElem = document.getElementById('break-preference-val');
        const startBtn = document.getElementById('start-innings-2-btn');

        const preference = battingTeam.preferredType.toUpperCase();
        const prefExplanation = preference === 'EVEN' ? 'EVEN BALLS (2, 4, 6, 8...)' : 'ODD BALLS (1, 3, 5, 7...)';

        if (titleElem) {
            titleElem.textContent = `${battingTeam.name.toUpperCase()}'S TURN TO BAT!`;
        }

        if (targetScoreElem) {
            targetScoreElem.textContent = `${target} Runs`;
        }

        if (targetContextElem) {
            targetContextElem.textContent = `${opponentTeam.name} scored ${opponentTeam.runs}/${opponentTeam.wickets}. Need ${target} runs in ${GameState.match.initialBalls} balls to win!`;
        }

        // Populate Innings 1 Shot Breakdown
        const breakTitle = document.getElementById('break-breakdown-title');
        if (breakTitle) breakTitle.textContent = `${opponentTeam.name.toUpperCase()} SHOT BREAKDOWN`;
        const shots = opponentTeam.shots || { sixes: 0, fours: 0, threes: 0, twos: 0, ones: 0, dots: 0 };
        const el6 = document.getElementById('inn1-sixes');
        const el4 = document.getElementById('inn1-fours');
        const el3 = document.getElementById('inn1-threes');
        const el2 = document.getElementById('inn1-twos');
        const el1 = document.getElementById('inn1-ones');
        const el0 = document.getElementById('inn1-dots');
        if (el6) el6.textContent = shots.sixes || 0;
        if (el4) el4.textContent = shots.fours || 0;
        if (el3) el3.textContent = shots.threes || 0;
        if (el2) el2.textContent = shots.twos || 0;
        if (el1) el1.textContent = shots.ones || 0;
        if (el0) el0.textContent = shots.dots || 0;

        if (prefValElem) {
            prefValElem.textContent = prefExplanation;
        }

        if (startBtn) {
            startBtn.textContent = `🏏 START INNINGS 2 (${battingTeam.name.toUpperCase()} CHASES TARGET)`;
        }

        this.showScreen('inningsBreak');
        Utils.playSound('bonus');
    },

    /**
     * Show final match result scorecard
     */
    showMatchResult() {
        const titleElem = document.getElementById('result-title');
        const messageElem = document.getElementById('result-message');
        const pScoreElem = document.getElementById('final-player-score');
        const cScoreElem = document.getElementById('final-opponent-score');
        const ballsElem = document.getElementById('final-total-balls');

        const winnerTeam = GameState.match.winner ? GameState[GameState.match.winner] : null;

        if (titleElem) {
            if (GameState.match.isTie) {
                titleElem.textContent = '🤝 MATCH TIED';
            } else if (winnerTeam) {
                titleElem.textContent = `🏆 ${winnerTeam.name.toUpperCase()} WINS!`;
            } else {
                titleElem.textContent = '🏏 MATCH OVER';
            }
        }

        if (messageElem) {
            messageElem.textContent = GameState.match.resultDescription;
            messageElem.className = `result-message ${GameState.match.winner === 'player' ? 'win' : (GameState.match.isTie ? '' : 'lose')}`;
        }

        if (pScoreElem) {
            const pLabel = pScoreElem.parentElement.querySelector('.stat-label');
            if (pLabel) pLabel.textContent = `${GameState.player.name}:`;
            pScoreElem.textContent = `${GameState.player.runs}/${GameState.player.wickets} (${GameState.player.deliveriesBowled}b, +${GameState.player.bonusEarned}/-${GameState.player.penaltyLost})`;
        }

        if (cScoreElem) {
            const cLabel = cScoreElem.parentElement.querySelector('.stat-label');
            if (cLabel) cLabel.textContent = `${GameState.computer.name}:`;
            cScoreElem.textContent = `${GameState.computer.runs}/${GameState.computer.wickets} (${GameState.computer.deliveriesBowled}b, +${GameState.computer.bonusEarned}/-${GameState.computer.penaltyLost})`;
        }

        // Final Shot Breakdowns
        const p1ShotsName = document.getElementById('final-p1-shots-name');
        const p2ShotsName = document.getElementById('final-p2-shots-name');
        if (p1ShotsName) p1ShotsName.textContent = `${GameState.player.name.toUpperCase()} SHOTS & BOUNDARIES`;
        if (p2ShotsName) p2ShotsName.textContent = `${GameState.computer.name.toUpperCase()} SHOTS & BOUNDARIES`;

        const p1s = GameState.player.shots || { sixes: 0, fours: 0, threes: 0, twos: 0, ones: 0, dots: 0 };
        const p2s = GameState.computer.shots || { sixes: 0, fours: 0, threes: 0, twos: 0, ones: 0, dots: 0 };

        const setP1 = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || 0; };
        const setP2 = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || 0; };

        setP1('final-p1-sixes', p1s.sixes);
        setP1('final-p1-fours', p1s.fours);
        setP1('final-p1-threes', p1s.threes);
        setP1('final-p1-twos', p1s.twos);
        setP1('final-p1-ones', p1s.ones);
        setP1('final-p1-dots', p1s.dots);

        setP2('final-p2-sixes', p2s.sixes);
        setP2('final-p2-fours', p2s.fours);
        setP2('final-p2-threes', p2s.threes);
        setP2('final-p2-twos', p2s.twos);
        setP2('final-p2-ones', p2s.ones);
        setP2('final-p2-dots', p2s.dots);

        if (ballsElem) {
            ballsElem.textContent = GameState.match.initialBalls;
        }

        // Check & Save High Score (for local player)
        const isNewRecord = GameState.saveHighScore(GameState.player.runs, GameState.player.name, GameState.match.initialBalls);
        const highScore = GameState.getHighScore();
        const highScoreElem = document.getElementById('final-high-score');

        if (highScoreElem) {
            highScoreElem.textContent = `${highScore.runs} Runs (by ${highScore.holder})`;
        }

        if (isNewRecord && GameState.player.runs > 0) {
            if (messageElem) {
                messageElem.innerHTML = `🎉 <strong>NEW PERSONAL HIGH SCORE!</strong><br>${GameState.match.resultDescription}`;
                messageElem.className = 'result-message win record-break';
            }
            if (window.CanvasRenderer) {
                CanvasRenderer.addConfetti(CanvasRenderer.width / 2, CanvasRenderer.height / 2);
            }
            Utils.playSound('bonus');
        }

        this.updateMenuProfile();
        this.showScreen('result');

        if (GameState.match.winner === 'player' || isNewRecord) {
            Utils.playSound('cheer');
        }
    },

    loadSettings() {
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.checked = Utils.getSetting('soundEnabled', 'true') === 'true';
            soundToggle.addEventListener('change', (e) => {
                Utils.saveSetting('soundEnabled', e.target.checked);
            });
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}
