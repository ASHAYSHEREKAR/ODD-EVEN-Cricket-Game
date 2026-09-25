"""
AI Opponent logic for the Even/Odd Cricket Game.
Implements strategic batting and bowling behaviors.
"""

import random
from typing import Tuple
from .models import BallPreference, InningsState


class CricketAI:
    def __init__(self, difficulty: str = "medium", aggressiveness: float = 0.7):
        """
        :param difficulty: 'low', 'medium', or 'high'
        :param aggressiveness: 0.0 (very defensive) to 1.0 (very aggressive)
        """
        self.difficulty = difficulty.lower() if difficulty else "medium"
        self.aggressiveness = aggressiveness

    def choose_toss_preference(self) -> BallPreference:
        """AI picks preferred ball type for batting."""
        return random.choice([BallPreference.EVEN, BallPreference.ODD])

    def decide_shot(self, innings: InningsState) -> Tuple[int, bool]:
        """
        AI decides what shot to play on the upcoming ball based on difficulty.
        Returns: (runs, is_wicket)
        """
        next_ball_num = innings.deliveries_bowled + 1
        pref = innings.batting_team.preferred_ball_type or BallPreference.ODD

        is_preferred = (
            (next_ball_num % 2 == 0)
            if pref == BallPreference.EVEN
            else (next_ball_num % 2 != 0)
        )

        if self.difficulty == "low":
            if is_preferred:
                roll = random.random()
                if roll < 0.22: # 22% wicket on easy
                    return (0, True)
                elif roll < 0.55:
                    return (random.choice([4, 6]), False)
                elif roll < 0.85:
                    return (random.choice([1, 2]), False)
                else:
                    return (0, False)
            else:
                roll = random.random()
                if roll < 0.55: # Only 55% safe defense
                    return (0, False)
                elif roll < 0.85: # 30% risky hits
                    return (random.choice([1, 2]), False)
                else:
                    return (0, True)
        elif self.difficulty == "high":
            if is_preferred:
                roll = random.random()
                if roll < 0.05: # Only 5% wicket risk
                    return (0, True)
                elif roll < 0.65: # 60% boundary rate
                    return (random.choice([4, 6]), False)
                elif roll < 0.95:
                    return (random.choice([1, 2, 3]), False)
                else:
                    return (0, False)
            else:
                # Ruthless discipline on non-preferred: 92% safe dot balls
                roll = random.random()
                if roll < 0.92:
                    return (0, False)
                elif roll < 0.97:
                    return (1, False)
                else:
                    return (0, True)
        else:
            # Medium (default)
            if is_preferred:
                roll = random.random()
                if roll < 0.12:
                    return (0, True)
                elif roll < 0.45:
                    return (random.choice([4, 6]), False)
                elif roll < 0.85:
                    return (random.choice([1, 2, 3]), False)
                else:
                    return (0, False)
            else:
                roll = random.random()
                if roll < 0.80:
                    return (0, False)
                elif roll < 0.92:
                    return (random.choice([1, 2]), False)
                else:
                    return (0, True)
