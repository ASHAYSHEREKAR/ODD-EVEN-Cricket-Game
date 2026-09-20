"""
AI Opponent logic for the Even/Odd Cricket Game.
Implements strategic batting and bowling behaviors.
"""

import random
from typing import Tuple
from .models import BallPreference, InningsState


class CricketAI:
    def __init__(self, aggressiveness: float = 0.7):
        """
        :param aggressiveness: 0.0 (very defensive) to 1.0 (very aggressive)
        """
        self.aggressiveness = aggressiveness

    def choose_toss_preference(self) -> BallPreference:
        """AI picks preferred ball type for batting."""
        return random.choice([BallPreference.EVEN, BallPreference.ODD])

    def decide_shot(self, innings: InningsState) -> Tuple[int, bool]:
        """
        AI decides what shot to play on the upcoming ball.
        Strategy:
        - If upcoming ball is PREFERRED:
            * High incentive to attack and score runs to earn +1 bonus ball.
            * AI chooses between 1, 2, 4, or 6 runs with small wicket risk.
        - If upcoming ball is NON-PREFERRED:
            * High incentive to defend/play safe dot ball (0 runs) to avoid the -1 penalty for scoring or getting out.
            * Small chance of misjudgment resulting in a single or wicket.

        Returns: (runs, is_wicket)
        """
        next_ball_num = innings.deliveries_bowled + 1
        pref = innings.batting_team.preferred_ball_type or BallPreference.ODD

        is_preferred = (
            (next_ball_num % 2 == 0)
            if pref == BallPreference.EVEN
            else (next_ball_num % 2 != 0)
        )

        if is_preferred:
            # Attack on preferred ball
            roll = random.random()
            if roll < 0.12:  # 12% chance of wicket
                return (0, True)
            elif roll < 0.40:
                return (random.choice([4, 6]), False)
            elif roll < 0.80:
                return (random.choice([1, 2, 3]), False)
            else:
                return (0, False)  # Dot ball
        else:
            # Defend on non-preferred ball (Optimal strategy: safe dot)
            roll = random.random()
            if roll < 0.75:  # 75% chance of safe dot ball
                return (0, False)
            elif roll < 0.90:  # 15% mistimed push for 1 or 2 runs
                return (random.choice([1, 2]), False)
            else:  # 10% edge/wicket
                return (0, True)
