/**
 * Frostwake Self-vs-Self 3D Ghost-Rig Controller
 * Records (x, z, heading) keyframes, pauses during Encounter Dock thinking,
 * replays a 60fps translucent cyan hologram, and celebrates personal records
 * with zero negative deltas.
 */

import * as THREE from "../vendor/three.module.min.js";

const SAMPLE_INTERVAL_SEC = 0.25;
const MAX_GHOST_FRAMES = 160;
const MAX_GHOST_COORD = 120;
const MAX_GHOST_TIME_SEC = 3600;

function finiteOr(n, fallback = 0) {
  if (typeof n === "number") return Number.isFinite(n) ? n : fallback;
  if (typeof n === "string") {
    const trimmed = n.trim();
    if (!trimmed) return fallback;
    const v = Number(trimmed);
    return Number.isFinite(v) ? v : fallback;
  }
  return fallback;
}

function clampCoord(n, fallback = 0) {
  const v = finiteOr(n, NaN);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(-MAX_GHOST_COORD, Math.min(MAX_GHOST_COORD, v));
}

function normalizeAngle(rad, fallback = 0) {
  const safe = finiteOr(rad, fallback);
  return Math.atan2(Math.sin(safe), Math.cos(safe));
}

function round2(n) {
  return Math.round(finiteOr(n, 0) * 100) / 100;
}

function round3(n) {
  return Math.round(finiteOr(n, 0) * 1000) / 1000;
}

function lerpShortestAngle(a, b, alpha) {
  const baseA = normalizeAngle(a, 0);
  const baseB = normalizeAngle(b, 0);
  const rawDiff = baseB - baseA;
  const diff = Math.atan2(Math.sin(rawDiff), Math.cos(rawDiff));
  const t = Math.max(0, Math.min(1, finiteOr(alpha, 0)));
  return baseA + diff * t;
}

export class GhostRigController {
  constructor(scene, baseHeightFn) {
    this.scene = scene;
    this.baseHeightFn = typeof baseHeightFn === "function" ? baseHeightFn : () => 0;
    this.bestWaveSec = null;
    this.bestFrames = [];
    this.recordingFrames = [];
    this.waveElapsedSec = 0;
    this.sampleAccumSec = 0;
    this.effectiveSampleInterval = SAMPLE_INTERVAL_SEC;
    this.waveActive = false;
    this.lastBannerText = null;
    this.chassisId = "terra_dozer";
    this.mesh = this._buildGhostMesh("terra_dozer");
    if (this.scene) this.scene.add(this.mesh);
  }

  _buildGhostMesh(chassisId = "terra_dozer") {
    const g = new THREE.Group();
    g.name = "self_ghost_rig";
    g.visible = false;

    const holoMat = new THREE.MeshStandardMaterial({
      color: 0x5ce1e6,
      emissive: 0x3bf0c5,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.44,
      roughness: 0.15,
      depthWrite: false,
    });
    const trimMat = new THREE.MeshBasicMaterial({
      color: 0xbaf7ff,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });

    if (chassisId === "aurora_sled") {
      const hull = new THREE.Mesh(new THREE.ConeGeometry(1.25, 4.1, 6), holoMat);
      hull.rotation.x = -Math.PI / 2;
      hull.position.set(0, 1.0, 0);
      const wings = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 1.35), trimMat);
      wings.position.set(0, 0.82, 0.3);
      g.add(hull, wings);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.98, 3.4), holoMat);
      body.position.set(0, 1.0, 0.2);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.95, 1.65), holoMat);
      cab.position.set(0, 1.88, 0.42);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.88, 0.25), trimMat);
      blade.position.set(0, 0.65, -1.9);
      g.add(body, cab, blade);
    }

    const ringGeo = new THREE.RingGeometry(1.75, 2.05, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, trimMat);
    ring.position.set(0, 0.12, 0);
    g.add(ring);

    return g;
  }

  setChassisAppearance(chassisId = "terra_dozer") {
    const nextId = chassisId === "aurora_sled" ? "aurora_sled" : "terra_dozer";
    if (nextId === this.chassisId && this.mesh) return;
    const wasVisible = this.mesh ? this.mesh.visible : false;
    const prevPos = this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
    const prevRotY = this.mesh ? this.mesh.rotation.y : 0;
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
    this.chassisId = nextId;
    this.mesh = this._buildGhostMesh(nextId);
    this.mesh.position.copy(prevPos);
    this.mesh.rotation.y = prevRotY;
    this.mesh.visible = wasVisible;
    if (this.scene) this.scene.add(this.mesh);
  }

  loadFromProgress(progress) {
    if (!progress || typeof progress !== "object") return;
    const rawFw = progress.games?.frostwake ?? progress.realms?.frostwake;
    const fw = rawFw && typeof rawFw === "object" ? rawFw : {};
    const savedObj = fw.ghostBest && typeof fw.ghostBest === "object" ? fw.ghostBest : fw;
    const savedSec = finiteOr(savedObj.bestWaveSec ?? fw.bestWaveSec, NaN);
    const rawFrames = Array.isArray(savedObj.frames)
      ? savedObj.frames
      : Array.isArray(fw.ghostFrames)
      ? fw.ghostFrames
      : [];
    const validFrames = rawFrames
      .filter((f) => f && typeof f === "object")
      .slice(0, MAX_GHOST_FRAMES * 2);

    if (Number.isFinite(savedSec) && savedSec > 0 && validFrames.length >= 2) {
      const clampedWaveSec = Math.max(0.5, Math.min(MAX_GHOST_TIME_SEC, savedSec));
      this.bestWaveSec = round2(clampedWaveSec);
      this.bestFrames = validFrames.map((f) => {
        const rawT = finiteOr(f.t, 0);
        return {
          t: round2(Math.max(0, Math.min(MAX_GHOST_TIME_SEC, rawT))),
          x: round2(clampCoord(f.x, 0)),
          z: round2(clampCoord(f.z, 0)),
          heading: round3(normalizeAngle(f.heading, 0)),
        };
      });
    }
  }

  startWave(initialRigState = { x: 0, z: 22, heading: Math.PI }) {
    const safeRig =
      initialRigState && typeof initialRigState === "object"
        ? initialRigState
        : { x: 0, z: 22, heading: Math.PI };
    this.waveElapsedSec = 0;
    this.sampleAccumSec = 0;
    this.effectiveSampleInterval = SAMPLE_INTERVAL_SEC;
    this.waveActive = true;
    this.lastBannerText = null;
    this.recordingFrames = [
      {
        t: 0,
        x: round2(clampCoord(safeRig.x, 0)),
        z: round2(clampCoord(safeRig.z, 22)),
        heading: round3(normalizeAngle(safeRig.heading, Math.PI)),
      },
    ];

    if (this.bestFrames.length >= 2 && this.bestWaveSec !== null) {
      const f0 = this.bestFrames[0];
      const rawY0 = this.baseHeightFn(f0.x, f0.z);
      const y0 = finiteOr(rawY0, 0) + 0.22;
      this.mesh.position.set(f0.x, y0, f0.z);
      this.mesh.rotation.y = normalizeAngle(f0.heading, 0);
      this.mesh.visible = true;
    } else {
      this.mesh.visible = false;
    }
  }

  update(dt, rigState, isPaused = false) {
    if (
      !this.waveActive ||
      isPaused ||
      !Number.isFinite(dt) ||
      !(dt > 0) ||
      !rigState ||
      typeof rigState !== "object"
    ) {
      return 0;
    }

    this.waveElapsedSec += dt;
    this.sampleAccumSec += dt;

    if (this.sampleAccumSec >= this.effectiveSampleInterval) {
      this.sampleAccumSec = 0;
      this.recordingFrames.push({
        t: round2(this.waveElapsedSec),
        x: round2(clampCoord(rigState.x, 0)),
        z: round2(clampCoord(rigState.z, 0)),
        heading: round3(normalizeAngle(rigState.heading, 0)),
      });

      if (this.recordingFrames.length > MAX_GHOST_FRAMES) {
        const decimated = [this.recordingFrames[0]];
        for (let i = 1; i < this.recordingFrames.length - 1; i += 2) {
          decimated.push(this.recordingFrames[i]);
        }
        decimated.push(this.recordingFrames[this.recordingFrames.length - 1]);
        this.recordingFrames = decimated;
        this.effectiveSampleInterval *= 2;
      }
    }

    if (this.bestFrames.length >= 2 && this.bestWaveSec !== null) {
      if (this.waveElapsedSec <= this.bestWaveSec) {
        const t = this.waveElapsedSec;
        let idx = 0;
        while (idx < this.bestFrames.length - 2 && this.bestFrames[idx + 1].t < t) {
          idx += 1;
        }
        const fA = this.bestFrames[idx];
        const fB = this.bestFrames[idx + 1];
        const span = Math.max(0.0001, fB.t - fA.t);
        const alpha = Math.max(0, Math.min(1, (t - fA.t) / span));
        const gx = clampCoord(fA.x + (fB.x - fA.x) * alpha, 0);
        const gz = clampCoord(fA.z + (fB.z - fA.z) * alpha, 0);
        const gh = lerpShortestAngle(fA.heading, fB.heading, alpha);
        const rawGy = this.baseHeightFn(gx, gz);
        const gy = finiteOr(rawGy, 0) + 0.22;
        this.mesh.position.set(gx, gy, gz);
        this.mesh.rotation.y = gh;
        this.mesh.visible = true;
      } else {
        this.mesh.visible = false;
      }
    }

    return dt;
  }

  _persistToProgress(progressRef) {
    if (!progressRef || typeof progressRef !== "object" || Object.isFrozen(progressRef)) return;
    try {
      if (!progressRef.games || Object.isFrozen(progressRef.games)) {
        progressRef.games = { ...(progressRef.games || {}) };
      }
      if (!progressRef.games.frostwake || Object.isFrozen(progressRef.games.frostwake)) {
        progressRef.games.frostwake = { ...(progressRef.games.frostwake || {}) };
      }
      const snapshot = this.bestFrames.map((f) => ({ ...f }));
      progressRef.games.frostwake.bestWaveSec = this.bestWaveSec;
      progressRef.games.frostwake.ghostFrames = snapshot;
      progressRef.games.frostwake.ghostBest = {
        bestWaveSec: this.bestWaveSec,
        frames: snapshot,
      };
    } catch (_) {}
  }

  completeWave(progressRef = null) {
    const runSec = round2(Math.max(0.5, this.waveElapsedSec));
    const lastRec = this.recordingFrames[this.recordingFrames.length - 1];
    if (!lastRec || lastRec.t < runSec) {
      this.recordingFrames.push({
        t: runSec,
        x: lastRec ? lastRec.x : 0,
        z: lastRec ? lastRec.z : 0,
        heading: lastRec ? lastRec.heading : Math.PI,
      });
    }

    this.waveActive = false;
    this.mesh.visible = false;
    const prevBest = this.bestWaveSec;

    if (prevBest === null) {
      this.bestWaveSec = runSec;
      this.bestFrames = this.recordingFrames.map((f) => ({ ...f }));
      this.lastBannerText = null;
      this._persistToProgress(progressRef);
      return {
        isNewRecord: false,
        firstBaseline: true,
        waveSec: runSec,
        bestWaveSec: runSec,
        bannerText: null,
      };
    }

    if (runSec < prevBest) {
      this.bestWaveSec = runSec;
      this.bestFrames = this.recordingFrames.map((f) => ({ ...f }));
      this.lastBannerText = "NEW PERSONAL RECORD! 🏆";
      this._persistToProgress(progressRef);
      return {
        isNewRecord: true,
        firstBaseline: false,
        waveSec: runSec,
        bestWaveSec: runSec,
        bannerText: "NEW PERSONAL RECORD! 🏆",
      };
    }

    this.lastBannerText = null;
    return {
      isNewRecord: false,
      firstBaseline: false,
      waveSec: runSec,
      bestWaveSec: prevBest,
      bannerText: null,
    };
  }
}
