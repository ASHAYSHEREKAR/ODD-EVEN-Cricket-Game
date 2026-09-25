// ===================================
// GAME STATE MANAGEMENT
// Centralized state synced with Python engine
// ===================================

const GameState = {
    PHASE_MENU: 'menu',
    PHASE_HOW_TO_PLAY: 'howToPlay',
    PHASE_SETTINGS: 'settings',
    PHASE_TOSS: 'toss',
    PHASE_INNINGS_1: 'innings1',
    PHASE_INNINGS_BREAK: 'inningsBreak',
    PHASE_INNINGS_2: 'innings2',
    PHASE_RESULT: 'result',

    currentPhase: 'menu',

    MODE_SINGLE: 'single',
    MODE_LOCAL_2P: 'local2p',
    MODE_ONLINE: 'online',

    gameMode: 'single', // 'single' | 'local2p' | 'online'
    localPlayerRole: 'p1', // 'p1' (Host/P1) or 'p2' (Joiner/P2)
    difficulty: 'medium', // 'low' | 'medium' | 'high'

    toss: {
        winner: null,        // 'player' (p1) or 'computer' (p2)
        playerChoice: null,  // 'even' or 'odd'
        computerChoice: null // 'even' or 'odd'
    },

    match: {
        initialBalls: 12,
        remainingBalls: 12,
        currentInning: 1,    // 1 or 2
        target: null,
        maxWickets: 10,
        winner: null,
        isTie: false,
        resultDescription: ''
    },

    player: {
        name: 'Player 1',
        runs: 0,
        wickets: 0,
        deliveriesBowled: 0,
        bonusEarned: 0,
        penaltyLost: 0,
        nonPrefScoringStreak: 0,
        preferredType: 'odd', // 'even' or 'odd'
        isBatting: true,
        shots: { sixes: 0, fours: 0, threes: 0, twos: 0, ones: 0, dots: 0 }
    },

    computer: {
        name: 'Computer',
        runs: 0,
        wickets: 0,
        deliveriesBowled: 0,
        bonusEarned: 0,
        penaltyLost: 0,
        nonPrefScoringStreak: 0,
        preferredType: 'even',
        isBatting: false,
        shots: { sixes: 0, fours: 0, threes: 0, twos: 0, ones: 0, dots: 0 }
    },

    currentBall: {
        number: 1,
        isPreferred: false,
        runs: 0,
        isWicket: false,
        delta: 0,
        netChange: -1,
        remainingAfter: 12,
        commentary: ''
    },

    init(initialBalls = 12, maxWickets = 10, mode = 'single') {
        this.currentPhase = this.PHASE_MENU;
        this.gameMode = mode;
        this.difficulty = this.getStoredDifficulty();
        this.match.initialBalls = initialBalls;
        this.match.remainingBalls = initialBalls;
        this.match.currentInning = 1;
        this.match.target = null;
        this.match.maxWickets = maxWickets;
        this.match.winner = null;
        this.match.isTie = false;
        this.match.resultDescription = '';

        let p1Name = 'Player 1';
        let p2Name = 'Computer';
        if (this.gameMode === this.MODE_LOCAL_2P) {
            p1Name = this.getStoredP1Name();
            p2Name = this.getStoredP2Name();
        } else if (this.gameMode === this.MODE_ONLINE) {
            const isHost = (typeof MultiplayerManager !== 'undefined' && MultiplayerManager.isHost) || this.localPlayerRole === 'p1';
            const localName = (typeof MultiplayerManager !== 'undefined' && MultiplayerManager.localPlayerName) || this.getStoredPlayerName();
            const remoteName = (typeof MultiplayerManager !== 'undefined' && MultiplayerManager.remotePlayerName) || (isHost ? 'Opponent' : 'Host');
            p1Name = isHost ? localName : remoteName;
            p2Name = isHost ? remoteName : localName;
        } else {
            p1Name = this.getStoredPlayerName();
            p2Name = 'Computer';
        }

        this.player = {
            name: p1Name,
            runs: 0,
            wickets: 0,
            deliveriesBowled: 0,
            bonusEarned: 0,
            penaltyLost: 0,
            nonPrefScoringStreak: 0,
            preferredType: 'odd',
            isBatting: true,
            shots: { sixes: 0, fours: 0, threes: 0, twos: 0, ones: 0, dots: 0 }
        };

        this.computer = {
            name: p2Name,
            runs: 0,
            wickets: 0,
            deliveriesBowled: 0,
            bonusEarned: 0,
            penaltyLost: 0,
            nonPrefScoringStreak: 0,
            preferredType: 'even',
            isBatting: false,
            shots: { sixes: 0, fours: 0, threes: 0, twos: 0, ones: 0, dots: 0 }
        };

        this.toss = {
            winner: null,
            playerChoice: null,
            computerChoice: null
        };
    },

    setToss(winner, chosenPreference = 'odd') {
        const isPlayerWinner = (winner === 'player' || winner === 'p1');
        const winnerChoice = chosenPreference;
        const otherChoice = chosenPreference === 'even' ? 'odd' : 'even';

        this.toss.winner = isPlayerWinner ? 'player' : 'computer';
        this.toss.playerChoice = isPlayerWinner ? winnerChoice : otherChoice;
        this.toss.computerChoice = isPlayerWinner ? otherChoice : winnerChoice;

        // Winner bats first as per rules
        if (isPlayerWinner) {
            this.player.isBatting = true;
            this.computer.isBatting = false;
            this.player.preferredType = winnerChoice;
            this.computer.preferredType = otherChoice;
        } else {
            this.player.isBatting = false;
            this.computer.isBatting = true;
            this.computer.preferredType = winnerChoice;
            this.player.preferredType = otherChoice;
        }

        this.match.currentInning = 1;
        this.match.remainingBalls = this.match.initialBalls;
        this.currentPhase = this.PHASE_INNINGS_1;
    },

    getCurrentBattingTeam() {
        return this.player.isBatting ? 'player' : 'computer';
    },

    getCurrentBowlingTeam() {
        return this.player.isBatting ? 'computer' : 'player';
    },

    getBattingTeamState() {
        return this[this.getCurrentBattingTeam()];
    },

    getBowlingTeamState() {
        return this[this.getCurrentBowlingTeam()];
    },

    isPreferredBall(ballNumber, preferredType) {
        if (preferredType === 'even') {
            return ballNumber % 2 === 0;
        } else {
            return ballNumber % 2 !== 0;
        }
    },

    switchInnings() {
        const inn1Batting = this.getCurrentBattingTeam();
        const firstInningsScore = this[inn1Batting].runs;

        this.match.currentInning = 2;
        this.match.target = firstInningsScore + 1;
        this.match.remainingBalls = this.match.initialBalls;

        // Switch batting roles
        this.player.isBatting = !this.player.isBatting;
        this.computer.isBatting = !this.computer.isBatting;
        this.currentPhase = this.PHASE_INNINGS_2;
    },

    finishMatch() {
        const inn1Runs = this.player.isBatting ? this.computer.runs : this.player.runs;
        const inn2Runs = this.player.isBatting ? this.player.runs : this.computer.runs;

        this.currentPhase = this.PHASE_RESULT;

        if (inn2Runs > inn1Runs) {
            const winnerKey = this.getCurrentBattingTeam();
            this.match.winner = winnerKey;
            const wicketsRemaining = this.match.maxWickets - this[winnerKey].wickets;
            this.match.resultDescription = `${this[winnerKey].name.toUpperCase()} WON by ${wicketsRemaining} wicket(s) (${this.match.remainingBalls} balls remaining)!`;
        } else if (inn1Runs > inn2Runs) {
            const winnerKey = this.getCurrentBowlingTeam();
            this.match.winner = winnerKey;
            const margin = inn1Runs - inn2Runs;
            this.match.resultDescription = `${this[winnerKey].name.toUpperCase()} WON by ${margin} run(s)!`;
        } else {
            this.match.isTie = true;
            this.match.winner = null;
            this.match.resultDescription = `MATCH TIED! Both teams scored ${inn1Runs} runs!`;
        }
    },

    getStoredPlayerName() {
        try {
            return localStorage.getItem('cricket_player_name') || 'Player 1';
        } catch (e) {
            return 'Player 1';
        }
    },

    setStoredPlayerName(name) {
        const trimmed = (name || '').trim();
        const finalName = trimmed.length > 0 ? trimmed.substring(0, 14) : 'Player 1';
        try {
            localStorage.setItem('cricket_player_name', finalName);
        } catch (e) {}
        if (this.gameMode === this.MODE_ONLINE && this.localPlayerRole === 'p2') {
            this.computer.name = finalName;
        } else {
            this.player.name = finalName;
        }
        return finalName;
    },

    getStoredP1Name() {
        try {
            return localStorage.getItem('cricket_p1_name') || 'Player 1';
        } catch (e) {
            return 'Player 1';
        }
    },

    setStoredP1Name(name) {
        const trimmed = (name || '').trim();
        const finalName = trimmed.length > 0 ? trimmed.substring(0, 14) : 'Player 1';
        try {
            localStorage.setItem('cricket_p1_name', finalName);
        } catch (e) {}
        this.player.name = finalName;
        return finalName;
    },

    getStoredP2Name() {
        try {
            return localStorage.getItem('cricket_p2_name') || 'Player 2';
        } catch (e) {
            return 'Player 2';
        }
    },

    setStoredP2Name(name) {
        const trimmed = (name || '').trim();
        const finalName = trimmed.length > 0 ? trimmed.substring(0, 14) : 'Player 2';
        try {
            localStorage.setItem('cricket_p2_name', finalName);
        } catch (e) {}
        this.computer.name = finalName;
        return finalName;
    },

    getStoredDifficulty() {
        try {
            const diff = localStorage.getItem('cricket_difficulty') || 'medium';
            return ['low', 'medium', 'high'].includes(diff) ? diff : 'medium';
        } catch (e) {
            return 'medium';
        }
    },

    setStoredDifficulty(difficulty) {
        const val = ['low', 'medium', 'high'].includes(difficulty) ? difficulty : 'medium';
        try {
            localStorage.setItem('cricket_difficulty', val);
        } catch (e) {}
        this.difficulty = val;
        return val;
    },

    getHighScore() {
        try {
            const runs = parseInt(localStorage.getItem('cricket_high_score'), 10) || 0;
            const holder = localStorage.getItem('cricket_high_score_holder') || 'Nobody';
            const balls = parseInt(localStorage.getItem('cricket_high_score_balls'), 10) || 0;
            return { runs, holder, balls };
        } catch (e) {
            return { runs: 0, holder: 'Nobody', balls: 0 };
        }
    },

    saveHighScore(runs, name, balls = 0) {
        const current = this.getHighScore();
        if (runs > current.runs) {
            try {
                localStorage.setItem('cricket_high_score', runs.toString());
                localStorage.setItem('cricket_high_score_holder', name || 'Player 1');
                if (balls > 0) {
                    localStorage.setItem('cricket_high_score_balls', balls.toString());
                }
            } catch (e) {}
            return true; // New record
        }
        return false;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameState;
}
