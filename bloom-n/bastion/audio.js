/**
 * Arc Bastion: Siegesmiths — Tactile Brass-Harp & Crystal WebAudio Synthesizer
 * Procedural, zero-asset foley & harmonic feedback with instant mute control
 * and full headless Node safety.
 */

function clampFinite(val, min, max, fallback = 0) {
  if (typeof val === "number") {
    return Number.isFinite(val) ? Math.max(min, Math.min(max, val)) : fallback;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    const n = Number(trimmed);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }
  return fallback;
}

export class BastionAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.windWhirSource = null;
    this.windWhirFilter = null;
    this.windWhirGain = null;
    this.noiseBuffer = null;
    this.unlocked = false;
  }

  _getAudioContextClass() {
    const root = typeof globalThis !== "undefined" ? globalThis : {};
    const win = root.window || null;
    if (win && (win.AudioContext || win.webkitAudioContext)) {
      return win.AudioContext || win.webkitAudioContext;
    }
    return root.AudioContext || root.webkitAudioContext || null;
  }

  setMuted(flag) {
    this.muted = Boolean(flag);
    if (this.ctx) {
      const now = this.ctx.currentTime || 0;
      if (this.engineGain && typeof this.engineGain.gain?.setTargetAtTime === "function") {
        this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.012, now, 0.06);
      }
      if (this.windWhirGain && this.muted && typeof this.windWhirGain.gain?.setTargetAtTime === "function") {
        this.windWhirGain.gain.setTargetAtTime(0, now, 0.05);
      }
    }
  }

  unlock() {
    if (this.muted) return;
    if (!this.ctx) {
      const AC = this._getAudioContextClass();
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (_) {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === "suspended" && typeof this.ctx.resume === "function") {
      Promise.resolve(this.ctx.resume()).catch(() => {});
    }
    if (!this.noiseBuffer && this.ctx && typeof this.ctx.createBuffer === "function") {
      try {
        const sampleRate = this.ctx.sampleRate || 44100;
        const length = Math.floor(sampleRate * 0.4);
        const buf = this.ctx.createBuffer(1, length, sampleRate);
        const data = buf.getChannelData(0);
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        for (let i = 0; i < length; i++) {
          const white = ((i * 16807) % 2147483647) / 1073741823.5 - 1.0;
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          data[i] = Math.max(-0.95, Math.min(0.95, (b0 + b1 + b2 + white * 0.1848) * 0.17));
        }
        this.noiseBuffer = buf;
      } catch (_) {}
    }
    if (!this.engineOsc && this.ctx) {
      try {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = 64;
        filter.type = "lowpass";
        filter.frequency.value = 240;
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
    if (
      !this.windWhirGain &&
      this.ctx &&
      this.noiseBuffer &&
      typeof this.ctx.createBufferSource === "function"
    ) {
      try {
        const src = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        src.buffer = this.noiseBuffer;
        src.loop = true;
        filter.type = "bandpass";
        filter.frequency.value = 1180;
        if (filter.Q) filter.Q.value = 1.45;
        gain.gain.value = 0.0;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        src.start();
        this.windWhirSource = src;
        this.windWhirFilter = filter;
        this.windWhirGain = gain;
      } catch (_) {}
    }
    this.unlocked = true;
  }

  stopHum() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime || 0;
    if (this.engineGain && typeof this.engineGain.gain?.setTargetAtTime === "function") {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
    }
    if (this.windWhirGain && typeof this.windWhirGain.gain?.setTargetAtTime === "function") {
      this.windWhirGain.gain.setTargetAtTime(0, now, 0.06);
    }
  }

  updateRigHum(speedNorm = 0, rigId = "iron_ballista", bulletTime = false) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const now = this.ctx.currentTime || 0;
    if (this.muted) {
      if (typeof this.engineGain.gain?.setTargetAtTime === "function") {
        this.engineGain.gain.setTargetAtTime(0, now, 0.05);
      }
      return;
    }
    const clamped = clampFinite(speedNorm, 0, 1.6, 0);
    const isSkiff = rigId === "prism_rail_skiff" || rigId === "rail_skiff";
    const btScale = bulletTime ? 0.55 : 1.0;
    const baseFreq = (isSkiff ? 168 : 62) * btScale;
    const span = (isSkiff ? 124 : 72) * btScale;
    this.engineOsc.type = isSkiff ? "sine" : "triangle";
    if (typeof this.engineOsc.frequency?.setTargetAtTime === "function") {
      this.engineOsc.frequency.setTargetAtTime(baseFreq + clamped * span, now, 0.07);
    }
    const vol = (0.007 + Math.min(1, clamped) * (isSkiff ? 0.022 : 0.03)) * (bulletTime ? 0.65 : 1.0);
    if (typeof this.engineGain.gain?.setTargetAtTime === "function") {
      this.engineGain.gain.setTargetAtTime(vol, now, 0.08);
    }
    if (this.windWhirGain && typeof this.windWhirGain.gain?.setTargetAtTime === "function") {
      const whirVol = clamped > 0.09 ? Math.min(0.02, clamped * 0.017) : 0;
      this.windWhirGain.gain.setTargetAtTime(whirVol, now, 0.06);
    }
  }

  updateMovementHum(speedNorm = 0, rigId = "iron_ballista", bulletTime = false) {
    this.updateRigHum(speedNorm, rigId, bulletTime);
  }

  tone(freq, dur = 0.12, type = "sine", vol = 0.08, delay = 0, slideTo = null) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    try {
      const safeFreq = clampFinite(freq, 30, 12000, 440);
      const safeDur = clampFinite(dur, 0.015, 5.0, 0.12);
      const safeVol = clampFinite(vol, 0.0002, 1.0, 0.08);
      const safeDelay = clampFinite(delay, 0, 10.0, 0);
      const t0 = (this.ctx.currentTime || 0) + safeDelay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(safeFreq, t0);
      if (slideTo !== null && slideTo !== undefined) {
        const safeSlide = clampFinite(slideTo, 30, 12000, NaN);
        if (Number.isFinite(safeSlide)) {
          osc.frequency.exponentialRampToValueAtTime(safeSlide, t0 + safeDur);
        }
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(safeVol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + safeDur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + safeDur + 0.02);
    } catch (_) {}
  }

  noiseBurst(dur = 0.15, cutoffHz = 1350, q = 1.6, vol = 0.045, delay = 0) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    if (this.noiseBuffer && typeof this.ctx.createBufferSource === "function") {
      try {
        const safeDur = clampFinite(dur, 0.02, 2.0, 0.15);
        const t0 = (this.ctx.currentTime || 0) + clampFinite(delay, 0, 5.0, 0);
        const src = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        src.buffer = this.noiseBuffer;
        filter.type = "bandpass";
        filter.frequency.value = clampFinite(cutoffHz, 120, 8000, 1350);
        if (filter.Q) filter.Q.value = clampFinite(q, 0.3, 12, 1.6);
        g.gain.setValueAtTime(clampFinite(vol, 0.0002, 0.5, 0.045), t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + safeDur);
        src.connect(filter);
        filter.connect(g);
        g.connect(this.ctx.destination);
        src.start(t0);
        src.stop(t0 + safeDur + 0.02);
        return;
      } catch (_) {}
    }
    this.tone(cutoffHz, dur * 0.6, "triangle", vol * 0.65, delay, cutoffHz * 1.25);
  }

  playDetentClick(currentValue = 0) {
    const clamped = clampFinite(currentValue, -250, 250, 0);
    const freq = Math.max(165, Math.min(940, 380 + clamped * 1.15));
    this.tone(freq, 0.042, "triangle", 0.065);
    this.tone(freq * 1.5, 0.028, "sine", 0.028, 0.01);
  }

  playBeamSlice(isRepel = false) {
    if (isRepel) {
      this.playMagneticRepel();
      return;
    }
    this.tone(480, 0.16, "sawtooth", 0.052, 0, 980);
    this.tone(720, 0.19, "sine", 0.062, 0.03, 1320);
  }

  playTwinBeam(isRepel = false) {
    this.playBeamSlice(isRepel);
  }

  playMagneticRepel() {
    this.tone(255, 0.12, "triangle", 0.07, 0, 180);
    this.tone(340, 0.12, "sine", 0.055, 0.06, 225);
  }

  playClear(overdrive = false) {
    const notes = overdrive
      ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
      : [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      this.tone(
        n,
        0.24,
        idx % 2 === 0 ? "triangle" : "sine",
        overdrive ? 0.085 : 0.065,
        idx * 0.052
      );
    });
  }

  playGentleMiss() {
    // Turquoise Cryo-Gel cushion pop + warm brass caliper chime
    this.noiseBurst(0.14, 920, 1.5, 0.038, 0);
    this.tone(264, 0.15, "triangle", 0.062, 0.01, 220);
    this.tone(396, 0.16, "sine", 0.048, 0.06, 352);
  }

  playCaliperNudge() {
    this.playGentleMiss();
  }

  playCryoGelSplat() {
    this.playGentleMiss();
  }

  playSnowShardTick() {
    this.tone(820 + Math.random() * 220, 0.05, "triangle", 0.036);
  }

  playGearTick() {
    this.playSnowShardTick();
  }

  playSlipstreamBoost(overdrive = false) {
    if (this.muted) return;
    this.tone(182, 0.28, "sawtooth", overdrive ? 0.058 : 0.046, 0, overdrive ? 720 : 540);
    const notes = overdrive
      ? [587.33, 880.0, 1174.66, 1567.98, 2093.0]
      : [523.25, 783.99, 1046.5, 1567.98];
    notes.forEach((n, idx) => {
      this.tone(n, 0.22, "sine", overdrive ? 0.068 : 0.052, 0.035 + idx * 0.045);
    });
  }

  playRelicChime() {
    const notes = [659.25, 880.0, 1174.66, 1567.98];
    notes.forEach((n, idx) => {
      this.tone(n, 0.24, "sine", 0.065, idx * 0.05);
    });
  }

  playCoinGrab() {
    this.playRelicChime();
  }

  playBulletTimeChime(active = true) {
    if (active) {
      // Crystal time-dome expansion harp glissando
      const notes = [783.99, 987.77, 1174.66, 1567.98];
      notes.forEach((n, idx) => {
        this.tone(n, 0.28, "sine", 0.052, idx * 0.042);
      });
    } else {
      const notes = [1174.66, 880.0, 587.33];
      notes.forEach((n, idx) => {
        this.tone(n, 0.16, "triangle", 0.045, idx * 0.035);
      });
    }
  }

  playGearBurst(overdrive = false) {
    // Tumbling brass cogwheel chime + confetti pop
    this.noiseBurst(0.18, 1650, 1.4, overdrive ? 0.055 : 0.042, 0);
    const cogs = overdrive ? [440, 587.33, 783.99, 1174.66] : [392, 523.25, 659.25];
    cogs.forEach((f, idx) => {
      this.tone(f, 0.17, "triangle", overdrive ? 0.072 : 0.056, idx * 0.038);
    });
  }

  playCrystalShatter(overdrive = false) {
    this.playGearBurst(overdrive);
  }

  playFoxReveal() {
    const notes = [523.25, 659.25, 783.99, 987.77];
    notes.forEach((n, idx) => {
      this.tone(n, 0.24, "sine", 0.06, idx * 0.06);
    });
  }

  playWhaleSong() {
    this.tone(293.66, 0.55, "sine", 0.065, 0, 440.0);
    this.tone(440.0, 0.65, "sine", 0.055, 0.28, 587.33);
  }

  playGarageLift() {
    this.tone(220, 0.18, "triangle", 0.06, 0, 330);
    this.tone(440, 0.22, "sine", 0.055, 0.09, 659.25);
  }

  playWorkshopChime() {
    this.playGarageLift();
  }

  playGuardianAwakening() {
    const chord = [261.63, 329.63, 392.0, 523.25, 783.99];
    chord.forEach((n, idx) => {
      this.tone(n, 0.42, idx < 2 ? "triangle" : "sine", 0.068, idx * 0.07);
    });
  }

  playCoopFlare() {
    this.tone(523.25, 0.26, "sine", 0.065, 0, 1046.5);
    this.tone(1318.5, 0.28, "triangle", 0.055, 0.12);
  }

  playCoopGateBurst() {
    const notes = [587.33, 783.99, 1174.66];
    notes.forEach((n, idx) => {
      this.tone(n, 0.22, "sine", 0.06, idx * 0.048);
    });
  }

  playAstrolabeLock() {
    const notes = [440, 659.25, 880, 1318.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.26, "triangle", 0.062, idx * 0.055);
    });
  }

  playExpeditionWaypoint() {
    this.tone(587.33, 0.16, "triangle", 0.06, 0);
    this.tone(880.0, 0.22, "sine", 0.065, 0.06);
  }
}
