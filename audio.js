// ================================================================
// SIKSAAN PENONTON — Audio Engine (Web Audio API Synthesizer)
// 100% Standalone - Zero External Asset Dependencies (No CORS!)
// ================================================================
'use strict';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.currentStep = 0;
    this.musicTempo = 130; // BPM
    this.isCurseActive = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.bgmPlaying) {
      this.stopBGM();
    } else if (!this.muted && !this.bgmPlaying) {
      this.startBGM();
    }
    return this.muted;
  }

  // Helper to create basic osc + gain node
  playTone(freq, duration, type = 'square', startGain = 0.15, endGain = 0.001, pitchDrop = 0) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (pitchDrop !== 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + pitchDrop), now + duration);
      }

      gain.gain.setValueAtTime(startGain, now);
      gain.gain.exponentialRampToValueAtTime(endGain, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  playShoot() {
    this.init();
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playHit() {
    this.init();
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playGem() {
    this.init();
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [659.25, 880, 1318.51];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.03);
      gain.gain.setValueAtTime(0.08, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 0.1);
    });
  }

  playLevelUp() {
    this.init();
    if (this.muted || !this.ctx) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((f, i) => {
      const now = this.ctx.currentTime + i * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  playNuke() {
    this.init();
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    // White noise buffer for massive explosion
    const bufferSize = this.ctx.sampleRate * 1.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 1.2);
  }

  playCurseAlert() {
    this.init();
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Two tone eerie alarm
    [0, 0.15, 0.3, 0.45].forEach((offset, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(idx % 2 === 0 ? 330 : 220, now + offset);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });
  }

  playVoteTick() {
    this.init();
    if (this.muted || !this.ctx) return;
    this.playTone(800, 0.03, 'triangle', 0.06, 0.001);
  }

  playVoteWin() {
    this.init();
    if (this.muted || !this.ctx) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      this.playTone(f, 0.25, 'square', 0.12, 0.001);
    });
  }

  playBossRoar() {
    this.init();
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.9);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  playWeaponDrop() {
    this.init();
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    [0, 0.08, 0.15].forEach((t, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(900 - i * 200, now + t);
      gain.gain.setValueAtTime(0.12, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.07);
    });
  }

  playWeaponPickup() {
    this.init();
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    [0, 0.06, 0.12].forEach((t, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500 + i * 250, now + t);
      gain.gain.setValueAtTime(0.12, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.08);
    });
  }

  // ── RETRO SYNTH CHIPTUNE BGM ──────────────────────────────
  startBGM() {
    if (this.muted || this.bgmPlaying) return;
    this.init();
    this.bgmPlaying = true;
    this.currentStep = 0;

    const bassLine = [
      110, 110, 130.81, 110, 146.83, 110, 130.81, 123.47,
      98, 98, 123.47, 98, 130.81, 98, 123.47, 110
    ];

    const leadLine = [
      440, 0, 523.25, 0, 587.33, 523.25, 440, 0,
      392, 0, 493.88, 0, 523.25, 493.88, 440, 0
    ];

    const stepDuration = 60 / (this.musicTempo * 4); // 16th note

    const playStep = () => {
      if (!this.bgmPlaying || this.muted) return;
      const now = this.ctx.currentTime;
      const step = this.currentStep % 16;

      // Bass note
      const bFreq = bassLine[step];
      if (bFreq > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = this.isCurseActive ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(bFreq, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + stepDuration * 1.5);
      }

      // Lead Melody
      const lFreq = leadLine[step];
      if (lFreq > 0 && (step % 2 === 0 || Math.random() < 0.3)) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(lFreq * (this.isCurseActive ? 0.94 : 1), now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + stepDuration * 1.2);
      }

      // Hi-hat noise on every off-beat
      if (step % 4 === 2) {
        this.playTone(3000, 0.02, 'triangle', 0.02, 0.001);
      }
      // Snare on beat 4 and 12
      if (step === 4 || step === 12) {
        this.playTone(180, 0.06, 'sawtooth', 0.05, 0.001, -80);
      }

      this.currentStep++;
      this.bgmTimer = setTimeout(playStep, stepDuration * 1000);
    };

    playStep();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

const audio = new SoundEngine();
