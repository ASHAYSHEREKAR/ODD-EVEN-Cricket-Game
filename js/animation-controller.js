// ===================================
// ANIMATION CONTROLLER
// Bridges Game Logic with 2.5D Canvas Renderer & Procedural FX
// ===================================

const AnimationController = {
    isBowling: false,
    deliveryTimer: null,
    contactTime: 0,
    ballDuration: 1050,

    init() {
        const canvas = document.getElementById('game-canvas');
        if (canvas && window.CanvasRenderer) {
            CanvasRenderer.init(canvas);
        }
    },

    reset() {
        if (this.deliveryTimer) {
            clearTimeout(this.deliveryTimer);
            this.deliveryTimer = null;
        }
        this.isBowling = false;
        if (window.CanvasRenderer) {
            CanvasRenderer.state.ball.visible = false;
            CanvasRenderer.state.ball.isHit = false;
            CanvasRenderer.state.batsman.isSwinging = false;
            CanvasRenderer.state.batsman.isDefending = false;
            CanvasRenderer.state.stumps.batting.broken = false;
        }
    },

    /**
     * Start bowler delivery animation on canvas
     * Returns synchronous timing window metrics and a completion Promise
     */
    startBowlerDelivery(speed = 'medium', variation = 'standard') {
        this.reset();
        this.isBowling = true;

        if (window.CanvasRenderer) {
            this.ballDuration = CanvasRenderer.triggerPitchDelivery(speed, variation);
        }

        const startTime = performance.now();
        // The ball arrives at the batsman's batting crease at ~82% of the trajectory (yorker is slightly later/fuller at 85%, bouncers rise at 80%)
        let contactFraction = 0.82;
        if (variation === 'yorker') contactFraction = 0.85;
        if (variation === 'bouncer') contactFraction = 0.79;
        if (variation === 'slower') contactFraction = 0.83;

        this.contactTime = startTime + this.ballDuration * contactFraction;

        const promise = new Promise(resolve => {
            this.deliveryTimer = setTimeout(() => {
                resolve({
                    startTime,
                    contactTime: this.contactTime,
                    duration: this.ballDuration,
                    variation
                });
            }, this.ballDuration);
        });

        return {
            promise,
            startTime,
            contactTime: this.contactTime,
            duration: this.ballDuration,
            variation
        };
    },

    /**
     * Animate batsman swing with visual impact on Canvas
     */
    animateBatSwing(shotType = 'drive') {
        if (!window.CanvasRenderer) return;

        if (shotType === 'defend') {
            CanvasRenderer.triggerDefend();
        } else {
            CanvasRenderer.state.batsman.isSwinging = true;
            CanvasRenderer.state.batsman.swingProgress = 0;
        }
    },

    /**
     * Animate ball after being hit, defended, or missed
     */
    async animateBallFlight(runs, isWicket) {
        if (!window.CanvasRenderer) return;

        if (isWicket) {
            CanvasRenderer.triggerWicket();
            Utils.playSound('wicket');
        } else if (runs === 6) {
            CanvasRenderer.triggerHit(6);
            Utils.playSound('bat-hit');
            Utils.playSound('cheer');
        } else if (runs === 4) {
            CanvasRenderer.triggerHit(4);
            Utils.playSound('bat-hit');
            Utils.playSound('cheer');
        } else if (runs > 0) {
            CanvasRenderer.triggerHit(runs);
            Utils.playSound('bat-hit');
        } else {
            CanvasRenderer.triggerHit(0);
        }

        this.isBowling = false;
    },

    showFloatingBadge(delta, text) {
        if (window.CanvasRenderer) {
            const type = delta > 0 ? 'bonus' : (delta < 0 ? 'penalty' : 'safe');
            const cleanText = text.replace(/<[^>]*>?/gm, ' ');
            CanvasRenderer.addBadge(cleanText, type);
        }

        if (delta > 0) {
            Utils.playSound('bonus');
        } else if (delta < 0) {
            Utils.playSound('penalty');
        } else {
            Utils.playSound('safe');
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationController;
}
