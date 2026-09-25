# 📚 API & Module Reference

Comprehensive API documentation for both the **Python Backend Engine** and the **JavaScript Client Runtime**.

---

## 1. Python Backend Engine (`cricket_backend`)

### `cricket_backend.engine.CricketMatchEngine`
Core match orchestrator for the Even/Odd ruleset.

#### Methods:
- `__init__(team1_name: str = "Player", team2_name: str = "Computer", initial_balls: int = 12, max_wickets: int = 10, team1_is_human: bool = True, team2_is_human: bool = False)`
  - Initializes the match engine and configures the `MatchState`.
- `conduct_toss(winner: Optional[Team] = None, preference: Optional[BallPreference] = None) -> Tuple[Team, BallPreference]`
  - Sets toss winner and assigns reciprocal Even/Odd preferences.
- `evaluate_delivery_rule(ball_number: int, preference: BallPreference, runs: int, is_wicket: bool) -> Tuple[bool, BallOutcomeType, int, str]`
  - Calculates ball pool delta (`+1`, `-1`, `0`), outcome enum, and rule commentary.
- `process_delivery(runs: int = 0, is_wicket: bool = False) -> DeliveryResult`
  - Consumes 1 delivery from ball bank, applies delta modifier, records shot in history, and triggers status check.

---

---

### `cricket_backend.ai_opponent.CricketAI`
Probabilistic AI batting decision engine.

#### Methods:
- `__init__(difficulty: str = "medium", aggressiveness: float = 0.7)`
  - Configures AI decision-making algorithms with difficulty levels (`'low'`, `'medium'`, `'high'`).
- `choose_toss_preference() -> BallPreference`
  - Selects preferred ball type for batting.
- `decide_shot(innings: InningsState) -> Tuple[int, bool]`
  - Calculates tactical shot (runs and wicket probability) scaled by difficulty level.

---

### `cricket_backend.models`
Dataclasses and Enums governing data contracts.

- `BallPreference(Enum)`: `EVEN = "EVEN"`, `ODD = "ODD"`
- `BallOutcomeType(Enum)`: `RUN = "RUN"`, `DOT = "DOT"`, `WICKET = "WICKET"`
- `MatchPhase(Enum)`: `TOSS`, `INNINGS_1`, `INNINGS_BREAK`, `INNINGS_2`, `MATCH_OVER`
- `InningsState(Dataclass)`:
  - `non_pref_scoring_streak: int`: Tracks consecutive scoring hits on non-preferred balls (triggers wicket penalty at 3).
- `DeliveryResult(Dataclass)`:
  - `ball_number: int`
  - `is_preferred_ball: bool`
  - `outcome_type: BallOutcomeType`
  - `runs_scored: int`
  - `is_wicket: bool`
  - `ball_pool_delta: int`
  - `net_balls_change: int`
  - `remaining_balls_after: int`
  - `commentary: str`
  - `metadata: Dict[str, Any]` (includes `is_wicket_penalty` and `non_pref_scoring_streak`)

---

## 2. JavaScript Client Engine (`js/`)

### `GameState` (`js/game-state.js`)
Central client-side state container.

#### Key Properties & Methods:
- `difficulty: 'low' | 'medium' | 'high'`: Active match difficulty.
- `getStoredDifficulty() -> string`: Loads saved difficulty from `localStorage` (defaults to `'medium'`).
- `setStoredDifficulty(difficulty: string) -> string`: Saves difficulty level to `localStorage`.
- `init(initialBalls: number, maxWickets: number, mode: string)`: Resets innings, players, and match records.
- `setToss(winner: string, chosenPreference: string)`: Designates batting roles and Even/Odd ball preferences.
- `getCurrentBattingTeam() -> 'player' | 'computer'`: Returns current batting key.
- `getBattingTeamState() -> TeamState`: Returns batting team object (contains `nonPrefScoringStreak`).
- `isPreferredBall(ballNumber: number, preferredType: string) -> boolean`: Evaluates whether delivery number is preferred.
- `switchInnings()`: Reverses batting/bowling roles and sets chase target.
- `finishMatch()`: Calculates match outcome (win by wickets / win by runs / tie).

---

### `GameLogic` (`js/game-logic.js`)
Rule matrix, 3-strike penalty enforcement, and shot timing mechanics.

#### Key Methods:
- `evaluateDeliveryRule(ballNumber: number, preference: string, runs: number, isWicket: boolean) -> Object`
  - Returns `{ isPreferred, outcomeType, delta, commentary }`.
- `processDelivery(runs: number, isWicket: boolean) -> Object`
  - Deducts ball, tracks `nonPrefScoringStreak`, evaluates 3-strike wicket penalty, increments score, updates bank stats, and returns `{ ...deliveryResult, isWicketPenalty, nonPrefStreak, status }`.
- `calculateShotOutcome(timingOffsetMs: number, isDefensive: boolean) -> Object`
  - Calculates sweet spot based on `GameState.difficulty` (Low: $\pm 130\text{ ms}$, Med: $\pm 95\text{ ms}$, High: $\pm 65\text{ ms}$). Returns `{ runs, isWicket, rating, ratingText }`.
- `simulateAIBattingTurn() -> Object`
  - Simulates computer turn scaled to difficulty settings.

---

### `UIController` (`js/ui-controller.js`)
DOM screens, difficulty slider controller, and HUD scoreboard manager.

#### Key Methods:
- `setupDifficultySlider()`: Syncs main menu and settings difficulty sliders, renders difficulty badges (`🟢 LOW`, `🟡 MEDIUM`, `🔴 HIGH`), and persists selections.
- `loadSettings()`: Loads sound FX and audio preferences from `localStorage`.
- `updateScoreboard()`: Renders score, balls left, bank stats, and updates the `#streak-warning-badge` (`⚠️ RISKY STREAK: 1/3`, `🚨 DANGER: 2/3!`).

---

### `CanvasRenderer` (`js/canvas-renderer.js`)
2.5D perspective canvas renderer and procedural animation controller.

#### Key Methods:
- `init(canvasElement: HTMLCanvasElement)`: Initializes rendering context, DPR scaling, and starts 60 FPS animation loop.
- `resize()`: Recomputes pitch perspective matrix, vanishing points, and fielder positions.
- `triggerPitchDelivery(speed: string, variation: string) -> number`: Launches 3D delivery trajectory scaled by difficulty duration multiplier and returns duration in ms.
- `triggerHit(runs: number)`: Launches 3D ball hit physics (high arc on 6s, bullet drive on 4s) with batsman swing follow-through.
- `triggerDefend()`: Animates forward defensive block with pitch impact dust.
- `triggerWicket()`: Breaks batting stumps with exploding bails and wood splinter particles.
- `flash(text: string)`: Renders screen-centered typography flash.
- `addBadge(text: string, type: 'bonus' | 'penalty' | 'safe')`: Generates floating score badge.

---

### `MultiplayerManager` (`js/multiplayer-manager.js`)
PeerJS WebRTC networking wrapper for online room multiplayer.

#### Key Events:
- `START_TOSS`: Broadcasts coin toss winner and ball count.
- `TOSS_CHOICE`: Broadcasts Even/Odd preference and match duration.
- `DELIVERY_START`: Broadcasts `{ speed, variation }` so both clients execute identical ball trajectories.
- `BAT_ACTION`: Broadcasts `{ timingOffset, isDefensive }` from batting client to host.
- `INNINGS_2_START`: Synchronizes launch of second innings.
