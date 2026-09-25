// Doodle Style Pseudo-3D Cricket Stadium, Characters & Ball Physics

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

    // Animation States
    state: {
        ball: {
            x: 250,
            y: 110,
            z: 0,           // Altitude / Height above ground
            vx: 0,
            vy: 0,
            vz: 0,
            visible: false,
            rotation: 0,
            isHit: false,
            deliveryProgress: 0,
            deliveryDuration: 1050,
            deliveryStartTime: 0,
            hasBounced: false
        },
        bowler: {
            x: 250,
            y: 95,
            runUpOffset: 0,
            armAngle: 0,
            isBowling: false,
            runUpProgress: 0,
            strideCycle: 0,
            torsoLean: 0,
            emotion: 'idle', // 'idle' | 'celebrate' | 'frustrated'
            emotionTimer: 0
        },
        batsman: {
            x: 250,
            y: 470,
            batAngle: 30,       // Degrees (stance)
            batOffsetY: 0,
            isSwinging: false,
            isDefending: false,
            isRunning: false,
            swingProgress: 0,
            runProgress: 0,
            stanceOffset: 0,
            tapOffset: 0,
            emotion: 'idle',    // 'idle' | 'celebrate' | 'dismay'
            emotionTimer: 0,
            swingType: 'drive', // 'drive' | 'six' | 'four' | 'defend'
            headTilt: 0,
            batRaiseProgress: 0
        },
        stumps: {
            bowling: { x: 250, y: 110, broken: false },
            batting: {
                x: 250,
                y: 490,
                broken: false,
                bails: [
                    { x: -5, y: -37, vx: 0, vy: 0, vz: 0, rot: 0, vrot: 0 },
                    { x: 5, y: -37, vx: 0, vy: 0, vz: 0, rot: 0, vrot: 0 }
                ]
            }
        },
        snails: [
            { x: 75, y: 170, color: '#f472b6', targetX: 75, targetY: 170, speed: 1.1, eyeAngle: 0, bob: 0, isDiving: false, isCheering: false },
            { x: 425, y: 180, color: '#fde047', targetX: 425, targetY: 180, speed: 1.1, eyeAngle: 0, bob: 0, isDiving: false, isCheering: false },
            { x: 65, y: 340, color: '#38bdf8', targetX: 65, targetY: 340, speed: 1.3, eyeAngle: 0, bob: 0, isDiving: false, isCheering: false },
            { x: 435, y: 355, color: '#c084fc', targetX: 435, targetY: 355, speed: 1.3, eyeAngle: 0, bob: 0, isDiving: false, isCheering: false },
            { x: 380, y: 505, color: '#fb923c', targetX: 380, targetY: 505, speed: 1.5, eyeAngle: 0, bob: 0, isDiving: false, isCheering: false }
        ],
        particles: [],
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

        // Layout pitch and key actors in 2.5D perspective
        const centerX = this.width / 2;
        const pitchTopY = this.height * 0.17;
        const pitchBottomY = this.height * 0.77;

        this.state.batsman.x = centerX;
        this.state.batsman.y = pitchBottomY - 10;
        this.state.bowler.x = centerX;
        this.state.bowler.y = pitchTopY - 8;
        this.state.stumps.batting.x = centerX;
        this.state.stumps.batting.y = pitchBottomY + 12;
        this.state.stumps.bowling.x = centerX;
        this.state.stumps.bowling.y = pitchTopY - 6;

        // Reposition fielders in perspective
        this.state.snails = [
            { x: this.width * 0.15, y: this.height * 0.26, color: '#f472b6', targetX: this.width * 0.15, targetY: this.height * 0.26, speed: 0.8, eyeAngle: 0 },
            { x: this.width * 0.85, y: this.height * 0.28, color: '#fde047', targetX: this.width * 0.85, targetY: this.height * 0.28, speed: 0.8, eyeAngle: 0 },
            { x: this.width * 0.13, y: this.height * 0.52, color: '#38bdf8', targetX: this.width * 0.13, targetY: this.height * 0.52, speed: 1.0, eyeAngle: 0 },
            { x: this.width * 0.87, y: this.height * 0.54, color: '#c084fc', targetX: this.width * 0.87, targetY: this.height * 0.54, speed: 1.0, eyeAngle: 0 },
            { x: this.width * 0.77, y: this.height * 0.76, color: '#fb923c', targetX: this.width * 0.77, targetY: this.height * 0.76, speed: 1.2, eyeAngle: 0 }
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
        // 0. Dynamic Stadium Wave & Crowd Cheer Decay
        s.crowdWave = Math.sin(time / 320);
        if (s.crowdCheer > 0) {
            s.crowdCheer = Math.max(0, s.crowdCheer - 0.015);
        }

        // 1. Batsman Idle Breathing, Bat Tap & Emotions
        s.batsman.stanceOffset = Math.sin(time / 250) * 1.8;
        if (!s.batsman.isSwinging && !s.batsman.isDefending && !s.batsman.isRunning) {
            s.batsman.tapOffset = Math.sin(time / 160) > 0.55 ? -3.5 : 0;
        } else {
            s.batsman.tapOffset = 0;
        }

        if (s.batsman.emotionTimer > 0) {
            s.batsman.emotionTimer--;
            if (s.batsman.emotionTimer <= 0) {
                s.batsman.emotion = 'idle';
            }
        }

        // 2. Bowler Run-Up, Stride Scissor & Release Physics
        if (s.bowler.isBowling) {
            if (s.bowler.runUpProgress < 1.0) {
                s.bowler.runUpProgress += 0.045;
                s.bowler.strideCycle += 0.35;
                // Vertical spring bob & forward acceleration
                s.bowler.runUpOffset = Math.sin(s.bowler.runUpProgress * Math.PI) * 15 + Math.abs(Math.sin(s.bowler.strideCycle)) * 3.5;
                s.bowler.torsoLean = Math.sin(s.bowler.runUpProgress * Math.PI) * 0.24;
            }
            s.bowler.armAngle -= 0.28;

            // Release dust puff at top of stride
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

        // 3. Batsman Swing (Tailored by Swing Type: Six, Four, Drive, Defend)
        if (s.batsman.isSwinging) {
            s.batsman.swingProgress += 0.082;
            const sp = s.batsman.swingProgress;
            const isSix = (s.batsman.swingType === 'six');

            if (sp <= 0.32) {
                // High Backlift
                const maxBacklift = isSix ? 55 : 38;
                s.batsman.batAngle = 30 + (sp / 0.32) * (maxBacklift - 30);
                s.batsman.headTilt = -0.1;
            } else if (sp <= 0.65) {
                // Explosive downswing and power contact arc
                const strikeProgress = (sp - 0.32) / 0.33;
                const targetArc = isSix ? -145 : -115;
                s.batsman.batAngle = 55 - strikeProgress * (55 - targetArc);
                s.batsman.headTilt = 0.15;
            } else if (sp <= 1.0) {
                // Follow-through high finish
                const followProgress = (sp - 0.65) / 0.35;
                const targetArc = isSix ? -145 : -115;
                s.batsman.batAngle = targetArc + followProgress * (30 - targetArc);
                s.batsman.headTilt = 0;
            } else {
                s.batsman.isSwinging = false;
                s.batsman.batAngle = 30;
                s.batsman.swingProgress = 0;
                s.batsman.headTilt = 0;
            }
        } else if (s.batsman.isDefending) {
            s.batsman.batAngle = -18; // Crisp forward defensive block
            s.batsman.headTilt = 0.12;
        } else if (s.batsman.emotion === 'celebrate') {
            // Joyful bat raise & hop
            s.batsman.batAngle = -110 + Math.sin(time / 140) * 15;
            s.batsman.stanceOffset = -Math.abs(Math.sin(time / 140)) * 8;
        } else if (s.batsman.emotion === 'dismay') {
            // Dismayed bat drop
            s.batsman.batAngle = 75;
            s.batsman.headTilt = 0.25;
            s.batsman.stanceOffset = 3;
        } else {
            s.batsman.batAngle = 30;
            s.batsman.headTilt = 0;
        }

        // 4. Batsman Running Between Wickets
        if (s.batsman.isRunning) {
            s.batsman.runProgress += 0.10;
            if (Math.random() < 0.3) {
                this.addGrassParticles(s.batsman.x + (Math.random() - 0.5) * 16, s.batsman.y + 24);
            }
        } else {
            s.batsman.runProgress = 0;
        }

        // 5. Ball Physics & 3D Flight
        if (s.ball.visible) {
            s.ball.rotation += 0.32;

            if (!s.ball.isHit) {
                // Ball in delivery trajectory towards batsman
                const elapsed = time - s.ball.deliveryStartTime;
                const progress = Math.min(1.0, elapsed / s.ball.deliveryDuration);
                s.ball.deliveryProgress = progress;

                const startY = s.bowler.y + 16;
                const targetY = s.batsman.y - 12;
                s.ball.y = startY + (targetY - startY) * progress;

                // Lateral Curve & Seam Movement by Delivery Variation
                let lateralOffset = 0;
                const variation = s.ball.variation || 'standard';
                const bouncePoint = s.ball.bouncePitchPoint || 0.50;

                if (variation === 'inswinger') {
                    if (progress < bouncePoint) {
                        lateralOffset = Math.sin((progress / bouncePoint) * Math.PI) * 10;
                    } else {
                        const postP = (progress - bouncePoint) / (1 - bouncePoint);
                        lateralOffset = 10 - postP * 24; // Cuts sharply left
                    }
                } else if (variation === 'outswinger') {
                    if (progress < bouncePoint) {
                        lateralOffset = -Math.sin((progress / bouncePoint) * Math.PI) * 6;
                    } else {
                        const postP = (progress - bouncePoint) / (1 - bouncePoint);
                        lateralOffset = -6 + postP * 20; // Swings away right
                    }
                } else if (variation === 'googly') {
                    if (progress < bouncePoint) {
                        lateralOffset = -Math.sin((progress / bouncePoint) * Math.PI) * 12;
                    } else {
                        const postP = (progress - bouncePoint) / (1 - bouncePoint);
                        lateralOffset = -12 + postP * 26; // Sharp leg-break
                    }
                } else {
                    lateralOffset = Math.sin(progress * Math.PI) * 4;
                }

                s.ball.x = s.bowler.x + lateralOffset;

                // 3D Altitude arc with pitch bounce
                const maxBounceZ = s.ball.maxBounceZ || 18;

                if (progress < bouncePoint) {
                    const dropProgress = progress / bouncePoint;
                    s.ball.z = 24 * (1 - dropProgress);
                } else {
                    if (!s.ball.hasBounced) {
                        s.ball.hasBounced = true;
                        this.addPitchDust(s.ball.x, s.ball.y);
                        if (variation === 'bouncer') {
                            this.addSparks(s.ball.x, s.ball.y);
                        }
                    }
                    const bounceProgress = (progress - bouncePoint) / (1 - bouncePoint);
                    s.ball.z = Math.sin(bounceProgress * Math.PI * 0.85) * maxBounceZ;
                }
            } else {
                // Ball hit trajectory
                s.ball.x += s.ball.vx;
                s.ball.y += s.ball.vy;
                s.ball.z += s.ball.vz;

                // 3D Gravity
                if (s.ball.z > 0 || s.ball.vz !== 0) {
                    s.ball.vz -= 0.45;
                    if (s.ball.z <= 0 && s.ball.vz < 0) {
                        s.ball.z = 0;
                        s.ball.vz = -s.ball.vz * 0.55; // Rebound
                        if (Math.abs(s.ball.vz) < 1) s.ball.vz = 0;
                        // Grass friction
                        s.ball.vx *= 0.88;
                        s.ball.vy *= 0.88;
                        this.addGrassParticles(s.ball.x, s.ball.y);
                    }
                }
            }
        }

        // 6. Flying Bails on Wicket
        const battingStumps = s.stumps.batting;
        if (battingStumps.broken) {
            battingStumps.bails.forEach(bail => {
                bail.x += bail.vx;
                bail.y += bail.vy;
                bail.vz -= 0.4;
                bail.rot += bail.vrot;
            });
        }

        // 7. Snail Fielders with Active Sprint & Eye Tracking
        s.snails.forEach(snail => {
            snail.bob = Math.sin(time / 160 + snail.x) * 1.8;

            if (s.ball.visible && s.ball.isHit) {
                // Eye angle points directly towards ball
                const dx = s.ball.x - snail.x;
                const dy = s.ball.y - snail.y;
                snail.eyeAngle = Math.atan2(dy, dx);

                // Move towards ball if ball is in outfield
                const dist = Math.hypot(dx, dy);
                if (dist < 220 && dist > 14) {
                    snail.x += (dx / dist) * snail.speed;
                    snail.y += (dy / dist) * snail.speed;
                    if (dist < 38) {
                        snail.isDiving = true;
                    }
                }
            } else {
                // Return slowly to fielding station
                snail.x += (snail.targetX - snail.x) * 0.04;
                snail.y += (snail.targetY - snail.y) * 0.04;
                snail.eyeAngle = Math.sin(time / 800) * 0.3;
                snail.isDiving = false;
            }
        });

        // 8. Particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
            const p = s.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            if (p.life <= 0) s.particles.splice(i, 1);
        }

        // 9. Badges
        for (let i = s.floatingBadges.length - 1; i >= 0; i--) {
            const b = s.floatingBadges[i];
            b.y -= 0.9;
            b.alpha -= 0.018;
            if (b.alpha <= 0) s.floatingBadges.splice(i, 1);
        }

        // 10. Flash Text
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

        // 1. Lush Outfield with 3D Radial Sunlight & Mowing Stripes
        const grad = ctx.createRadialGradient(centerX, h * 0.55, 30, centerX, h * 0.55, w * 0.95);
        grad.addColorStop(0, '#22c55e');
        grad.addColorStop(0.45, '#16a34a');
        grad.addColorStop(0.85, '#15803d');
        grad.addColorStop(1, '#14532d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Perspective Outfield Mower Stripes (Fan out from top vanishing point)
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

        // 2. Stadium Boundary Rope & Advertisement Cushions
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        safeEllipse(ctx, centerX, h * 0.54, w * 0.47, h * 0.44, 0);
        ctx.stroke();
        ctx.setLineDash([]);

        // 3. Top Grandstand & Animated Crowd
        this.drawCrowd(ctx, w, 52);

        // 4. 2.5D Perspective Pitch (Trapezoid)
        const pitchTopY = h * 0.17;
        const pitchBottomY = h * 0.81;
        const pitchTopW = Math.min(65, w * 0.14);
        const pitchBottomW = Math.min(145, w * 0.33);

        const pTopLeft = centerX - pitchTopW / 2;
        const pTopRight = centerX + pitchTopW / 2;
        const pBotLeft = centerX - pitchBottomW / 2;
        const pBotRight = centerX + pitchBottomW / 2;

        // Pitch Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        ctx.moveTo(pTopLeft - 4, pitchTopY + 4);
        ctx.lineTo(pTopRight + 4, pitchTopY + 4);
        ctx.lineTo(pBotRight + 6, pitchBottomY + 6);
        ctx.lineTo(pBotLeft - 6, pitchBottomY + 6);
        ctx.closePath();
        ctx.fill();

        // Clay Pitch Surface with 3D Texture Gradient
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

        // Perspective Creases
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;

        // Bowling Crease (Top)
        const topCreaseY = pitchTopY + 28;
        const topRatio = (topCreaseY - pitchTopY) / (pitchBottomY - pitchTopY);
        const topW = pitchTopW + (pitchBottomW - pitchTopW) * topRatio;
        ctx.beginPath();
        ctx.moveTo(centerX - topW / 2 + 2, topCreaseY);
        ctx.lineTo(centerX + topW / 2 - 2, topCreaseY);
        ctx.stroke();

        // Batting Popping Crease (Bottom)
        const botCreaseY = pitchBottomY - 26;
        const botRatio = (botCreaseY - pitchTopY) / (pitchBottomY - pitchTopY);
        const botW = pitchTopW + (pitchBottomW - pitchTopW) * botRatio;
        ctx.beginPath();
        ctx.moveTo(centerX - botW / 2 + 3, botCreaseY);
        ctx.lineTo(centerX + botW / 2 - 3, botCreaseY);
        ctx.stroke();

        // Subtle Preferred Ball Crease Aura (Golden pulse without obstructing view)
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

        // 5. Stumps (Top & Bottom)
        this.drawStumps(ctx, this.state.stumps.bowling.x, this.state.stumps.bowling.y, 0.70, false);
        this.drawBattingStumps(ctx, this.state.stumps.batting);

        // 6. Snail Fielders in Perspective
        this.state.snails.forEach(snail => {
            const depthScale = 0.65 + 0.35 * (snail.y / h);
            this.drawSnail(ctx, snail.x, snail.y + (snail.bob || 0), snail.color, depthScale, snail.eyeAngle, snail.isDiving, snail.isCheering);
        });

        // 7. Bowler (Grasshopper with Scissor Legs & Windmill)
        const bowlerJump = this.state.bowler.emotion === 'celebrate' ? -Math.abs(Math.sin(Date.now() / 150)) * 12 : 0;
        this.drawBowler(ctx, this.state.bowler.x, this.state.bowler.y + this.state.bowler.runUpOffset + bowlerJump, 0.72);

        // 8. 3D Cricket Ball
        if (this.state.ball.visible) {
            this.draw3DBall(ctx, this.state.ball, h);
        }

        // 9. Cricket Batsman (Foreground Mascot with Emotional Postures)
        this.drawBatsman(ctx, this.state.batsman, 1.08);

        // 10. Particles & Badges
        this.drawParticles(ctx);
        this.drawBadges(ctx);

        if (this.state.flashText) {
            this.drawFlash(ctx, w, h);
        }
    },

    drawCrowd(ctx, w, height) {
        // Multi-Tier Grandstand Structure
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#090d16');
        grad.addColorStop(0.6, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, height);

        // Stadium Canopy Roof Line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(0, 0, w, 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(0, height * 0.48, w, 3);

        // Animated Spectator Seats with Mexican Wave & Cheering Jumps
        const colors = ['#f8fafc', '#38bdf8', '#f43f5e', '#ffd600', '#a855f7', '#34d399', '#fb923c'];
        const cheerBoost = (this.state.crowdCheer || 0) * 5;

        for (let i = 10; i < w - 8; i += 14) {
            for (let j = 8; j < height - 6; j += 12) {
                const col = colors[(i * 3 + j * 7) % colors.length];
                const waveOffset = Math.sin(i * 0.14 + this.state.crowdWave * 3.2) * (2.5 + cheerBoost);
                
                // Spectator Body & Head
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(i, j + waveOffset, 3.2, 0, Math.PI * 2);
                ctx.fill();

                // Waving Team Flags on upper tier
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

        // Stadium Floodlight Towers (Left & Right) with Radiant Cones
        [-w * 0.02, w * 0.94].forEach(lightX => {
            // Lamp Fixture
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(lightX, 4, 22, 10);
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(lightX + 11, 9, 5, 0, Math.PI * 2);
            ctx.fill();

            // Radiant Floodlight Soft Glow Cone
            const lightGrad = ctx.createRadialGradient(lightX + 11, 9, 3, lightX + 11, 9, 120);
            lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
            lightGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.08)');
            lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
            ctx.fillStyle = lightGrad;
            ctx.beginPath();
            ctx.arc(lightX + 11, 9, 120, 0, Math.PI * 2);
            ctx.fill();
        });

        // Lower pitch boundary advertising barrier
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, height - 5, w, 5);
        ctx.fillStyle = '#ffffff';
        for (let b = 15; b < w; b += 60) {
            ctx.fillRect(b, height - 4, 30, 3);
        }
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

        // Bails
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(-12, -33, 24, 3);
        ctx.restore();
    },

    drawBattingStumps(ctx, bStumps) {
        ctx.save();
        ctx.translate(bStumps.x, bStumps.y);
        ctx.scale(1.05, 1.05);

        if (bStumps.broken) {
            // Exploded tilted stumps
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(-16, -18, 5, 24);
            ctx.fillRect(8, -14, 5, 24);
            ctx.fillRect(-3, -32, 5, 24);

            // Flying bails
            bStumps.bails.forEach(bail => {
                ctx.save();
                ctx.translate(bail.x, bail.y);
                ctx.rotate(bail.rot);
                ctx.fillStyle = '#ca8a04';
                ctx.fillRect(-6, -2, 12, 3);
                ctx.restore();
            });
        } else {
            // Normal 3 Stumps
            ctx.fillStyle = '#fde047';
            ctx.strokeStyle = '#854d0e';
            ctx.lineWidth = 1.2;

            [-10, 0, 10].forEach(offset => {
                safeRoundRect(ctx, offset - 2.5, -34, 5, 34, 2);
                ctx.fill();
                ctx.stroke();
            });

            // 2 Separate bails
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(-12, -37, 11, 3);
            ctx.fillRect(1, -37, 11, 3);
        }
        ctx.restore();
    },

    drawBowler(ctx, x, y, scale = 0.72) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        const isRunning = this.state.bowler.isBowling;
        const legStride = isRunning ? Math.sin(this.state.bowler.strideCycle) * 12 : 0;
        const torsoTilt = this.state.bowler.torsoLean || 0;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        safeEllipse(ctx, 0, 30, 15, 6, 0);
        ctx.fill();

        // Animated Scissor Legs
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        // Left Leg
        ctx.fillRect(-8, 10 + legStride, 6, 20 - legStride * 0.4);
        ctx.strokeRect(-8, 10 + legStride, 6, 20 - legStride * 0.4);
        // Right Leg
        ctx.fillRect(2, 10 - legStride, 6, 20 + legStride * 0.4);
        ctx.strokeRect(2, 10 - legStride, 6, 20 + legStride * 0.4);

        // Torso with dynamic bowling lean
        ctx.save();
        ctx.rotate(torsoTilt);

        // Body / Jersey (Red)
        ctx.fillStyle = '#ef4444';
        safeRoundRect(ctx, -9, -8, 18, 20, 4);
        ctx.fill();
        ctx.stroke();

        // Jersey Number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('7', 0, 5);

        // Head (Cute green grasshopper)
        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.arc(0, -18, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cute Eyes & Expression
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-3, -18, 2, 0, Math.PI * 2);
        ctx.arc(3, -18, 2, 0, Math.PI * 2);
        ctx.fill();

        // Antennae (wiggle)
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-3, -26);
        ctx.lineTo(-7 + Math.sin(Date.now() / 140) * 2, -36);
        ctx.moveTo(3, -26);
        ctx.lineTo(7 + Math.sin(Date.now() / 140 + 1) * 2, -36);
        ctx.stroke();

        // Red Cap
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, -22, 9, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-4, -22, 15, 3);

        // Left Arm (Steady or Pumping)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-9, -4);
        if (this.state.bowler.emotion === 'celebrate') {
            ctx.lineTo(-18, -18); // Fist pump high
        } else {
            ctx.lineTo(-16, 8 + (isRunning ? -legStride * 0.5 : 0));
        }
        ctx.stroke();

        // Right Arm (Windmill bowling swing or victory fist)
        ctx.save();
        ctx.translate(9, -4);
        if (this.state.bowler.emotion === 'celebrate') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(10, -16); // High fist pump
            ctx.stroke();
        } else {
            ctx.rotate(this.state.bowler.armAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 22);
            ctx.stroke();

            // Ball in hand before release
            if (!this.state.ball.visible && !this.state.bowler.isBowling) {
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(0, 24, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();

        ctx.restore(); // Restore torso rotation
        ctx.restore(); // Restore main transform
    },

    drawBatsman(ctx, b, scale = 1.08) {
        ctx.save();
        // Calculate running offset & stride
        const isRunning = b.isRunning;
        const runX = isRunning ? Math.sin(b.runProgress * 4) * 22 : 0;
        const runY = isRunning ? Math.cos(b.runProgress * 4) * 6 : 0;
        const legStride = isRunning ? Math.sin(b.runProgress * 12) * 8 : 0;

        ctx.translate(b.x + runX, b.y + b.stanceOffset + b.tapOffset + runY);
        ctx.scale(scale, scale);

        // 3D Shadow under batsman
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.beginPath();
        safeEllipse(ctx, 0, 36, 18, 7, 0);
        ctx.fill();

        // White Batting Pads with Active Leg Strides
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        safeRoundRect(ctx, -12, 10 + legStride, 10, 26 - legStride * 0.3, 3);
        ctx.fill();
        ctx.stroke();
        safeRoundRect(ctx, 2, 10 - legStride, 10, 26 + legStride * 0.3, 3);
        ctx.fill();
        ctx.stroke();

        // White Jersey with Stance breathing scale
        ctx.fillStyle = '#ffffff';
        safeRoundRect(ctx, -12, -12, 24, 24, 6);
        ctx.fill();
        ctx.stroke();

        // Jersey Blue Trim Collar
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-4, -12, 8, 4);

        // Head (Cricket Helmet) with Dynamic Shot Angle Tilt
        ctx.save();
        ctx.rotate(b.headTilt || 0);

        // Cricket Helmet (Blue)
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, -22, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Helmet Visor / Grille
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.fillRect(2, -22, 10, 8);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(2, -22, 10, 8);

        // Cute Expressive Eyes
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        if (b.emotion === 'dismay') {
            // Sad / closed eyes
            ctx.moveTo(-4, -22); ctx.lineTo(-1, -22);
            ctx.moveTo(2, -22); ctx.lineTo(5, -22);
            ctx.stroke();
        } else {
            ctx.arc(-2, -22, 2, 0, Math.PI * 2);
            ctx.arc(4, -22, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Antennae (wiggle)
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-4, -32);
        ctx.lineTo(-8 + Math.sin(Date.now() / 150) * 2, -42);
        ctx.moveTo(4, -32);
        ctx.lineTo(8 + Math.sin(Date.now() / 150 + 1) * 2, -42);
        ctx.stroke();

        ctx.restore(); // Restore head tilt

        // Batting Arms & 3D Willow Cricket Bat
        ctx.save();
        ctx.translate(6, -2);
        ctx.rotate((b.batAngle * Math.PI) / 180);

        // Bat Handle (Grip)
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-2, 0, 4, 14);
        ctx.strokeRect(-2, 0, 4, 14);

        // Bat Blade (Fine English Willow Grain)
        const batGrad = ctx.createLinearGradient(-6, 14, 6, 52);
        batGrad.addColorStop(0, '#fef3c7');
        batGrad.addColorStop(0.3, '#fbbf24');
        batGrad.addColorStop(0.7, '#d97706');
        batGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = batGrad;
        safeRoundRect(ctx, -6, 14, 12, 38, [2, 2, 6, 6]);
        ctx.fill();
        ctx.stroke();

        // Bat Edge Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(-5, 16, 2, 34);

        // Blue Batting Gloves
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore(); // Restore Bat
        ctx.restore(); // Restore Batsman
    },

    drawSnail(ctx, x, y, shellColor, scale = 1, eyeAngle = 0, isDiving = false, isCheering = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Cheer jump offset
        if (isCheering) {
            ctx.translate(0, -Math.abs(Math.sin(Date.now() / 160)) * 8);
        }

        // Diving posture forward tilt
        if (isDiving) {
            ctx.rotate(-0.25);
        }

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        safeEllipse(ctx, 0, 12, 16, 6, 0);
        ctx.fill();

        // Body (Cute snail foot)
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        safeRoundRect(ctx, -14, 2, 28, 10, 5);
        ctx.fill();
        ctx.stroke();

        // Eyestalks (Turn dynamically towards ball)
        const eyeOffset = Math.sin(eyeAngle) * 3.5;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-10, 2);
        ctx.lineTo(-12 + eyeOffset, -6);
        ctx.moveTo(-6, 2);
        ctx.lineTo(-6 + eyeOffset, -6);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-12 + eyeOffset, -6, 2, 0, Math.PI * 2);
        ctx.arc(-6 + eyeOffset, -6, 2, 0, Math.PI * 2);
        ctx.fill();

        // Colorful Shell with 3D Radial Depth
        const shellGrad = ctx.createRadialGradient(2, -4, 2, 2, -4, 11);
        shellGrad.addColorStop(0, '#ffffff');
        shellGrad.addColorStop(0.4, shellColor);
        shellGrad.addColorStop(1, '#0f172a');

        ctx.fillStyle = shellGrad;
        ctx.beginPath();
        ctx.arc(2, -4, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Shell Spiral
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(2, -4, 6, 0, Math.PI * 1.5);
        ctx.stroke();

        ctx.restore();
    },

    draw3DBall(ctx, ball, canvasHeight) {
        ctx.save();
        // Depth scale from bowler (0.55x) to batsman (1.15x)
        const depthRatio = Math.max(0, Math.min(1, ball.y / canvasHeight));
        const depthScale = 0.55 + 0.55 * depthRatio;
        const radius = Math.max(3.5, 9 * depthScale);

        const drawY = ball.y - ball.z; // Projected altitude

        // 3D Shadow on the ground
        const shadowAlpha = Math.max(0.08, 0.40 - ball.z * 0.0035);
        const shadowRadius = Math.max(2, radius * (1 + ball.z * 0.02));
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.beginPath();
        safeEllipse(ctx, ball.x, ball.y + 4, shadowRadius, shadowRadius * 0.45, 0);
        ctx.fill();

        // Delivery variation aura & trail glow
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

        // Cricket Red Leather Ball with 3D Specular Highlight
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

        // Seam (Rotating)
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

    // Trigger Delivery with Variations & Physics
    triggerPitchDelivery(speed = 'medium', variation = 'standard') {
        const s = this.state;
        s.bowler.isBowling = true;
        s.bowler.armAngle = 0;
        s.bowler.runUpProgress = 0;

        let duration = 1050;
        let bouncePitchPoint = 0.50;
        let maxBounceZ = 18;

        if (variation === 'bouncer') {
            duration = speed === 'fast' ? 820 : 920;
            bouncePitchPoint = 0.35; // Pitches short
            maxBounceZ = 28; // Bounces high up to chest/helmet height
        } else if (variation === 'yorker') {
            duration = speed === 'fast' ? 760 : 840;
            bouncePitchPoint = 0.78; // Pitches right at the batsman's toes
            maxBounceZ = 7; // Skids low along the pitch
        } else if (variation === 'slower') {
            duration = 1350; // Deceptive floaty knuckle ball
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
            // standard
            duration = speed === 'fast' ? 880 : (speed === 'slow' ? 1250 : 1050);
            bouncePitchPoint = 0.50;
            maxBounceZ = 18;
        }

        // Adjust speed/reaction window based on difficulty setting
        const diff = (typeof GameState !== 'undefined' && GameState.difficulty) ? GameState.difficulty : 'medium';
        if (diff === 'low') {
            duration = Math.round(duration * 1.25); // Slower & easier to track
        } else if (diff === 'high') {
            duration = Math.round(duration * 0.78); // Rapid express pace
        }

        s.ball.variation = variation;
        s.ball.bouncePitchPoint = bouncePitchPoint;
        s.ball.maxBounceZ = maxBounceZ;
        s.ball.x = s.bowler.x;
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

        // Origin at bat contact
        s.ball.x = s.batsman.x + 4;
        s.ball.y = s.batsman.y - 14;
        s.ball.z = 12;

        if (runs === 6) {
            // High six into stadium stands
            s.batsman.swingType = 'six';
            s.batsman.emotion = 'celebrate';
            s.batsman.emotionTimer = 65;
            s.crowdCheer = 1.0;
            s.ball.vx = (Math.random() - 0.5) * 6;
            s.ball.vy = -14;
            s.ball.vz = 16;
            this.flash('SIX!');
            this.addConfetti(s.batsman.x, s.batsman.y);
        } else if (runs === 4) {
            // Bullet ground drive to boundary
            s.batsman.swingType = 'four';
            s.batsman.emotion = 'celebrate';
            s.batsman.emotionTimer = 50;
            s.crowdCheer = 0.85;
            s.ball.vx = Math.random() < 0.5 ? 8.5 : -8.5;
            s.ball.vy = -6.5;
            s.ball.vz = 2;
            this.flash('FOUR!');
        } else if (runs > 0) {
            // 1 or 2 runs into outfield with running cycle
            s.batsman.swingType = 'drive';
            s.ball.vx = (Math.random() - 0.5) * 4.5;
            s.ball.vy = -4;
            s.ball.vz = 3.5;
            s.batsman.isRunning = true;
            setTimeout(() => s.batsman.isRunning = false, 1200);
        } else {
            // Played and missed
            s.batsman.swingType = 'drive';
            s.ball.vx = (Math.random() - 0.5) * 1.5;
            s.ball.vy = 1.2;
            s.ball.vz = 0;
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
    },

    triggerWicket() {
        const s = this.state;
        s.ball.isHit = true;
        s.stumps.batting.broken = true;

        // Batsman dismay & Bowler/Fielder celebration
        s.batsman.emotion = 'dismay';
        s.batsman.emotionTimer = 80;
        s.bowler.emotion = 'celebrate';
        s.bowler.emotionTimer = 75;
        s.snails.forEach(snail => snail.isCheering = true);
        setTimeout(() => s.snails.forEach(snail => snail.isCheering = false), 1800);

        // Explode bails with upward physics
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
                x: x + (Math.random() - 0.5) * 80,
                y: y - 60,
                vx: (Math.random() - 0.5) * 12,
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
