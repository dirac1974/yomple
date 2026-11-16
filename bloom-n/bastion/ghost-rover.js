/**
 * Arc Bastion: Siegesmiths — Self-vs-Self 3D Ghost-Rover Controller
 * Records (x, z, heading) keyframes during active Siege Battery raids,
 * pauses completely during Encounter Dock / Gate thinking, replays a translucent
 * cyan-and-gold hologram Siege-Rover for bestRaidSec, and celebrates personal records
 * with zero negative time deltas.
 */

import * as THREE from "../vendor/three.module.min.js";
import {
  createLatheProfileGeometry,
  createBeveledWingGeometry,
  createSplineTubeGeometry,
} from "../core/character-graphics-3d.js";

const SAMPLE_INTERVAL_SEC = 0.25;
const MAX_GHOST_FRAMES = 180;
const MAX_GHOST_COORD = 120;
const MAX_GHOST_TIME_SEC = 3600;

function finiteOr(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
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
  const diff = Math.atan2(Math.sin(baseB - baseA), Math.cos(baseB - baseA));
  const t = Math.max(0, Math.min(1, finiteOr(alpha, 0)));
  return baseA + diff * t;
}

export class GhostRoverController {
  constructor(scene, baseHeightFn) {
    this.scene = scene && typeof scene.add === "function" ? scene : null;
    this.baseHeightFn = typeof baseHeightFn === "function" ? baseHeightFn : () => 0;
    this.bestRaidSec = null;
    this.bestWaveSec = null;
    this.bestFrames = [];
    this.recordingFrames = [];
    this.waveElapsedSec = 0;
    this.sampleAccumSec = 0;
    this.effectiveSampleInterval = SAMPLE_INTERVAL_SEC;
    this.waveActive = false;
    this.lastBannerText = null;
    this.rigId = "iron_ballista";
    this.mesh = this._buildGhostMesh("iron_ballista");
    if (this.scene) this.scene.add(this.mesh);
  }

  _buildGhostMesh(rigId = "iron_ballista") {
    const g = new THREE.Group();
    g.name = "self_ghost_rover";
    g.visible = false;

    const holoMat = new THREE.MeshStandardMaterial({
      color: 0x7ee8fa,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.42,
      roughness: 0.16,
      depthWrite: false,
    });
    const goldTrimMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.64,
      depthWrite: false,
    });
    const coreHoloMat = new THREE.MeshBasicMaterial({
      color: 0xcffafe,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    if (rigId === "prism_rail_skiff" || rigId === "rail_skiff") {
      // Sculpted Twin-Prong Hover-Skiff hologram silhouette
      const fuselageGeo = createLatheProfileGeometry(
        [
          [0.05, 0.0],
          [0.48, 0.42],
          [0.72, 1.3],
          [0.64, 2.3],
          [0.24, 2.85],
        ],
        16
      );
      fuselageGeo.rotateX(Math.PI / 2);
      const fuselage = new THREE.Mesh(fuselageGeo, holoMat);
      fuselage.scale.set(1.06, 0.62, 1.0);
      fuselage.position.set(0, 0.88, -1.02);
      g.add(fuselage);

      for (const sx of [-1, 1]) {
        const prong = new THREE.Mesh(
          createBeveledWingGeometry(
            [
              [0.0, -0.22],
              [1.92, -0.58],
              [2.28, -0.34],
              [0.76, 0.22],
              [0.0, 0.18],
            ],
            0.2,
            0.05
          ),
          holoMat
        );
        prong.rotation.x = -Math.PI / 2;
        prong.rotation.z = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (sx < 0) prong.scale.y = -1;
        prong.position.set(sx * 0.42, 0.86, -0.45);

        const nacelleGeo = createLatheProfileGeometry(
          [
            [0.2, 0.0],
            [0.32, 0.25],
            [0.34, 1.15],
            [0.22, 1.5],
          ],
          12
        );
        nacelleGeo.rotateX(Math.PI / 2);
        const nacelle = new THREE.Mesh(nacelleGeo, goldTrimMat);
        nacelle.position.set(sx * 1.15, 0.84, 0.1);
        g.add(prong, nacelle);
      }

      // Nose Hourglass Chronos Core hologram
      const topC = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 8), coreHoloMat);
      topC.rotation.x = Math.PI;
      topC.position.set(0, 1.08, -1.72);
      const botC = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 8), goldTrimMat);
      botC.position.set(0, 0.8, -1.72);
      g.add(topC, botC);

      // Seated Chrono-Tactician hologram pilot silhouette
      const pilotSil = new THREE.Group();
      pilotSil.name = "ghost_pilot_silhouette";
      const torso = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.14, 0.0],
            [0.24, 0.28],
            [0.2, 0.52],
          ],
          12
        ),
        holoMat
      );
      torso.position.set(0, 1.05, 0.34);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), coreHoloMat);
      head.position.set(0, 1.72, 0.34);
      const visor = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.04, 6, 14, Math.PI),
        goldTrimMat
      );
      visor.rotation.x = Math.PI / 2;
      visor.rotation.z = Math.PI;
      visor.position.set(0, 1.73, 0.3);
      pilotSil.add(torso, head, visor);
      g.add(pilotSil);
    } else {
      // Sculpted 6x6 Siegesmith Ballista Crawler hologram silhouette
      const deckGeo = createBeveledWingGeometry(
        [
          [-1.58, -0.78],
          [1.52, -0.92],
          [1.76, -0.56],
          [1.76, 0.56],
          [1.52, 0.92],
          [-1.58, 0.78],
          [-1.82, 0.44],
          [-1.82, -0.44],
        ],
        0.54,
        0.09
      );
      deckGeo.rotateX(-Math.PI / 2);
      deckGeo.rotateY(Math.PI / 2);
      const deck = new THREE.Mesh(deckGeo, holoMat);
      deck.position.set(0, 0.56, 0.14);
      g.add(deck);

      const gearRam = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.09, 8, 14), goldTrimMat);
      gearRam.position.set(0, 0.76, -1.82);
      g.add(gearRam);

      // Curved twin-arm torsion Ballista bow + faceted bolt hologram
      for (const sx of [-1, 1]) {
        const bowArm = new THREE.Mesh(
          createSplineTubeGeometry(
            [
              [sx * 0.16, 1.54, -0.68],
              [sx * 0.72, 1.56, -0.56],
              [sx * 1.12, 1.58, -0.24],
            ],
            0.055,
            10,
            6
          ),
          goldTrimMat
        );
        g.add(bowArm);
      }
      const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.72, 6), coreHoloMat);
      bolt.rotation.x = -Math.PI / 2;
      bolt.position.set(0, 1.58, -1.18);
      g.add(bolt);

      // 6 hologram wheels
      const wheelGeo = createLatheProfileGeometry(
        [
          [0.24, -0.16],
          [0.48, -0.14],
          [0.5, 0.0],
          [0.48, 0.14],
          [0.24, 0.16],
        ],
        12
      );
      wheelGeo.rotateZ(Math.PI / 2);
      for (const wx of [-1.18, 1.18]) {
        for (const wz of [-1.02, 0.16, 1.34]) {
          const w = new THREE.Mesh(wheelGeo, goldTrimMat);
          w.position.set(wx, 0.5, wz);
          g.add(w);
        }
      }

      // Standing Siegesmith hologram pilot silhouette at rear helm
      const pilotSil = new THREE.Group();
      pilotSil.name = "ghost_pilot_silhouette";
      const torso = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.14, 0.0],
            [0.24, 0.3],
            [0.2, 0.56],
          ],
          12
        ),
        holoMat
      );
      torso.position.set(0, 1.18, 0.88);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), coreHoloMat);
      head.position.set(0, 1.92, 0.88);
      pilotSil.add(torso, head);
      g.add(pilotSil);
    }

    const ringGeo = new THREE.RingGeometry(1.75, 2.08, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, goldTrimMat);
    ring.position.set(0, 0.12, 0);
    g.add(ring);

    return g;
  }

  setRigAppearance(rigId = "iron_ballista") {
    const nextId =
      rigId === "prism_rail_skiff" || rigId === "rail_skiff"
        ? "prism_rail_skiff"
        : "iron_ballista";
    if (nextId === this.rigId && this.mesh) return;
    const wasVisible = this.mesh ? this.mesh.visible : false;
    const prevPos = this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
    const prevRotY = this.mesh ? this.mesh.rotation.y : 0;
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
    this.rigId = nextId;
    this.mesh = this._buildGhostMesh(nextId);
    this.mesh.position.copy(prevPos);
    this.mesh.rotation.y = prevRotY;
    this.mesh.visible = wasVisible;
    if (this.scene) this.scene.add(this.mesh);
  }

  setChassisAppearance(rigId = "iron_ballista") {
    this.setRigAppearance(rigId);
  }

  loadFromProgress(progress) {
    if (!progress || typeof progress !== "object") return;
    const rawAb = progress.games?.arc_bastion ?? progress.realms?.arc_bastion;
    const ab = rawAb && typeof rawAb === "object" ? rawAb : {};
    const savedObj = ab.ghostBest && typeof ab.ghostBest === "object" ? ab.ghostBest : ab;
    const savedSec = finiteOr(
      savedObj.bestRaidSec ?? savedObj.bestWaveSec ?? ab.bestRaidSec,
      NaN
    );
    const rawFrames = Array.isArray(savedObj.frames)
      ? savedObj.frames
      : Array.isArray(ab.ghostFrames)
      ? ab.ghostFrames
      : [];
    const validFrames = rawFrames
      .filter((f) => f && typeof f === "object")
      .slice(0, MAX_GHOST_FRAMES * 2);

    if (Number.isFinite(savedSec) && savedSec > 0 && validFrames.length >= 2) {
      const clampedSec = round2(Math.max(0.5, Math.min(MAX_GHOST_TIME_SEC, savedSec)));
      this.bestRaidSec = clampedSec;
      this.bestWaveSec = clampedSec;
      this.bestFrames = validFrames.map((f) => ({
        t: round2(Math.max(0, Math.min(MAX_GHOST_TIME_SEC, finiteOr(f.t, 0)))),
        x: round2(clampCoord(f.x, 0)),
        z: round2(clampCoord(f.z, 0)),
        heading: round3(normalizeAngle(f.heading, 0)),
      }));
    }
  }

  startWave(initialRigState = { x: 0, z: 14, heading: 0 }) {
    const safeRig =
      initialRigState && typeof initialRigState === "object"
        ? initialRigState
        : { x: 0, z: 14, heading: 0 };
    this.waveElapsedSec = 0;
    this.sampleAccumSec = 0;
    this.effectiveSampleInterval = SAMPLE_INTERVAL_SEC;
    this.waveActive = true;
    this.lastBannerText = null;
    this.recordingFrames = [
      {
        t: 0,
        x: round2(clampCoord(safeRig.x, 0)),
        z: round2(clampCoord(safeRig.z, 14)),
        heading: round3(normalizeAngle(safeRig.heading, 0)),
      },
    ];

    if (this.bestFrames.length >= 2 && this.bestRaidSec !== null) {
      const f0 = this.bestFrames[0];
      const y0 = finiteOr(this.baseHeightFn(f0.x, f0.z), 0) + 0.22;
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

    if (this.bestFrames.length >= 2 && this.bestRaidSec !== null) {
      if (this.waveElapsedSec <= this.bestRaidSec) {
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
        const gy = finiteOr(this.baseHeightFn(gx, gz), 0) + 0.22;
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
      if (!progressRef.games || typeof progressRef.games !== "object") {
        progressRef.games = {};
      }
      if (!progressRef.games.arc_bastion || typeof progressRef.games.arc_bastion !== "object") {
        progressRef.games.arc_bastion = {};
      }
      const ab = progressRef.games.arc_bastion;
      ab.bestRaidSec = this.bestRaidSec;
      ab.ghostFrames = this.bestFrames.map((f) => ({ ...f }));
      ab.ghostBest = {
        bestRaidSec: this.bestRaidSec,
        bestWaveSec: this.bestRaidSec,
        frames: this.bestFrames.map((f) => ({ ...f })),
      };
    } catch (_) {}
  }

  completeWave(progressRef = null, rigState = null) {
    if (!this.waveActive) {
      return {
        isNewRecord: false,
        raidSec: 0,
        bestRaidSec: this.bestRaidSec,
        bannerText: null,
      };
    }
    this.waveActive = false;
    this.mesh.visible = false;

    const finalSec = round2(Math.max(0.5, this.waveElapsedSec));
    if (rigState && typeof rigState === "object") {
      this.recordingFrames.push({
        t: finalSec,
        x: round2(clampCoord(rigState.x, 0)),
        z: round2(clampCoord(rigState.z, 0)),
        heading: round3(normalizeAngle(rigState.heading, 0)),
      });
    }

    const isNewRecord = this.bestRaidSec === null || finalSec < this.bestRaidSec;
    if (isNewRecord && this.recordingFrames.length >= 2) {
      this.bestRaidSec = finalSec;
      this.bestWaveSec = finalSec;
      this.bestFrames = this.recordingFrames.map((f) => ({ ...f }));
      this._persistToProgress(progressRef);
      // Zero negative time deltas, zero competitive rank markers!
      this.lastBannerText = `NEW SIEGE RAID PERSONAL BEST · ${finalSec}s! 🏆`;
    } else {
      this.lastBannerText = null;
    }

    return {
      isNewRecord,
      raidSec: finalSec,
      bestRaidSec: this.bestRaidSec,
      bannerText: this.lastBannerText,
    };
  }
}
