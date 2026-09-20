"""
Interactive Command-Line Runner for the Even/Odd Cricket Game.
Allows playing an interactive match or running quick simulations.
"""

import sys
import os
import time
import random
from typing import Optional

# Allow running directly from file or as package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cricket_backend.engine import CricketMatchEngine
from cricket_backend.models import BallPreference, MatchPhase
from cricket_backend.ai_opponent import CricketAI


def print_banner():
    print("=" * 60)
    print("       🏏  EVEN / ODD CRICKET STRATEGY GAME  🏏        ")
    print("=" * 60)
    print("Rules at a glance:")
    print(" • Toss winner bats first and picks EVEN or ODD balls.")
    print(" • PREFERRED BALL: Run (+1 Ball Bonus) | Dot (-1 Ball) | Wicket (-1 Ball)")
    print(" • NON-PREFERRED : Run (-1 Ball) | Dot (Safe, 0 Penalty) | Wicket (-1 Ball)")
    print("=" * 60)


def format_scoreboard(engine: CricketMatchEngine) -> str:
    inn = engine.state.current_innings
    if not inn:
        return ""
    pref_str = inn.batting_team.preferred_ball_type.value if inn.batting_team.preferred_ball_type else "N/A"
    target_str = f" | Target: {inn.target}" if inn.target else ""
    return (
        f"\n┌──────────────────────────────────────────────────────────┐\n"
        f"│ Innings {inn.inning_number}: {inn.batting_team.name:<10} Score: {inn.runs}/{inn.wickets} ({inn.max_wickets} Wkts Max){target_str:<18} │\n"
        f"│ Balls Remaining: {inn.remaining_balls:<3} | Total Allocated: {inn.total_balls_allocated:<3} | Bowled: {inn.deliveries_bowled:<3} │\n"
        f"│ Preferred Balls: {pref_str:<5} (Earned +{inn.bonus_balls_earned}, Lost -{inn.penalty_balls_lost})                 │\n"
        f"└──────────────────────────────────────────────────────────┘"
    )


def play_interactive_match():
    print_banner()
    player_name = input("\nEnter your name (default: Player): ").strip() or "Player"
    balls_input = input("Starting balls per innings (default 12): ").strip()
    starting_balls = int(balls_input) if balls_input.isdigit() else 12

    engine = CricketMatchEngine(
        team1_name=player_name,
        team2_name="Computer",
        initial_balls=starting_balls,
        team1_is_human=True,
        team2_is_human=False,
    )
    ai = CricketAI()

    print("\n🪙 Flipping coin for toss...")
    time.sleep(0.5)
    toss_winner_team = random.choice([engine.team1, engine.team2])

    if toss_winner_team.is_human:
        print(f"🎉 You ({player_name}) WON the toss!")
        print("As per rules, you will BAT first!")
        choice = ""
        while choice not in ["1", "2", "EVEN", "ODD"]:
            choice = input("Choose your preferred ball type (1 for EVEN, 2 for ODD): ").strip().upper()
        pref = BallPreference.EVEN if choice in ["1", "EVEN"] else BallPreference.ODD
    else:
        pref = ai.choose_toss_preference()
        print(f"🤖 Computer WON the toss! Computer bats first and chooses {pref.value} balls.")

    engine.conduct_toss(winner=toss_winner_team, preference=pref)
    print(f"\nMatch starts! {engine.state.first_batting_team.name} is batting.")

    # Play Innings 1 and Innings 2
    while not engine.is_game_over():
        current_inn = engine.state.current_innings
        print(format_scoreboard(engine))

        next_ball_num = current_inn.deliveries_bowled + 1
        is_pref = engine.is_preferred_ball(next_ball_num, current_inn.batting_team.preferred_ball_type)
        pref_badge = "★ PREFERRED BALL ★" if is_pref else "◇ NON-PREFERRED BALL ◇"

        print(f"\nDelivery #{next_ball_num} incoming... [{pref_badge}]")

        if current_inn.batting_team.is_human:
            # Human is batting
            print("\nSelect your shot:")
            print(" 1. 🛡️  Defend / Leave (Safe dot: 0 penalty on non-pref, but -1 penalty on pref)")
            print(" 2. ⚡ Single / Rotate Strike (1 run)")
            print(" 3. 💥 Boundary Drive (4 runs)")
            print(" 4. 🚀 Big Maximum (6 runs)")
            shot = input("Your shot choice [1-4]: ").strip()

            if shot == "1":
                runs = 0
                is_wicket = False
            elif shot == "2":
                # Single
                is_wicket = random.random() < (0.05 if is_pref else 0.15)
                runs = 0 if is_wicket else 1
            elif shot == "3":
                # Four
                is_wicket = random.random() < (0.12 if is_pref else 0.35)
                runs = 0 if is_wicket else 4
            elif shot == "4":
                # Six
                is_wicket = random.random() < (0.22 if is_pref else 0.50)
                runs = 0 if is_wicket else 6
            else:
                runs = 0
                is_wicket = False
        else:
            # Computer is batting
            time.sleep(0.6)
            runs, is_wicket = ai.decide_shot(current_inn)

        # Process through rule engine
        result = engine.process_delivery(runs=runs, is_wicket=is_wicket)
        print(f"👉 {result.commentary}")
        print(f"   Net Balls Change: {result.net_balls_change:+d} | Remaining Balls: {result.remaining_balls_after}")
        time.sleep(0.4)

    # Match over summary
    print("\n" + "=" * 60)
    print("                    🏁 MATCH FINISHED 🏁                  ")
    print("=" * 60)
    print(f"Innings 1 ({engine.state.innings1.batting_team.name}): {engine.state.innings1.runs}/{engine.state.innings1.wickets} (Balls bowled: {engine.state.innings1.deliveries_bowled})")
    print(f"Innings 2 ({engine.state.innings2.batting_team.name}): {engine.state.innings2.runs}/{engine.state.innings2.wickets} (Balls bowled: {engine.state.innings2.deliveries_bowled})")
    print("-" * 60)
    print(f"RESULT: {engine.state.result_description}")
    print("=" * 60)


def run_simulation(num_matches: int = 5):
    print(f"\n--- Running {num_matches} Quick Simulations ---")
    ai = CricketAI()
    for m in range(1, num_matches + 1):
        engine = CricketMatchEngine(
            team1_name="Team Alpha",
            team2_name="Team Beta",
            initial_balls=12,
            team1_is_human=False,
            team2_is_human=False,
        )
        engine.conduct_toss()
        while not engine.is_game_over():
            inn = engine.state.current_innings
            runs, is_wicket = ai.decide_shot(inn)
            engine.process_delivery(runs=runs, is_wicket=is_wicket)

        print(f"Match #{m}: {engine.state.innings1.batting_team.name} {engine.state.innings1.runs}/{engine.state.innings1.wickets} vs "
              f"{engine.state.innings2.batting_team.name} {engine.state.innings2.runs}/{engine.state.innings2.wickets} -> {engine.state.result_description}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--sim":
        run_simulation(int(sys.argv[2]) if len(sys.argv) > 2 else 5)
    else:
        play_interactive_match()
