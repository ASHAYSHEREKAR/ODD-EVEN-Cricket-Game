// ==========================================================================
// Cricket Mascot 2.5D Canvas Renderer
// Characters: Leo the Lion Batsman, Dynamic Bowlers (Cheetah/Fox/Mantis),
//             Snails Outfield Fielders, Milo the Monkey Keeper, Professor Giraffe Umpire
// ==========================================================================

// Safe cross-browser RoundRect helper
function safeRoundRect(ctx, x, y, w, h, radius) {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    let r0 = 0, r1 = 0, r2 = 0, r3 = 0;
    if (typeof radius === 'number') {
        const r = Math.max(0, Math.min(radius, w / 2, h / 2));
        r0 = r1 = r2 = r3 = r;
    } else if (Array.isArray(radius)) {
        r0 = Math.max(0, Math.min(radius[0] || 0, w / 2, h / 2));
        r1 = Math.max(0, Math.min(radius[1] !== undefined ? radius[1] : r0, w / 2, h / 2));
        r2 = Math.max(0, Math.min(radius[2] !== undefined ? radius[2] : r0, w / 2, h / 2));
        r3 = Math.max(0, Math.min(radius[3] !== undefined ? radius[3] : r1, w / 2, h / 2));
    }
    ctx.beginPath();
    ctx.moveTo(x + r0, y);
    ctx.lineTo(x + w - r1, y);
    ctx.arcTo(x + w, y, x + w, y + r1, r1);
    ctx.lineTo(x + w, y + h - r2);
    ctx.arcTo(x + w, y + h, x + w - r2, y + h, r2);
    ctx.lineTo(x + r3, y + h);
    ctx.arcTo(x, y + h, x, y + h - r3, r3);
    ctx.lineTo(x, y + r0);
    ctx.arcTo(x, y, x + r0, y, r0);
    ctx.closePath();
}

// Safe cross-browser Ellipse helper
function safeEllipse(ctx, x, y, radiusX, radiusY, rotation = 0) {
    radiusX = Math.max(0.1, Math.abs(radiusX));
    radiusY = Math.max(0.1, Math.abs(radiusY));
    if (typeof ctx.ellipse === 'function') {
        try {
            ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
            return;
        } catch (e) {}
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(radiusX, radiusY);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.restore();
}

const CanvasRenderer = {
    canvas: null,
    ctx: null,
    width: 500,
    height: 600,
    dpr: 1,
    isRunning: false,
    lastTime: 0,

    // Animation States & Mascot Cast
    state: {
        ball: {
            x: 250,
            y: 110,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            visible: false,
            rotation: 0,
            spinSpeed: 0.15,
            isHit: false,
            deliveryProgress: 0,
            deliveryDuration: 1050,
            deliveryStartTime: 0,
            hasBounced: false,
            variation: 'standard'
        },
        bowler: {
            x: 242,
            y: 95,
            type: 'cheetah', // 'cheetah' | 'fox' | 'mantis'
            runUpOffset: 0,
            armAngle: 0,
            isBowling: false,
            runUpProgress: 0,
            strideCycle: 0,
            torsoLean: 0,
            tailWag: 0,
            emotion: 'idle', // 'idle' | 'celebrate' | 'frustrated'
            emotionTimer: 0
        },
        batsman: {
            x: 250,              // Centered
            y: 452,              // Standing proudly in FRONT of the wickets
            batAngle: 28,
            batOffsetY: 0,
            isSwinging: false,
            isDefending: false,
            isRunning: false,
            swingProgress: 0,
            runProgress: 0,
            stanceOffset: 0,
            tapOffset: 0,
            tailWag: 0,
            emotion: 'idle',    // 'idle' | 'celebrate' | 'dismay'
            emotionTimer: 0,
            swingType: 'drive', // 'drive' | 'six' | 'four' | 'defend'
            headTilt: 0
        },
        umpire: {
            x: 286,              // Behind bowling stumps
            y: 82,
            signal: 'idle',     // 'idle' | 'six' | 'four' | 'out' | 'safe'
            signalTimer: 0,
            armPhase: 0,
            neckExtend: 0
        },
        keeper: {
            x: 286,              // Behind batsman & stumps to off-side
            y: 510,
            crouchBob: 0,
            tailAngle: 0,
            isCatching: false,
            catchTimer: 0
        },
        stumps: {
            bowling: { x: 250, y: 104, broken: false },
            batting: {
                x: 250,
                y: 476,          // Planted BEHIND the batsman
                broken: false,
                bails: [
                    { x: -5, y: -37, vx: 0, vy: 0, vz: 0, rot: 0, vrot: 0 },
                    { x: 5, y: -37, vx: 0, vy: 0, vz: 0, rot: 0, vrot: 0 }
                ]
            }
        },
        snails: [
            { x: 75, y: 170, color: '#f472b6', bandana: '#f43f5e', targetX: 75, targetY: 170, speed: 1.1, eyeAngle: 0, bob: 0, isDiving: false, rollAngle: 0, isCheering: false },
            { x: 425, y: 180, color: '#fde047', bandana: '#0284c7', targetX: 425, targetY: 180, speed: 1.1, eyeAngle: 0, bob: 0, isDiving: false, rollAngle: 0, isCheering: false },
            { x: 65, y: 340, color: '#38bdf8', bandana: '#10b981', targetX: 65, targetY: 340, speed: 1.3, eyeAngle: 0, bob: 0, isDiving: false, rollAngle: 0, isCheering: false },
            { x: 435, y: 355, color: '#c084fc', bandana: '#fb923c', targetX: 435, targetY: 355, speed: 1.3, eyeAngle: 0, bob: 0, isDiving: false, rollAngle: 0, isCheering: false },
            { x: 380, y: 505, color: '#fb923c', bandana: '#ef4444', targetX: 380, targetY: 505, speed: 1.5, eyeAngle: 0, bob: 0, isDiving: false, rollAngle: 0, isCheering: false }
        ],
        particles: [],
        shockwaves: [],
        pitchMarks: [],
        floatingBadges: [],
        flashText: null,
        flashTimer: 0,
        crowdWave: 0,
        crowdCheer: 0,
        isPreferredBall: false
    },

    init(canvasElement) {
        if (!canvasElement) {
            canvasElement = document.getElementById('game-canvas');
        }
        if (!canvasElement) return;

        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 80));

        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.startLoop();
        }
    },

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
        this.width = (rect && rect.width > 50) ? rect.width : (this.canvas.clientWidth || 480);
        this.height = (rect && rect.height > 50) ? rect.height : (this.canvas.clientHeight || 540);
        this.dpr = window.devicePixelRatio || 1;

        this.canvas.width = Math.floor(this.width * this.dpr);
        this.canvas.height = Math.floor(this.height * this.dpr);

        if (this.ctx) {
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        const centerX = this.width / 2;
        const pitchTopY = this.height * 0.17;
        const pitchBottomY = this.height * 0.77;

        // 1. Lion Batsman: Standing in FRONT of the wickets
        this.state.batsman.x = centerX - 6;
        this.state.batsman.y = pitchBottomY - 24;

        // 2. Batting Stumps: Planted BEHIND the batsman
        this.state.stumps.batting.x = centerX;
        this.state.stumps.batting.y = pitchBottomY;

        // 3. Wicketkeeper: Behind batsman & stumps to off-side
        this.state.keeper.x = centerX + 36;
        this.state.keeper.y = pitchBottomY + 28;

        // 4. Bowling Stumps
        this.state.stumps.bowling.x = centerX;
        this.state.stumps.bowling.y = pitchTopY - 6;

        // 5. Bowler
        this.state.bowler.x = centerX - 10;
        this.state.bowler.y = pitchTopY - 8;

        // 6. Umpire
        this.state.umpire.x = centerX + 36;
        this.state.umpire.y = pitchTopY - 20;

        // 7. Snail Fielders
        this.state.snails = [
            { x: this.width * 0.15, y: this.height * 0.26, color: '#f472b6', bandana: '#f43f5e', targetX: this.width * 0.15, targetY: this.height * 0.26, speed: 0.8, eyeAngle: 0, rollAngle: 0 },
            { x: this.width * 0.85, y: this.height * 0.28, color: '#fde047', bandana: '#0284c7', targetX: this.width * 0.85, targetY: this.height * 0.28, speed: 0.8, eyeAngle: 0, rollAngle: 0 },
            { x: this.width * 0.12, y: this.height * 0.52, color: '#38bdf8', bandana: '#10b981', targetX: this.width * 0.12, targetY: this.height * 0.52, speed: 1.0, eyeAngle: 0, rollAngle: 0 },
            { x: this.width * 0.88, y: this.height * 0.54, color: '#c084fc', bandana: '#fb923c', targetX: this.width * 0.88, targetY: this.height * 0.54, speed: 1.0, eyeAngle: 0, rollAngle: 0 },
            { x: this.width * 0.80, y: this.height * 0.76, color: '#fb923c', bandana: '#ef4444', targetX: this.width * 0.80, targetY: this.height * 0.76, speed: 1.2, eyeAngle: 0, rollAngle: 0 }
        ];
    },

    startLoop() {
        const render = (currentTime) => {
            const dt = Math.min(32, currentTime - this.lastTime);
            this.lastTime = currentTime;

            try {
                this.update(currentTime, dt);
                this.draw();
            } catch (err) {
                console.error('Render loop tick error:', err);
            }
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    },

    update(time, dt) {
        if (window.cricketGameApp && window.cricketGameApp.isPaused) return;

        const s = this.state;
        s.crowdWave = Math.sin(time / 320);
        if (s.crowdCheer > 0) {
            s.crowdCheer = Math.max(0, s.crowdCheer - 0.015);
        }

        // 1. Lion Batsman Breathing & Bat Tap
        s.batsman.stanceOffset = Math.sin(time / 250) * 1.5;
        s.batsman.tailWag = Math.sin(time / 180) * 0.35;
        if (!s.batsman.isSwinging && !s.batsman.isDefending && !s.batsman.isRunning) {
            s.batsman.tapOffset = Math.sin(time / 160) > 0.55 ? -3.0 : 0;
        } else {
            s.batsman.tapOffset = 0;
        }

        if (s.batsman.emotionTimer > 0) {
            s.batsman.emotionTimer--;
            if (s.batsman.emotionTimer <= 0) {
                s.batsman.emotion = 'idle';
            }
        }

        // 2. Bowler Run-Up & Stride
        s.bowler.tailWag = Math.sin(time / 140) * 0.45;
        if (s.bowler.isBowling) {
            if (s.bowler.runUpProgress < 1.0) {
                s.bowler.runUpProgress += 0.045;
                s.bowler.strideCycle += 0.35;
                s.bowler.runUpOffset = Math.sin(s.bowler.runUpProgress * Math.PI) * 15 + Math.abs(Math.sin(s.bowler.strideCycle)) * 3.5;
                s.bowler.torsoLean = Math.sin(s.bowler.runUpProgress * Math.PI) * 0.24;
            }
            s.bowler.armAngle -= 0.28;

            if (s.bowler.runUpProgress > 0.72 && s.bowler.runUpProgress < 0.78) {
                this.addPitchDust(s.bowler.x + 8, s.bowler.y + 18);
            }

            if (s.bowler.armAngle < -Math.PI * 2) {
                s.bowler.armAngle = 0;
                s.bowler.isBowling = false;
                s.bowler.runUpProgress = 0;
                s.bowler.runUpOffset = 0;
                s.bowler.torsoLean = 0;
            }
        }

        if (s.bowler.emotionTimer > 0) {
            s.bowler.emotionTimer--;
            if (s.bowler.emotionTimer <= 0) {
                s.bowler.emotion = 'idle';
            }
        }

        // 3. Monkey Keeper Crouch & Reflexes
        s.keeper.crouchBob = Math.sin(time / 220) * 1.5;
        s.keeper.tailAngle = Math.sin(time / 160) * 0.4;
        if (s.keeper.catchTimer > 0) {
            s.keeper.catchTimer--;
            if (s.keeper.catchTimer <= 0) s.keeper.isCatching = false;
        }

        // 4. Giraffe Umpire Signal Timer
        s.umpire.armPhase += 0.12;
        if (s.umpire.signalTimer > 0) {
            s.umpire.signalTimer--;
            s.umpire.neckExtend = Math.min(1.0, s.umpire.neckExtend + 0.08);
            if (s.umpire.signalTimer <= 0) {
                s.umpire.signal = 'idle';
            }
        } else {
            s.umpire.neckExtend = Math.max(0, s.umpire.neckExtend - 0.05);
        }

        // 5. 3D Ball Trajectory Simulation & Seam
        if (s.ball.visible) {
            s.ball.rotation += s.ball.spinSpeed;
            if (!s.ball.isHit) {
                const elapsed = performance.now() - s.ball.deliveryStartTime;
                const progress = Math.min(1.0, elapsed / s.ball.deliveryDuration);
                s.ball.deliveryProgress = progress;

                const startX = s.bowler.x + 4;
                const startY = s.bowler.y + 16;
                const targetX = s.stumps.batting.x;
                const targetY = s.stumps.batting.y - 8;

                let swingOffsetX = 0;
                if (s.ball.variation === 'inswinger') {
                    swingOffsetX = -Math.sin(progress * Math.PI) * 18;
                } else if (s.ball.variation === 'outswinger') {
                    swingOffsetX = Math.sin(progress * Math.PI) * 18;
                } else if (s.ball.variation === 'googly') {
                    swingOffsetX = progress > 0.5 ? Math.sin((progress - 0.5) * 2 * Math.PI) * 14 : 0;
                }

                s.ball.x = startX + (targetX - startX) * progress + swingOffsetX;
                s.ball.y = startY + (targetY - startY) * progress;

                const bounceT = s.ball.bouncePitchPoint || 0.50;
                if (progress < bounceT) {
                    const normT = progress / bounceT;
                    s.ball.z = (1 - normT) * 24 + Math.sin(normT * Math.PI * 0.5) * 4;
                } else {
                    const normT = (progress - bounceT) / (1 - bounceT);
                    if (!s.ball.hasBounced) {
                        s.ball.hasBounced = true;
                        this.addPitchDust(s.ball.x, s.ball.y);
                        this.addPitchMark(s.ball.x, s.ball.y);
                    }
                    const maxZ = s.ball.maxBounceZ || 18;
                    s.ball.z = Math.sin(normT * Math.PI) * maxZ + (1 - normT) * 2;
                }

                if (progress >= 1.0 && !s.ball.isHit) {
                    s.ball.visible = false;
                }
            } else {
                s.ball.x += s.ball.vx;
                s.ball.y += s.ball.vy;
                s.ball.z = Math.max(0, s.ball.z + s.ball.vz);
                s.ball.vz -= 0.65;

                if (s.ball.z === 0 && Math.abs(s.ball.vz) > 1) {
                    s.ball.vz = -s.ball.vz * 0.45;
                    this.addGrassParticles(s.ball.x, s.ball.y);
                }

                if (s.ball.x < -60 || s.ball.x > this.width + 60 || s.ball.y < -60 || s.ball.y > this.height + 60) {
                    s.ball.visible = false;
                }
            }
        }

        // 6. Batsman Stroke Articulation
        if (s.batsman.isSwinging) {
            s.batsman.swingProgress += 0.12;
            if (s.batsman.swingType === 'six') {
                s.batsman.batAngle = 28 - Math.sin(s.batsman.swingProgress * Math.PI) * 155;
                s.batsman.headTilt = -Math.sin(s.batsman.swingProgress * Math.PI) * 0.28;
            } else if (s.batsman.swingType === 'four') {
                s.batsman.batAngle = 28 - Math.sin(s.batsman.swingProgress * Math.PI) * 110;
                s.batsman.headTilt = Math.sin(s.batsman.swingProgress * Math.PI) * 0.18;
            } else {
                s.batsman.batAngle = 28 - Math.sin(s.batsman.swingProgress * Math.PI) * 95;
            }

            if (s.batsman.swingProgress >= 1.0) {
                s.batsman.isSwinging = false;
                s.batsman.swingProgress = 0;
                s.batsman.batAngle = 28;
                s.batsman.headTilt = 0;
            }
        } else if (s.batsman.isDefending) {
            s.batsman.batAngle = -22;
            s.batsman.headTilt = 0.15;
        } else if (!s.batsman.isRunning) {
            s.batsman.batAngle = 28 + Math.sin(time / 200) * 3.5;
            s.batsman.headTilt = 0;
        }

        if (s.batsman.isRunning) {
            s.batsman.runProgress += 0.08;
        } else {
            s.batsman.runProgress = 0;
        }

        // 7. Stumps Physics
        if (s.stumps.batting.broken) {
            s.stumps.batting.bails.forEach(bail => {
                bail.x += bail.vx;
                bail.y += bail.vy;
                bail.z = Math.max(0, bail.z + bail.vz);
                bail.vz -= 0.55;
                bail.rot += bail.vrot;
            });
        }

        // 8. Hog Rider Fielders Gallop & Ball Tracking
        s.snails.forEach(f => {
            if (s.ball.visible) {
                const dx = s.ball.x - f.x;
                const dy = s.ball.y - f.y;
                f.eyeAngle = Math.atan2(dy, dx);

                if (s.ball.isHit) {
                    const dist = Math.hypot(dx, dy);
                    if (dist < 120 && dist > 15) {
                        f.targetX = f.x + (dx / dist) * 22;
                        f.targetY = f.y + (dy / dist) * 22;
                        f.isDiving = true;
                        f.rollAngle = (dx > 0 ? 0.15 : -0.15);
                    }
                }
            } else {
                f.eyeAngle = 0;
                f.isDiving = false;
                f.rollAngle = 0;
            }

            f.x += (f.targetX - f.x) * 0.06;
            f.y += (f.targetY - f.y) * 0.06;
            f.bob = Math.sin(time / 140 + f.x) * 2.2;
        });

        // 9. Shockwaves & Pitch Marks
        for (let i = s.shockwaves.length - 1; i >= 0; i--) {
            const sw = s.shockwaves[i];
            sw.radius += 2.8;
            sw.alpha -= 0.04;
            if (sw.alpha <= 0) s.shockwaves.splice(i, 1);
        }

        for (let i = s.pitchMarks.length - 1; i >= 0; i--) {
            const pm = s.pitchMarks[i];
            pm.alpha -= 0.003;
            if (pm.alpha <= 0) s.pitchMarks.splice(i, 1);
        }

        // 10. Particles & Badges
        for (let i = s.particles.length - 1; i >= 0; i--) {
            const p = s.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.025;
            if (p.life <= 0) s.particles.splice(i, 1);
        }

        for (let i = s.floatingBadges.length - 1; i >= 0; i--) {
            const b = s.floatingBadges[i];
            b.y -= 0.9;
            b.alpha -= 0.018;
            if (b.alpha <= 0) s.floatingBadges.splice(i, 1);
        }

        if (s.flashTimer > 0) {
            s.flashTimer -= 1;
            if (s.flashTimer <= 0) s.flashText = null;
        }
    },

    draw() {
        const ctx = this.ctx;
        if (!ctx) return;

        const w = this.width;
        const h = this.height;
        const centerX = w / 2;

        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // 1. Outfield Grass
        const grad = ctx.createRadialGradient(centerX, h * 0.55, 30, centerX, h * 0.55, w * 0.95);
        grad.addColorStop(0, '#22c55e');
        grad.addColorStop(0.45, '#16a34a');
        grad.addColorStop(0.85, '#15803d');
        grad.addColorStop(1, '#14532d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Mower Stripes Fan
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
        for (let i = -6; i <= 6; i++) {
            ctx.beginPath();
            ctx.moveTo(centerX + i * 20, 0);
            ctx.lineTo(centerX + (i + 0.5) * 20, 0);
            ctx.lineTo(centerX + (i + 0.5) * 75, h);
            ctx.lineTo(centerX + i * 75, h);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // 2. Boundary Rope
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        safeEllipse(ctx, centerX, h * 0.54, w * 0.47, h * 0.44, 0);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Grandstand & Animated Crowd
        this.drawCrowd(ctx, w, 52);

        // 4. Pitch Surface
        const pitchTopY = h * 0.17;
        const pitchBottomY = h * 0.81;
        const pitchTopW = Math.min(65, w * 0.14);
        const pitchBottomW = Math.min(145, w * 0.33);

        const pTopLeft = centerX - pitchTopW / 2;
        const pTopRight = centerX + pitchTopW / 2;
        const pBotLeft = centerX - pitchBottomW / 2;
        const pBotRight = centerX + pitchBottomW / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        ctx.moveTo(pTopLeft - 4, pitchTopY + 4);
        ctx.lineTo(pTopRight + 4, pitchTopY + 4);
        ctx.lineTo(pBotRight + 6, pitchBottomY + 6);
        ctx.lineTo(pBotLeft - 6, pitchBottomY + 6);
        ctx.closePath();
        ctx.fill();

        const pitchGrad = ctx.createLinearGradient(centerX, pitchTopY, centerX, pitchBottomY);
        pitchGrad.addColorStop(0, '#d4a373');
        pitchGrad.addColorStop(0.35, '#faedcd');
        pitchGrad.addColorStop(0.70, '#faedcd');
        pitchGrad.addColorStop(1, '#c89666');
        ctx.fillStyle = pitchGrad;

        ctx.beginPath();
        ctx.moveTo(pTopLeft, pitchTopY);
        ctx.lineTo(pTopRight, pitchTopY);
        ctx.lineTo(pBotRight, pitchBottomY);
        ctx.lineTo(pBotLeft, pitchBottomY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();

        this.drawPitchMarks(ctx);

        // Crease Lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;

        // Bowling Crease
        const topCreaseY = pitchTopY + 28;
        const topRatio = (topCreaseY - pitchTopY) / (pitchBottomY - pitchTopY);
        const topW = pitchTopW + (pitchBottomW - pitchTopW) * topRatio;
        ctx.beginPath();
        ctx.moveTo(centerX - topW / 2 + 2, topCreaseY);
        ctx.lineTo(centerX + topW / 2 - 2, topCreaseY);
        ctx.stroke();

        // Batting Crease
        const botCreaseY = pitchBottomY - 26;
        const botRatio = (botCreaseY - pitchTopY) / (pitchBottomY - pitchTopY);
        const botW = pitchTopW + (pitchBottomW - pitchTopW) * botRatio;
        ctx.beginPath();
        ctx.moveTo(centerX - botW / 2 + 3, botCreaseY);
        ctx.lineTo(centerX + botW / 2 - 3, botCreaseY);
        ctx.stroke();

        if (this.state.isPreferredBall) {
            ctx.save();
            const glowAlpha = 0.35 + 0.25 * Math.sin(Date.now() / 240);
            ctx.strokeStyle = `rgba(255, 214, 0, ${glowAlpha})`;
            ctx.lineWidth = 5;
            ctx.shadowColor = '#ffd600';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(centerX - botW / 2 + 2, botCreaseY);
            ctx.lineTo(centerX + botW / 2 - 2, botCreaseY);
            ctx.stroke();
            ctx.restore();
        }

        // 5. Bowling Stumps
        this.drawStumps(ctx, this.state.stumps.bowling.x, this.state.stumps.bowling.y, 0.70, false);

        // 6. Giraffe Umpire (Top Right behind bowling stumps)
        this.drawGiraffeUmpire(ctx, this.state.umpire, 0.70);

        // 7. Upper Fielders (Snails)
        this.state.snails.forEach(f => {
            if (f.y < h * 0.6) {
                const depthScale = 0.65 + 0.35 * (f.y / h);
                this.drawSnailFielder(ctx, f, depthScale);
            }
        });

        // 8. Dynamic Bowler (Cheetah / Fox / Mantis)
        const bowlerJump = this.state.bowler.emotion === 'celebrate' ? -Math.abs(Math.sin(Date.now() / 150)) * 12 : 0;
        this.drawDynamicBowler(ctx, this.state.bowler.x, this.state.bowler.y + this.state.bowler.runUpOffset + bowlerJump, 0.70);

        // 9. 3D Cricket Ball (when in flight before bat)
        if (this.state.ball.visible && !this.state.ball.isHit) {
            this.draw3DBall(ctx, this.state.ball, h);
        }

        // 10. Batting Stumps (Planted BEHIND the batsman)
        this.drawBattingStumps(ctx, this.state.stumps.batting);

        // 11. Lion Batsman (Standing in FRONT of the wickets)
        this.drawLionBatsman(ctx, this.state.batsman, 1.05);

        // 12. Monkey Wicketkeeper (Behind stumps off-side)
        this.drawMonkeyKeeper(ctx, this.state.keeper, 0.88);

        // 13. Lower Fielders (Snails)
        this.state.snails.forEach(f => {
            if (f.y >= h * 0.6) {
                const depthScale = 0.65 + 0.35 * (f.y / h);
                this.drawSnailFielder(ctx, f, depthScale);
            }
        });

        // 14. 3D Cricket Ball (when hit into outfield/air)
        if (this.state.ball.visible && this.state.ball.isHit) {
            this.draw3DBall(ctx, this.state.ball, h);
        }

        // 15. Shockwaves, Particles, Badges & Flash
        this.drawShockwaves(ctx);
        this.drawParticles(ctx);
        this.drawBadges(ctx);

        if (this.state.flashText) {
            this.drawFlash(ctx, w, h);
        }
    },

    drawCrowd(ctx, w, height) {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#090d16');
        grad.addColorStop(0.6, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(0, 0, w, 6);

        const colors = ['#f8fafc', '#38bdf8', '#f43f5e', '#ffd600', '#a855f7', '#34d399', '#fb923c'];
        const cheerBoost = (this.state.crowdCheer || 0) * 5;

        for (let i = 10; i < w - 8; i += 14) {
            for (let j = 8; j < height - 6; j += 12) {
                const col = colors[(i * 3 + j * 7) % colors.length];
                const waveOffset = Math.sin(i * 0.14 + this.state.crowdWave * 3.2) * (2.5 + cheerBoost);
                
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(i, j + waveOffset, 3.2, 0, Math.PI * 2);
                ctx.fill();

                if (j < 18 && (i % 42 === 0)) {
                    const flagAngle = Math.sin(Date.now() / 180 + i) * 0.35;
                    ctx.save();
                    ctx.translate(i, j + waveOffset - 4);
                    ctx.rotate(flagAngle);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(0, -9);
                    ctx.stroke();

                    ctx.fillStyle = col;
                    ctx.fillRect(0, -9, 7, 5);
                    ctx.restore();
                }
            }
        }

        [-w * 0.02, w * 0.94].forEach(lightX => {
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(lightX, 4, 22, 10);
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(lightX + 11, 9, 5, 0, Math.PI * 2);
            ctx.fill();

            const lightGrad = ctx.createRadialGradient(lightX + 11, 9, 3, lightX + 11, 9, 120);
            lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
            lightGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.08)');
            lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
            ctx.fillStyle = lightGrad;
            ctx.beginPath();
            ctx.arc(lightX + 11, 9, 120, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, height - 5, w, 5);
        ctx.fillStyle = '#ffffff';
        for (let b = 15; b < w; b += 60) {
            ctx.fillRect(b, height - 4, 30, 3);
        }
    },

    drawPitchMarks(ctx) {
        this.state.pitchMarks.forEach(pm => {
            ctx.save();
            ctx.fillStyle = `rgba(120, 53, 15, ${pm.alpha * 0.45})`;
            ctx.beginPath();
            safeEllipse(ctx, pm.x, pm.y, 6, 2.5, 0);
            ctx.fill();
            ctx.restore();
        });
    },

    drawStumps(ctx, x, y, scale = 1, broken = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.fillStyle = '#eab308';
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 1;

        [-9, 0, 9].forEach(offset => {
            safeRoundRect(ctx, offset - 2.5, -30, 5, 30, 2);
            ctx.fill();
            ctx.stroke();
        });

        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(-12, -33, 24, 3);
        ctx.restore();
    },

    drawBattingStumps(ctx, bStumps) {
        ctx.save();
        ctx.translate(bStumps.x, bStumps.y);
        ctx.scale(1.05, 1.05);

        if (bStumps.broken) {
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(-16, -18, 5, 24);
            ctx.fillRect(8, -14, 5, 24);
            ctx.fillRect(-3, -32, 5, 24);

            bStumps.bails.forEach(bail => {
                ctx.save();
                ctx.translate(bail.x, bail.y);
                ctx.rotate(bail.rot);
                ctx.fillStyle = '#ca8a04';
                ctx.fillRect(-6, -2, 12, 3);
                ctx.restore();
            });
        } else {
            ctx.fillStyle = '#fde047';
            ctx.strokeStyle = '#854d0e';
            ctx.lineWidth = 1.3;

            [-10, 0, 10].forEach(offset => {
                safeRoundRect(ctx, offset - 2.5, -34, 5, 34, 2);
                ctx.fill();
                ctx.stroke();
            });

            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(-12, -37, 11, 3);
            ctx.fillRect(1, -37, 11, 3);
        }
        ctx.restore();
    },

    // 🦒 Giraffe Umpire
    drawGiraffeUmpire(ctx, u, scale = 0.70) {
        ctx.save();
        ctx.translate(u.x, u.y);
        ctx.scale(scale, scale);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        safeEllipse(ctx, 0, 26, 14, 5, 0);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.2;
        ctx.fillRect(-6, 12, 4, 14);
        ctx.fillRect(2, 12, 4, 14);

        ctx.fillStyle = '#1e3a8a';
        safeRoundRect(ctx, -10, -8, 20, 22, 4);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -8, 6, 8);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-2, -5, 2, 0, Math.PI * 2);
        ctx.arc(2, -5, 2, 0, Math.PI * 2);
        ctx.fill();

        const neckH = 26 + (u.neckExtend || 0) * 12;
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        safeRoundRect(ctx, -4, -8 - neckH, 8, neckH + 2, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(-1, -12, 2.5, 0, Math.PI * 2);
        ctx.arc(1, -22, 2.2, 0, Math.PI * 2);
        if (neckH > 28) ctx.arc(-1, -30, 2.2, 0, Math.PI * 2);
        ctx.fill();

        const headY = -8 - neckH;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, headY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#78350f';
        ctx.fillRect(-4, headY - 14, 2, 6);
        ctx.fillRect(2, headY - 14, 2, 6);
        ctx.beginPath();
        ctx.arc(-3, headY - 14, 2.2, 0, Math.PI * 2);
        ctx.arc(3, headY - 14, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-6, headY - 3, 5, 5);
        ctx.strokeRect(1, headY - 3, 5, 5);
        ctx.beginPath();
        ctx.moveTo(-1, headY - 1);
        ctx.lineTo(1, headY - 1);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-3.5, headY - 0.5, 1.4, 0, Math.PI * 2);
        ctx.arc(3.5, headY - 0.5, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        safeEllipse(ctx, 0, headY - 8, 14, 4, 0);
        ctx.fill();
        ctx.stroke();
        safeRoundRect(ctx, -6, headY - 16, 12, 9, [3, 3, 0, 0]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, headY - 9, 12, 2.5);

        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';

        if (u.signal === 'six') {
            const wave = Math.sin(u.armPhase * 2) * 3;
            ctx.beginPath();
            ctx.moveTo(-8, -4);
            ctx.lineTo(-12 + wave, -28);
            ctx.moveTo(8, -4);
            ctx.lineTo(12 - wave, -28);
            ctx.stroke();
        } else if (u.signal === 'four') {
            const sweep = Math.sin(u.armPhase * 3) * 12;
            ctx.beginPath();
            ctx.moveTo(-8, -4);
            ctx.lineTo(-12, 6);
            ctx.moveTo(8, -4);
            ctx.lineTo(-6 + sweep, 2);
            ctx.stroke();
        } else if (u.signal === 'out') {
            ctx.beginPath();
            ctx.moveTo(-8, -4);
            ctx.lineTo(-12, 6);
            ctx.moveTo(8, -4);
            ctx.lineTo(10, -28);
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(10, -29, 2.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (u.signal === 'safe') {
            ctx.beginPath();
            ctx.moveTo(-8, -4);
            ctx.lineTo(-24, -4);
            ctx.moveTo(8, -4);
            ctx.lineTo(24, -4);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(-8, -4);
            ctx.lineTo(-12, 8);
            ctx.moveTo(8, -4);
            ctx.lineTo(12, 8);
            ctx.stroke();
        }

        ctx.restore();
    },

    // Dynamic Bowler Dispatcher
    drawDynamicBowler(ctx, x, y, scale = 0.70) {
        const bType = this.state.bowler.type || 'cheetah';
        if (bType === 'cheetah') {
            this.drawCheetahBowler(ctx, x, y, scale);
        } else if (bType === 'fox') {
            this.drawFoxBowler(ctx, x, y, scale);
        } else {
            this.drawMantisBowler(ctx, x, y, scale);
        }
    },

    // 🐆 Cheetah Fast Bowler
    drawCheetahBowler(ctx, x, y, scale = 0.70) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        const isRunning = this.state.bowler.isBowling;
        const legStride = isRunning ? Math.sin(this.state.bowler.strideCycle) * 14 : 0;
        const torsoTilt = this.state.bowler.torsoLean || 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        safeEllipse(ctx, 0, 30, 16, 6, 0);
        ctx.fill();

        ctx.save();
        ctx.translate(-4, 6);
        ctx.rotate(this.state.bowler.tailWag - 0.4);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-16, -10, -22, -4);
        ctx.stroke();
        ctx.strokeStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-18, -6);
        ctx.lineTo(-22, -4);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-8, 10 + legStride, 6, 20 - legStride * 0.4);
        ctx.strokeRect(-8, 10 + legStride, 6, 20 - legStride * 0.4);
        ctx.fillRect(2, 10 - legStride, 6, 20 + legStride * 0.4);
        ctx.strokeRect(2, 10 - legStride, 6, 20 + legStride * 0.4);

        ctx.save();
        ctx.rotate(torsoTilt);

        ctx.fillStyle = '#ef4444';
        safeRoundRect(ctx, -10, -8, 20, 20, 4);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-5, -3, 1.5, 0, Math.PI * 2);
        ctx.arc(5, 3, 1.5, 0, Math.PI * 2);
        ctx.arc(0, 8, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, -18, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(-8, -26, 4, 0, Math.PI * 2);
        ctx.arc(8, -26, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-8, -27, 2, 0, Math.PI * 2);
        ctx.arc(8, -27, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        safeEllipse(ctx, 0, -15, 5, 3.5, 0);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-1.5, -17, 3, 2);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-4, -19); ctx.lineTo(-4, -14);
        ctx.moveTo(4, -19); ctx.lineTo(4, -14);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-4, -20, 2, 0, Math.PI * 2);
        ctx.arc(4, -20, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-9, -4);
        if (this.state.bowler.emotion === 'celebrate') {
            ctx.lineTo(-18, -18);
        } else {
            ctx.lineTo(-16, 8 + (isRunning ? -legStride * 0.5 : 0));
        }
        ctx.stroke();

        ctx.save();
        ctx.translate(9, -4);
        if (this.state.bowler.emotion === 'celebrate') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(10, -16);
            ctx.stroke();
        } else {
            ctx.rotate(this.state.bowler.armAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 22);
            ctx.stroke();

            if (!this.state.ball.visible && !this.state.bowler.isBowling) {
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(0, 24, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        ctx.restore();
        ctx.restore();
    },

    // 🦊 Fox Spin Bowler
    drawFoxBowler(ctx, x, y, scale = 0.70) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        const isRunning = this.state.bowler.isBowling;
        const legStride = isRunning ? Math.sin(this.state.bowler.strideCycle) * 12 : 0;
        const torsoTilt = this.state.bowler.torsoLean || 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        safeEllipse(ctx, 0, 30, 15, 6, 0);
        ctx.fill();

        ctx.save();
        ctx.translate(-4, 8);
        ctx.rotate(this.state.bowler.tailWag - 0.3);
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        safeEllipse(ctx, -14, -8, 14, 8, -0.3);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-24, -10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#ea580c';
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-8, 10 + legStride, 6, 20 - legStride * 0.4);
        ctx.strokeRect(-8, 10 + legStride, 6, 20 - legStride * 0.4);
        ctx.fillRect(2, 10 - legStride, 6, 20 + legStride * 0.4);
        ctx.strokeRect(2, 10 - legStride, 6, 20 + legStride * 0.4);

        ctx.save();
        ctx.rotate(torsoTilt);

        ctx.fillStyle = '#9333ea';
        safeRoundRect(ctx, -10, -8, 20, 20, 4);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, -18, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-9, -22); ctx.lineTo(-12, -32); ctx.lineTo(-4, -26); ctx.closePath();
        ctx.moveTo(9, -22); ctx.lineTo(12, -32); ctx.lineTo(4, -26); ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        safeEllipse(ctx, 0, -14, 6, 4, 0);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, -16, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-4, -20, 2, 0, Math.PI * 2);
        ctx.arc(4, -20, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-9, -4);
        ctx.lineTo(-16, 8);
        ctx.stroke();

        ctx.save();
        ctx.translate(9, -4);
        if (this.state.bowler.emotion === 'celebrate') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(10, -16);
            ctx.stroke();
        } else {
            ctx.rotate(this.state.bowler.armAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 22);
            ctx.stroke();

            if (!this.state.ball.visible && !this.state.bowler.isBowling) {
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(0, 24, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        ctx.restore();
        ctx.restore();
    },

    // 🦗 Mantis Swing Bowler
    drawMantisBowler(ctx, x, y, scale = 0.70) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        const isRunning = this.state.bowler.isBowling;
        const legStride = isRunning ? Math.sin(this.state.bowler.strideCycle) * 12 : 0;
        const torsoTilt = this.state.bowler.torsoLean || 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        safeEllipse(ctx, 0, 30, 15, 6, 0);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-8, 10 + legStride, 6, 20 - legStride * 0.4);
        ctx.strokeRect(-8, 10 + legStride, 6, 20 - legStride * 0.4);
        ctx.fillRect(2, 10 - legStride, 6, 20 + legStride * 0.4);
        ctx.strokeRect(2, 10 - legStride, 6, 20 + legStride * 0.4);

        ctx.save();
        ctx.rotate(torsoTilt);

        ctx.fillStyle = '#10b981';
        safeRoundRect(ctx, -9, -8, 18, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.arc(0, -18, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-3, -18, 2, 0, Math.PI * 2);
        ctx.arc(3, -18, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-3, -26);
        ctx.lineTo(-7 + Math.sin(Date.now() / 140) * 2, -36);
        ctx.moveTo(3, -26);
        ctx.lineTo(7 + Math.sin(Date.now() / 140 + 1) * 2, -36);
        ctx.stroke();

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-9, -4);
        ctx.lineTo(-16, 8);
        ctx.stroke();

        ctx.save();
        ctx.translate(9, -4);
        if (this.state.bowler.emotion === 'celebrate') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(10, -16);
            ctx.stroke();
        } else {
            ctx.rotate(this.state.bowler.armAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 22);
            ctx.stroke();

            if (!this.state.ball.visible && !this.state.bowler.isBowling) {
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(0, 24, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        ctx.restore();
        ctx.restore();
    },

    // 🦁 Leo the Lion Batsman (Standing in front of the wickets)
    drawLionBatsman(ctx, b, scale = 1.05) {
        ctx.save();
        const isRunning = b.isRunning;
        const runX = isRunning ? Math.sin(b.runProgress * 4) * 22 : 0;
        const runY = isRunning ? Math.cos(b.runProgress * 4) * 6 : 0;
        const legStride = isRunning ? Math.sin(b.runProgress * 12) * 8 : 0;

        ctx.translate(b.x + runX, b.y + b.stanceOffset + b.tapOffset + runY);
        ctx.scale(scale, scale);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
        ctx.beginPath();
        safeEllipse(ctx, 0, 36, 17, 6.5, 0);
        ctx.fill();

        ctx.save();
        ctx.translate(-10, 4);
        ctx.rotate(b.tailWag || 0);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-14, 8, -20, 2);
        ctx.stroke();
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(-21, 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        safeRoundRect(ctx, -12, 10 + legStride, 10, 26 - legStride * 0.3, 3);
        ctx.fill();
        ctx.stroke();
        safeRoundRect(ctx, 2, 10 - legStride, 10, 26 + legStride * 0.3, 3);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(-11, 16 + legStride, 8, 4);
        ctx.strokeRect(3, 16 - legStride, 8, 4);

        ctx.fillStyle = '#ffffff';
        safeRoundRect(ctx, -12, -12, 24, 24, 6);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-4, -12, 8, 4);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-4, -8, 8, 2);

        ctx.save();
        ctx.rotate(b.headTilt || 0);

        ctx.fillStyle = '#b45309';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            const mx = Math.cos(a) * 15;
            const my = -22 + Math.sin(a) * 15;
            ctx.beginPath();
            ctx.arc(mx, my, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, -22, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(-11, -31, 4, 0, Math.PI * 2);
        ctx.arc(11, -31, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.stroke();
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(-11, -31, 2, 0, Math.PI * 2);
        ctx.arc(11, -31, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, -26, 11, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0369a1';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-8, -26, 16, 3);

        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        safeEllipse(ctx, 0, -17, 6, 4.5, 0);
        ctx.fill();

        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(0, -19, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2, -16); ctx.lineTo(-8, -16);
        ctx.moveTo(2, -16); ctx.lineTo(8, -16);
        ctx.stroke();

        if (b.emotion === 'celebrate') {
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            safeEllipse(ctx, 0, -13.5, 3.5, 2.5, 0);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(-4, -22, 2, 0, Math.PI * 2);
            ctx.arc(4, -22, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (b.emotion === 'dismay') {
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-5, -21); ctx.lineTo(-2, -21);
            ctx.moveTo(2, -21); ctx.lineTo(5, -21);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(-4, -22, 2, 0, Math.PI * 2);
            ctx.arc(4, -22, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        ctx.save();
        ctx.translate(6, -2);
        ctx.rotate((b.batAngle * Math.PI) / 180);

        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-2, 0, 4, 14);
        ctx.strokeRect(-2, 0, 4, 14);

        const batGrad = ctx.createLinearGradient(-6, 14, 6, 52);
        batGrad.addColorStop(0, '#fef3c7');
        batGrad.addColorStop(0.3, '#fbbf24');
        batGrad.addColorStop(0.7, '#d97706');
        batGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = batGrad;
        safeRoundRect(ctx, -6, 14, 12, 38, [2, 2, 6, 6]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-4, 24, 8, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, 27, 4, 4);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(-5, 16, 2, 34);

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
        ctx.restore();
    },

    // 🐒 Milo the Monkey Keeper
    drawMonkeyKeeper(ctx, k, scale = 0.88) {
        ctx.save();
        ctx.translate(k.x, k.y + k.crouchBob);
        ctx.scale(scale, scale);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        safeEllipse(ctx, 0, 16, 14, 5.5, 0);
        ctx.fill();

        ctx.save();
        ctx.translate(-8, 2);
        ctx.rotate(k.tailAngle);
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-14, -8, -10, -18);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#b45309';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.2;
        ctx.fillRect(-10, 4, 6, 12);
        ctx.fillRect(4, 4, 6, 12);

        ctx.fillStyle = '#0284c7';
        safeRoundRect(ctx, -8, -10, 16, 16, 4);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(0, -18, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(-10, -18, 4.5, 0, Math.PI * 2);
        ctx.arc(10, -18, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(-10, -18, 2.5, 0, Math.PI * 2);
        ctx.arc(10, -18, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        safeEllipse(ctx, 0, -16, 6, 4.5, 0);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, -17, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-3, -21, 1.8, 0, Math.PI * 2);
        ctx.arc(3, -21, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#eab308';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        safeRoundRect(ctx, -14, -8, 8, 10, 3);
        ctx.fill();
        ctx.stroke();
        safeRoundRect(ctx, 6, -8, 8, 10, 3);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    },

    // 🐌 Snail Outfield Fielder (Classic Google Doodle inspired cute snail with swirly shell & ball-tracking eyestalks)
    drawSnailFielder(ctx, f, scale = 1) {
        ctx.save();
        ctx.translate(f.x, f.y + (f.bob || 0));
        ctx.scale(scale, scale);

        if (f.isCheering) {
            ctx.translate(0, -Math.abs(Math.sin(Date.now() / 140)) * 8);
        }

        if (f.isDiving) {
            ctx.rotate(f.rollAngle || 0);
        }

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        safeEllipse(ctx, 0, 10, 14, 5, 0);
        ctx.fill();

        const bodyColor = f.color || '#38bdf8';
        const bandanaColor = f.bandana || '#f43f5e';

        // 1. Snail Slime / Foot Body
        const slideWiggle = Math.sin(Date.now() / 200 + (f.x || 0)) * 1.5;
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-14, 8);
        ctx.quadraticCurveTo(-16, 4, -10, 4);
        ctx.lineTo(8, 4);
        ctx.quadraticCurveTo(14 + slideWiggle, 4, 13, 9);
        ctx.quadraticCurveTo(0, 11, -14, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2. Snail Shell (Colorful, Glossy Spiral)
        ctx.save();
        ctx.translate(-3, 0);

        // Shell base gradient
        const shellGrad = ctx.createRadialGradient(-2, -4, 2, 0, 0, 14);
        shellGrad.addColorStop(0, '#ffffff');
        shellGrad.addColorStop(0.3, bodyColor);
        shellGrad.addColorStop(0.85, bodyColor);
        shellGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = shellGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Shell inner spiral swirls
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0.2, Math.PI * 1.6);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-1, -1, 4.5, 0.4, Math.PI * 1.8);
        ctx.stroke();

        // Shell gloss shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        safeEllipse(ctx, -4, -6, 4, 2, -0.4);
        ctx.fill();

        ctx.restore();

        // 3. Snail Head & Neck
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(9, 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cute smiling mouth & rosy cheek
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(11, 4, 2.5, 0.2, Math.PI * 0.85);
        ctx.stroke();

        ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
        ctx.beginPath();
        ctx.arc(8, 4, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 4. Team Bandana
        ctx.fillStyle = bandanaColor;
        ctx.fillRect(5, -1, 7, 3.5);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(5, -1, 7, 3.5);

        // Bandana knot / tail
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(2, -2 + Math.sin(Date.now() / 150) * 1.5);
        ctx.lineTo(3, 2);
        ctx.closePath();
        ctx.fill();

        // 5. Eyestalks & Ball-Tracking Eyes
        const eyeDx = Math.cos(f.eyeAngle || 0) * 1.5;
        const eyeDy = Math.sin(f.eyeAngle || 0) * 1.5;
        const cheerWiggle = f.isCheering ? Math.sin(Date.now() / 80) * 2 : 0;

        // Eyestalk 1 (Left)
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(7, -1);
        ctx.lineTo(6 + cheerWiggle, -9);
        ctx.stroke();

        // Eye bulb 1
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(6 + cheerWiggle, -10, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Pupil 1
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(6 + cheerWiggle + eyeDx, -10 + eyeDy, 1.6, 0, Math.PI * 2);
        ctx.fill();
        // Catchlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(5.5 + cheerWiggle + eyeDx, -10.5 + eyeDy, 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Eyestalk 2 (Right)
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(11, -1);
        ctx.lineTo(12 - cheerWiggle, -9);
        ctx.stroke();

        // Eye bulb 2
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(12 - cheerWiggle, -10, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Pupil 2
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(12 - cheerWiggle + eyeDx, -10 + eyeDy, 1.6, 0, Math.PI * 2);
        ctx.fill();
        // Catchlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(11.5 - cheerWiggle + eyeDx, -10.5 + eyeDy, 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    draw3DBall(ctx, ball, canvasHeight) {
        ctx.save();
        const depthRatio = Math.max(0, Math.min(1, ball.y / canvasHeight));
        const depthScale = 0.55 + 0.55 * depthRatio;
        const radius = Math.max(3.5, 9 * depthScale);

        const drawY = ball.y - ball.z;

        const shadowAlpha = Math.max(0.08, 0.40 - ball.z * 0.0035);
        const shadowRadius = Math.max(2, radius * (1 + ball.z * 0.02));
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.beginPath();
        safeEllipse(ctx, ball.x, ball.y + 4, shadowRadius, shadowRadius * 0.45, 0);
        ctx.fill();

        const hasAura = !ball.isHit && ball.variation && ball.variation !== 'standard';
        if (hasAura) {
            ctx.save();
            if (ball.variation === 'bouncer') {
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 14;
            } else if (ball.variation === 'yorker') {
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 16;
            } else if (ball.variation === 'slower') {
                ctx.shadowColor = '#06b6d4';
                ctx.shadowBlur = 12;
            } else if (ball.variation === 'inswinger') {
                ctx.shadowColor = '#3b82f6';
                ctx.shadowBlur = 12;
            } else if (ball.variation === 'outswinger') {
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 12;
            } else if (ball.variation === 'googly') {
                ctx.shadowColor = '#a855f7';
                ctx.shadowBlur = 14;
            }
        }

        const ballGrad = ctx.createRadialGradient(
            ball.x - radius * 0.3, drawY - radius * 0.3, radius * 0.15,
            ball.x, drawY, radius
        );
        ballGrad.addColorStop(0, '#fca5a5');
        ballGrad.addColorStop(0.35, '#ef4444');
        ballGrad.addColorStop(0.85, '#dc2626');
        ballGrad.addColorStop(1, '#7f1d1d');

        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(ball.x, drawY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = Math.max(1, 1.5 * depthScale);
        ctx.beginPath();
        ctx.arc(ball.x, drawY, radius * 0.75, ball.rotation, ball.rotation + Math.PI);
        ctx.stroke();

        if (hasAura) {
            ctx.restore();
        }

        ctx.restore();
    },

    drawShockwaves(ctx) {
        this.state.shockwaves.forEach(sw => {
            ctx.save();
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = Math.max(0, sw.alpha);
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
    },

    drawParticles(ctx) {
        this.state.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });
    },

    drawBadges(ctx) {
        this.state.floatingBadges.forEach(b => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, b.alpha);
            ctx.font = 'bold 15px Outfit, sans-serif';
            ctx.textAlign = 'center';

            const textWidth = ctx.measureText(b.text).width;
            ctx.fillStyle = b.bg;
            safeRoundRect(ctx, b.x - textWidth / 2 - 12, b.y - 13, textWidth + 24, 26, 13);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = b.color;
            ctx.fillText(b.text, b.x, b.y + 5);
            ctx.restore();
        });
    },

    drawFlash(ctx, w, h) {
        ctx.save();
        ctx.font = '900 48px Bungee, cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.state.flashText === 'SIX!' ? '#ffd600' : '#00e676';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 18;
        ctx.fillText(this.state.flashText, w / 2, h / 2);
        ctx.restore();
    },

    triggerPitchDelivery(speed = 'medium', variation = 'standard') {
        const s = this.state;
        s.bowler.isBowling = true;
        s.bowler.armAngle = 0;
        s.bowler.runUpProgress = 0;

        if (variation === 'bouncer' || variation === 'yorker' || speed === 'fast') {
            s.bowler.type = 'cheetah';
        } else if (variation === 'googly' || variation === 'slower') {
            s.bowler.type = 'fox';
        } else {
            s.bowler.type = 'mantis';
        }

        let duration = 1050;
        let bouncePitchPoint = 0.50;
        let maxBounceZ = 18;

        if (variation === 'bouncer') {
            duration = speed === 'fast' ? 820 : 920;
            bouncePitchPoint = 0.35;
            maxBounceZ = 28;
        } else if (variation === 'yorker') {
            duration = speed === 'fast' ? 760 : 840;
            bouncePitchPoint = 0.78;
            maxBounceZ = 7;
        } else if (variation === 'slower') {
            duration = 1350;
            bouncePitchPoint = 0.52;
            maxBounceZ = 16;
        } else if (variation === 'inswinger') {
            duration = speed === 'fast' ? 880 : 1000;
            bouncePitchPoint = 0.48;
            maxBounceZ = 18;
        } else if (variation === 'outswinger') {
            duration = speed === 'fast' ? 900 : 1020;
            bouncePitchPoint = 0.48;
            maxBounceZ = 18;
        } else if (variation === 'googly') {
            duration = 1150;
            bouncePitchPoint = 0.55;
            maxBounceZ = 15;
        } else {
            duration = speed === 'fast' ? 880 : (speed === 'slow' ? 1250 : 1050);
            bouncePitchPoint = 0.50;
            maxBounceZ = 18;
        }

        const diff = (typeof GameState !== 'undefined' && GameState.difficulty) ? GameState.difficulty : 'medium';
        if (diff === 'low') {
            duration = Math.round(duration * 1.25);
        } else if (diff === 'high') {
            duration = Math.round(duration * 0.78);
        }

        s.ball.variation = variation;
        s.ball.bouncePitchPoint = bouncePitchPoint;
        s.ball.maxBounceZ = maxBounceZ;
        s.ball.x = s.bowler.x + 4;
        s.ball.y = s.bowler.y + 16;
        s.ball.z = 22;
        s.ball.vx = 0;
        s.ball.vy = 0;
        s.ball.vz = 0;
        s.ball.isHit = false;
        s.ball.hasBounced = false;
        s.ball.deliveryDuration = duration;
        s.ball.deliveryStartTime = performance.now();
        s.ball.visible = true;

        return duration;
    },

    triggerHit(runs) {
        const s = this.state;
        s.ball.isHit = true;
        s.batsman.isSwinging = true;
        s.batsman.swingProgress = 0;

        s.ball.x = s.batsman.x + 4;
        s.ball.y = s.batsman.y - 14;
        s.ball.z = 12;

        if (runs === 6) {
            s.batsman.swingType = 'six';
            s.batsman.emotion = 'celebrate';
            s.batsman.emotionTimer = 65;
            s.bowler.emotion = 'frustrated';
            s.bowler.emotionTimer = 60;
            s.crowdCheer = 1.0;
            s.ball.vx = (Math.random() - 0.5) * 6;
            s.ball.vy = -14;
            s.ball.vz = 16;
            this.flash('SIX!');
            this.addShockwave(s.batsman.x, s.batsman.y - 12, '#ffd600');
            this.addConfetti(s.batsman.x, s.batsman.y);
            this.triggerUmpireSignal('six');
        } else if (runs === 4) {
            s.batsman.swingType = 'four';
            s.batsman.emotion = 'celebrate';
            s.batsman.emotionTimer = 50;
            s.bowler.emotion = 'frustrated';
            s.bowler.emotionTimer = 50;
            s.crowdCheer = 0.85;
            s.ball.vx = Math.random() < 0.5 ? 8.5 : -8.5;
            s.ball.vy = -6.5;
            s.ball.vz = 2;
            this.flash('FOUR!');
            this.addShockwave(s.batsman.x, s.batsman.y - 12, '#38bdf8');
            this.triggerUmpireSignal('four');
        } else if (runs > 0) {
            s.batsman.swingType = 'drive';
            s.ball.vx = (Math.random() - 0.5) * 4.5;
            s.ball.vy = -4;
            s.ball.vz = 3.5;
            s.batsman.isRunning = true;
            setTimeout(() => s.batsman.isRunning = false, 1200);
            this.triggerUmpireSignal('safe');
        } else {
            s.batsman.swingType = 'drive';
            s.ball.vx = (Math.random() - 0.5) * 1.5;
            s.ball.vy = 1.2;
            s.ball.vz = 0;
            s.keeper.isCatching = true;
            s.keeper.catchTimer = 40;
        }

        this.addSparks(s.batsman.x, s.batsman.y - 12);
    },

    triggerDefend() {
        const s = this.state;
        s.ball.isHit = true;
        s.batsman.isDefending = true;
        s.batsman.swingType = 'defend';

        s.ball.x = s.batsman.x + 2;
        s.ball.y = s.batsman.y - 12;
        s.ball.z = 2;
        s.ball.vx = (Math.random() - 0.5) * 0.8;
        s.ball.vy = 0.8;
        s.ball.vz = 0;

        setTimeout(() => s.batsman.isDefending = false, 450);
        this.addPitchDust(s.batsman.x, s.batsman.y);
        this.triggerUmpireSignal('safe');
    },

    triggerWicket() {
        const s = this.state;
        s.ball.isHit = true;
        s.stumps.batting.broken = true;

        s.batsman.emotion = 'dismay';
        s.batsman.emotionTimer = 80;
        s.bowler.emotion = 'celebrate';
        s.bowler.emotionTimer = 75;
        s.snails.forEach(f => f.isCheering = true);
        setTimeout(() => s.snails.forEach(f => f.isCheering = false), 1800);

        this.triggerUmpireSignal('out');

        s.stumps.batting.bails = [
            { x: -6, y: -36, vx: -3 - Math.random() * 2, vy: -5 - Math.random() * 3, vz: 10, rot: 0, vrot: 0.25 },
            { x: 6, y: -36, vx: 3 + Math.random() * 2, vy: -6 - Math.random() * 3, vz: 12, rot: 0, vrot: -0.3 }
        ];

        s.ball.vx = 0.5;
        s.ball.vy = 1;
        s.ball.vz = 0;

        this.addWoodSplinters(s.stumps.batting.x, s.stumps.batting.y);
        setTimeout(() => s.stumps.batting.broken = false, 1800);
    },

    triggerUmpireSignal(signal) {
        this.state.umpire.signal = signal;
        this.state.umpire.signalTimer = 75;
        this.state.umpire.neckExtend = 0.8;
    },

    addShockwave(x, y, color = '#ffd600') {
        this.state.shockwaves.push({
            x, y,
            radius: 8,
            color,
            alpha: 0.85
        });
    },

    addPitchMark(x, y) {
        this.state.pitchMarks.push({
            x, y,
            alpha: 1.0
        });
        if (this.state.pitchMarks.length > 12) {
            this.state.pitchMarks.shift();
        }
    },

    flash(text) {
        this.state.flashText = text;
        this.state.flashTimer = 48;
    },

    addBadge(text, type = 'bonus') {
        const bg = type === 'bonus' ? '#00c853' : (type === 'penalty' ? '#ff1744' : '#00b0ff');
        this.state.floatingBadges.push({
            x: this.width / 2,
            y: this.height * 0.62,
            text,
            bg,
            color: '#ffffff',
            alpha: 1.0
        });
    },

    addSparks(x, y) {
        for (let i = 0; i < 14; i++) {
            this.state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 9,
                vy: (Math.random() - 0.5) * 9,
                size: Math.random() * 3.5 + 1.5,
                color: '#fef08a',
                life: 1.0
            });
        }
    },

    addPitchDust(x, y) {
        for (let i = 0; i < 8; i++) {
            this.state.particles.push({
                x: x + (Math.random() - 0.5) * 8,
                y: y + (Math.random() - 0.5) * 4,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 3 + 1,
                color: '#e2d3b4',
                life: 0.8
            });
        }
    },

    addGrassParticles(x, y) {
        for (let i = 0; i < 6; i++) {
            this.state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                size: Math.random() * 3 + 1,
                color: '#86efac',
                life: 0.7
            });
        }
    },

    addWoodSplinters(x, y) {
        for (let i = 0; i < 18; i++) {
            this.state.particles.push({
                x, y: y - 18,
                vx: (Math.random() - 0.5) * 7,
                vy: (Math.random() - 1) * 7,
                size: Math.random() * 4 + 2,
                color: '#ca8a04',
                life: 1.0
            });
        }
    },

    addConfetti(x, y) {
        const colors = ['#ffd600', '#00e676', '#38bdf8', '#f43f5e', '#a855f7'];
        for (let i = 0; i < 30; i++) {
            this.state.particles.push({
                x, y: y - 60,
                vx: (Math.random() - 0.5) * 80,
                vy: (Math.random() - 1.2) * 9,
                size: Math.random() * 5 + 2,
                color: colors[i % colors.length],
                life: 1.3
            });
        }
    }
};

window.CanvasRenderer = CanvasRenderer;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasRenderer;
}
