/**
 * Arc Bastion: Siegesmiths — 3D Clockwork Opposition & 0.08x Crystal Bullet-Time Aura
 * Spawns quirky, bloodless Clockwork Walkers, Origami Hover-Blimps, Spinning Gear-Barricades,
 * and smashable Golden Gear-Pods (+2 Flux Shards).
 * Enforces exact bitwise 0.0 movement delta during Encounter Dock / Gate focus,
 * expands a sapphire-cyan Crystal Bullet-Time Dome (0.08x ambient drift), and performs
 * harmless Confetti Gear-Juggle Stalls at gates with zero health bars or base damage.
 */

import * as THREE from "../vendor/three.module.min.js";
import {
  BULLET_TIME_SCALE,
  computeSimulationTimeScale,
} from "../core/world-sim.js";
import {
  getCharacterToonGradient,
  getCustomSurfaceTexture,
  createLatheProfileGeometry,
  createBeveledWingGeometry,
  createSplineTubeGeometry,
  createDirigibleHullGeometry,
} from "../core/character-graphics-3d.js";

const MAX_GEAR_PARTICLES = 96;
const MAX_CONFETTI_PARTICLES = 96;
const DOME_MOTE_COUNT = 28;

function clampFinite(val, min, max, fallback = 0) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

const WALKER_LANE_SPECS = [
  { key: "walker_0", laneX: -20, startZ: -44, gateZ: -14, speed: 3.1, phase: 0.0 },
  { key: "walker_1", laneX: -12, startZ: -38, gateZ: -10, speed: 2.85, phase: 1.1 },
  { key: "walker_2", laneX: 0, startZ: -46, gateZ: -16, speed: 3.25, phase: 2.2 },
  { key: "walker_3", laneX: 12, startZ: -40, gateZ: -10, speed: 2.95, phase: 3.3 },
  { key: "walker_4", laneX: 20, startZ: -43, gateZ: -14, speed: 3.15, phase: 4.4 },
  { key: "walker_5", laneX: 32, startZ: -36, gateZ: -8, speed: 2.75, phase: 5.5 },
];

const GEAR_HOUND_SPECS = [
  { key: "hound_0", laneX: -26, startZ: -45, gateZ: -13, speed: 4.15, phase: 0.5 },
  { key: "hound_1", laneX: -16, startZ: -47, gateZ: -15, speed: 4.35, phase: 1.8 },
  { key: "hound_2", laneX: 16, startZ: -44, gateZ: -15, speed: 4.25, phase: 3.1 },
  { key: "hound_3", laneX: 26, startZ: -42, gateZ: -13, speed: 4.05, phase: 4.6 },
];

const BLIMP_ORBIT_SPECS = [
  { key: "blimp_0", cx: -18, cz: -22, rx: 8.5, rz: 6.0, speed: 0.62, phase: 0.3 },
  { key: "blimp_1", cx: 18, cz: -22, rx: 8.5, rz: 6.0, speed: 0.58, phase: 1.9 },
  { key: "blimp_2", cx: 0, cz: -34, rx: 11.0, rz: 5.5, speed: 0.54, phase: 3.5 },
  { key: "blimp_3", cx: 28, cz: 4, rx: 7.5, rz: 6.5, speed: 0.66, phase: 5.0 },
];

const BARRICADE_SPECS = [
  { key: "barricade_0", baseX: -15, baseZ: -4, swayAmp: 2.6, speed: 1.05, phase: 0.4 },
  { key: "barricade_1", baseX: 15, baseZ: -4, swayAmp: 2.6, speed: 1.05, phase: 2.0 },
  { key: "barricade_2", baseX: -8, baseZ: -20, swayAmp: 2.2, speed: 1.18, phase: 3.6 },
  { key: "barricade_3", baseX: 8, baseZ: -20, swayAmp: 2.2, speed: 1.18, phase: 5.1 },
];

const GEAR_POD_SPECS = [
  { key: "gear_pod_0", x: -14, z: 12, bobPhase: 0.0 },
  { key: "gear_pod_1", x: 14, z: 12, bobPhase: 1.0 },
  { key: "gear_pod_2", x: -20, z: -2, bobPhase: 2.1 },
  { key: "gear_pod_3", x: 20, z: -2, bobPhase: 3.2 },
  { key: "gear_pod_4", x: -9, z: -16, bobPhase: 4.3 },
  { key: "gear_pod_5", x: 9, z: -16, bobPhase: 5.4 },
];

export class BastionOpposition3D {
  constructor(opts = {}) {
    const safeOpts = opts && typeof opts === "object" ? opts : {};
    this.scene = safeOpts.scene && typeof safeOpts.scene.add === "function" ? safeOpts.scene : null;
    this.baseHeightFn =
      typeof safeOpts.baseHeightFn === "function" ? safeOpts.baseHeightFn : () => 0;
    this.audio = safeOpts.audio || null;
    this.onWorldActivity =
      typeof safeOpts.onWorldActivity === "function" ? safeOpts.onWorldActivity : () => {};
    this.onOppositionEvent =
      typeof safeOpts.onOppositionEvent === "function" ? safeOpts.onOppositionEvent : () => {};

    this.paused = false;
    this.bulletTimeActive = false;
    this.lastTimeScale = {
      mathPaused: false,
      bulletTimeActive: false,
      playerDt: 0,
      oppositionDt: 0,
      ambientDt: 0,
      scaleFactor: 1,
    };

    this.upgradesSet = new Set();
    this.juggleStallCount = 0;
    this.shatteredCount = 0;
    this._turretCooldown = 1.6;
    this._domeExpand = 0;
    this._ambientClock = 0;

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = "bastion_opposition_root";
    if (this.scene) {
      this.scene.add(this.rootGroup);
    }

    this.walkers = [];
    this.gearHounds = [];
    this.blimps = [];
    this.barricades = [];
    this.gearPods = [];
    this.units = [];
    this.cryoZones = [];
    this.activeBolts = [];

    this._tmpMat4 = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
    this._tmpEuler = new THREE.Euler();

    this._buildMaterials();
    this._buildOppositionUnits();
    this._buildBulletTimeDome();
    this._buildUpgradeStructures();
    this._buildBurstParticlePools();
  }

  _groundY(x, z) {
    try {
      const y = Number(this.baseHeightFn(x, z));
      return Number.isFinite(y) ? y : 0;
    } catch (_) {
      return 0;
    }
  }

  _buildMaterials() {
    const toonGrad = getCharacterToonGradient();
    const brassTex = getCustomSurfaceTexture("bastion_brass_plate");
    const sapphireTex = getCustomSurfaceTexture("sapphire_filigree");

    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xf0c665,
      map: brassTex,
      emissive: 0x5c3d08,
      emissiveIntensity: 0.24,
      roughness: 0.28,
      metalness: 0.72,
    });
    this.sapphireArmorMat = new THREE.MeshToonMaterial({
      color: 0xffffff,
      map: sapphireTex,
      gradientMap: toonGrad,
    });
    this.darkIronMat = new THREE.MeshToonMaterial({
      color: 0x263147,
      gradientMap: toonGrad,
    });
    this.timberMat = new THREE.MeshStandardMaterial({
      color: 0x7c5333,
      roughness: 0.68,
      metalness: 0.14,
    });
    this.sapphireMat = new THREE.MeshStandardMaterial({
      color: 0x5ce1e6,
      emissive: 0x1d7dfa,
      emissiveIntensity: 1.05,
      roughness: 0.12,
      metalness: 0.3,
    });
    this.amberEyeMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xff9f1c,
      emissiveIntensity: 1.15,
      roughness: 0.12,
      metalness: 0.2,
    });
    this.parchmentMat = new THREE.MeshToonMaterial({
      color: 0xf7efe0,
      gradientMap: toonGrad,
    });
    this.goldPodMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      roughness: 0.18,
      metalness: 0.62,
    });
    this.cryoZoneMat = new THREE.MeshBasicMaterial({
      color: 0x5ce1e6,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  _createClockworkWalkerMesh() {
    const g = new THREE.Group();
    g.name = "clockwork_walker_mesh";

    // Rounded Steampunk Brass-and-Sapphire Dome Automaton Body
    const domeBodyGeo = createLatheProfileGeometry(
      [
        [0.14, 0.0],
        [0.58, 0.08],
        [0.76, 0.38],
        [0.78, 0.78],
        [0.68, 1.16],
        [0.44, 1.42],
        [0.06, 1.52],
      ],
      20
    );
    const domeBody = new THREE.Mesh(domeBodyGeo, this.brassMat);
    domeBody.position.y = 0.84;

    // Royal-sapphire filigree armor corset around mid-dome
    const sapphireBandGeo = createLatheProfileGeometry(
      [
        [0.74, 0.0],
        [0.8, 0.18],
        [0.79, 0.48],
        [0.71, 0.64],
      ],
      20
    );
    const sapphireBand = new THREE.Mesh(sapphireBandGeo, this.sapphireArmorMat);
    sapphireBand.position.y = 1.16;

    const beltRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.068, 8, 20),
      this.brassMat
    );
    beltRing.rotation.x = Math.PI / 2;
    beltRing.position.y = 1.18;

    // Glowing Cyan Monocle Lens Eye + Curved Brass Optical Conduit
    const monocleGroup = new THREE.Group();
    monocleGroup.name = "walker_monocle_eye";
    monocleGroup.position.set(0.08, 1.56, 0.72);
    const monocleRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.055, 10, 18),
      this.brassMat
    );
    const monocleLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 14, 12),
      this.sapphireMat
    );
    monocleLens.scale.set(1, 1, 0.55);
    const monocleGlint = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    monocleGlint.position.set(0.07, 0.07, 0.11);
    monocleGroup.add(monocleRim, monocleLens, monocleGlint);

    const opticalTube = new THREE.Mesh(
      createSplineTubeGeometry(
        [
          [0.3, 1.56, 0.68],
          [0.64, 1.48, 0.42],
          [0.72, 1.32, -0.18],
        ],
        0.042,
        10,
        6
      ),
      this.brassMat
    );

    // Large Spinning Vertical Brass Dorsal Gear on the Back
    const dorsalGear = new THREE.Group();
    dorsalGear.name = "walker_dorsal_gear";
    dorsalGear.position.set(0, 1.52, -0.76);
    const gearRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.085, 8, 18),
      this.brassMat
    );
    gearRim.rotation.y = Math.PI / 2;
    const gearHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.22, 12),
      this.sapphireMat
    );
    gearHub.rotation.z = Math.PI / 2;
    dorsalGear.add(gearRim, gearHub);
    for (let t = 0; t < 10; t++) {
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.2, 0.16),
        this.goldPodMat
      );
      const a = (t / 10) * Math.PI * 2;
      tooth.position.set(0, Math.cos(a) * 0.62, Math.sin(a) * 0.62);
      tooth.rotation.x = -a;
      dorsalGear.add(tooth);
    }

    // Crown wind-up finial
    const windKey = new THREE.Group();
    windKey.name = "walker_windup_key";
    windKey.position.set(0, 2.42, 0);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 8), this.brassMat);
    const bowL = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 14), this.goldPodMat);
    bowL.position.set(-0.15, 0.18, 0);
    const bowR = bowL.clone();
    bowR.position.x = 0.15;
    windKey.add(stem, bowL, bowR);

    // 2 Articulated Piston Legs + 2 Articulated Automaton Pincer Arms
    const legs = [];
    for (const sx of [-1, 1]) {
      const legPivot = new THREE.Group();
      legPivot.position.set(sx * 0.44, 0.88, 0);
      const hip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), this.darkIronMat);
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.1, 0.46, 10),
        this.brassMat
      );
      thigh.position.y = -0.24;
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), this.sapphireArmorMat);
      knee.position.y = -0.46;
      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.13, 0.38, 10),
        this.darkIronMat
      );
      shin.position.set(0, -0.66, 0.04);
      const foot = new THREE.Mesh(
        createLatheProfileGeometry(
          [
            [0.05, 0.0],
            [0.24, 0.02],
            [0.22, 0.12],
            [0.12, 0.16],
          ],
          12
        ),
        this.brassMat
      );
      foot.scale.set(1.0, 1.0, 1.35);
      foot.position.set(0, -0.88, 0.08);
      legPivot.add(hip, thigh, knee, shin, foot);
      g.add(legPivot);
      legs.push(legPivot);
    }

    for (const sx of [-1, 1]) {
      const armPivot = new THREE.Group();
      armPivot.position.set(sx * 0.82, 1.48, 0.06);
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 10),
        this.sapphireArmorMat
      );
      const forearm = new THREE.Mesh(
        createSplineTubeGeometry(
          [
            [0, -0.06, 0],
            [sx * 0.12, -0.34, 0.14],
            [sx * 0.06, -0.58, 0.34],
          ],
          0.075,
          10,
          8
        ),
        this.brassMat
      );
      const pincer = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.04, 8, 12, Math.PI * 1.4),
        this.darkIronMat
      );
      pincer.position.set(sx * 0.06, -0.64, 0.42);
      pincer.rotation.x = Math.PI / 2;
      armPivot.add(pauldron, forearm, pincer);
      g.add(armPivot);
      legs.push(armPivot);
    }

    // Juggle gears (hidden unless performing harmless gate Confetti Gear-Juggle Stall)
    const juggleCluster = new THREE.Group();
    juggleCluster.name = "confetti_juggle_gears";
    juggleCluster.position.set(0, 2.95, 0);
    juggleCluster.visible = false;
    for (let i = 0; i < 3; i++) {
      const cog = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 6, 10), this.goldPodMat);
      const ang = (i / 3) * Math.PI * 2;
      cog.position.set(Math.cos(ang) * 0.52, Math.sin(ang) * 0.24, Math.sin(ang) * 0.32);
      juggleCluster.add(cog);
    }

    g.add(domeBody, sapphireBand, beltRing, monocleGroup, opticalTube, dorsalGear, windKey, juggleCluster);
    return { group: g, windKey, dorsalGear, legs, juggleCluster };
  }

  _createGearHoundMesh() {
    const g = new THREE.Group();
    g.name = "clockwork_gear_hound_mesh";

    // Playful Mechanical Brass Robo-Pup Segmented Barrel Torso
    const torsoGeo = createLatheProfileGeometry(
      [
        [0.08, 0.0],
        [0.36, 0.14],
        [0.44, 0.48],
        [0.4, 0.92],
        [0.28, 1.18],
        [0.06, 1.26],
      ],
      16
    );
    torsoGeo.rotateX(Math.PI / 2);
    const torso = new THREE.Mesh(torsoGeo, this.brassMat);
    torso.position.set(0, 0.72, -0.62);
    g.add(torso);

    // Royal-sapphire saddle collar plate
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.41, 0.065, 8, 16),
      this.sapphireArmorMat
    );
    collar.position.set(0, 0.74, 0.28);
    g.add(collar);

    // Expressive Pup Head + Sculpted Snout + Floppy Brass Ears + Twin Glowing Amber Eyes
    const head = new THREE.Group();
    head.name = "gear_hound_head";
    head.position.set(0, 0.96, 0.56);

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), this.brassMat);
    cranium.scale.set(1.05, 0.96, 1.04);

    const snoutGeo = createLatheProfileGeometry(
      [
        [0.06, 0.0],
        [0.18, 0.08],
        [0.22, 0.34],
        [0.24, 0.46],
      ],
      14
    );
    snoutGeo.rotateX(-Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeo, this.brassMat);
    snout.position.set(0, -0.08, 0.52);

    const noseButton = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 10, 8),
      this.darkIronMat
    );
    noseButton.position.set(0, -0.04, 0.54);
    head.add(cranium, snout, noseButton);

    // Twin Glowing Amber Eyes with Brass Rims & Specular Glints
    for (const sx of [-1, 1]) {
      const eyeRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.024, 8, 14),
        this.darkIronMat
      );
      eyeRim.position.set(sx * 0.16, 0.08, 0.28);
      const amberEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 10),
        this.amberEyeMat
      );
      amberEye.position.set(sx * 0.16, 0.08, 0.28);
      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      glint.position.set(sx * 0.18, 0.11, 0.35);
      head.add(eyeRim, amberEye, glint);
    }

    // Floppy Sculpted Brass Ears
    const ears = [];
    for (const sx of [-1, 1]) {
      const earPivot = new THREE.Group();
      earPivot.position.set(sx * 0.3, 0.14, 0.02);
      const earFlap = new THREE.Mesh(
        createBeveledWingGeometry(
          [
            [-0.1, 0.04],
            [0.1, 0.04],
            [0.16, -0.36],
            [0.0, -0.46],
            [-0.14, -0.34],
          ],
          0.06,
          0.02
        ),
        this.brassMat
      );
      earFlap.rotation.z = sx * 0.28;
      earPivot.add(earFlap);
      head.add(earPivot);
      ears.push(earPivot);
    }
    g.add(head);

    // Spinning Vertical Brass Gear-Tail
    const gearTail = new THREE.Group();
    gearTail.name = "gear_hound_tail";
    gearTail.position.set(0, 0.94, -0.68);
    const tailRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.05, 8, 14),
      this.goldPodMat
    );
    tailRing.rotation.y = Math.PI / 2;
    const tailHub = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      this.sapphireMat
    );
    gearTail.add(tailRing, tailHub);
    for (let t = 0; t < 6; t++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.1), this.brassMat);
      const a = (t / 6) * Math.PI * 2;
      tooth.position.set(0, Math.cos(a) * 0.3, Math.sin(a) * 0.3);
      gearTail.add(tooth);
    }
    g.add(gearTail);

    // 4 Articulated Robo-Pup Legs
    const legs = [];
    const pupLegCoords = [
      [-0.32, 0.34],
      [0.32, 0.34],
      [-0.32, -0.36],
      [0.32, -0.36],
    ];
    for (const [lx, lz] of pupLegCoords) {
      const legPivot = new THREE.Group();
      legPivot.position.set(lx, 0.56, lz);
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), this.sapphireArmorMat);
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.065, 0.44, 8),
        this.brassMat
      );
      strut.position.y = -0.22;
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), this.darkIronMat);
      paw.scale.set(1.0, 0.65, 1.3);
      paw.position.set(0, -0.46, 0.05);
      legPivot.add(joint, strut, paw);
      g.add(legPivot);
      legs.push(legPivot);
    }

    const juggleCluster = new THREE.Group();
    juggleCluster.name = "confetti_juggle_gears";
    juggleCluster.position.set(0, 1.95, 0);
    juggleCluster.visible = false;
    for (let i = 0; i < 3; i++) {
      const cog = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 6, 10), this.goldPodMat);
      const ang = (i / 3) * Math.PI * 2;
      cog.position.set(Math.cos(ang) * 0.4, Math.sin(ang) * 0.18, Math.sin(ang) * 0.25);
      juggleCluster.add(cog);
    }
    g.add(juggleCluster);

    return { group: g, head, ears, gearTail, legs, juggleCluster };
  }

  _createOrigamiBlimpMesh() {
    const g = new THREE.Group();
    g.name = "hover_zeppelin_mesh";

    // Ribbed Steampunk Dirigible Airship Envelope
    const envelopeGeo = createDirigibleHullGeometry(0.96, 2.28);
    const envelope = new THREE.Mesh(envelopeGeo, this.parchmentMat);
    envelope.position.y = 1.92;
    g.add(envelope);

    // Circumferential brass structural rib bands + royal-sapphire nose cone trim
    for (const [rz, rad] of [
      [-1.05, 0.82],
      [0.0, 0.97],
      [1.05, 0.82],
    ]) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(rad, 0.042, 8, 22),
        this.brassMat
      );
      rib.position.set(0, 1.92, rz);
      g.add(rib);
    }
    const noseCone = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 14, 12),
      this.sapphireArmorMat
    );
    noseCone.scale.set(0.95, 0.95, 1.25);
    noseCone.position.set(0, 1.92, 1.95);
    g.add(noseCone);

    // Underslung Sculpted Brass Gondola + Rigging Struts + Glowing Cyan Portholes
    const gondolaGeo = createLatheProfileGeometry(
      [
        [0.06, 0.0],
        [0.34, 0.18],
        [0.38, 0.65],
        [0.34, 1.18],
        [0.08, 1.38],
      ],
      16
    );
    gondolaGeo.rotateX(Math.PI / 2);
    const gondola = new THREE.Mesh(gondolaGeo, this.brassMat);
    gondola.position.set(0, 0.82, -0.68);
    g.add(gondola);

    for (const sx of [-1, 1]) {
      for (const sz of [-0.42, 0.42]) {
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.022, 0.64, 6),
          this.darkIronMat
        );
        cable.position.set(sx * 0.24, 1.18, sz);
        cable.rotation.z = -sx * 0.22;
        g.add(cable);
      }
      const porthole = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        this.sapphireMat
      );
      porthole.position.set(sx * 0.34, 0.84, 0.05);
      g.add(porthole);
    }

    // Beveled Cruciform Tail Fins
    const finShape = createBeveledWingGeometry(
      [
        [0.0, -0.35],
        [0.72, -0.52],
        [0.78, -0.12],
        [0.0, 0.28],
      ],
      0.06,
      0.015
    );
    for (const sx of [-1, 1]) {
      const hFin = new THREE.Mesh(finShape, this.sapphireArmorMat);
      hFin.rotation.x = -Math.PI / 2;
      if (sx < 0) hFin.scale.x = -1;
      hFin.position.set(sx * 0.45, 1.92, -1.55);
      g.add(hFin);
    }
    const vFinTop = new THREE.Mesh(finShape, this.brassMat);
    vFinTop.rotation.y = -Math.PI / 2;
    vFinTop.position.set(0, 2.35, -1.55);
    g.add(vFinTop);

    // Spinning 4-Blade Brass Rear Propeller
    const prop = new THREE.Group();
    prop.name = "zeppelin_rear_propeller";
    prop.position.set(0, 1.92, -2.34);
    const propHub = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      this.sapphireMat
    );
    const bladeA = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.14, 0.05), this.brassMat);
    const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.18, 0.05), this.brassMat);
    prop.add(propHub, bladeA, bladeB);

    g.add(prop);
    return { group: g, prop };
  }

  _createGearBarricadeMesh() {
    const g = new THREE.Group();
    g.name = "spinning_gear_barricade_mesh";

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.32, 0.72), this.timberMat);
    frame.position.y = 0.22;

    const cogMain = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.18, 8, 12), this.brassMat);
    cogMain.position.y = 1.18;

    const cogHub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.28, 10), this.sapphireMat);
    cogHub.rotation.x = Math.PI / 2;
    cogHub.position.y = 1.18;
    cogMain.add(cogHub);

    for (let t = 0; t < 8; t++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.24), this.brassMat);
      const a = (t / 8) * Math.PI * 2;
      tooth.position.set(Math.cos(a) * 1.04, Math.sin(a) * 1.04, 0);
      tooth.rotation.z = a;
      cogMain.add(tooth);
    }

    g.add(frame, cogMain);
    return { group: g, cogMain };
  }

  _createGearPodMesh() {
    const g = new THREE.Group();
    g.name = "golden_gear_pod_mesh";

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.14, 8, 12), this.goldPodMat);
    ring.position.y = 1.05;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), this.sapphireMat);
    gem.position.y = 1.05;
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.06, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.12;

    g.add(ring, gem, halo);
    return { group: g, ring, gem };
  }

  _buildOppositionUnits() {
    WALKER_LANE_SPECS.forEach((spec, idx) => {
      const built = this._createClockworkWalkerMesh();
      const startZ = spec.startZ + (idx % 3) * 4.5;
      const y = this._groundY(spec.laneX, startZ);
      built.group.position.set(spec.laneX, y, startZ);
      built.group.userData = { kind: "clockwork_walker", oppositionId: spec.key };
      this.rootGroup.add(built.group);

      const unit = {
        id: spec.key,
        key: spec.key,
        kind: "clockwork_walker",
        active: true,
        respawnTimer: 0,
        jugglingTimer: 0,
        laneX: spec.laneX,
        startZ: spec.startZ,
        gateZ: spec.gateZ,
        baseSpeed: spec.speed,
        phase: spec.phase,
        strideClock: spec.phase,
        x: spec.laneX,
        y,
        z: startZ,
        scale: 1,
        group: built.group,
        windKey: built.windKey,
        dorsalGear: built.dorsalGear,
        legs: built.legs,
        juggleCluster: built.juggleCluster,
      };
      this.walkers.push(unit);
      this.units.push(unit);
    });

    GEAR_HOUND_SPECS.forEach((spec, idx) => {
      const built = this._createGearHoundMesh();
      const startZ = spec.startZ + (idx % 2) * 3.0;
      const y = this._groundY(spec.laneX, startZ);
      built.group.position.set(spec.laneX, y, startZ);
      built.group.userData = { kind: "gear_hound", oppositionId: spec.key };
      this.rootGroup.add(built.group);

      const unit = {
        id: spec.key,
        key: spec.key,
        kind: "gear_hound",
        active: true,
        respawnTimer: 0,
        jugglingTimer: 0,
        laneX: spec.laneX,
        startZ: spec.startZ,
        gateZ: spec.gateZ,
        baseSpeed: spec.speed,
        phase: spec.phase,
        strideClock: spec.phase,
        x: spec.laneX,
        y,
        z: startZ,
        scale: 1,
        group: built.group,
        head: built.head,
        ears: built.ears,
        gearTail: built.gearTail,
        legs: built.legs,
        juggleCluster: built.juggleCluster,
      };
      this.gearHounds.push(unit);
      this.units.push(unit);
    });

    BLIMP_ORBIT_SPECS.forEach((spec) => {
      const built = this._createOrigamiBlimpMesh();
      const x = spec.cx + Math.cos(spec.phase) * spec.rx;
      const z = spec.cz + Math.sin(spec.phase) * spec.rz;
      const y = this._groundY(x, z) + 0.55;
      built.group.position.set(x, y, z);
      built.group.userData = { kind: "origami_blimp", oppositionId: spec.key };
      this.rootGroup.add(built.group);

      const unit = {
        id: spec.key,
        key: spec.key,
        kind: "origami_blimp",
        active: true,
        respawnTimer: 0,
        cx: spec.cx,
        cz: spec.cz,
        rx: spec.rx,
        rz: spec.rz,
        orbitAngle: spec.phase,
        orbitSpeed: spec.speed,
        x,
        y,
        z,
        scale: 1,
        group: built.group,
        prop: built.prop,
      };
      this.blimps.push(unit);
      this.units.push(unit);
    });

    BARRICADE_SPECS.forEach((spec) => {
      const built = this._createGearBarricadeMesh();
      const x = spec.baseX + Math.sin(spec.phase) * spec.swayAmp;
      const z = spec.baseZ;
      const y = this._groundY(x, z);
      built.group.position.set(x, y, z);
      built.group.userData = { kind: "gear_barricade", oppositionId: spec.key };
      this.rootGroup.add(built.group);

      const unit = {
        id: spec.key,
        key: spec.key,
        kind: "gear_barricade",
        active: true,
        respawnTimer: 0,
        baseX: spec.baseX,
        baseZ: spec.baseZ,
        swayAmp: spec.swayAmp,
        swayPhase: spec.phase,
        swaySpeed: spec.speed,
        x,
        y,
        z,
        scale: 1,
        group: built.group,
        cogMain: built.cogMain,
      };
      this.barricades.push(unit);
      this.units.push(unit);
    });

    GEAR_POD_SPECS.forEach((spec) => {
      const built = this._createGearPodMesh();
      const y = this._groundY(spec.x, spec.z);
      built.group.position.set(spec.x, y, spec.z);
      built.group.userData = { kind: "gear_pod", oppositionId: spec.key };
      this.rootGroup.add(built.group);

      const unit = {
        id: spec.key,
        key: spec.key,
        kind: "gear_pod",
        active: true,
        respawnTimer: 0,
        baseX: spec.x,
        baseZ: spec.z,
        spinAngle: spec.bobPhase,
        x: spec.x,
        y,
        z: spec.z,
        scale: 1,
        group: built.group,
        ring: built.ring,
        gem: built.gem,
      };
      this.gearPods.push(unit);
      this.units.push(unit);
    });
  }

  _buildBulletTimeDome() {
    const domeGroup = new THREE.Group();
    domeGroup.name = "crystal_bullet_time_dome";
    domeGroup.visible = false;

    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x5ce1e6,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(9.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      shellMat
    );
    shell.name = "bullet_time_shell";
    domeGroup.add(shell);

    const rimMat = new THREE.MeshBasicMaterial({
      color: 0x7ee8fa,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const baseRing = new THREE.Mesh(new THREE.RingGeometry(8.6, 9.35, 36), rimMat);
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = 0.08;
    domeGroup.add(baseRing);

    // Chronos Harp golden resonance rings (enhanced when ab_chronos_harp is active)
    const harpGroup = new THREE.Group();
    harpGroup.name = "chronos_harp_aura_rings";
    harpGroup.visible = false;
    const harpMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(3.6 + i * 1.8, 0.055, 8, 32), harpMat);
      r.rotation.x = Math.PI / 2;
      r.position.y = 1.2 + i * 1.1;
      harpGroup.add(r);
    }
    domeGroup.add(harpGroup);

    // Floating golden embers & micro-gears inside Crystal Time-Dome (stepped by ambientDt = 0.08x)
    this.domeMotes = [];
    const moteMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    for (let i = 0; i < DOME_MOTE_COUNT; i++) {
      const isGear = i % 3 === 0;
      const mesh = new THREE.Mesh(
        isGear
          ? new THREE.TorusGeometry(0.18, 0.045, 6, 10)
          : new THREE.OctahedronGeometry(0.12, 0),
        moteMat
      );
      const radius = 2.2 + (i % 7) * 0.92;
      const angle = (i / DOME_MOTE_COUNT) * Math.PI * 2;
      const baseY = 0.9 + (i % 5) * 0.85;
      mesh.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
      domeGroup.add(mesh);
      this.domeMotes.push({ mesh, radius, angle, baseY, speed: 0.8 + (i % 4) * 0.35 });
    }

    this.bulletTimeDome = domeGroup;
    this.bulletTimeShellMat = shellMat;
    this.chronosHarpAura = harpGroup;
    if (this.scene) {
      this.scene.add(domeGroup);
    }
  }

  _buildUpgradeStructures() {
    // Friendly Clockwork Sentinel Rampart Turret (ab_auto_turret)
    const turret = new THREE.Group();
    turret.name = "bastion_auto_turret";
    turret.visible = false;
    const tY = this._groundY(0, -5.5);
    turret.position.set(0, tY, -5.5);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.4, 1.2, 10), this.brassMat);
    plinth.position.y = 0.6;
    const head = new THREE.Group();
    head.position.y = 1.45;
    const cowl = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 1.35), this.sapphireMat);
    const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.5, 8), this.brassMat);
    barrelL.rotation.x = Math.PI / 2;
    barrelL.position.set(-0.28, 0.08, -0.95);
    const barrelR = barrelL.clone();
    barrelR.position.x = 0.28;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 8, 20), this.goldPodMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.55;
    head.add(cowl, barrelL, barrelR, halo);
    turret.add(plinth, head);

    this.autoTurretGroup = turret;
    this.autoTurretHead = head;
    if (this.scene) {
      this.scene.add(turret);
    }

    // 3D Canyon Ricochet Angle-Mirrors (ab_angle_mirrors)
    const mirrors = new THREE.Group();
    mirrors.name = "bastion_angle_mirrors";
    mirrors.visible = false;
    const mirrorGlassMat = new THREE.MeshStandardMaterial({
      color: 0x9ef5ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
      roughness: 0.06,
      metalness: 0.88,
    });
    const mirrorCoords = [
      { x: -16, z: -18, rotY: 0.62 },
      { x: 16, z: -18, rotY: -0.62 },
      { x: -10, z: -32, rotY: 0.45 },
      { x: 10, z: -32, rotY: -0.45 },
    ];
    this.mirrorNodes = [];
    for (const mc of mirrorCoords) {
      const mNode = new THREE.Group();
      const my = this._groundY(mc.x, mc.z);
      mNode.position.set(mc.x, my, mc.z);
      mNode.rotation.y = mc.rotY;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.22), this.brassMat);
      frame.position.y = 1.5;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 0.26), mirrorGlassMat);
      pane.position.y = 1.5;
      mNode.add(frame, pane);
      mirrors.add(mNode);
      this.mirrorNodes.push({ x: mc.x, y: my + 1.5, z: mc.z, mesh: mNode });
    }
    this.angleMirrorsGroup = mirrors;
    if (this.scene) {
      this.scene.add(mirrors);
    }
  }

  _buildBurstParticlePools() {
    const gearGeo = new THREE.TorusGeometry(0.24, 0.065, 6, 10);
    this.gearBurstMesh = new THREE.InstancedMesh(gearGeo, this.brassMat, MAX_GEAR_PARTICLES);
    this.gearBurstMesh.name = "tumbling_gear_burst_pool";
    this.gearBurstMesh.frustumCulled = false;

    const confettiGeo = new THREE.BoxGeometry(0.22, 0.06, 0.28);
    const confettiMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    this.confettiBurstMesh = new THREE.InstancedMesh(
      confettiGeo,
      confettiMat,
      MAX_CONFETTI_PARTICLES
    );
    this.confettiBurstMesh.name = "celebratory_confetti_pool";
    this.confettiBurstMesh.frustumCulled = false;

    this.gearParticles = [];
    this.confettiParticles = [];
    this._tmpPos.set(0, -50, 0);
    this._tmpQuat.identity();
    this._tmpScale.set(0, 0, 0);
    this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);

    const confettiPalette = [0xffd166, 0x4ad8ff, 0x7ee081, 0xc084fc, 0x5ce1e6];
    const tmpColor = new THREE.Color();

    for (let i = 0; i < MAX_GEAR_PARTICLES; i++) {
      this.gearBurstMesh.setMatrixAt(i, this._tmpMat4);
      this.gearParticles.push({
        index: i,
        life: 0,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
      });
    }
    for (let i = 0; i < MAX_CONFETTI_PARTICLES; i++) {
      this.confettiBurstMesh.setMatrixAt(i, this._tmpMat4);
      tmpColor.setHex(confettiPalette[i % confettiPalette.length]);
      this.confettiBurstMesh.setColorAt(i, tmpColor);
      this.confettiParticles.push({
        index: i,
        life: 0,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
      });
    }
    this.gearBurstMesh.instanceMatrix.needsUpdate = true;
    this.confettiBurstMesh.instanceMatrix.needsUpdate = true;
    if (this.confettiBurstMesh.instanceColor) {
      this.confettiBurstMesh.instanceColor.needsUpdate = true;
    }

    if (this.scene) {
      this.scene.add(this.gearBurstMesh, this.confettiBurstMesh);
    }
  }

  setUpgrades(upgrades = []) {
    const arr = Array.isArray(upgrades) ? upgrades : [];
    this.upgradesSet = new Set(arr);
    if (this.autoTurretGroup) {
      this.autoTurretGroup.visible = this.upgradesSet.has("ab_auto_turret");
    }
    if (this.angleMirrorsGroup) {
      this.angleMirrorsGroup.visible = this.upgradesSet.has("ab_angle_mirrors");
    }
    if (this.chronosHarpAura) {
      this.chronosHarpAura.visible = this.upgradesSet.has("ab_chronos_harp");
    }
  }

  setPaused(flag) {
    this.paused = Boolean(flag);
  }

  refreshIntactPods() {
    for (const u of this.units) {
      u.active = true;
      u.respawnTimer = 0;
      if (u.kind === "clockwork_walker" || u.kind === "gear_hound") {
        u.jugglingTimer = 0;
        u.x = u.laneX;
        u.z = u.startZ;
        u.y = this._groundY(u.x, u.z);
        if (u.juggleCluster) u.juggleCluster.visible = false;
      }
      if (u.group) {
        u.group.position.set(u.x, u.y, u.z);
        u.group.visible = true;
      }
    }
  }

  getSnapshots() {
    const out = [];
    for (const u of this.units) {
      if (!u.active) continue;
      out.push({
        key: u.key,
        kind: u.kind,
        x: u.x,
        y: u.y,
        z: u.z,
      });
    }
    return out;
  }

  getBarricadeDragFactor(x, z, speed = 0, isBallista = false) {
    for (const b of this.barricades) {
      if (!b.active) continue;
      const d = Math.hypot(x - b.x, z - b.z);
      if (d < 2.5) {
        if (Math.abs(speed) >= (isBallista ? 4.2 : 6.0) || this.upgradesSet.has("ab_prism_pierce")) {
          return 1.0;
        }
        return 0.72;
      }
    }
    return 1.0;
  }

  spawnGearConfettiBurst(cx, cy, cz, count = 20) {
    let gSpawned = 0;
    for (const p of this.gearParticles) {
      if (p.life > 0) continue;
      p.life = 1.15 + (p.index % 4) * 0.12;
      p.x = cx + ((p.index % 5) - 2) * 0.25;
      p.y = cy + 0.5;
      p.z = cz + ((p.index % 3) - 1) * 0.25;
      const ang = (p.index / 10) * Math.PI * 2;
      const spd = 4.2 + (p.index % 6) * 1.1;
      p.vx = Math.cos(ang) * spd;
      p.vy = 4.8 + (p.index % 5) * 1.2;
      p.vz = Math.sin(ang) * spd;
      gSpawned += 1;
      if (gSpawned >= count) break;
    }

    let cSpawned = 0;
    for (const c of this.confettiParticles) {
      if (c.life > 0) continue;
      c.life = 1.35 + (c.index % 5) * 0.1;
      c.x = cx;
      c.y = cy + 0.9;
      c.z = cz;
      const ang = (c.index / 12) * Math.PI * 2;
      const spd = 3.4 + (c.index % 7) * 0.95;
      c.vx = Math.cos(ang) * spd;
      c.vy = 5.6 + (c.index % 4) * 1.3;
      c.vz = Math.sin(ang) * spd;
      cSpawned += 1;
      if (cSpawned >= count) break;
    }
  }

  spawnCryoChillZone(x, y, z, hasCryoMortar = this.upgradesSet.has("ab_cryo_mortar")) {
    const radius = hasCryoMortar ? 7.8 : 4.6;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 24),
      this.cryoZoneMat.clone()
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(x, y + 0.08, z);
    disc.name = "cryo_chill_zone";
    if (this.scene) {
      this.scene.add(disc);
    }
    this.cryoZones.push({ mesh: disc, x, z, radius, life: 6.5 });
    return { x, z, radius };
  }

  _shatterContraption(unit, sourceLabel = "Siege Ram") {
    if (!unit || !unit.active) return false;
    unit.active = false;
    unit.respawnTimer = 8.5;
    unit.jugglingTimer = 0;
    if (unit.group) unit.group.visible = false;
    this.shatteredCount += 1;

    this.spawnGearConfettiBurst(unit.x, unit.y + 0.8, unit.z, 22);
    this.audio?.playGearBurst?.(false);

    if (unit.kind === "gear_pod") {
      this.onWorldActivity(1, 2, "contraptionsShattered");
      this.onOppositionEvent({
        kind: "gear_pod_smashed",
        shardsEarned: 2,
        source: sourceLabel,
        message: "Golden Gear-Pod Popped! +2💎",
      });
    } else {
      this.onWorldActivity(1, 3, "contraptionsShattered");
      this.onOppositionEvent({
        kind: "contraption_shattered",
        shardsEarned: 3,
        source: sourceLabel,
        message: "Clockwork Contraption Shattered! +3💎",
      });
    }
    return true;
  }

  triggerCitadelShockwave(cx, cz, radius = 16.0) {
    let shattered = 0;
    for (const u of this.units) {
      if (!u.active || u.kind === "gear_pod") continue;
      if (Math.hypot(u.x - cx, u.z - cz) <= radius) {
        this._shatterContraption(u, "Battery Clear Shockwave");
        shattered += 1;
      }
    }
    return shattered;
  }

  firePrismPiercePulse(rigState, hasAngleMirrors = this.upgradesSet.has("ab_angle_mirrors")) {
    if (!rigState) return { hitCount: 0 };
    const fwdX = -Math.sin(rigState.heading || 0);
    const fwdZ = -Math.cos(rigState.heading || 0);
    const maxHits = hasAngleMirrors ? 3 : 2;
    const beamLen = 24.0;

    const start = new THREE.Vector3(rigState.x, (rigState.y || 0) + 1.2, rigState.z);
    const end = new THREE.Vector3(
      rigState.x + fwdX * beamLen,
      (rigState.y || 0) + 1.2,
      rigState.z + fwdZ * beamLen
    );
    this._spawnVisualBolt(start, end, 0x7ee8fa);
    this.audio?.playBeamSlice?.(false);

    const candidates = this.units
      .filter((u) => u.active)
      .map((u) => {
        const dx = u.x - rigState.x;
        const dz = u.z - rigState.z;
        const along = dx * fwdX + dz * fwdZ;
        const perp = Math.abs(dx * fwdZ - dz * fwdX);
        return { u, along, perp, dist: Math.hypot(dx, dz) };
      })
      .filter((item) => (item.along >= -1.0 && item.along <= beamLen && item.perp <= 4.2) || (hasAngleMirrors && item.dist <= 18.0))
      .sort((a, b) => a.dist - b.dist);

    let hitCount = 0;
    for (const c of candidates) {
      if (hitCount >= maxHits) break;
      if (this._shatterContraption(c.u, "Piercing Prism Rail")) {
        hitCount += 1;
      }
    }
    return { hitCount };
  }

  _spawnVisualBolt(startVec, endVec, colorHex = 0xffd166) {
    if (!this.scene) return;
    const dist = Math.max(0.25, startVec.distanceTo(endVec));
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, dist, 8),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.9,
      })
    );
    bolt.position.copy(startVec).lerp(endVec, 0.5);
    bolt.lookAt(endVec);
    bolt.rotateX(Math.PI / 2);
    this.scene.add(bolt);
    this.activeBolts.push({ mesh: bolt, life: 0.34 });
  }

  _stepAutoTurret(oppDt) {
    if (!this.upgradesSet.has("ab_auto_turret") || !(oppDt > 0)) return;
    this._turretCooldown -= oppDt;
    const tx = 0;
    const tz = -5.5;
    const ty = this._groundY(tx, tz) + 1.5;

    let nearest = null;
    let bestD = 34.0;
    for (const u of this.units) {
      if (!u.active || u.kind === "gear_pod") continue;
      const d = Math.hypot(u.x - tx, u.z - tz);
      if (d < bestD) {
        bestD = d;
        nearest = u;
      }
    }

    if (nearest && this.autoTurretHead) {
      this.autoTurretHead.rotation.y = Math.atan2(nearest.x - tx, nearest.z - tz) + Math.PI;
    }

    if (this._turretCooldown <= 0 && nearest) {
      this._turretCooldown = 2.6;
      const start = new THREE.Vector3(tx, ty, tz);
      const targetPos = new THREE.Vector3(nearest.x, nearest.y + 1.2, nearest.z);

      if (this.upgradesSet.has("ab_angle_mirrors") && this.mirrorNodes.length > 0) {
        const m = this.mirrorNodes[this.shatteredCount % this.mirrorNodes.length];
        const mid = new THREE.Vector3(m.x, m.y, m.z);
        this._spawnVisualBolt(start, mid, 0xffd166);
        this._spawnVisualBolt(mid, targetPos, 0x5ce1e6);
      } else {
        this._spawnVisualBolt(start, targetPos, 0xffd166);
      }
      this._shatterContraption(nearest, "Clockwork Sentinel");
    }
  }

  _isInsideCryoChill(x, z) {
    for (const cz of this.cryoZones) {
      if (cz.life > 0 && Math.hypot(x - cz.x, z - cz.z) <= cz.radius) {
        return true;
      }
    }
    return false;
  }

  update(dt, opts = {}) {
    const safeDt = clampFinite(dt, 0, 0.25, 0);
    const encounterDockOpen = Boolean(opts.encounterDockOpen || opts.paused || this.paused);
    const activeGateSlot = Boolean(opts.activeGateSlot);
    const bulletTimeRequested = Boolean(opts.bulletTimeRequested);
    const rigState = opts.rigState || { x: 0, y: 0, z: 14, heading: 0, speed: 0 };

    const timeScale = computeSimulationTimeScale({
      dt: safeDt,
      encounterDockOpen,
      activeGateSlot,
      bulletTimeRequested,
      realmId: "arc_bastion",
    });

    this.lastTimeScale = timeScale;
    this.paused = timeScale.mathPaused;
    this.bulletTimeActive = timeScale.bulletTimeActive;

    // 1. Update 0.08x Crystal Bullet-Time Dome & Ambient Floating Motes (stepped by ambientDt)
    const ambientDt = timeScale.ambientDt;
    this._ambientClock += ambientDt;

    if (this.bulletTimeDome) {
      const targetExpand = timeScale.bulletTimeActive ? 1.0 : 0.0;
      const expandRate = timeScale.bulletTimeActive ? 8.5 : 6.5;
      this._domeExpand += (targetExpand - this._domeExpand) * Math.min(1, safeDt * expandRate);
      if (this._domeExpand > 0.02) {
        this.bulletTimeDome.visible = true;
        this.bulletTimeDome.position.set(
          rigState.x || 0,
          this._groundY(rigState.x || 0, rigState.z || 0),
          rigState.z || 0
        );
        const s = 0.25 + this._domeExpand * 0.75;
        this.bulletTimeDome.scale.set(s, s, s);
        if (this.bulletTimeShellMat) {
          this.bulletTimeShellMat.opacity = 0.16 * this._domeExpand;
        }
        for (const m of this.domeMotes) {
          m.angle += ambientDt * m.speed;
          m.mesh.position.set(
            Math.cos(m.angle) * m.radius,
            m.baseY + Math.sin(this._ambientClock * 2.4 + m.angle) * 0.28,
            Math.sin(m.angle) * m.radius
          );
          m.mesh.rotation.y += ambientDt * 2.2;
          m.mesh.rotation.x += ambientDt * 1.4;
        }
        if (this.chronosHarpAura && this.chronosHarpAura.visible) {
          this.chronosHarpAura.rotation.y += ambientDt * 1.2;
        }
      } else {
        this.bulletTimeDome.visible = false;
      }
    }

    // Step transient visual particles & bolts (purely cosmetic, does NOT touch opposition units!)
    this._stepCosmeticPools(safeDt);

    // 2. MANDATORY MATH-PAUSE LAW: exact bitwise 0.0 opposition movement while docked/focused!
    const oppDt = timeScale.oppositionDt;
    if (oppDt === 0.0) {
      return timeScale;
    }

    // 3. Step Clockwork Walkers (with Cryo-Gel chill & harmless Confetti Gear-Juggle Stall at gates)
    for (const w of this.walkers) {
      if (!w.active) {
        w.respawnTimer -= oppDt;
        if (w.respawnTimer <= 0) {
          w.active = true;
          w.jugglingTimer = 0;
          w.x = w.laneX;
          w.z = w.startZ;
          w.y = this._groundY(w.x, w.z);
          w.group.position.set(w.x, w.y, w.z);
          if (w.juggleCluster) w.juggleCluster.visible = false;
          w.group.visible = true;
        }
        continue;
      }

      if (w.jugglingTimer > 0) {
        // Harmless Confetti Gear-Juggle Stall at gate — zero damage, pure physical comedy!
        w.jugglingTimer -= oppDt;
        w.strideClock += oppDt * 10.0;
        w.y = this._groundY(w.x, w.z) + Math.abs(Math.sin(w.strideClock)) * 0.55;
        w.group.position.set(w.x, w.y, w.z);
        w.group.rotation.y += oppDt * 5.2;
        if (w.juggleCluster) {
          w.juggleCluster.visible = true;
          w.juggleCluster.rotation.y += oppDt * 6.5;
          w.juggleCluster.rotation.z = Math.sin(w.strideClock) * 0.45;
        }
        if (w.jugglingTimer <= 0) {
          if (w.juggleCluster) w.juggleCluster.visible = false;
          w.x = w.laneX;
          w.z = w.startZ;
          w.y = this._groundY(w.x, w.z);
          w.group.rotation.y = 0;
          w.group.position.set(w.x, w.y, w.z);
        }
        continue;
      }

      const cryoMul = this._isInsideCryoChill(w.x, w.z) ? 0.35 : 1.0;
      const stepSpd = w.baseSpeed * cryoMul;
      w.z += stepSpd * oppDt;
      w.x = w.laneX + Math.sin(w.strideClock * 0.7) * 0.65;
      w.y = this._groundY(w.x, w.z);
      w.strideClock += oppDt * 6.5 * cryoMul;

      w.group.position.set(w.x, w.y, w.z);
      w.group.rotation.y = 0;
      if (w.windKey) {
        w.windKey.rotation.y += oppDt * 4.2 * cryoMul;
      }
      if (w.dorsalGear) {
        w.dorsalGear.rotation.x += oppDt * 4.8 * cryoMul;
      }
      for (let i = 0; i < w.legs.length; i++) {
        const sign = i % 2 === 0 ? 1 : -1;
        w.legs[i].rotation.x = Math.sin(w.strideClock + (i >= 2 ? Math.PI : 0)) * 0.48 * sign;
      }

      if (w.z >= w.gateZ) {
        w.jugglingTimer = 1.6;
        this.juggleStallCount += 1;
        this.spawnGearConfettiBurst(w.x, w.y + 1.6, w.z, 14);
      }
    }

    // 3b. Step Playful Mechanical Brass Gear-Hounds
    for (const h of this.gearHounds) {
      if (!h.active) {
        h.respawnTimer -= oppDt;
        if (h.respawnTimer <= 0) {
          h.active = true;
          h.jugglingTimer = 0;
          h.x = h.laneX;
          h.z = h.startZ;
          h.y = this._groundY(h.x, h.z);
          h.group.position.set(h.x, h.y, h.z);
          if (h.juggleCluster) h.juggleCluster.visible = false;
          h.group.visible = true;
        }
        continue;
      }

      if (h.jugglingTimer > 0) {
        h.jugglingTimer -= oppDt;
        h.strideClock += oppDt * 12.0;
        h.y = this._groundY(h.x, h.z) + Math.abs(Math.sin(h.strideClock)) * 0.46;
        h.group.position.set(h.x, h.y, h.z);
        h.group.rotation.y += oppDt * 5.8;
        if (h.juggleCluster) {
          h.juggleCluster.visible = true;
          h.juggleCluster.rotation.y += oppDt * 6.8;
        }
        if (h.jugglingTimer <= 0) {
          if (h.juggleCluster) h.juggleCluster.visible = false;
          h.x = h.laneX;
          h.z = h.startZ;
          h.y = this._groundY(h.x, h.z);
          h.group.rotation.y = 0;
          h.group.position.set(h.x, h.y, h.z);
        }
        continue;
      }

      const cryoMul = this._isInsideCryoChill(h.x, h.z) ? 0.35 : 1.0;
      const stepSpd = h.baseSpeed * cryoMul;
      h.z += stepSpd * oppDt;
      h.x = h.laneX + Math.sin(h.strideClock * 0.85) * 0.52;
      h.y = this._groundY(h.x, h.z) + Math.abs(Math.sin(h.strideClock * 2.0)) * 0.08;
      h.strideClock += oppDt * 8.4 * cryoMul;

      h.group.position.set(h.x, h.y, h.z);
      h.group.rotation.y = 0;
      if (h.gearTail) {
        h.gearTail.rotation.x += oppDt * 9.5 * cryoMul;
        h.gearTail.rotation.z = Math.sin(h.strideClock * 1.4) * 0.3;
      }
      if (h.head) {
        h.head.rotation.x = Math.sin(h.strideClock * 1.8) * 0.1;
        h.head.rotation.z = Math.sin(h.strideClock * 0.9) * 0.08;
      }
      if (Array.isArray(h.ears)) {
        const earBounce = Math.abs(Math.sin(h.strideClock * 2.0)) * 0.22;
        if (h.ears[0]) h.ears[0].rotation.z = -earBounce;
        if (h.ears[1]) h.ears[1].rotation.z = earBounce;
      }
      for (let i = 0; i < h.legs.length; i++) {
        const diag = i === 0 || i === 3 ? 0 : Math.PI;
        h.legs[i].rotation.x = Math.sin(h.strideClock * 1.6 + diag) * 0.56;
      }

      if (h.z >= h.gateZ) {
        h.jugglingTimer = 1.5;
        this.juggleStallCount += 1;
        this.spawnGearConfettiBurst(h.x, h.y + 1.2, h.z, 12);
      }
    }

    // 4. Step Hover-Zeppelins
    for (const b of this.blimps) {
      if (!b.active) {
        b.respawnTimer -= oppDt;
        if (b.respawnTimer <= 0) {
          b.active = true;
          b.group.visible = true;
        }
        continue;
      }
      b.orbitAngle += b.orbitSpeed * oppDt;
      const nx = b.cx + Math.cos(b.orbitAngle) * b.rx;
      const nz = b.cz + Math.sin(b.orbitAngle) * b.rz;
      const dx = nx - b.x;
      const dz = nz - b.z;
      b.x = nx;
      b.z = nz;
      b.y = this._groundY(b.x, b.z) + 0.55 + Math.sin(b.orbitAngle * 2.0) * 0.25;
      b.group.position.set(b.x, b.y, b.z);
      if (Math.hypot(dx, dz) > 1e-5) {
        b.group.rotation.y = Math.atan2(dx, dz);
      }
      if (b.prop) {
        b.prop.rotation.z += oppDt * 14.0;
      }
    }

    // 5. Step Spinning Gear-Barricades
    for (const bar of this.barricades) {
      if (!bar.active) {
        bar.respawnTimer -= oppDt;
        if (bar.respawnTimer <= 0) {
          bar.active = true;
          bar.group.visible = true;
        }
        continue;
      }
      bar.swayPhase += bar.swaySpeed * oppDt;
      bar.x = bar.baseX + Math.sin(bar.swayPhase) * bar.swayAmp;
      bar.z = bar.baseZ;
      bar.y = this._groundY(bar.x, bar.z);
      bar.group.position.set(bar.x, bar.y, bar.z);
      if (bar.cogMain) {
        bar.cogMain.rotation.z += oppDt * 3.2;
      }
    }

    // 6. Step Smashable Golden Gear-Pods (+2 Flux Shards)
    for (const pod of this.gearPods) {
      if (!pod.active) {
        pod.respawnTimer -= oppDt;
        if (pod.respawnTimer <= 0) {
          pod.active = true;
          pod.group.visible = true;
        }
        continue;
      }
      pod.spinAngle += oppDt * 2.4;
      pod.x = pod.baseX;
      pod.z = pod.baseZ;
      pod.y = this._groundY(pod.x, pod.z) + Math.sin(pod.spinAngle * 1.6) * 0.16;
      pod.group.position.set(pod.x, pod.y, pod.z);
      if (pod.ring) pod.ring.rotation.y = pod.spinAngle;
      if (pod.gem) pod.gem.rotation.y = -pod.spinAngle * 1.4;
    }

    // 7. Player Rover Ramming & Smash Collisions
    const isBallista = rigState.rigId === "iron_ballista" || rigState.chassisId === "iron_ballista";
    const ramRadius = isBallista ? 3.3 : 2.9;
    const fwdX = -Math.sin(rigState.heading || 0);
    const fwdZ = -Math.cos(rigState.heading || 0);
    const prowX = (rigState.x || 0) + fwdX * 1.5;
    const prowZ = (rigState.z || 0) + fwdZ * 1.5;
    const speedMag = Math.abs(rigState.speed || 0);

    for (const u of this.units) {
      if (!u.active) continue;
      const dCenter = Math.hypot((rigState.x || 0) - u.x, (rigState.z || 0) - u.z);
      const dProw = Math.hypot(prowX - u.x, prowZ - u.z);
      const hitDist = Math.min(dCenter, dProw);

      if (u.kind === "gear_pod") {
        if (hitDist <= ramRadius + 0.4) {
          this._shatterContraption(u, "Rover Pickup");
        }
      } else if (u.kind === "gear_barricade") {
        const canBreak =
          speedMag >= (isBallista ? 3.8 : 5.5) ||
          Boolean(rigState.boosting) ||
          this.upgradesSet.has("ab_prism_pierce");
        if (hitDist <= ramRadius && canBreak) {
          this._shatterContraption(u, "Gear-Ram");
        }
      } else if (hitDist <= ramRadius && (speedMag >= 1.2 || isBallista)) {
        this._shatterContraption(u, "Siege-Rover Ram");
      }
    }

    // 8. Friendly Battlement Sentinel Auto-Turret
    this._stepAutoTurret(oppDt);

    return timeScale;
  }

  _stepCosmeticPools(dt) {
    if (!(dt > 0)) return;
    const stepPool = (pool, mesh, gravity) => {
      if (!pool || !mesh) return;
      let dirty = false;
      for (const p of pool) {
        if (p.life <= 0) continue;
        p.life -= dt;
        dirty = true;
        if (p.life <= 0) {
          this._tmpPos.set(0, -50, 0);
          this._tmpQuat.identity();
          this._tmpScale.set(0, 0, 0);
          this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
          mesh.setMatrixAt(p.index, this._tmpMat4);
          continue;
        }
        p.vy -= gravity * dt;
        p.x += p.vx * dt;
        p.y = Math.max(-18, p.y + p.vy * dt);
        p.z += p.vz * dt;
        p.rx += dt * 5.2;
        p.ry += dt * 6.4;
        this._tmpPos.set(p.x, p.y, p.z);
        this._tmpEuler.set(p.rx, p.ry, 0);
        this._tmpQuat.setFromEuler(this._tmpEuler);
        this._tmpScale.setScalar(Math.min(1, p.life * 1.8));
        this._tmpMat4.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        mesh.setMatrixAt(p.index, this._tmpMat4);
      }
      if (dirty) mesh.instanceMatrix.needsUpdate = true;
    };

    stepPool(this.gearParticles, this.gearBurstMesh, 14.5);
    stepPool(this.confettiParticles, this.confettiBurstMesh, 7.2);

    for (let i = this.activeBolts.length - 1; i >= 0; i--) {
      const b = this.activeBolts[i];
      b.life -= dt;
      b.mesh.material.opacity = Math.max(0, b.life * 2.6);
      if (b.life <= 0) {
        if (this.scene) this.scene.remove(b.mesh);
        this.activeBolts.splice(i, 1);
      }
    }

    for (let i = this.cryoZones.length - 1; i >= 0; i--) {
      const cz = this.cryoZones[i];
      cz.life -= dt;
      cz.mesh.material.opacity = Math.min(0.38, Math.max(0, cz.life * 0.14));
      if (cz.life <= 0) {
        if (this.scene) this.scene.remove(cz.mesh);
        this.cryoZones.splice(i, 1);
      }
    }
  }

  dispose() {
    if (this.scene) {
      if (this.rootGroup) this.scene.remove(this.rootGroup);
      if (this.bulletTimeDome) this.scene.remove(this.bulletTimeDome);
      if (this.autoTurretGroup) this.scene.remove(this.autoTurretGroup);
      if (this.angleMirrorsGroup) this.scene.remove(this.angleMirrorsGroup);
      if (this.gearBurstMesh) this.scene.remove(this.gearBurstMesh);
      if (this.confettiBurstMesh) this.scene.remove(this.confettiBurstMesh);
      for (const b of this.activeBolts) {
        if (b.mesh) this.scene.remove(b.mesh);
      }
      for (const cz of this.cryoZones) {
        if (cz.mesh) this.scene.remove(cz.mesh);
      }
    }
    this.activeBolts = [];
    this.cryoZones = [];
  }
}
