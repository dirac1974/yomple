/**
 * Frostwake Tactile WebAudio Synthesizer
 * Procedural, zero-asset foley & harmonic feedback with instant mute control.
 */

export class FrostwakeAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.unlocked = false;
  }

  setMuted(flag) {
    this.muted = Boolean(flag);
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.015, this.ctx.currentTime, 0.08);
    }
  }

  unlock() {
    if (this.muted) return;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    if (!this.engineOsc && this.ctx) {
      try {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = 58;
        filter.type = "lowpass";
        filter.frequency.value = 180;
        gain.gain.value = 0.0;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        this.engineOsc = osc;
        this.engineFilter = filter;
        this.engineGain = gain;
      } catch (_) {}
    }
    this.unlocked = true;
  }

  updateRigHum(speedNorm, chassisId) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const now = this.ctx.currentTime;
    if (this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }
    const isSled = chassisId === "aurora_sled";
    const baseFreq = isSled ? 148 : 54;
    const pitchSpan = isSled ? 110 : 62;
    this.engineOsc.type = isSled ? "sine" : "triangle";
    this.engineOsc.frequency.setTargetAtTime(baseFreq + speedNorm * pitchSpan, now, 0.07);
    const vol = 0.008 + Math.min(1, speedNorm) * (isSled ? 0.022 : 0.032);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.08);
  }

  stopHum() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
  }

  tone(freq, dur = 0.11, type = "sine", vol = 0.09, delay = 0, slideTo = null) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freq), t0);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  playDetentClick(currentValue = 0) {
    const clamped = Math.max(-200, Math.min(200, Number(currentValue) || 0));
    const freq = 340 + clamped * 1.1;
    this.tone(Math.max(150, Math.min(880, freq)), 0.045, "triangle", 0.065);
  }

  playSnowShardTick() {
    this.tone(780 + Math.random() * 240, 0.055, "sine", 0.03);
  }

  playTwinBeam() {
    this.tone(520, 0.16, "sawtooth", 0.05, 0, 960);
    this.tone(780, 0.18, "sine", 0.06, 0.03, 1180);
  }

  playMagneticRepel() {
    this.tone(240, 0.12, "triangle", 0.07, 0, 175);
    this.tone(310, 0.12, "sine", 0.06, 0.07, 220);
  }

  playCaliperNudge() {
    this.tone(220, 0.14, "triangle", 0.07, 0, 190);
    this.tone(330, 0.14, "sine", 0.05, 0.06, 300);
  }

  playClear(overdrive = false) {
    const notes = overdrive ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      this.tone(n, 0.24, idx % 2 === 0 ? "triangle" : "sine", overdrive ? 0.085 : 0.065, idx * 0.055);
    });
  }

  playFoxReveal() {
    [392, 493.88, 587.33, 783.99].forEach((n, idx) => {
      this.tone(n, 0.28, "sine", 0.065, idx * 0.07);
    });
  }

  playWhaleSong() {
    this.tone(196, 0.9, "sine", 0.07, 0, 293.66);
    this.tone(293.66, 1.1, "sine", 0.06, 0.45, 220);
  }
}
