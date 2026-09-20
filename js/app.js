// ===================================
// MAIN APPLICATION & GAME CONTROLLER
// Interactive Doodle Cricket Game Loop with Pause Feature
// ===================================

class CricketGameApp {
    constructor() {
        this.isProcessingBall = false;
        this.bowlerDeliveryPromise = null;
        this.deliveryActive = false;
        this.isPaused = false;
        this.contactWindow = { start: 0, target: 0, duration: 0 };
        this.selectedPreference = 'odd';
        this.selectedBalls = 12;

        this.init();
    }

    init() {
        UIController.init();
        AnimationController.init();
        this.setupEventListeners();
        this.setupMultiplayerListeners();
        this.checkInviteUrl();
        UIController.showScreen('menu');
        console.log('Cricket Game initialized with Local 2P & Online Room Multiplayer!');
    }

    checkInviteUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('room') || window.location.hash.replace('#room=', '').replace('#', '').trim();
        if (roomCode && roomCode.length >= 3) {
            setTimeout(() => {
                const onlineTab = document.querySelector('.mode-tab[data-mode="online"]');
                onlineTab?.click();
                const openJoinBtn = document.getElementById('open-join-card-btn');
                openJoinBtn?.click();
                const joinInput = document.getElementById('join-room-code-input');
                if (joinInput) {
                    joinInput.value = roomCode.toUpperCase();
                }
                const joinConfirmBtn = document.getElementById('join-room-confirm-btn');
                joinConfirmBtn?.click();
            }, 300);
        }
    }

    setupEventListeners() {
        // Navigation Buttons
        document.getElementById('start-game-btn')?.addEventListener('click', () => this.handlePlayButtonClick());
        document.getElementById('how-to-play-btn')?.addEventListener('click', () => UIController.showScreen('howToPlay'));
        document.getElementById('settings-btn')?.addEventListener('click', () => UIController.showScreen('settings'));
        document.getElementById('back-from-help-btn')?.addEventListener('click', () => UIController.showScreen('menu'));
        document.getElementById('back-from-settings-btn')?.addEventListener('click', () => UIController.showScreen('menu'));
        document.getElementById('play-again-btn')?.addEventListener('click', () => this.handlePlayButtonClick());
        document.getElementById('main-menu-btn')?.addEventListener('click', () => {
            if (GameState.gameMode === GameState.MODE_ONLINE) {
                MultiplayerManager.cleanup();
            }
            UIController.showScreen('menu');
        });

        // Pause / Resume Event Handlers
        document.getElementById('pause-game-btn')?.addEventListener('click', () => this.togglePause());
        document.getElementById('resume-game-btn')?.addEventListener('click', () => this.togglePause());
        document.getElementById('restart-match-btn')?.addEventListener('click', () => {
            this.isPaused = false;
            this.startMatchWithSettings();
        });
        document.getElementById('pause-main-menu-btn')?.addEventListener('click', () => {
            this.isPaused = false;
            if (GameState.gameMode === GameState.MODE_ONLINE) {
                MultiplayerManager.cleanup();
            }
            UIController.showScreen('menu');
        });

        // Innings 2 Start Button
        document.getElementById('start-innings-2-btn')?.addEventListener('click', () => {
            if (GameState.gameMode === GameState.MODE_ONLINE && MultiplayerManager.isConnected) {
                MultiplayerManager.send(MultiplayerManager.EVENTS.INNINGS_2_START, {});
            }
            this.launchInnings2();
        });

        // Toss Preference Buttons (Even / Odd)
        document.querySelectorAll('.btn-toss-choice').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const choice = e.currentTarget.dataset.choice || e.target.dataset.choice;
                this.selectedPreference = choice;
                // Transition to ball count selection
                Utils.hide(document.getElementById('toss-choice-buttons'));
                Utils.show(document.getElementById('ball-count-selection'));
            });
        });

        // Ball Count Selection Buttons (6, 12, 18, 24 Balls)
        document.querySelectorAll('.btn-ball-count').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const balls = parseInt(e.target.dataset.balls) || 12;
                this.selectedBalls = balls;

                if (GameState.gameMode === GameState.MODE_ONLINE && MultiplayerManager.isConnected) {
                    MultiplayerManager.send(MultiplayerManager.EVENTS.TOSS_CHOICE, {
                        preference: this.selectedPreference,
                        balls: this.selectedBalls,
                        winner: GameState.toss.winner
                    });
                }

                this.startMatchWithSettings();
            });
        });

        // Interactive Batting Actions
        document.getElementById('swing-bat-btn')?.addEventListener('click', () => this.handlePlayerBattingAction(false));
        document.getElementById('defend-bat-btn')?.addEventListener('click', () => this.handlePlayerBattingAction(true));

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P' || e.code === 'Escape') {
                if (GameState.currentPhase === GameState.PHASE_INNINGS_1 || GameState.currentPhase === GameState.PHASE_INNINGS_2 || this.isPaused) {
                    e.preventDefault();
                    this.togglePause();
                    return;
                }
            }

            if (!this.isPaused && (GameState.currentPhase === GameState.PHASE_INNINGS_1 || GameState.currentPhase === GameState.PHASE_INNINGS_2)) {
                if (this.isLocalPlayerBatting() && !this.isProcessingBall) {
                    if (e.code === 'Space' || e.key === ' ') {
                        e.preventDefault();
                        this.handlePlayerBattingAction(false);
                    } else if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D') {
                        e.preventDefault();
                        this.handlePlayerBattingAction(true);
                    }
                }
            }
        });
    }

    setupMultiplayerListeners() {
        MultiplayerManager.on(MultiplayerManager.EVENTS.ROOM_JOINED, (data) => {
            console.log('Opponent joined the room:', data.name);
            UIController.updateOnlineRoomUI(MultiplayerManager.roomCode, MultiplayerManager.isHost, MultiplayerManager.localPlayerName, data.name, true, this.selectedBalls);
        });

        MultiplayerManager.on(MultiplayerManager.EVENTS.LOBBY_READY, (data) => {
            console.log('Lobby ready with host:', data.hostName);
            UIController.updateOnlineRoomUI(MultiplayerManager.roomCode, false, data.hostName, MultiplayerManager.localPlayerName, true, this.selectedBalls);
        });

        MultiplayerManager.on(MultiplayerManager.EVENTS.SETTINGS_SYNC, (data) => {
            console.log('Host updated overs:', data.balls);
            this.selectedBalls = data.balls;
            UIController.updateOnlineRoomUI(MultiplayerManager.roomCode, false, MultiplayerManager.remotePlayerName, MultiplayerManager.localPlayerName, true, data.balls);
        });

        MultiplayerManager.on(MultiplayerManager.EVENTS.KICK_PLAYER, (data) => {
            alert(data.message || 'You have been removed from the room by the host.');
            UIController.showScreen('menu');
        });

        MultiplayerManager.on(MultiplayerManager.EVENTS.ROOM_CLOSED, (data) => {
            alert(data.message || 'The host has closed the room.');
            UIController.showScreen('menu');
        });

        MultiplayerManager.on(MultiplayerManager.EVENTS.START_TOSS, (data) => {
            this.selectedBalls = data.balls || 12;
            GameState.init(this.selectedBalls, 10, GameState.MODE_ONLINE);
            GameState.toss.winner = data.winner;
            UIController.showScreen('toss');
            UIController.animateToss(data.winner, 'odd');
        });

        MultiplayerManager.on(MultiplayerManager.EVENTS.TOSS_CHOICE, (data) => {
            this.selectedPreference = data.preference;
            this.selectedBalls = data.balls;
            GameState.toss.winner = data.winner;
            this.startMatchWithSettings();
        });

        MultiplayerManager.on(MultiplayerManager.EVENTS.DELIVERY_START, (data) => {
            this.executeBowlerDelivery(data.speed, data.variation);
        });

        MultiplayerManager.on(MultiplayerManager.EVENTS.BAT_ACTION, async (data) => {
            if (this.deliveryActive && !this.isProcessingBall) {
                this.isProcessingBall = true;
                this.deliveryActive = false;
                AnimationController.animateBatSwing(data.isDefensive ? 'defend' : 'swing');
                const outcome = GameLogic.calculateShotOutcome(data.timingOffset, data.isDefensive);
                await this.resolveDeliveryOutcome(outcome);
            }
        });

        MultiplayerManager.on(MultiplayerManager.EVENTS.INNINGS_2_START, () => {
            this.launchInnings2();
        });

        MultiplayerManager.on(MultiplayerManager.EVENTS.OPPONENT_DISCONNECTED, (data) => {
            if (MultiplayerManager.isHost && (!GameState.currentPhase || GameState.currentPhase === GameState.PHASE_MENU)) {
                UIController.updateOnlineRoomUI(MultiplayerManager.roomCode, true, MultiplayerManager.localPlayerName, null, false, this.selectedBalls);
            } else {
                UIController.showCommentary('⚠️ Opponent disconnected from the match!', 'penalty');
            }
        });
    }

    handlePlayButtonClick() {
        if (GameState.gameMode === GameState.MODE_ONLINE) {
            if (!MultiplayerManager.isConnected) {
                const joinCard = document.getElementById('join-room-card');
                const hostCard = document.getElementById('host-room-card');
                if (joinCard && !joinCard.classList.contains('hidden')) {
                    document.getElementById('join-room-confirm-btn')?.click();
                } else if (hostCard && !hostCard.classList.contains('hidden')) {
                    UIController.showCommentary('Waiting for an opponent to join with your Room Code!');
                } else {
                    document.getElementById('host-room-btn')?.click();
                }
                return;
            }
        }
        this.startTossSequence();
    }

    isLocalPlayerBatting() {
        if (GameState.gameMode === GameState.MODE_LOCAL_2P) {
            return true; // Both innings are human-controlled in Local 2P
        } else if (GameState.gameMode === GameState.MODE_ONLINE) {
            return GameState.localPlayerRole === 'p1' ? GameState.player.isBatting : GameState.computer.isBatting;
        } else {
            return GameState.player.isBatting;
        }
    }

    togglePause() {
        if (GameState.gameMode === GameState.MODE_ONLINE) return; // Online matches cannot be paused
        if (GameState.currentPhase !== GameState.PHASE_INNINGS_1 && GameState.currentPhase !== GameState.PHASE_INNINGS_2 && !this.isPaused) {
            return;
        }

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            UIController.showPauseMenu();
        } else {
            UIController.showScreen('game');
            UIController.updateScoreboard();
            if (!this.deliveryActive && !this.isProcessingBall) {
                this.startNextDelivery();
            }
        }
    }

    startTossSequence() {
        this.isPaused = false;

        if (GameState.gameMode === GameState.MODE_LOCAL_2P) {
            const p1 = document.getElementById('p1-name-input')?.value || 'Player 1';
            const p2 = document.getElementById('p2-name-input')?.value || 'Player 2';
            GameState.setStoredP1Name(p1);
            GameState.setStoredP2Name(p2);
            GameState.init(this.selectedBalls, 10, GameState.MODE_LOCAL_2P);
            UIController.showScreen('toss');

            const tossWinner = Math.random() < 0.5 ? 'player' : 'computer';
            GameState.toss.winner = tossWinner;
            UIController.animateToss(tossWinner, 'odd');
        } else if (GameState.gameMode === GameState.MODE_ONLINE) {
            GameState.init(this.selectedBalls, 10, GameState.MODE_ONLINE);
            UIController.showScreen('toss');

            if (MultiplayerManager.isHost) {
                const tossWinner = Math.random() < 0.5 ? 'p1' : 'p2';
                GameState.toss.winner = tossWinner;
                MultiplayerManager.send(MultiplayerManager.EVENTS.START_TOSS, {
                    winner: tossWinner,
                    balls: this.selectedBalls
                });
                UIController.animateToss(tossWinner, 'odd');
            }
        } else {
            // Single player vs AI
            const nameInput = document.getElementById('player-name-input');
            if (nameInput) {
                GameState.setStoredPlayerName(nameInput.value);
            }
            GameState.init(this.selectedBalls, 10, GameState.MODE_SINGLE);
            UIController.showScreen('toss');

            const tossWinner = Math.random() < 0.5 ? 'player' : 'computer';
            GameState.toss.winner = tossWinner;
            UIController.animateToss(tossWinner, 'odd');
        }
    }

    startMatchWithSettings() {
        this.isPaused = false;
        const tossWinner = GameState.toss.winner || 'player';
        const preference = this.selectedPreference || 'odd';
        const balls = this.selectedBalls || 12;

        GameState.match.initialBalls = balls;
        GameState.match.remainingBalls = balls;
        GameState.setToss(tossWinner, preference);

        UIController.showScreen('game');
        if (window.CanvasRenderer) {
            CanvasRenderer.resize();
        }
        UIController.updateScoreboard();

        const battingTeam = GameState.getBattingTeamState();
        UIController.showCommentary(`${battingTeam.name.toUpperCase()} is batting first! Preferred: ${battingTeam.preferredType.toUpperCase()}`);

        if (GameState.gameMode === GameState.MODE_ONLINE) {
            if (MultiplayerManager.isHost) {
                setTimeout(() => this.startNextDelivery(), 800);
            }
        } else {
            this.startNextDelivery();
        }
    }

    launchInnings2() {
        UIController.showScreen('game');
        if (window.CanvasRenderer) {
            setTimeout(() => CanvasRenderer.resize(), 40);
        }
        UIController.updateScoreboard();
        const battingTeam = GameState.getBattingTeamState();
        UIController.showCommentary(`INNINGS 2: ${battingTeam.name.toUpperCase()} batting! Preferred: ${battingTeam.preferredType.toUpperCase()}`);

        if (GameState.gameMode === GameState.MODE_ONLINE) {
            if (MultiplayerManager.isHost) {
                setTimeout(() => this.startNextDelivery(), 800);
            }
        } else {
            this.startNextDelivery();
        }
    }

    /**
     * Triggers the next bowler delivery in the active innings
     */
    async startNextDelivery() {
        if (this.isPaused || GameState.match.remainingBalls <= 0 || GameState.currentPhase === GameState.PHASE_RESULT) {
            return;
        }

        const variations = [
            { variation: 'standard', speed: 'medium' },
            { variation: 'standard', speed: 'fast' },
            { variation: 'inswinger', speed: 'fast' },
            { variation: 'outswinger', speed: 'medium' },
            { variation: 'bouncer', speed: 'fast' },
            { variation: 'yorker', speed: 'fast' },
            { variation: 'slower', speed: 'slow' },
            { variation: 'googly', speed: 'medium' }
        ];
        const chosen = variations[Math.floor(Math.random() * variations.length)];

        if (GameState.gameMode === GameState.MODE_ONLINE && MultiplayerManager.isConnected) {
            MultiplayerManager.send(MultiplayerManager.EVENTS.DELIVERY_START, {
                speed: chosen.speed,
                variation: chosen.variation
            });
        }

        this.executeBowlerDelivery(chosen.speed, chosen.variation);
    }

    async executeBowlerDelivery(chosenSpeed = 'medium', chosenVariation = 'standard') {
        this.isProcessingBall = false;
        this.deliveryActive = true;
        UIController.updateScoreboard();

        const cueMap = {
            bouncer: '🌪️ RISING BOUNCER!',
            yorker: '💨 EXPRESS YORKER!',
            slower: '🐢 DECEPTIVE SLOWER BALL!',
            inswinger: '🌀 SHARP IN-SWINGER!',
            outswinger: '💫 SNEAKY OUT-SWINGER!',
            googly: '🔮 TRICKY GOOGLY!',
            standard: chosenSpeed === 'fast' ? '⚡ EXPRESS SEAMER!' : '🎯 GOOD LENGTH DELIVERY'
        };
        const cueText = cueMap[chosenVariation] || '🎯 BOWLED!';
        UIController.showCommentary(cueText);

        const isHumanBatting = this.isLocalPlayerBatting();
        const swingBtn = document.getElementById('swing-bat-btn');
        const defendBtn = document.getElementById('defend-bat-btn');
        const controlPanel = document.querySelector('.batting-control-panel');

        if (controlPanel) {
            controlPanel.style.display = isHumanBatting ? 'flex' : 'none';
        }

        if (swingBtn) swingBtn.disabled = !isHumanBatting;
        if (defendBtn) defendBtn.disabled = !isHumanBatting;

        await Utils.wait(400);
        if (this.isPaused) return;

        const deliveryObj = AnimationController.startBowlerDelivery(chosenSpeed, chosenVariation);
        this.contactWindow = {
            startTime: deliveryObj.startTime,
            contactTime: deliveryObj.contactTime,
            duration: deliveryObj.duration
        };

        deliveryObj.promise.then(async () => {
            if (this.isPaused) return;

            if (isHumanBatting && this.deliveryActive && !this.isProcessingBall) {
                // Ball passed without shot -> DOT or Wicket
                await this.resolveDeliveryOutcome({ runs: 0, isWicket: Math.random() < 0.20, rating: 'MISSED', ratingText: '💨 BEATEN BY PACE' });
            } else if (!isHumanBatting && this.deliveryActive && !this.isProcessingBall && GameState.gameMode === GameState.MODE_SINGLE) {
                // AI is batting
                const aiOutcome = GameLogic.simulateAIBattingTurn();
                await this.resolveDeliveryOutcome(aiOutcome);
            }
        });
    }

    /**
     * Handle user click / tap on SWING or DEFEND
     */
    async handlePlayerBattingAction(isDefensive = false) {
        if (this.isPaused || !this.deliveryActive || this.isProcessingBall || !this.isLocalPlayerBatting()) return;

        this.isProcessingBall = true;
        this.deliveryActive = false;

        const currentTime = performance.now();
        const timingOffset = currentTime - this.contactWindow.contactTime;

        if (GameState.gameMode === GameState.MODE_ONLINE && MultiplayerManager.isConnected) {
            MultiplayerManager.send(MultiplayerManager.EVENTS.BAT_ACTION, {
                timingOffset,
                isDefensive
            });
        }

        // Animate bat swing
        AnimationController.animateBatSwing(isDefensive ? 'defend' : 'swing');

        // Evaluate shot outcome
        const outcome = GameLogic.calculateShotOutcome(timingOffset, isDefensive);
        await this.resolveDeliveryOutcome(outcome);
    }

    /**
     * Resolves ball outcome through rule matrix and triggers animations
     */
    async resolveDeliveryOutcome(outcome) {
        this.isProcessingBall = true;
        this.deliveryActive = false;

        // Process through Even/Odd GameLogic rule matrix
        const result = GameLogic.processDelivery(outcome.runs, outcome.isWicket);

        // Animate ball hit / wicket on Canvas
        await AnimationController.animateBallFlight(outcome.runs, outcome.isWicket);

        // Show floating bonus/penalty popup
        if (result.delta > 0) {
            AnimationController.showFloatingBadge(+1, `+1 BONUS BALL! (${outcome.ratingText})`);
        } else if (result.delta < 0) {
            AnimationController.showFloatingBadge(-1, `-1 PENALTY (${outcome.ratingText})`);
        } else {
            AnimationController.showFloatingBadge(0, `SAFE (0 PENALTY)`);
        }

        // Update UI
        UIController.updateScoreboard();
        UIController.showCommentary(result.commentary, result.delta > 0 ? 'bonus' : (result.delta < 0 ? 'penalty' : 'safe'));

        await Utils.wait(1200);
        if (this.isPaused) return;

        // Check Innings & Match Progression
        if (result.status === 'INNINGS_1_OVER') {
            await this.handleInningsBreak();
        } else if (result.status === 'MATCH_OVER') {
            GameState.finishMatch();
            UIController.showMatchResult();
        } else {
            if (GameState.gameMode === GameState.MODE_ONLINE) {
                if (MultiplayerManager.isHost) {
                    this.startNextDelivery();
                }
            } else {
                this.startNextDelivery();
            }
        }
    }

    async handleInningsBreak() {
        const inn1BattingKey = GameState.getCurrentBattingTeam();
        const inn1Score = GameState[inn1BattingKey].runs;
        const target = inn1Score + 1;
        const opponentTeam = { ...GameState[inn1BattingKey] };

        GameState.switchInnings();
        const newBatting = GameState.getBattingTeamState();

        UIController.updateScoreboard();
        UIController.showInningsBreakScreen(target, newBatting, opponentTeam);
    }
}

// Initialize application on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.cricketGameApp = new CricketGameApp();
});
