/**
 * Frostwake Tactile WebAudio Synthesizer
 * Procedural, zero-asset foley & harmonic feedback with instant mute control
 * and headless Node safety.
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

export class FrostwakeAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.snowHissSource = null;
    this.snowHissFilter = null;
    this.snowHissGain = null;
    this.noiseBuffer = null;
    this.unlocked = false;
  }

  setMuted(flag) {
    this.muted = Boolean(flag);
    if (this.ctx) {
      const now = this.ctx.currentTime || 0;
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.015, now, 0.08);
      }
      if (this.snowHissGain && this.muted) {
        this.snowHissGain.gain.setTargetAtTime(0, now, 0.05);
      }
    }
  }

  unlock() {
    if (this.muted) return;
    if (!this.ctx) {
      const root = typeof globalThis !== "undefined" ? globalThis : {};
      const AC = root.AudioContext || root.webkitAudioContext;
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
    if (!this.snowHissGain && this.ctx) {
      try {
        if (
          typeof this.ctx.createBuffer === "function" &&
          typeof this.ctx.createBufferSource === "function"
        ) {
          const sampleRate = this.ctx.sampleRate || 44100;
          const length = Math.floor(sampleRate * 0.5);
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
            data[i] = Math.max(-0.95, Math.min(0.95, (b0 + b1 + b2 + white * 0.1848) * 0.18));
          }
          this.noiseBuffer = buf;
          const src = this.ctx.createBufferSource();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();
          src.buffer = buf;
          src.loop = true;
          filter.type = "bandpass";
          filter.frequency.value = 1100;
          if (filter.Q) filter.Q.value = 1.35;
          gain.gain.value = 0.0;
          src.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          src.start();
          this.snowHissSource = src;
          this.snowHissFilter = filter;
          this.snowHissGain = gain;
        }
      } catch (_) {}
    }
    this.unlocked = true;
  }

  updateRigHum(speedNorm = 0, chassisId = "terra_dozer") {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const now = this.ctx.currentTime || 0;
    if (this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }
    const clamped = clampFinite(speedNorm, 0, 1.5, 0);
    const isSled = chassisId === "aurora_sled";
    const baseFreq = isSled ? 148 : 54;
    const pitchSpan = isSled ? 110 : 62;
    this.engineOsc.type = isSled ? "sine" : "triangle";
    this.engineOsc.frequency.setTargetAtTime(baseFreq + clamped * pitchSpan, now, 0.07);
    const vol = 0.008 + Math.min(1, clamped) * (isSled ? 0.022 : 0.032);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.08);
  }

  updateSnowHiss(speedNorm = 0, inPermafrost = false, hasWideBlade = false) {
    if (!this.ctx || !this.snowHissFilter || !this.snowHissGain) return;
    const now = this.ctx.currentTime || 0;
    const s = clampFinite(speedNorm, 0, 1.4, 0);
    if (this.muted || !(s > 0.08)) {
      this.snowHissGain.gain.setTargetAtTime(0, now, 0.06);
      return;
    }
    let freq = 950 + s * 1150;
    let qVal = 1.35;
    let targetGain = Math.min(0.024, s * 0.022);
    if (inPermafrost && !hasWideBlade) {
      freq = 480 + s * 420;
      qVal = 2.1;
      targetGain = Math.min(0.022, s * 0.02);
    } else if (inPermafrost && hasWideBlade) {
      freq = 1450 + s * 1250;
      qVal = 1.15;
      targetGain = Math.min(0.03, s * 0.026);
    }
    this.snowHissFilter.frequency.setTargetAtTime(freq, now, 0.06);
    if (this.snowHissFilter.Q && typeof this.snowHissFilter.Q.setTargetAtTime === "function") {
      this.snowHissFilter.Q.setTargetAtTime(qVal, now, 0.06);
    }
    this.snowHissGain.gain.setTargetAtTime(targetGain, now, 0.06);
  }

  stopHum() {
    if (this.ctx) {
      const now = this.ctx.currentTime || 0;
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      }
      if (this.snowHissGain) {
        this.snowHissGain.gain.setTargetAtTime(0, now, 0.06);
      }
    }
  }

  tone(freq, dur = 0.11, type = "sine", vol = 0.09, delay = 0, slideTo = null) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    try {
      const safeFreq = clampFinite(freq, 30, 12000, 440);
      const safeDur = clampFinite(dur, 0.01, 5.0, 0.11);
      const safeVol = clampFinite(vol, 0.0002, 1.0, 0.09);
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

  playDetentClick(currentValue = 0) {
    const clamped = clampFinite(currentValue, -200, 200, 0);
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

  playSlipstreamBoost(overdrive = false) {
    if (this.muted) return;
    this.tone(168, 0.28, "sawtooth", overdrive ? 0.058 : 0.045, 0, overdrive ? 680 : 520);
    const notes = overdrive
      ? [587.33, 880.0, 1174.66, 1567.98, 2093.0]
      : [523.25, 783.99, 1046.5, 1567.98];
    notes.forEach((n, idx) => {
      this.tone(
        n,
        0.22,
        idx % 2 === 0 ? "triangle" : "sine",
        overdrive ? 0.072 : 0.055,
        0.03 + idx * 0.042
      );
    });
    if (
      !this.muted &&
      this.ctx &&
      this.noiseBuffer &&
      typeof this.ctx.createBufferSource === "function"
    ) {
      try {
        const t0 = this.ctx.currentTime || 0;
        const src = this.ctx.createBufferSource();
        const bp = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        src.buffer = this.noiseBuffer;
        bp.type = "bandpass";
        bp.frequency.value = overdrive ? 2200 : 1750;
        if (bp.Q) bp.Q.value = 1.6;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(overdrive ? 0.048 : 0.036, t0 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
        src.connect(bp);
        bp.connect(g);
        g.connect(this.ctx.destination);
        src.start(t0);
        src.stop(t0 + 0.36);
      } catch (_) {}
    } else {
      this.tone(1320, 0.16, "sine", 0.032, 0.04, overdrive ? 2640 : 2100);
    }
  }

  playCrystalShatter(overdrive = false) {
    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((n, idx) => {
      this.tone(n, 0.16, idx % 2 === 0 ? "sine" : "triangle", overdrive ? 0.075 : 0.055, idx * 0.028);
    });
    if (!this.muted && this.ctx && this.noiseBuffer && typeof this.ctx.createBufferSource === "function") {
      try {
        const t0 = this.ctx.currentTime || 0;
        const src = this.ctx.createBufferSource();
        const hp = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        src.buffer = this.noiseBuffer;
        hp.type = "highpass";
        hp.frequency.value = 2600;
        g.gain.setValueAtTime(0.045, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);
        src.connect(hp);
        hp.connect(g);
        g.connect(this.ctx.destination);
        src.start(t0);
        src.stop(t0 + 0.09);
      } catch (_) {}
    } else {
      this.tone(1760, 0.075, "sawtooth", 0.035, 0.01, 2640);
    }
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

  playRimeBoop() {
    this.tone(195, 0.11, "triangle", 0.065, 0, 330);
    this.tone(410, 0.09, "sine", 0.045, 0.04, 260);
  }

  playRimeThud(shielded = false) {
    if (shielded) {
      this.tone(620, 0.09, "triangle", 0.06, 0, 440);
    } else {
      this.tone(115, 0.11, "triangle", 0.07, 0, 52);
    }
  }

  playGeyserBurst() {
    this.tone(155, 0.24, "sawtooth", 0.05, 0, 620);
    [587.33, 783.99, 1046.5, 1318.5].forEach((n, idx) => {
      this.tone(n, 0.18, "sine", 0.06, 0.05 + idx * 0.045);
    });
  }

  playRimeGeyserPop() {
    this.playGeyserBurst();
  }

  playPermafrostMelt() {
    this.tone(260, 0.16, "triangle", 0.055, 0, 520);
    this.tone(660, 0.14, "sine", 0.04, 0.04, 880);
  }

  playThermalCharge() {
    this.tone(196, 0.22, "sine", 0.06, 0, 293.66);
    this.tone(293.66, 0.24, "triangle", 0.045, 0.05, 392);
  }

  playThermalTrenchThaw() {
    [392, 493.88, 587.33, 783.99, 987.77].forEach((n, idx) => {
      this.tone(n, 0.24, "sine", 0.065, idx * 0.05);
    });
  }

  playShieldShatter() {
    this.tone(120, 0.15, "sawtooth", 0.07, 0, 58);
    [880, 1174.66, 1567.98].forEach((n, idx) => {
      this.tone(n, 0.16, "triangle", 0.06, 0.03 + idx * 0.04);
    });
  }

  playHarpoonWinch() {
    this.tone(260, 0.2, "sawtooth", 0.05, 0, 1240);
    this.tone(987.77, 0.18, "triangle", 0.065, 0.12, 1318.5);
  }

  playChasmLaunch(boosted = false) {
    if (boosted) {
      this.tone(185, 0.34, "sawtooth", 0.06, 0, 640);
      this.tone(523.25, 0.22, "sine", 0.05, 0.08, 1046.5);
    } else {
      this.tone(155, 0.18, "triangle", 0.045, 0, 235);
    }
  }

  playRimeBlast() {
    this.tone(110, 0.36, "triangle", 0.075, 0, 293.66);
    this.tone(587.33, 0.3, "sine", 0.06, 0.05, 1174.66);
  }

  playGarageLift() {
    this.tone(92, 0.22, "triangle", 0.06, 0, 184);
    this.tone(587.33, 0.14, "sine", 0.05, 0.12);
  }

  playGuardianAwakening() {
    this.tone(130.81, 0.72, "triangle", 0.075, 0);
    [261.63, 392.0, 493.88, 587.33, 783.99].forEach((n, idx) => {
      this.tone(n, 0.42, idx % 2 === 0 ? "triangle" : "sine", 0.07, idx * 0.065);
    });
  }

  playCoopFlare() {
    [587.33, 783.99, 987.77, 1174.66].forEach((n, idx) => {
      this.tone(n, 0.22, "sine", 0.065, idx * 0.045);
    });
  }

  playCoinGrab() {
    this.tone(987.77, 0.09, "sine", 0.07, 0);
    this.tone(1318.5, 0.18, "triangle", 0.075, 0.065);
  }

  playCoopGateBurst(overdrive = false) {
    const chord = overdrive ? [523.25, 659.25, 783.99, 1046.5] : [392.0, 493.88, 587.33, 783.99];
    chord.forEach((n, idx) => {
      this.tone(n, 0.3, "sine", 0.055, idx * 0.05);
    });
  }
}
