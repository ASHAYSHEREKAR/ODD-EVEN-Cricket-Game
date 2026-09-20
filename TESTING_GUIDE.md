# Cricket Game — Testing Quickstart & Reference Guide

This guide explains how to run, write, and manage automated tests for the Even/Odd Cricket Game project, as well as how to use [`TESTING_AGENT.md`](file:///c:/Users/Ashay/Desktop/CricketGame/TESTING_AGENT.md) and [`AGENT.md`](file:///c:/Users/Ashay/Desktop/CricketGame/AGENT.md).

---

## 1. Quick Test Commands

All commands should be executed from the project root directory:

```powershell
cd c:\Users\Ashay\Desktop\CricketGame
```

| Command | Action | Recommended Use Case |
| :--- | :--- | :--- |
| `python -m unittest discover -s tests -p "test_*.py" -v` | Runs all Python unit tests with verbose output | Fast pre-commit check & rule verification (< 0.1s) |
| `python cricket_backend/cli_runner.py --sim 10` | Runs 10 automated match simulations | End-to-end match engine & AI sanity check |
| `python cricket_backend/cli_runner.py --sim 50` | Runs 50 stress simulations | State machine stability & edge case testing |
| `python cricket_backend/cli_runner.py` | Launches interactive CLI match | Manual verification of player inputs & shots |

---

## 2. Running Targeted Unit Tests

```powershell
# Run only specific test classes or methods
python -m unittest tests.test_engine.TestCricketEngineRules.test_rule_1_preferred_ball_runs_scored
python -m unittest tests.test_engine.TestCricketEngineRules.test_rule_2_preferred_ball_dot
python -m unittest tests.test_engine.TestCricketEngineRules.test_rule_5_non_preferred_ball_dot_safe
python -m unittest tests.test_engine.TestCricketEngineRules.test_innings_switch_and_target_chase_win
```

---

## 3. Key Rule Assertions & Verification Points

When writing or verifying tests, verify these core mechanics:

1. **Preferred Ball + Run:**  
   `ball_pool_delta == +1` $\rightarrow$ Net change: $0$ $\rightarrow$ Bonus metric incremented.
2. **Preferred Ball + Dot:**  
   `ball_pool_delta == -1` $\rightarrow$ Net change: $-2$ $\rightarrow$ Penalty metric incremented.
3. **Preferred Ball + Wicket:**  
   `ball_pool_delta == -1` $\rightarrow$ Net change: $-2$ $\rightarrow$ Wicket added.
4. **Non-Preferred Ball + Run:**  
   `ball_pool_delta == -1` $\rightarrow$ Net change: $-2$ $\rightarrow$ Runs added, penalty metric incremented.
5. **Non-Preferred Ball + Dot:**  
   `ball_pool_delta == 0` $\rightarrow$ Net change: $-1$ (safe defense, standard delivery consumed).
6. **Non-Preferred Ball + Wicket:**  
   `ball_pool_delta == -1` $\rightarrow$ Net change: $-2$ $\rightarrow$ Wicket added.

---

## 4. Frontend Browser Testing Checklist

When testing the web client (`index.html`):
- [ ] **Toss Screen:** Coin flips smoothly and displays winner with Even/Odd buttons.
- [ ] **Pitch & Stadium:** Batsman, bowler, and pitch render crisply.
- [ ] **Ball Badges:** Current delivery shows `★ PREFERRED ★` or `◇ NON-PREFERRED ◇`.
- [ ] **Dynamic Ball Bank:** Floating badges (`+1 BONUS BALL!`, `-1 PENALTY`) pop up on shot execution.
- [ ] **Target Display:** In Innings 2, the target score ("Need X runs to win") displays accurately.
- [ ] **Audio Synthesizer:** Bat-on-ball crack and crowd cheers play without latency.
