"""
Data models, enums, and state schemas for the Even/Odd Cricket Game.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any


class BallPreference(str, Enum):
    EVEN = "EVEN"
    ODD = "ODD"


class MatchPhase(str, Enum):
    SETUP = "SETUP"
    TOSS = "TOSS"
    INNINGS_1 = "INNINGS_1"
    INNINGS_BREAK = "INNINGS_BREAK"
    INNINGS_2 = "INNINGS_2"
    MATCH_OVER = "MATCH_OVER"


class BallOutcomeType(str, Enum):
    RUN = "RUN"
    DOT = "DOT"
    WICKET = "WICKET"


@dataclass
class DeliveryResult:
    ball_number: int             # 1-based sequential delivery number in this innings (1, 2, 3, ...)
    is_preferred_ball: bool      # True if ball_number matches batting team's preference
    outcome_type: BallOutcomeType # RUN, DOT, or WICKET
    runs_scored: int             # Runs added to batting team's score (0, 1, 2, 3, 4, 6, etc.)
    is_wicket: bool              # True if a wicket fell
    ball_pool_delta: int         # Adjustment to remaining ball pool (+1, -1, 0)
    net_balls_change: int        # Net change to remaining balls (-1 standard delivery + delta)
    remaining_balls_after: int   # Remaining balls pool after this delivery
    commentary: str              # Explanatory commentary message
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ball_number": self.ball_number,
            "is_preferred_ball": self.is_preferred_ball,
            "outcome_type": self.outcome_type.value,
            "runs_scored": self.runs_scored,
            "is_wicket": self.is_wicket,
            "ball_pool_delta": self.ball_pool_delta,
            "net_balls_change": self.net_balls_change,
            "remaining_balls_after": self.remaining_balls_after,
            "commentary": self.commentary,
            "metadata": self.metadata
        }


@dataclass
class Team:
    name: str
    is_human: bool = False
    preferred_ball_type: Optional[BallPreference] = None


@dataclass
class InningsState:
    inning_number: int           # 1 or 2
    batting_team: Team
    bowling_team: Team
    runs: int = 0
    wickets: int = 0
    max_wickets: int = 10
    deliveries_bowled: int = 0   # Total actual deliveries bowled (1, 2, 3...)
    initial_balls: int = 12      # Starting quota of balls
    bonus_balls_earned: int = 0  # Total +1 additions from rules
    penalty_balls_lost: int = 0  # Total -1 deductions from rules
    remaining_balls: int = 12    # Dynamic available balls pool
    non_pref_scoring_streak: int = 0 # Consecutive scoring hits (>0) on non-preferred balls
    is_completed: bool = False
    target: Optional[int] = None # For inning 2
    history: List[DeliveryResult] = field(default_factory=list)

    @property
    def total_balls_allocated(self) -> int:
        """Initial balls + bonus balls earned - penalty balls lost."""
        return self.initial_balls + self.bonus_balls_earned - self.penalty_balls_lost

    def to_dict(self) -> Dict[str, Any]:
        return {
            "inning_number": self.inning_number,
            "batting_team": self.batting_team.name,
            "bowling_team": self.bowling_team.name,
            "preference": self.batting_team.preferred_ball_type.value if self.batting_team.preferred_ball_type else None,
            "runs": self.runs,
            "wickets": self.wickets,
            "max_wickets": self.max_wickets,
            "deliveries_bowled": self.deliveries_bowled,
            "remaining_balls": self.remaining_balls,
            "non_pref_scoring_streak": self.non_pref_scoring_streak,
            "total_balls_allocated": self.total_balls_allocated,
            "bonus_balls_earned": self.bonus_balls_earned,
            "penalty_balls_lost": self.penalty_balls_lost,
            "is_completed": self.is_completed,
            "target": self.target,
            "history_count": len(self.history)
        }


@dataclass
class MatchState:
    team1: Team
    team2: Team
    initial_balls_per_innings: int = 12
    max_wickets: int = 10
    phase: MatchPhase = MatchPhase.SETUP
    toss_winner: Optional[Team] = None
    toss_loser: Optional[Team] = None
    first_batting_team: Optional[Team] = None
    innings1: Optional[InningsState] = None
    innings2: Optional[InningsState] = None
    winner: Optional[Team] = None
    is_tie: bool = False
    result_description: str = ""

    @property
    def current_innings(self) -> Optional[InningsState]:
        if self.phase == MatchPhase.INNINGS_1:
            return self.innings1
        elif self.phase == MatchPhase.INNINGS_2:
            return self.innings2
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "phase": self.phase.value,
            "team1": self.team1.name,
            "team2": self.team2.name,
            "toss_winner": self.toss_winner.name if self.toss_winner else None,
            "first_batting_team": self.first_batting_team.name if self.first_batting_team else None,
            "innings1": self.innings1.to_dict() if self.innings1 else None,
            "innings2": self.innings2.to_dict() if self.innings2 else None,
            "winner": self.winner.name if self.winner else ("TIE" if self.is_tie else None),
            "result_description": self.result_description
        }
