// ===================================
// GAME LOGIC
// Core delivery rule matrix & shot timing mechanics
// ===================================

const GameLogic = {
    /**
     * Evaluates the exact Even/Odd rule matrix
     */
    evaluateDeliveryRule(ballNumber, preference, runs, isWicket) {
        const isPref = GameState.isPreferredBall(ballNumber, preference);
        let delta = 0;
        let commentary = '';
        let outcomeType = 'DOT';

        if (isWicket) {
            outcomeType = 'WICKET';
            delta = -1;
            const prefStr = isPref ? 'Preferred' : 'Non-Preferred';
            commentary = `OUT! Wicket on ${prefStr} Ball #${ballNumber} (-1 Ball Penalty)`;
        } else if (runs > 0) {
            outcomeType = 'RUN';
            if (isPref) {
                delta = +1;
                commentary = `CRACK! ${runs} Run(s) on Preferred Ball #${ballNumber} (+1 BONUS Ball!)`;
            } else {
                delta = -1;
                commentary = `HIT! ${runs} Run(s) on Non-Preferred Ball #${ballNumber} (-1 Ball Penalty)`;
            }
        } else {
            outcomeType = 'DOT';
            if (isPref) {
                delta = -1;
                commentary = `DOT BALL on Preferred Ball #${ballNumber} (-1 Ball Penalty)`;
            } else {
                delta = 0;
                commentary = `SAFE! Dot ball on Non-Preferred Ball #${ballNumber} (0 Penalty)`;
            }
        }

        return {
            isPreferred: isPref,
            outcomeType,
            delta,
            commentary
        };
    },

    /**
     * Process a delivery in the active innings
     */
    processDelivery(runs = 0, isWicket = false) {
        const battingKey = GameState.getCurrentBattingTeam();
        const battingTeam = GameState[battingKey];
        const ballNumber = battingTeam.deliveriesBowled + 1;
        const preference = battingTeam.preferredType || 'odd';

        const ruleResult = this.evaluateDeliveryRule(ballNumber, preference, runs, isWicket);

        // Update batting metrics
        battingTeam.deliveriesBowled += 1;
        if (isWicket) {
            battingTeam.wickets += 1;
        } else {
            battingTeam.runs += runs;
        }

        // Track boundary & shot breakdown (6, 4, 3, 2, 1, dots)
        if (!battingTeam.shots) {
            battingTeam.shots = { sixes: 0, fours: 0, threes: 0, twos: 0, ones: 0, dots: 0 };
        }
        if (runs === 6) battingTeam.shots.sixes++;
        else if (runs === 4) battingTeam.shots.fours++;
        else if (runs === 3) battingTeam.shots.threes++;
        else if (runs === 2) battingTeam.shots.twos++;
        else if (runs === 1) battingTeam.shots.ones++;
        else if (runs === 0) battingTeam.shots.dots++;

        if (ruleResult.delta > 0) {
            battingTeam.bonusEarned += ruleResult.delta;
        } else if (ruleResult.delta < 0) {
            battingTeam.penaltyLost += Math.abs(ruleResult.delta);
        }

        // Net balls change: -1 for delivery bowled + delta modifier
        const netChange = -1 + ruleResult.delta;
        const newRemaining = Math.max(0, GameState.match.remainingBalls + netChange);
        GameState.match.remainingBalls = newRemaining;

        const deliveryResult = {
            ballNumber,
            isPreferred: ruleResult.isPreferred,
            outcomeType: ruleResult.outcomeType,
            runsScored: runs,
            isWicket,
            delta: ruleResult.delta,
            netChange,
            remainingAfter: newRemaining,
            commentary: ruleResult.commentary
        };

        GameState.currentBall = deliveryResult;

        // Check Innings / Match progression
        const status = this.checkInningsStatus();

        return {
            ...deliveryResult,
            status
        };
    },

    /**
     * Checks if current innings is over or match is complete
     */
    checkInningsStatus() {
        const battingKey = GameState.getCurrentBattingTeam();
        const battingTeam = GameState[battingKey];
        const allOut = battingTeam.wickets >= GameState.match.maxWickets;
        const ballsExhausted = GameState.match.remainingBalls <= 0;

        let targetReached = false;
        if (GameState.match.currentInning === 2 && GameState.match.target !== null) {
            if (battingTeam.runs >= GameState.match.target) {
                targetReached = true;
            }
        }

        if (allOut || ballsExhausted || targetReached) {
            if (GameState.match.currentInning === 1) {
                return 'INNINGS_1_OVER';
            } else {
                return 'MATCH_OVER';
            }
        }

        return 'IN_PROGRESS';
    },

    /**
     * Calculates shot outcome based on timing offset (in ms from sweet spot)
     */
    calculateShotOutcome(timingOffsetMs, isDefensive = false) {
        if (isDefensive) {
            // Player chose safe defensive block: Guaranteed safe dot ball
            return {
                runs: 0,
                isWicket: false,
                rating: 'DEFENDED',
                ratingText: '🛡️ SOLID DEFENSE'
            };
        }

        const absOffset = Math.abs(timingOffsetMs);
        const isEarly = timingOffsetMs < 0;

        // Sweet spot: -95ms to +95ms
        if (absOffset <= 95) {
            const runs = Math.random() < 0.50 ? 6 : 4;
            return {
                runs,
                isWicket: false,
                rating: 'PERFECT',
                ratingText: runs === 6 ? '🚀 HUGE SIX!' : '⚡ CRACKING FOUR!'
            };
        } else if (absOffset <= 195) {
            // Good timing: 1 or 2 runs
            const runs = Math.random() < 0.65 ? 1 : 2;
            const prefix = isEarly ? '⚡ EARLY DRIVE' : '⚡ LATE CUT';
            return {
                runs,
                isWicket: false,
                rating: 'GOOD',
                ratingText: `${prefix} (${runs} RUN${runs > 1 ? 'S' : ''})`
            };
        } else if (absOffset <= 320) {
            // Mistimed: Early or Late
            const roll = Math.random();
            const tag = isEarly ? '⚠️ SWUNG EARLY' : '⚠️ SWUNG LATE';
            if (roll < 0.25) {
                return {
                    runs: 0,
                    isWicket: true,
                    rating: 'CAUGHT',
                    ratingText: `🧤 ${tag} (CAUGHT!)`
                };
            } else {
                return {
                    runs: 0,
                    isWicket: false,
                    rating: 'MISTIMED',
                    ratingText: `${tag} (DOT)`
                };
            }
        } else {
            // Complete miss / Clean bowled
            const roll = Math.random();
            if (roll < 0.40) {
                return {
                    runs: 0,
                    isWicket: true,
                    rating: 'BOWLED',
                    ratingText: '🪵 BOWLED OUT!'
                };
            } else {
                return {
                    runs: 0,
                    isWicket: false,
                    rating: 'BEATEN',
                    ratingText: '💨 PLAYED & MISSED'
                };
            }
        }
    },

    /**
     * AI Batting decision for Computer turns
     */
    simulateAIBattingTurn() {
        const battingTeam = GameState.computer;
        const nextBall = battingTeam.deliveriesBowled + 1;
        const isPref = GameState.isPreferredBall(nextBall, battingTeam.preferredType);

        if (isPref) {
            // AI attacks on preferred balls
            const roll = Math.random();
            if (roll < 0.12) {
                return { runs: 0, isWicket: true, rating: 'WICKET', ratingText: '🧤 OUT!' };
            } else if (roll < 0.45) {
                const runs = Math.random() < 0.5 ? 6 : 4;
                return { runs, isWicket: false, rating: 'PERFECT', ratingText: runs === 6 ? '🚀 6 RUNS' : '⚡ 4 RUNS' };
            } else if (roll < 0.85) {
                const runs = Math.random() < 0.7 ? 1 : 2;
                return { runs, isWicket: false, rating: 'GOOD', ratingText: `${runs} RUN(S)` };
            } else {
                return { runs: 0, isWicket: false, rating: 'DOT', ratingText: 'DOT' };
            }
        } else {
            // AI defends on non-preferred balls
            const roll = Math.random();
            if (roll < 0.80) {
                return { runs: 0, isWicket: false, rating: 'DEFENDED', ratingText: '🛡️ DEFENDED (SAFE)' };
            } else if (roll < 0.90) {
                return { runs: 1, isWicket: false, rating: 'GOOD', ratingText: '1 RUN' };
            } else {
                return { runs: 0, isWicket: true, rating: 'WICKET', ratingText: '🧤 OUT!' };
            }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameLogic;
}
