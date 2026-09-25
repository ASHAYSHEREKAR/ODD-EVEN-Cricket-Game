"""
Core match engine for the Even/Odd Cricket Game.
Implements the exact rule matrix, innings management, and match state tracking.
"""

import random
from typing import Optional, Tuple, Dict, Any

from .models import (
    BallPreference,
    BallOutcomeType,
    DeliveryResult,
    InningsState,
    MatchPhase,
    MatchState,
    Team,
)


class CricketMatchEngine:
    def __init__(
        self,
        team1_name: str = "Player",
        team2_name: str = "Computer",
        initial_balls: int = 12,
        max_wickets: int = 10,
        team1_is_human: bool = True,
        team2_is_human: bool = False,
    ):
        self.team1 = Team(name=team1_name, is_human=team1_is_human)
        self.team2 = Team(name=team2_name, is_human=team2_is_human)
        self.initial_balls = initial_balls
        self.max_wickets = max_wickets
        self.state = MatchState(
            team1=self.team1,
            team2=self.team2,
            initial_balls_per_innings=initial_balls,
            max_wickets=max_wickets,
            phase=MatchPhase.TOSS,
        )

    # ---------------------------------------------------------
    # Toss & Setup
    # ---------------------------------------------------------
    def conduct_toss(
        self,
        winner: Optional[Team] = None,
        preference: Optional[BallPreference] = None,
    ) -> Tuple[Team, BallPreference]:
        """
        Conduct toss. Toss winner always bats first (as specified in rules)
        and picks their preferred ball type (EVEN or ODD).
        The other team automatically receives the opposite preference.
        """
        if winner is None:
            winner = random.choice([self.team1, self.team2])

        loser = self.team2 if winner == self.team1 else self.team1

        if preference is None:
            preference = random.choice([BallPreference.EVEN, BallPreference.ODD])

        other_preference = (
            BallPreference.ODD if preference == BallPreference.EVEN else BallPreference.EVEN
        )

        winner.preferred_ball_type = preference
        loser.preferred_ball_type = other_preference

        self.state.toss_winner = winner
        self.state.toss_loser = loser
        self.state.first_batting_team = winner

        # Initialize Innings 1
        self.state.innings1 = InningsState(
            inning_number=1,
            batting_team=winner,
            bowling_team=loser,
            initial_balls=self.initial_balls,
            remaining_balls=self.initial_balls,
            max_wickets=self.max_wickets,
        )
        self.state.phase = MatchPhase.INNINGS_1
        return winner, preference

    # ---------------------------------------------------------
    # Rule Evaluation Matrix
    # ---------------------------------------------------------
    @staticmethod
    def is_preferred_ball(ball_number: int, preference: BallPreference) -> bool:
        """
        Determine whether a given delivery number (1-based) is preferred.
        """
        if preference == BallPreference.EVEN:
            return ball_number % 2 == 0
        else:
            return ball_number % 2 != 0

    @classmethod
    def evaluate_delivery_rule(
        cls,
        ball_number: int,
        preference: BallPreference,
        runs: int,
        is_wicket: bool,
    ) -> Tuple[bool, BallOutcomeType, int, str]:
        """
        Calculates ball pool delta (+1, -1, 0), outcome type, and commentary based on the rules:

        Rules:
        - Preferred ball:
          * Runs scored (>0): +1 ball added
          * Dot ball (0 runs): -1 ball deducted
          * Wicket: -1 ball deducted
        - Not Preferred ball:
          * Runs scored (>0): -1 ball deducted
          * Dot ball (0 runs): 0 (No deduction)
          * Wicket: -1 ball deducted

        Returns: (is_preferred, outcome_type, ball_pool_delta, commentary)
        """
        is_pref = cls.is_preferred_ball(ball_number, preference)

        if is_wicket:
            outcome = BallOutcomeType.WICKET
            delta = -1
            pref_str = "Preferred" if is_pref else "Non-Preferred"
            commentary = f"OUT! Wicket on {pref_str} Ball #{ball_number} (Rule Penalty: -1 Ball)"
        elif runs > 0:
            outcome = BallOutcomeType.RUN
            if is_pref:
                delta = +1
                commentary = f"HIT! {runs} run(s) on Preferred Ball #{ball_number} (Rule Reward: +1 Bonus Ball)"
            else:
                delta = -1
                commentary = f"HIT! {runs} run(s) on Non-Preferred Ball #{ball_number} (Rule Penalty: -1 Ball)"
        else:
            outcome = BallOutcomeType.DOT
            if is_pref:
                delta = -1
                commentary = f"DOT! No runs on Preferred Ball #{ball_number} (Rule Penalty: -1 Ball)"
            else:
                delta = 0
                commentary = f"DOT! Played safe on Non-Preferred Ball #{ball_number} (Rule Safe: No Penalty, 0 Balls)"

        return is_pref, outcome, delta, commentary

    # ---------------------------------------------------------
    # Delivery Processing
    # ---------------------------------------------------------
    def process_delivery(self, runs: int = 0, is_wicket: bool = False) -> DeliveryResult:
        """
        Processes a single delivery for the active innings.
        Applies standard delivery ball consumption and rule-based ball adjustments.
        """
        innings = self.state.current_innings
        if innings is None or innings.is_completed:
            raise ValueError("No active innings to bowl a delivery.")

        # Ball number is 1-based sequential delivery bowled in this innings
        ball_number = innings.deliveries_bowled + 1
        preference = innings.batting_team.preferred_ball_type or BallPreference.ODD

        is_pref, outcome_type, delta, commentary = self.evaluate_delivery_rule(
            ball_number=ball_number,
            preference=preference,
            runs=runs,
            is_wicket=is_wicket,
        )

        # Update deliveries count
        innings.deliveries_bowled += 1

        # Track consecutive non-preferred scoring hits
        is_wicket_penalty = False
        if not is_pref:
            if is_wicket:
                innings.non_pref_scoring_streak = 0
            elif runs > 0:
                innings.non_pref_scoring_streak += 1
                if innings.non_pref_scoring_streak >= 3:
                    # 3rd consecutive non-preferred scoring hit triggers Wicket Penalty
                    is_wicket_penalty = True
                    innings.wickets += 1
                    innings.non_pref_scoring_streak = 0
                    commentary += " | 💥 WICKET PENALTY! 3rd consecutive non-preferred hit costs 1 WICKET!"
            else:
                # Safe dot ball on non-preferred resets the risky streak
                innings.non_pref_scoring_streak = 0
        else:
            # On preferred ball, if wicket falls, reset streak
            if is_wicket:
                innings.non_pref_scoring_streak = 0

        # Update score
        if is_wicket:
            innings.wickets += 1
        else:
            innings.runs += runs

        # Update bonus/penalty metrics
        if delta > 0:
            innings.bonus_balls_earned += delta
        elif delta < 0:
            innings.penalty_balls_lost += abs(delta)

        # Net change to available remaining balls:
        # 1 delivery is bowled (-1), plus the rule modifier delta (+1, -1, or 0)
        net_change = -1 + delta
        new_remaining = max(0, innings.remaining_balls + net_change)
        innings.remaining_balls = new_remaining

        result = DeliveryResult(
            ball_number=ball_number,
            is_preferred_ball=is_pref,
            outcome_type=outcome_type,
            runs_scored=runs,
            is_wicket=is_wicket or is_wicket_penalty,
            ball_pool_delta=delta,
            net_balls_change=net_change,
            remaining_balls_after=new_remaining,
            commentary=commentary,
            metadata={
                "innings": innings.inning_number,
                "batting_team": innings.batting_team.name,
                "current_score": f"{innings.runs}/{innings.wickets}",
                "target": innings.target,
                "is_wicket_penalty": is_wicket_penalty,
                "non_pref_scoring_streak": innings.non_pref_scoring_streak,
            },
        )
        innings.history.append(result)

        # Check for innings completion or match conclusion
        self._check_innings_and_match_state()

        return result

    # ---------------------------------------------------------
    # State Transitions & End Conditions
    # ---------------------------------------------------------
    def _check_innings_and_match_state(self) -> None:
        innings = self.state.current_innings
        if innings is None:
            return

        # Check if innings is complete
        all_out = innings.wickets >= innings.max_wickets
        balls_exhausted = innings.remaining_balls <= 0

        # Inning 2 Target check
        target_chased = False
        if innings.inning_number == 2 and innings.target is not None:
            if innings.runs >= innings.target:
                target_chased = True

        if all_out or balls_exhausted or target_chased:
            innings.is_completed = True

            if innings.inning_number == 1:
                # Transition to Innings 2
                self._start_second_innings()
            elif innings.inning_number == 2:
                # Finish match
                self._finish_match()

    def _start_second_innings(self) -> None:
        inn1 = self.state.innings1
        assert inn1 is not None

        target = inn1.runs + 1
        batting_team = inn1.bowling_team
        bowling_team = inn1.batting_team

        self.state.innings2 = InningsState(
            inning_number=2,
            batting_team=batting_team,
            bowling_team=bowling_team,
            initial_balls=self.initial_balls,
            remaining_balls=self.initial_balls,
            max_wickets=self.max_wickets,
            target=target,
        )
        self.state.phase = MatchPhase.INNINGS_2

    def _finish_match(self) -> None:
        inn1 = self.state.innings1
        inn2 = self.state.innings2
        assert inn1 is not None and inn2 is not None

        self.state.phase = MatchPhase.MATCH_OVER

        if inn2.runs > inn1.runs:
            self.state.winner = inn2.batting_team
            wickets_left = inn2.max_wickets - inn2.wickets
            balls_left = inn2.remaining_balls
            self.state.result_description = (
                f"{inn2.batting_team.name} WON by {wickets_left} wickets "
                f"({balls_left} balls remaining)!"
            )
        elif inn1.runs > inn2.runs:
            self.state.winner = inn1.batting_team
            margin = inn1.runs - inn2.runs
            self.state.result_description = (
                f"{inn1.batting_team.name} WON by {margin} runs!"
            )
        else:
            self.state.is_tie = True
            self.state.winner = None
            self.state.result_description = (
                f"MATCH TIED! Both teams scored {inn1.runs} runs."
            )

    def is_game_over(self) -> bool:
        return self.state.phase == MatchPhase.MATCH_OVER
