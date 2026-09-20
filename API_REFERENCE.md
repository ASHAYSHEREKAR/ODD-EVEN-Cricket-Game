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

### `cricket_backend.models`
Dataclasses and Enums governing data contracts.

- `BallPreference(Enum)`: `EVEN = "even"`, `ODD = "odd"`
- `BallOutcomeType(Enum)`: `RUN = "RUN"`, `DOT = "DOT"`, `WICKET = "WICKET"`
- `MatchPhase(Enum)`: `TOSS`, `INNINGS_1`, `INNINGS_BREAK`, `INNINGS_2`, `MATCH_OVER`
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

---

## 2. JavaScript Client Engine (`js/`)

### `GameState` (`js/game-state.js`)
Central client-side state container.

#### Key Methods:
- `init(initialBalls: number, maxWickets: number, mode: string)`: Resets innings, players, and match records.
- `setToss(winner: string, chosenPreference: string)`: Designates batting roles and Even/Odd ball preferences.
- `getCurrentBattingTeam() -> 'player' | 'computer'`: Returns current batting key.
- `getBattingTeamState() -> TeamState`: Returns batting team object.
- `isPreferredBall(ballNumber: number, preferredType: string) -> boolean`: Evaluates whether delivery number is preferred.
- `switchInnings()`: Reverses batting/bowling roles and sets chase target.
- `finishMatch()`: Calculates match outcome (win by wickets / win by runs / tie).

---

### `GameLogic` (`js/game-logic.js`)
Rule matrix and shot timing mechanics.

#### Key Methods:
- `evaluateDeliveryRule(ballNumber: number, preference: string, runs: number, isWicket: boolean) -> Object`
  - Returns `{ isPreferred, outcomeType, delta, commentary }`.
- `processDelivery(runs: number, isWicket: boolean) -> Object`
  - Deducts ball, increments score and boundary counts, updates bank stats, and returns updated status (`IN_PROGRESS`, `INNINGS_1_OVER`, `MATCH_OVER`).
- `calculateShotOutcome(timingOffsetMs: number, isDefensive: boolean) -> Object`
  - Calculates contact sweet spot: returns `{ runs, isWicket, rating, ratingText }`.

---

### `CanvasRenderer` (`js/canvas-renderer.js`)
2.5D perspective canvas renderer and procedural animation controller.

#### Key Methods:
- `init(canvasElement: HTMLCanvasElement)`: Initializes rendering context, DPR scaling, and starts 60 FPS animation loop.
- `resize()`: Recomputes pitch perspective matrix, vanishing points, and fielder positions.
- `triggerPitchDelivery(speed: string, variation: string) -> number`: Launches 3D delivery trajectory with lateral curves and returns duration in ms.
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
