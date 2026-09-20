// ===================================
// UTILITIES & WEB AUDIO SYNTHESIZER
// Procedural audio generation & helpers
// ===================================

const Utils = {
    audioCtx: null,

    /**
     * Get or initialize Web Audio Context safely on user gesture
     */
    getAudioContext() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    /**
     * Procedural Sound Effects via Web Audio API (Zero external audio asset dependencies)
     */
    playSound(soundType) {
        if (this.getSetting('soundEnabled', 'true') !== 'true') return;

        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            switch (soundType) {
                case 'bat-hit': {
                    // Crisp wooden crack of cricket bat hitting ball
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(320, now);
                    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

                    // Noise burst for impact
                    const bufferSize = ctx.sampleRate * 0.05;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    const noise = ctx.createBufferSource();
                    noise.buffer = buffer;
                    const noiseGain = ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.6, now);
                    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

                    gain.gain.setValueAtTime(0.8, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    noise.connect(noiseGain);
                    noiseGain.connect(ctx.destination);

                    osc.start(now);
                    noise.start(now);
                    osc.stop(now + 0.1);
                    noise.stop(now + 0.06);
                    break;
                }

                case 'bonus': {
                    // Uplifting 2-tone chime for +1 bonus ball reward
                    [523.25, 659.25, 783.99].forEach((freq, idx) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                        gain.gain.setValueAtTime(0.3, now + idx * 0.06);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now + idx * 0.06);
                        osc.stop(now + idx * 0.06 + 0.3);
                    });
                    break;
                }

                case 'penalty': {
                    // Subtle low buzzer for -1 ball penalty
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(160, now);
                    osc.frequency.linearRampToValueAtTime(110, now + 0.18);
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.22);
                    break;
                }

                case 'safe': {
                    // Soft reassuring "tuck" for safe non-preferred dot
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.16);
                    break;
                }

                case 'wicket': {
                    // Clatter of timber and bails
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(220, now);
                    osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
                    gain.gain.setValueAtTime(0.5, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.36);
                    break;
                }

                case 'cheer': {
                    // Crowd roar simulation using band-pass filtered white noise
                    const bufferSize = ctx.sampleRate * 0.8;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    const noise = ctx.createBufferSource();
                    noise.buffer = buffer;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.setValueAtTime(800, now);
                    filter.Q.setValueAtTime(1.5, now);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.01, now);
                    gain.gain.linearRampToValueAtTime(0.4, now + 0.2);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    noise.start(now);
                    noise.stop(now + 0.82);
                    break;
                }

                case 'coin-flip': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, now);
                    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.22);
                    break;
                }
            }
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    },

    /**
     * Vibrate device if supported
     */
    vibrate(duration = 100) {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    },

    /**
     * Wait helper
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * DOM Class helpers
     */
    addClass(element, className) {
        if (element) element.classList.add(className);
    },

    removeClass(element, className) {
        if (element) element.classList.remove(className);
    },

    toggleClass(element, className) {
        if (element) element.classList.toggle(className);
    },

    show(element) {
        if (element) element.classList.remove('hidden');
    },

    hide(element) {
        if (element) element.classList.add('hidden');
    },

    /**
     * Local storage settings
     */
    getSetting(key, defaultValue) {
        return localStorage.getItem(key) || defaultValue;
    },

    saveSetting(key, value) {
        localStorage.setItem(key, value);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
