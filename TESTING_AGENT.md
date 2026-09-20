# Cricket Game — Testing Agent Operating Rules

> **Project:** Even/Odd Strategic Cricket Game (Google Doodle Inspired)  
> **Backend:** Python Engine (`cricket_backend/`)  
> **Frontend:** HTML5 / CSS3 / JavaScript (`index.html`, `js/`, `css/`)  
> **Companion Document:** [AGENT.md](file:///c:/Users/Ashay/Desktop/CricketGame/AGENT.md) | [TESTING_GUIDE.md](file:///c:/Users/Ashay/Desktop/CricketGame/TESTING_GUIDE.md)

---

## 1. Purpose & Operating Philosophy

This document defines the operating rules, verification protocols, and quality gates for any **AI Testing Agent** working on the Cricket Game repository.

The Testing Agent is responsible for:
- **Comprehensive Quality Assurance:** Verifying all mathematical, rule-based, and visual behaviors of the Cricket Game.
- **Rule Verification:** Ensuring 100% coverage of the **Even/Odd Ball Bank Strategy Rules**.
- **Test Integrity:** Writing robust unit tests, edge-case simulations, and regression suites.
- **Honest Reporting:** Reporting all test outcomes truthfully — **never claiming `PASSED` when a case is `UNVERIFIED` or failing**.
- **Defect Diagnosis:** Isolating root causes of bugs and reporting them clearly to the Development Agent with exact steps to reproduce.

> [!CAUTION]
> **Cardinal Rule:** The Testing Agent must **never modify production source code** (`cricket_backend/engine.py`, `js/game-logic.js`, etc.) to make tests pass. If a test fails due to a bug in production code, file a bug report for the Development Agent. If a test itself is flawed, correct the test and document the rationale.

---

## 2. Test Architecture & Coverage Matrix

### Test Hierarchy
```text
┌────────────────────────────────────────────────────────┐
│                   QUALITY GATES                         │
├────────────────────────────────────────────────────────┤
│  1. Unit Tests (tests/test_engine.py)                  │
│     • 100% branch coverage of rule matrix             │
│  2. Batch Simulation Tests (cricket_backend/cli_runner)│
│     • End-to-end full match cycles (>50 games)         │
│  3. Frontend Logic Sanity (js/game-logic.js)          │
│     • Rule parity between Python & JavaScript         │
│  4. Browser UI & Interaction Validation                │
│     • Batting timing, audio synth, responsive UI       │
└────────────────────────────────────────────────────────┘
```

---

## 3. Required Verification Matrices

Every release or major feature must pass all test scenarios in the matrix below:

### A. Delivery Rule Matrix (100% Mandatory Branch Coverage)

| Test ID | Ball # Type | Batter Event | Expected $\Delta$ | Net Balls Change | Expected State Update |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `TC-R1` | **Preferred** (e.g. #1 on ODD) | Run ($>0$) | **$+1$** | **$0$** | Runs added; `bonus_balls_earned += 1`; Balls remaining unchanged |
| `TC-R2` | **Preferred** (e.g. #1 on ODD) | Dot ($0$) | **$-1$** | **$-2$** | Runs unchanged; `penalty_balls_lost += 1`; Balls remaining $-2$ |
| `TC-R3` | **Preferred** (e.g. #1 on ODD) | Wicket | **$-1$** | **$-2$** | `wickets += 1`; `penalty_balls_lost += 1`; Balls remaining $-2$ |
| `TC-R4` | **Non-Preferred** (e.g. #2 on ODD) | Run ($>0$) | **$-1$** | **$-2$** | Runs added; `penalty_balls_lost += 1`; Balls remaining $-2$ |
| `TC-R5` | **Non-Preferred** (e.g. #2 on ODD) | Dot ($0$) | **$0$** | **$-1$** | Safe defense; Runs unchanged; Balls remaining $-1$ (normal ball) |
| `TC-R6` | **Non-Preferred** (e.g. #2 on ODD) | Wicket | **$-1$** | **$-2$** | `wickets += 1`; `penalty_balls_lost += 1`; Balls remaining $-2$ |

### B. Match Flow & State Transition Scenarios

| Test ID | Category | Scenario | Expected Result |
| :--- | :--- | :--- | :--- |
| `TC-M1` | **Toss** | Toss flip winner bats first | Winner becomes batting team for Innings 1; Opposite preference assigned to loser |
| `TC-M2` | **Innings 1 End** | Remaining balls reaches $0$ | Innings 1 completes; Target set to `Runs + 1`; Innings 2 starts |
| `TC-M3` | **Innings 1 All-Out**| Wickets reaches `max_wickets` | Innings 1 completes immediately regardless of remaining balls |
| `TC-M4` | **Innings 2 Chase** | Batting team reaches Target | Match ends immediately; Batting team wins by remaining wickets |
| `TC-M5` | **Innings 2 Defend**| Bowling team restricts before Target | Match ends when balls/wickets expire; Bowling team wins by runs |
| `TC-M6` | **Match Tie** | Both teams score equal runs | `is_tie == True`; Result description states match tied |

---

## 4. Testing Execution Commands

### 1. Run Automated Unit Test Suite
```powershell
python -m unittest discover -s tests -p "test_*.py" -v
```

### 2. Run Stress & Batch Simulation (50 Matches)
```powershell
python cricket_backend/cli_runner.py --sim 50
```

### 3. Verify Frontend/Backend Rule Parity
Validate that any delivery outcome in `js/game-logic.js` produces identical `delta`, `runs`, and `wickets` as `cricket_backend/engine.py`.

---

## 5. Quality Gates for Release Readiness

An implementation is considered **PRODUCTION-READY** only when:
1. ✅ **Unit Tests:** 100% of unit tests pass with zero failures and zero errors.
2. ✅ **Simulation Stress:** 50 simulated matches run with zero runtime exceptions or invalid state transitions.
3. ✅ **No Negative Balls:** `remaining_balls` never falls below $0$.
4. ✅ **UI State Accuracy:** Browser scoreboard accurately renders runs, wickets, target, and ball badges.
5. ✅ **Audio Safety:** Web Audio synthesis initializes smoothly without blocking the UI thread.
