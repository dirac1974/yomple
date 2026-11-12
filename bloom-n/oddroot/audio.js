/**
 * Oddroot Wilds Tactile Sanctuary WebAudio Synthesizer
 * Zero-asset procedural foley, marimba detents, elixir waves, creature chimes,
 * and co-op celebration harmonies with instant mute control and headless Node safety.
 */

export class OddrootAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.humOsc = null;
    this.humFilter = null;
    this.humGain = null;
    this.breezeSource = null;
    this.breezeFilter = null;
    this.breezeGain = null;
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
      if (this.humGain && typeof this.humGain.gain?.setTargetAtTime === "function") {
        this.humGain.gain.setTargetAtTime(this.muted ? 0 : 0.008, now, 0.06);
      }
      if (this.breezeGain && this.muted && typeof this.breezeGain.gain?.setTargetAtTime === "function") {
        this.breezeGain.gain.setTargetAtTime(0, now, 0.05);
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
        const length = Math.floor(sampleRate * 0.35);
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
          data[i] = Math.max(-0.95, Math.min(0.95, (b0 + b1 + b2 + white * 0.1848) * 0.16));
        }
        this.noiseBuffer = buf;
      } catch (_) {}
    }
    if (!this.humOsc && this.ctx) {
      try {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 196;
        filter.type = "lowpass";
        filter.frequency.value = 520;
        gain.gain.value = 0.0;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        this.humOsc = osc;
        this.humFilter = filter;
        this.humGain = gain;
      } catch (_) {}
    }
    if (!this.breezeGain && this.ctx && this.noiseBuffer && typeof this.ctx.createBufferSource === "function") {
      try {
        const src = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        src.buffer = this.noiseBuffer;
        src.loop = true;
        filter.type = "bandpass";
        filter.frequency.value = 920;
        if (filter.Q) filter.Q.value = 1.5;
        gain.gain.value = 0.0;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        src.start();
        this.breezeSource = src;
        this.breezeFilter = filter;
        this.breezeGain = gain;
      } catch (_) {}
    }
    this.unlocked = true;
  }

  stopHum() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime || 0;
    if (this.humGain && typeof this.humGain.gain?.setTargetAtTime === "function") {
      this.humGain.gain.setTargetAtTime(0, now, 0.08);
    }
    if (this.breezeGain && typeof this.breezeGain.gain?.setTargetAtTime === "function") {
      this.breezeGain.gain.setTargetAtTime(0, now, 0.06);
    }
  }

  updateMovementHum(speedNorm = 0, mountId = "starlight_glider") {
    if (!this.ctx || !this.humOsc || !this.humGain) return;
    const now = this.ctx.currentTime || 0;
    if (this.muted) {
      if (typeof this.humGain.gain?.setTargetAtTime === "function") {
        this.humGain.gain.setTargetAtTime(0, now, 0.05);
      }
      return;
    }
    const clamped = Math.max(0, Math.min(1.5, Number(speedNorm) || 0));
    const isBoar = mountId === "bramble_boar";
    this.humOsc.type = isBoar ? "triangle" : "sine";
    const targetFreq = isBoar ? 72 + clamped * 68 : 196 + clamped * 134;
    const filterFreq = isBoar ? 240 : 620;
    const targetGain = isBoar
      ? 0.008 + Math.min(1, clamped) * 0.028
      : 0.006 + Math.min(1, clamped) * 0.022;
    if (typeof this.humOsc.frequency?.setTargetAtTime === "function") {
      this.humOsc.frequency.setTargetAtTime(targetFreq, now, 0.07);
    }
    if (this.humFilter && typeof this.humFilter.frequency?.setTargetAtTime === "function") {
      this.humFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    }
    if (typeof this.humGain.gain?.setTargetAtTime === "function") {
      this.humGain.gain.setTargetAtTime(targetGain, now, 0.08);
    }
    if (this.breezeGain && typeof this.breezeGain.gain?.setTargetAtTime === "function") {
      const breezeVol = clamped > 0.1 ? Math.min(0.018, clamped * 0.016) : 0;
      this.breezeGain.gain.setTargetAtTime(breezeVol, now, 0.07);
    }
  }

  updateRigHum(speedNorm = 0, mountId = "starlight_glider") {
    this.updateMovementHum(speedNorm, mountId);
  }

  tone(freq, dur = 0.12, type = "sine", vol = 0.08, delay = 0, slideTo = null) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    try {
      const safeFreq = Math.max(30, Number.isFinite(Number(freq)) ? Number(freq) : 440);
      const safeDur = Math.max(0.02, Number.isFinite(Number(dur)) ? Number(dur) : 0.12);
      const t0 = (this.ctx.currentTime || 0) + Math.max(0, Number(delay) || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(safeFreq, t0);
      if (slideTo !== null && Number.isFinite(Number(slideTo))) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, Number(slideTo)), t0 + safeDur);
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + safeDur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + safeDur + 0.02);
    } catch (_) {}
  }

  noiseBurst(dur = 0.16, cutoffHz = 1300, q = 1.6, vol = 0.045, delay = 0) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    if (this.noiseBuffer && typeof this.ctx.createBufferSource === "function") {
      try {
        const t0 = (this.ctx.currentTime || 0) + Math.max(0, Number(delay) || 0);
        const src = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        src.buffer = this.noiseBuffer;
        filter.type = "bandpass";
        filter.frequency.value = Math.max(120, cutoffHz);
        if (filter.Q) filter.Q.value = q;
        g.gain.setValueAtTime(Math.max(0.0002, vol), t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filter);
        filter.connect(g);
        g.connect(this.ctx.destination);
        src.start(t0);
        src.stop(t0 + dur + 0.02);
        return;
      } catch (_) {}
    }
    this.tone(cutoffHz, dur * 0.6, "triangle", vol * 0.65, delay, cutoffHz * 1.25);
  }

  playDetentClick(currentValue = 0) {
    const val = Math.max(-250, Math.min(250, Number(currentValue) || 0));
    const freq = Math.max(165, Math.min(920, 360 + val * 1.05));
    this.tone(freq, 0.045, "triangle", 0.06);
  }

  playSiphonPop(pitchScale = 1) {
    const p = Math.max(0.5, Math.min(2.0, Number(pitchScale) || 1));
    this.tone(360 * p, 0.085, "sine", 0.065, 0, 740 * p);
    this.tone(1080 * p, 0.06, "triangle", 0.03, 0.03);
  }

  playSnowShardTick() {
    this.playSiphonPop(1.05);
  }

  playZeroPairPoof() {
    this.noiseBurst(0.16, 1450, 1.8, 0.045, 0);
    this.tone(587.33, 0.18, "sine", 0.055, 0.02);
    this.tone(880.0, 0.22, "sine", 0.045, 0.05);
  }

  playTwinBeam() {
    this.tone(440, 0.16, "triangle", 0.055, 0, 880);
    this.tone(659.25, 0.19, "sine", 0.06, 0.03, 1318.5);
  }

  playMagneticRepel() {
    this.tone(260, 0.12, "triangle", 0.07, 0, 175);
    this.tone(370, 0.13, "sine", 0.055, 0.06, 225);
  }

  playCaliperNudge() {
    this.tone(246.94, 0.14, "triangle", 0.065, 0, 220);
    this.tone(329.63, 0.14, "sine", 0.05, 0.06, 293.66);
  }

  playAstrolabeLock() {
    [523.25, 783.99, 1046.5, 1567.98].forEach((n, idx) => {
      this.tone(n, 0.34, "sine", 0.055, idx * 0.05);
    });
  }

  playClear(overdrive = false) {
    const notes = overdrive
      ? [523.25, 659.25, 783.99, 987.77, 1318.5, 1567.98]
      : [440, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.24, idx % 2 === 0 ? "triangle" : "sine", overdrive ? 0.08 : 0.062, idx * 0.05);
    });
  }

  playCrystalShatter(overdrive = false) {
    this.playClear(overdrive);
  }

  playFoxReveal() {
    [392.0, 493.88, 587.33, 739.99, 783.99].forEach((n, idx) => {
      this.tone(n, 0.28, "sine", 0.06, idx * 0.06);
    });
  }

  playGuideReveal() {
    this.playFoxReveal();
  }

  playCreatureHatch(stage = 1) {
    const safeStage = Math.max(1, Math.min(3, Number(stage) || 1));
    this.tone(293.66, 0.18, "sine", 0.07, 0, 587.33);
    const sparkles = [659.25, 880.0, 1174.66, 1567.98].slice(0, 1 + safeStage);
    sparkles.forEach((n, idx) => {
      this.tone(n, 0.2, "triangle", 0.055, 0.06 + idx * 0.045);
    });
  }

  playWhaleSong() {
    this.tone(174.61, 0.95, "sine", 0.07, 0, 261.63);
    this.tone(261.63, 1.15, "sine", 0.06, 0.46, 196.0);
  }

  playElixirWave() {
    this.noiseBurst(0.24, 960, 1.2, 0.035, 0);
    [329.63, 493.88, 659.25, 987.77].forEach((n, idx) => {
      this.tone(n, 0.26, "sine", 0.06, idx * 0.045);
    });
  }

  playRimeBlast() {
    this.playElixirWave();
  }

  playBrambleSmash() {
    this.noiseBurst(0.12, 740, 1.4, 0.04, 0);
    this.tone(220, 0.14, "triangle", 0.065, 0, 440);
    this.tone(659.25, 0.14, "sine", 0.05, 0.04, 880);
  }

  playUpdraftLift() {
    this.tone(329.63, 0.24, "sine", 0.055, 0, 659.25);
    this.tone(523.25, 0.22, "triangle", 0.045, 0.06, 1046.5);
  }

  playChasmLaunch(boosted = true) {
    if (boosted) {
      this.playUpdraftLift();
    } else {
      this.tone(196, 0.16, "triangle", 0.045, 0, 261.63);
    }
  }

  playWorkshopChime() {
    this.tone(392.0, 0.18, "triangle", 0.055, 0, 587.33);
    this.tone(783.99, 0.2, "sine", 0.05, 0.08);
  }

  playGarageLift() {
    this.playWorkshopChime();
  }

  playGuardianAwakening() {
    this.tone(130.81, 0.72, "triangle", 0.075, 0);
    [261.63, 392.0, 493.88, 587.33, 783.99].forEach((n, idx) => {
      this.tone(n, 0.42, idx % 2 === 0 ? "triangle" : "sine", 0.07, idx * 0.065);
    });
  }

  playCoopFlare() {
    [587.33, 783.99, 987.77, 1318.5].forEach((n, idx) => {
      this.tone(n, 0.22, "sine", 0.065, idx * 0.045);
    });
  }

  playCoinGrab() {
    this.tone(987.77, 0.09, "sine", 0.07, 0);
    this.tone(1318.5, 0.18, "triangle", 0.075, 0.065);
  }

  playCoopGateBurst(overdrive = false) {
    const chord = overdrive
      ? [523.25, 659.25, 783.99, 1046.5, 1567.98]
      : [392.0, 493.88, 587.33, 783.99];
    chord.forEach((n, idx) => {
      this.tone(n, 0.3, "sine", 0.055, idx * 0.05);
    });
  }
}
