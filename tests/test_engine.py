"""
Comprehensive unit tests for the Even/Odd Cricket Game backend engine.
"""

import unittest
from cricket_backend.engine import CricketMatchEngine
from cricket_backend.models import (
    BallPreference,
    BallOutcomeType,
    MatchPhase,
)


class TestCricketEngineRules(unittest.TestCase):
    def setUp(self):
        self.engine = CricketMatchEngine(
            team1_name="Player",
            team2_name="Computer",
            initial_balls=10,
            max_wickets=5,
        )
        # Force Player to win toss and pick ODD balls (so Ball 1, 3, 5 are preferred; 2, 4, 6 are not)
        self.engine.conduct_toss(
            winner=self.engine.team1,
            preference=BallPreference.ODD,
        )

    def test_toss_and_initial_state(self):
        """Verify toss setup, batting order, and initial allocations."""
        self.assertEqual(self.engine.state.phase, MatchPhase.INNINGS_1)
        self.assertEqual(self.engine.state.toss_winner.name, "Player")
        self.assertEqual(self.engine.state.first_batting_team.name, "Player")
        self.assertEqual(self.engine.team1.preferred_ball_type, BallPreference.ODD)
        self.assertEqual(self.engine.team2.preferred_ball_type, BallPreference.EVEN)

        inn1 = self.engine.state.innings1
        self.assertIsNotNone(inn1)
        self.assertEqual(inn1.remaining_balls, 10)
        self.assertEqual(inn1.deliveries_bowled, 0)
        self.assertEqual(inn1.runs, 0)
        self.assertEqual(inn1.wickets, 0)

    def test_rule_1_preferred_ball_runs_scored(self):
        """Ball #1 (ODD - Preferred): Scoring runs gives +1 ball bonus (net change: 0)."""
        res = self.engine.process_delivery(runs=4, is_wicket=False)
        inn1 = self.engine.state.innings1

        self.assertEqual(res.ball_number, 1)
        self.assertTrue(res.is_preferred_ball)
        self.assertEqual(res.outcome_type, BallOutcomeType.RUN)
        self.assertEqual(res.ball_pool_delta, 1) # +1 bonus
        self.assertEqual(res.net_balls_change, 0) # -1 + 1 = 0
        self.assertEqual(inn1.remaining_balls, 10)
        self.assertEqual(inn1.runs, 4)
        self.assertEqual(inn1.bonus_balls_earned, 1)
        self.assertEqual(inn1.penalty_balls_lost, 0)

    def test_rule_2_preferred_ball_dot(self):
        """Ball #1 (ODD - Preferred): Dot ball gives -1 ball penalty (net change: -2)."""
        res = self.engine.process_delivery(runs=0, is_wicket=False)
        inn1 = self.engine.state.innings1

        self.assertEqual(res.ball_number, 1)
        self.assertTrue(res.is_preferred_ball)
        self.assertEqual(res.outcome_type, BallOutcomeType.DOT)
        self.assertEqual(res.ball_pool_delta, -1) # -1 penalty
        self.assertEqual(res.net_balls_change, -2) # -1 - 1 = -2
        self.assertEqual(inn1.remaining_balls, 8) # 10 - 2 = 8
        self.assertEqual(inn1.runs, 0)
        self.assertEqual(inn1.penalty_balls_lost, 1)

    def test_rule_3_preferred_ball_wicket(self):
        """Ball #1 (ODD - Preferred): Wicket gives -1 ball penalty (net change: -2) and +1 wicket."""
        res = self.engine.process_delivery(runs=0, is_wicket=True)
        inn1 = self.engine.state.innings1

        self.assertEqual(res.ball_number, 1)
        self.assertTrue(res.is_preferred_ball)
        self.assertEqual(res.outcome_type, BallOutcomeType.WICKET)
        self.assertEqual(res.ball_pool_delta, -1)
        self.assertEqual(res.net_balls_change, -2)
        self.assertEqual(inn1.remaining_balls, 8)
        self.assertEqual(inn1.wickets, 1)
        self.assertEqual(inn1.penalty_balls_lost, 1)

    def test_rule_4_non_preferred_ball_runs_scored(self):
        """Ball #2 (EVEN - Non-Preferred): Scoring runs gives -1 penalty (net change: -2)."""
        # Play Ball #1 first
        self.engine.process_delivery(runs=1, is_wicket=False) # remaining = 10
        # Ball #2 (Non-Preferred)
        res = self.engine.process_delivery(runs=2, is_wicket=False)
        inn1 = self.engine.state.innings1

        self.assertEqual(res.ball_number, 2)
        self.assertFalse(res.is_preferred_ball)
        self.assertEqual(res.outcome_type, BallOutcomeType.RUN)
        self.assertEqual(res.ball_pool_delta, -1)
        self.assertEqual(res.net_balls_change, -2)
        self.assertEqual(inn1.remaining_balls, 8) # 10 - 2 = 8
        self.assertEqual(inn1.runs, 3) # 1 + 2 = 3
        self.assertEqual(inn1.penalty_balls_lost, 1)

    def test_rule_5_non_preferred_ball_dot_safe(self):
        """Ball #2 (EVEN - Non-Preferred): Dot ball gives 0 penalty (net change: -1 normal ball bowled)."""
        # Play Ball #1 first
        self.engine.process_delivery(runs=1, is_wicket=False) # remaining = 10
        # Ball #2 (Non-Preferred)
        res = self.engine.process_delivery(runs=0, is_wicket=False)
        inn1 = self.engine.state.innings1

        self.assertEqual(res.ball_number, 2)
        self.assertFalse(res.is_preferred_ball)
        self.assertEqual(res.outcome_type, BallOutcomeType.DOT)
        self.assertEqual(res.ball_pool_delta, 0) # Safe 0 penalty
        self.assertEqual(res.net_balls_change, -1) # Standard 1 ball consumed
        self.assertEqual(inn1.remaining_balls, 9) # 10 - 1 = 9
        self.assertEqual(inn1.runs, 1)
        self.assertEqual(inn1.penalty_balls_lost, 0)

    def test_rule_6_non_preferred_ball_wicket(self):
        """Ball #2 (EVEN - Non-Preferred): Wicket gives -1 penalty (net change: -2) and +1 wicket."""
        # Play Ball #1 first
        self.engine.process_delivery(runs=1, is_wicket=False) # remaining = 10
        # Ball #2 (Non-Preferred)
        res = self.engine.process_delivery(runs=0, is_wicket=True)
        inn1 = self.engine.state.innings1

        self.assertEqual(res.ball_number, 2)
        self.assertFalse(res.is_preferred_ball)
        self.assertEqual(res.outcome_type, BallOutcomeType.WICKET)
        self.assertEqual(res.ball_pool_delta, -1)
        self.assertEqual(res.net_balls_change, -2)
        self.assertEqual(inn1.remaining_balls, 8)
        self.assertEqual(inn1.wickets, 1)

    def test_consecutive_non_preferred_scoring_penalty(self):
        """Scoring runs on non-preferred balls 3 consecutive times awards an extra wicket penalty."""
        # Ball 1 (ODD - Preferred): Dot
        self.engine.process_delivery(runs=0, is_wicket=False)
        self.assertEqual(self.engine.state.innings1.wickets, 0)
        self.assertEqual(self.engine.state.innings1.non_pref_scoring_streak, 0)

        # 1st Non-preferred hit (Ball 2 - EVEN): 1 run
        res1 = self.engine.process_delivery(runs=1, is_wicket=False)
        self.assertEqual(self.engine.state.innings1.wickets, 0)
        self.assertEqual(self.engine.state.innings1.non_pref_scoring_streak, 1)

        # Preferred ball in between (Ball 3 - ODD): 4 runs (bonus)
        self.engine.process_delivery(runs=4, is_wicket=False)
        self.assertEqual(self.engine.state.innings1.wickets, 0)
        # Streak remains 1
        self.assertEqual(self.engine.state.innings1.non_pref_scoring_streak, 1)

        # 2nd Non-preferred hit (Ball 4 - EVEN): 2 runs
        res2 = self.engine.process_delivery(runs=2, is_wicket=False)
        self.assertEqual(self.engine.state.innings1.wickets, 0)
        self.assertEqual(self.engine.state.innings1.non_pref_scoring_streak, 2)

        # Preferred ball (Ball 5 - ODD): 1 run
        self.engine.process_delivery(runs=1, is_wicket=False)

        # 3rd Non-preferred hit (Ball 6 - EVEN): 1 run -> TRIGGERS WICKET PENALTY!
        res3 = self.engine.process_delivery(runs=1, is_wicket=False)
        self.assertEqual(self.engine.state.innings1.wickets, 1) # Wicket penalty applied!
        self.assertEqual(self.engine.state.innings1.non_pref_scoring_streak, 0) # Reset to 0
        self.assertTrue(res3.is_wicket)
        self.assertTrue(res3.metadata.get("is_wicket_penalty"))

    def test_innings_switch_and_target_chase_win(self):
        """Full match flow: Innings 1 finishes -> Innings 2 starts -> Team 2 chases target and wins."""
        # Innings 1: 5 dots on preferred ball = 5 * -2 = -10 balls -> innings complete
        for _ in range(5):
            self.engine.process_delivery(runs=1, is_wicket=False) # 5 runs, remaining unchanged
        # Now consume balls
        for _ in range(5):
            self.engine.process_delivery(runs=0, is_wicket=False) # dots reduce balls

        self.assertTrue(self.engine.state.innings1.is_completed)
        self.assertEqual(self.engine.state.phase, MatchPhase.INNINGS_2)

        inn2 = self.engine.state.innings2
        self.assertIsNotNone(inn2)
        self.assertEqual(inn2.batting_team.name, "Computer")
        self.assertEqual(inn2.batting_team.preferred_ball_type, BallPreference.EVEN)
        self.assertEqual(inn2.target, self.engine.state.innings1.runs + 1)

        # Computer hits a six on ball 1 (odd - non-preferred: 6 runs, delta -1, net -2)
        self.engine.process_delivery(runs=6, is_wicket=False)

        # Game should be over because runs (6) >= target (6)
        self.assertTrue(self.engine.is_game_over())
        self.assertEqual(self.engine.state.winner.name, "Computer")
        self.assertIn("Computer WON", self.engine.state.result_description)


if __name__ == "__main__":
    unittest.main()
