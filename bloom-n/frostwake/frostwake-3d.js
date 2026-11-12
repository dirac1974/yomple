/**
 * Frostwake: Flux Terra-Rigs — 60fps Three.js Deformable-Snow & 3D Math Encounter Engine
 * Built for phones, tablets, and desktops with zero external network asset dependencies.
 */

import * as THREE from "../vendor/three.module.min.js";
import { RIG_CHASSIS } from "../core/engine.js";

const VALLEY_SIZE = 156;
const VALLEY_HALF = VALLEY_SIZE / 2;
const GRID_SEGMENTS = 112;

export class FrostwakeWorld3D {
  constructor({ canvas, audio, onSnowCleared, onApproachGate, onLeaveGate, onMysteryFound }) {
    this.canvas = canvas;
    this.audio = audio;
    this.onSnowCleared = onSnowCleared || (() => {});
    this.onApproachGate = onApproachGate || (() => {});
    this.onLeaveGate = onLeaveGate || (() => {});
    this.onMysteryFound = onMysteryFound || (() => {});

    this.running = false;
    this.webglAvailable = true;
    this.clock = new THREE.Clock();

    // Rig physics state
    this.rigState = {
      x: 0,
      y: 0,
      z: 22,
      heading: Math.PI, // facing -Z (north into the valley)
      speed: 0,
      steerInput: 0,
      throttleInput: 0,
      boosting: false,
      chassisId: "terra_dozer",
      upgrades: [],
      observatoryTier: 1,
      inSurge: false,
    };

    this.autopilotTarget = null;
    this.activeGateSlot = null;
    this.dialPreviewValue = 0;
    this.moonDwellSec = 0;
    this.carvedCountAccum = 0;

    // Cinematic action animations (ram, ramp surf, laser slice, ice-jack nudge, sky-whale)
    this.rigAnim = null;
    this.laserBeams = [];
    this.shatterShards = [];
    this.snowSpray = [];
    this.wokenFoxes = [];
    this.gateSlots = [];
    this.whaleTimer = 0;

    this._initScene();
  }

  _baseHeight(x, z) {
    const r = Math.hypot(x, z);
    // Flat central Moon Sanctuary around (0,0), gentle rolling alpine bowl outward
    const centerFlat = Math.min(1, Math.max(0, (r - 10) / 18));
    const bowl = Math.pow(Math.max(0, r - 48) / 28, 2) * 3.2;
    const waves = (Math.sin(x * 0.055) * Math.cos(z * 0.055) * 1.15 + Math.sin(z * 0.03) * 0.6) * centerFlat;
    return waves + bowl;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c2136);
    this.scene.fog = new THREE.FogExp2(0x102b44, 0.0068);

    this.camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.4, 340);
    this.camera.position.set(0, 11, 36);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: "high-performance",
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;
    } catch (_) {
      this.webglAvailable = false;
      return;
    }

    // Crisp Nordic twilight + warm sunlit alpine rim lighting
    const hemi = new THREE.HemisphereLight(0xbbeeff, 0x1b3b56, 1.25);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1d0, 1.55);
    sun.position.set(38, 62, 34);
    this.scene.add(sun);

    const auroraFill = new THREE.DirectionalLight(0x3bf0c5, 0.55);
    auroraFill.position.set(-40, 35, -50);
    this.scene.add(auroraFill);

    this._buildAuroraSky();
    this._buildDeformableSnow();
    this._buildMoonSanctuaryAndObservatory();
    this._buildAlpinePines();
    this._buildSnowfallParticles();
    this._buildSprayAndShardPools();
    this._buildSkyWhale();
    this.rebuildRig(this.rigState.chassisId, this.rigState.upgrades);

    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
  }

  resize() {
    if (!this.renderer || !this.canvas) return;
    const rect = this.canvas.parentElement
      ? this.canvas.parentElement.getBoundingClientRect()
      : { width: window.innerWidth, height: window.innerHeight };
    const w = Math.max(300, rect.width || window.innerWidth);
    const h = Math.max(260, rect.height || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _buildAuroraSky() {
    // Glowing aurora ribbons waving high across the northern horizon
    this.auroraRibbons = [];
    const colors = [0x3bf0c5, 0x5ce1e6, 0xffd166];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.PlaneGeometry(190, 26, 36, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.18 - i * 0.03,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((i - 1) * 18, 46 + i * 7, -88 - i * 10);
      mesh.rotation.x = 0.22;
      this.scene.add(mesh);
      this.auroraRibbons.push({ mesh, geo, phase: i * 1.7 });
    }

    // Crisp starfield dome
    const starCount = 320;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.44;
      const rad = 185;
      pos[i * 3] = Math.cos(theta) * Math.sin(phi) * rad;
      pos[i * 3 + 1] = Math.cos(phi) * rad + 12;
      pos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * rad;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xeef9ff, size: 1.35, transparent: true, opacity: 0.85 });
    this.scene.add(new THREE.Points(starGeo, starMat));
  }

  _buildDeformableSnow() {
    const geo = new THREE.PlaneGeometry(VALLEY_SIZE, VALLEY_SIZE, GRID_SEGMENTS, GRID_SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const count = geo.attributes.position.count;
    this.snowBaseY = new Float32Array(count);
    this.snowCarve = new Float32Array(count); // 0 = fresh powder, 1 = fully carved stream
    const colors = new Float32Array(count * 3);

    const posAttr = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = this._baseHeight(x, z);
      this.snowBaseY[i] = y;
      posAttr.setY(i, y + 0.42);
      // Sparkling crisp snow color with subtle elevation tint
      const shade = 0.91 + Math.min(0.08, y * 0.015);
      colors[i * 3] = shade * 0.92;
      colors[i * 3 + 1] = shade * 0.97;
      colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.58,
      metalness: 0.06,
    });

    this.snowMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.snowMesh);
  }

  resetFreshSnow() {
    if (!this.snowMesh) return;
    const posAttr = this.snowMesh.geometry.attributes.position;
    const colAttr = this.snowMesh.geometry.attributes.color;
    for (let i = 0; i < posAttr.count; i++) {
      this.snowCarve[i] = 0;
      const y = this.snowBaseY[i];
      posAttr.setY(i, y + 0.42);
      const shade = 0.91 + Math.min(0.08, y * 0.015);
      colAttr.setXYZ(i, shade * 0.92, shade * 0.97, 1.0);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this.snowMesh.geometry.computeVertexNormals();
  }

  _carveSnowAt(wx, wz, radius) {
    if (!this.snowMesh) return;
    const geo = this.snowMesh.geometry;
    const posAttr = geo.attributes.position;
    const colAttr = geo.attributes.color;
    const cellSize = VALLEY_SIZE / GRID_SEGMENTS;
    const gxCenter = Math.round(((wx + VALLEY_HALF) / VALLEY_SIZE) * GRID_SEGMENTS);
    const gzCenter = Math.round(((wz + VALLEY_HALF) / VALLEY_SIZE) * GRID_SEGMENTS);
    const cellSpan = Math.ceil((radius + 1.4) / cellSize);

    const hasPrism = this.rigState.upgrades.includes("prismatic_trail") || this.rigState.inSurge;
    let newlyCarved = 0;
    let dirty = false;

    for (let gz = Math.max(0, gzCenter - cellSpan); gz <= Math.min(GRID_SEGMENTS, gzCenter + cellSpan); gz++) {
      for (let gx = Math.max(0, gxCenter - cellSpan); gx <= Math.min(GRID_SEGMENTS, gxCenter + cellSpan); gx++) {
        const idx = gz * (GRID_SEGMENTS + 1) + gx;
        const vx = posAttr.getX(idx);
        const vz = posAttr.getZ(idx);
        const dist = Math.hypot(vx - wx, vz - wz);

        if (dist < radius) {
          const strength = Math.min(1, (1 - dist / radius) * 1.45);
          if (strength > this.snowCarve[idx]) {
            if (this.snowCarve[idx] < 0.35 && strength >= 0.35) newlyCarved += 1;
            this.snowCarve[idx] = strength;
            posAttr.setY(idx, this.snowBaseY[idx] + 0.42 * (1 - strength * 0.95));

            if (hasPrism) {
              const hueWave = 0.5 + 0.5 * Math.sin(vx * 0.22 + vz * 0.22);
              colAttr.setXYZ(
                idx,
                0.22 + hueWave * 0.72,
                0.88 - hueWave * 0.12,
                0.82 + (1 - hueWave) * 0.16
              );
            } else {
              // Glowing glacial turquoise stream beneath carved snow
              colAttr.setXYZ(
                idx,
                0.86 * (1 - strength) + 0.16 * strength,
                0.94 * (1 - strength) + 0.78 * strength,
                1.0 * (1 - strength) + 0.86 * strength
              );
            }
            dirty = true;
          }
        } else if (dist < radius + 1.1 && this.snowCarve[idx] < 0.12) {
          // Raised snowbank ridge pushed out by plow edges!
          const ridge = Math.sin(((dist - radius) / 1.1) * Math.PI) * 0.22;
          const curY = posAttr.getY(idx);
          const targetRidgeY = this.snowBaseY[idx] + 0.42 + ridge;
          if (targetRidgeY > curY) {
            posAttr.setY(idx, targetRidgeY);
            dirty = true;
          }
        }
      }
    }

    if (dirty) {
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    if (newlyCarved > 0) {
      const m2 = newlyCarved * cellSize * cellSize;
      this.carvedCountAccum += m2;
      if (this.carvedCountAccum >= 18) {
        const chunks = Math.floor(this.carvedCountAccum / 18);
        this.carvedCountAccum -= chunks * 18;
        this.onSnowCleared(chunks * 18, chunks);
      }
    }
  }

  _buildMoonSanctuaryAndObservatory() {
    // Unspoken Mystery at (0, 0): Silver Moon Ring etched in ice
    const ringGeo = new THREE.RingGeometry(4.2, 5.1, 40);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xaee8ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    this.moonRing = new THREE.Mesh(ringGeo, ringMat);
    this.moonRing.position.set(0, this._baseHeight(0, 0) + 0.48, 0);
    this.scene.add(this.moonRing);

    const crescentGeo = new THREE.TorusGeometry(1.5, 0.18, 12, 28, Math.PI * 1.45);
    const crescentMat = new THREE.MeshStandardMaterial({
      color: 0xfff0b5,
      emissive: 0xffd166,
      emissiveIntensity: 0.7,
    });
    this.moonTotem = new THREE.Mesh(crescentGeo, crescentMat);
    this.moonTotem.position.set(0, 2.4, 0);
    this.scene.add(this.moonTotem);

    // Great Northern Observatory Spire on the North Ridge (co-op household wonder!)
    this.observatoryGroup = new THREE.Group();
    const obsZ = -60;
    const obsY = this._baseHeight(0, obsZ);
    this.observatoryGroup.position.set(0, obsY, obsZ);

    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 7.2, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x1d3554, roughness: 0.4, metalness: 0.3 })
    );
    baseMesh.position.y = 3;
    this.observatoryGroup.add(baseMesh);

    const spireMesh = new THREE.Mesh(
      new THREE.ConeGeometry(3.8, 16, 8),
      new THREE.MeshStandardMaterial({ color: 0x2d537d, roughness: 0.25, metalness: 0.45 })
    );
    spireMesh.position.y = 14;
    this.observatoryGroup.add(spireMesh);

    this.observatoryRings = [];
    for (let t = 0; t < 6; t++) {
      const rMesh = new THREE.Mesh(
        new THREE.TorusGeometry(4.6 - t * 0.42, 0.22, 10, 28),
        new THREE.MeshStandardMaterial({
          color: 0xffd166,
          emissive: 0x3bf0c5,
          emissiveIntensity: 0.15,
        })
      );
      rMesh.position.y = 5.5 + t * 2.7;
      rMesh.rotation.x = Math.PI / 2;
      this.observatoryGroup.add(rMesh);
      this.observatoryRings.push(rMesh);
    }
    this.scene.add(this.observatoryGroup);
  }

  setObservatoryTier(tier = 1) {
    this.rigState.observatoryTier = tier;
    if (!this.observatoryRings) return;
    this.observatoryRings.forEach((ring, idx) => {
      const lit = idx < tier;
      ring.material.color.setHex(lit ? 0xffd166 : 0x33506e);
      ring.material.emissive.setHex(lit ? 0x3bf0c5 : 0x102030);
      ring.material.emissiveIntensity = lit ? 0.95 : 0.1;
    });
  }

  _buildAlpinePines() {
    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.48, 2.2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b382a, roughness: 0.9 });
    const coneGeo1 = new THREE.ConeGeometry(2.3, 4.4, 7);
    const coneGeo2 = new THREE.ConeGeometry(1.75, 3.6, 7);
    const snowCapGeo = new THREE.ConeGeometry(1.8, 1.5, 7);
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x1f5c4e, roughness: 0.75 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xeef8ff, roughness: 0.5 });

    this.pines = [];
    for (let i = 0; i < 46; i++) {
      const angle = (i / 46) * Math.PI * 2 + (i % 3) * 0.08;
      const dist = 54 + (i % 4) * 5.2;
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;
      if (Math.abs(px) < 12 && pz < -46) continue; // Keep Northern Observatory vista clear!

      const tree = new THREE.Group();
      const s = 0.85 + (i % 5) * 0.14;
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.1;
      const c1 = new THREE.Mesh(coneGeo1, pineMat);
      c1.position.y = 3.6;
      const c2 = new THREE.Mesh(coneGeo2, pineMat);
      c2.position.y = 5.6;
      const cap = new THREE.Mesh(snowCapGeo, capMat);
      cap.position.y = 6.7;

      tree.add(trunk, c1, c2, cap);
      tree.scale.setScalar(s);
      tree.position.set(px, this._baseHeight(px, pz), pz);
      this.scene.add(tree);
      this.pines.push({ mesh: tree, phase: i * 0.7 });
    }
  }

  _buildSnowfallParticles() {
    const count = 260;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = Math.random() * 28 + 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.42,
      transparent: true,
      opacity: 0.72,
    });
    this.snowfall = new THREE.Points(geo, mat);
    this.scene.add(this.snowfall);
  }

  _buildSprayAndShardPools() {
    const sprayGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const sprayMat = new THREE.MeshStandardMaterial({ color: 0xf2fbff, roughness: 0.45 });
    this.sprayPool = [];
    for (let i = 0; i < 64; i++) {
      const m = new THREE.Mesh(sprayGeo, sprayMat);
      m.visible = false;
      this.scene.add(m);
      this.sprayPool.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0 });
    }

    const shardGeo = new THREE.OctahedronGeometry(0.42, 0);
    this.shardPool = [];
    for (let i = 0; i < 96; i++) {
      const m = new THREE.Mesh(
        shardGeo,
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0x45f0df : 0xffd166,
          emissive: i % 2 === 0 ? 0x1ea89c : 0xc98a18,
          emissiveIntensity: 0.65,
          roughness: 0.2,
        })
      );
      m.visible = false;
      this.scene.add(m);
      this.shardPool.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0 });
    }
  }

  _buildSkyWhale() {
    // Majestic translucent Aurora Sky-Whale that breaches across the sky on 3x Overdrive!
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x62f5e4,
      emissive: 0x2dd4bf,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.78,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(2.6, 9.5, 8, 16), mat);
    body.rotation.x = Math.PI / 2;
    const finL = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.28, 2.2), mat);
    finL.position.set(-3.6, -0.3, 1.2);
    finL.rotation.z = 0.28;
    const finR = finL.clone();
    finR.position.x = 3.6;
    finR.rotation.z = -0.28;
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 1.8), mat);
    fluke.position.set(0, 0.3, -6.4);
    g.add(body, finL, finR, fluke);
    g.visible = false;
    this.skyWhale = g;
    this.scene.add(g);
  }

  triggerSkyWhale() {
    this.whaleTimer = 11.0;
    if (this.skyWhale) this.skyWhale.visible = true;
    this.audio.playWhaleSong();
  }

  rebuildRig(chassisId = "terra_dozer", upgrades = []) {
    this.rigState.chassisId = chassisId;
    this.rigState.upgrades = [...upgrades];
    if (!this.scene) return;

    if (this.rigGroup) {
      this.scene.remove(this.rigGroup);
    }

    const spec = RIG_CHASSIS.find((c) => c.id === chassisId) || RIG_CHASSIS[0];
    const hasWide = upgrades.includes("wide_blade");
    const hasBoost = upgrades.includes("ion_boosters");
    const hasCrown = upgrades.includes("celestial_crown");
    const hasFox = upgrades.includes("spirit_fox");

    const g = new THREE.Group();
    this.rigWheels = [];

    const primaryColor = hasCrown ? 0xffd86b : spec.primaryHex;
    const bodyMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.32, metalness: 0.35 });
    const darkMat = new THREE.MeshStandardMaterial({ color: spec.secondaryHex, roughness: 0.55, metalness: 0.25 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: spec.glowHex,
      emissive: spec.glowHex,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });

    if (chassisId === "aurora_sled") {
      // Sarah's Sleek Aurora Crystal Hover-Skiff
      const hull = new THREE.Mesh(new THREE.ConeGeometry(1.35, 4.4, 6), bodyMat);
      hull.rotation.x = -Math.PI / 2;
      hull.position.set(0, 1.05, 0);
      g.add(hull);

      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(0.82, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xbaf7ff, emissive: 0x2ec4b6, emissiveIntensity: 0.35, roughness: 0.1 })
      );
      canopy.scale.set(0.9, 0.68, 1.45);
      canopy.position.set(0, 1.48, 0.25);
      g.add(canopy);

      // Swept crystal wings + levitating plasma skids
      const wingSpan = hasWide ? 4.8 : 3.5;
      const wings = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.16, 1.5), glowMat);
      wings.position.set(0, 0.85, 0.35);
      g.add(wings);

      for (const sx of [-1.25, 1.25]) {
        const skid = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 3.8), glowMat);
        skid.position.set(sx, 0.36, 0);
        g.add(skid);
      }

      // Crescent snow-parting wave prow
      const prowW = hasWide ? 4.5 : 3.1;
      const prow = new THREE.Mesh(new THREE.TorusGeometry(prowW * 0.42, 0.2, 10, 24, Math.PI), glowMat);
      prow.rotation.x = Math.PI / 2;
      prow.rotation.z = Math.PI;
      prow.position.set(0, 0.55, -1.55);
      g.add(prow);
    } else {
      // David's Chunky 6x6 Thermal Terra-Dozer
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.05, 3.6), bodyMat);
      chassis.position.set(0, 1.05, 0.2);
      g.add(chassis);

      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.05, 1.75), darkMat);
      cab.position.set(0, 1.95, 0.45);
      g.add(cab);

      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.26), glowMat);
      lightBar.position.set(0, 2.55, -0.35);
      g.add(lightBar);

      // 6 Heavy Chunky Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.48, 14);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x182232, roughness: 0.85 });
      for (const wx of [-1.25, 1.25]) {
        for (const wz of [-1.05, 0.2, 1.45]) {
          const w = new THREE.Mesh(wheelGeo, wheelMat);
          w.position.set(wx, 0.56, wz);
          g.add(w);
          this.rigWheels.push(w);
        }
      }

      // Angled Molten-Edge V-Plow Blade up front!
      const bladeW = (hasWide ? 4.7 : 3.2) * 0.55;
      const bladeGeo = new THREE.BoxGeometry(bladeW, 1.05, 0.28);
      const bladeL = new THREE.Mesh(bladeGeo, bodyMat);
      bladeL.position.set(-bladeW * 0.44, 0.68, -1.95);
      bladeL.rotation.y = 0.28;
      const bladeR = new THREE.Mesh(bladeGeo, bodyMat);
      bladeR.position.set(bladeW * 0.44, 0.68, -1.95);
      bladeR.rotation.y = -0.28;
      const magmaStrip = new THREE.Mesh(new THREE.BoxGeometry(bladeW * 1.85, 0.22, 0.34), glowMat);
      magmaStrip.position.set(0, 0.26, -2.02);
      g.add(bladeL, bladeR, magmaStrip);
    }

    if (hasBoost) {
      for (const tx of [-0.65, 0.65]) {
        const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.7, 10), glowMat);
        thruster.rotation.x = Math.PI / 2;
        thruster.position.set(tx, 0.95, 2.15);
        g.add(thruster);
      }
    }

    if (hasCrown) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 10, 24), glowMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, 3.05, 0.2);
      g.add(halo);
    }

    if (hasFox) {
      this.companionFox = this._createSpiritFoxMesh();
      this.companionFox.position.set(2.4, 0, 0.6);
      g.add(this.companionFox);
    } else {
      this.companionFox = null;
    }

    this.rigGroup = g;
    const groundY = this._baseHeight(this.rigState.x, this.rigState.z);
    this.rigGroup.position.set(this.rigState.x, groundY + 0.15, this.rigState.z);
    this.rigGroup.rotation.y = this.rigState.heading;
    this.scene.add(this.rigGroup);
  }

  _createSpiritFoxMesh() {
    const fox = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.4 });
    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x45f0df,
      emissive: 0x2ec4b6,
      emissiveIntensity: 0.65,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 1.05), whiteMat);
    body.position.y = 0.52;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.46, 0.52), whiteMat);
    head.position.set(0, 0.82, -0.52);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 4), cyanMat);
    earL.position.set(-0.16, 1.16, -0.5);
    const earR = earL.clone();
    earR.position.x = 0.16;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.85, 6), cyanMat);
    tail.rotation.x = -1.1;
    tail.position.set(0, 0.62, 0.78);
    fox.add(body, head, earL, earR, tail);
    return fox;
  }

  /**
   * Populates 3 glowing 3D encounters around the valley!
   */
  populateEncounters(encounters) {
    // Clear existing gate meshes
    for (const slot of this.gateSlots) {
      if (slot.group && this.scene) this.scene.remove(slot.group);
    }
    this.gateSlots = [];
    this.activeGateSlot = null;

    const coords = [
      { x: 0, z: -8, rotY: 0 },
      { x: -26, z: -26, rotY: 0.42 },
      { x: 26, z: -24, rotY: -0.42 },
    ];

    encounters.slice(0, 3).forEach((enc, idx) => {
      const pos = coords[idx % coords.length];
      const slot = {
        index: idx,
        encounter: enc,
        x: pos.x,
        z: pos.z,
        y: this._baseHeight(pos.x, pos.z),
        rotY: pos.rotY,
        cleared: false,
        group: null,
      };
      if (this.scene) {
        slot.group = this._buildEncounter3DGroup(slot);
        this.scene.add(slot.group);
      }
      this.gateSlots.push(slot);
    });
  }

  refreshActiveEncounterVisual(updatedEncounter) {
    if (!this.activeGateSlot) return;
    this.activeGateSlot.encounter = updatedEncounter;
    if (!this.scene) return;
    if (this.activeGateSlot.group) this.scene.remove(this.activeGateSlot.group);
    this.activeGateSlot.group = this._buildEncounter3DGroup(this.activeGateSlot);
    this.scene.add(this.activeGateSlot.group);
    this.updateDialPreview(this.dialPreviewValue);
  }

  _buildEncounter3DGroup(slot) {
    const enc = slot.encounter;
    const g = new THREE.Group();
    g.position.set(slot.x, slot.y, slot.z);
    g.rotation.y = slot.rotY;

    // Glowing Approach Pad Ring on the snow
    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(5.6, 6.4, 36),
      new THREE.MeshBasicMaterial({ color: 0x3bf0c5, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(0, 0.52, 6.5);
    g.add(padRing);

    // Tall Beacon Light Pillar so you can see every gate across the valley
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.55, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: enc.encounterType === "holo_ramp" || enc.encounterType === "rainbow_arch" ? 0xffd166 : 0x45f0df,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beacon.position.set(0, 13, 0);
    g.add(beacon);

    if (enc.encounterType === "holo_ramp" || enc.encounterType === "rainbow_arch") {
      this._populateRampOrArchMesh(g, enc, slot);
    } else if (enc.encounterType === "astrolabe_shrine") {
      this._populateAstrolabeMesh(g, enc, slot);
    } else if (enc.encounterType === "harpoon_cliff") {
      this._populateHarpoonCliffMesh(g, enc, slot);
    } else {
      this._populateCryoTowersMesh(g, enc, slot);
    }

    return g;
  }

  _populateCryoTowersMesh(g, enc, slot) {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffcf56,
      emissive: 0xd98a16,
      emissiveIntensity: 0.55,
      roughness: 0.25,
    });
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x48b8ff,
      emissive: 0x1665c1,
      emissiveIntensity: 0.55,
      roughness: 0.2,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x45f0df,
      emissive: 0x1cb5a3,
      emissiveIntensity: 0.85,
      roughness: 0.15,
    });

    const towers = enc.towers || { leftA: 1, leftB: 4, rightA: 0, rightB: 10 };
    const buildStack = (xPos, varCount, constVal) => {
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.9, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x1d3554, roughness: 0.5 })
      );
      ped.position.set(xPos, 0.5, 0);
      g.add(ped);

      let curY = 1.25;
      const vVis = Math.min(6, Math.abs(varCount || 0));
      for (let i = 0; i < vVis; i++) {
        const oct = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), varCount < 0 ? iceMat : coreMat);
        oct.position.set(xPos, curY + i * 1.15, 0);
        g.add(oct);
      }
      curY += vVis * 1.15;

      const cVis = Math.min(7, Math.max(1, Math.round(Math.abs(constVal || 0) / (Math.abs(constVal) >= 40 ? 25 : 3))));
      if (constVal !== 0) {
        for (let j = 0; j < cVis; j++) {
          const blk = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 1.15), constVal > 0 ? goldMat : iceMat);
          blk.position.set(xPos, curY + j * 0.82, 0);
          g.add(blk);
        }
      }
    };

    buildStack(-4.2, towers.leftA, towers.leftB);
    buildStack(4.2, towers.rightA, towers.rightB);

    // Translucent Cryo-Barrier Wall between the twin towers (shatters on hit!)
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 5.2, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0x7ceeff,
        emissive: 0x1f8ea8,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.62,
        roughness: 0.12,
      })
    );
    barrier.position.set(0, 3.0, 0);
    g.add(barrier);
    slot.barrierMesh = barrier;

    // Gold Caliper Bar for physical off-target height cue
    const caliper = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.22, 0.62),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    caliper.position.set(0, 3.0, 0.35);
    caliper.visible = false;
    g.add(caliper);
    slot.caliperMesh = caliper;
  }

  _populateRampOrArchMesh(g, enc, slot) {
    // Launch emitter pad + 15% Near-Field Tangent Stub (Adversarial Anti-Scrub Rule!)
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.5, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x1e3858, emissive: 0x164c6b, emissiveIntensity: 0.5 })
    );
    pad.position.set(0, 0.55, 2.5);
    g.add(pad);

    // 15% Near-Field Origin Tangent Stub (3 short neon chevrons right at the lip!)
    const stubGroup = new THREE.Group();
    stubGroup.position.set(0, 0.9, 0.2);
    for (let i = 0; i < 3; i++) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(3.4 - i * 0.35, 0.14, 0.72),
        new THREE.MeshBasicMaterial({
          color: 0x45f0df,
          transparent: true,
          opacity: 0.88 - i * 0.22,
        })
      );
      strip.position.set(0, 0, -i * 1.05);
      stubGroup.add(strip);
    }
    g.add(stubGroup);
    slot.tangentStub = stubGroup;

    // Target Spinning Gold Crystal Ring suspended across chasm!
    const ringH = enc.encounterType === "rainbow_arch" ? 7.2 : 6.2;
    const targetRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.28, 12, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xf4a62a,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      })
    );
    targetRing.position.set(0, ringH, -13.5);
    g.add(targetRing);
    slot.targetRing = targetRing;

    // Extruded Full 3D Curve Bridge (HIDDEN until Commit Launch — strict Anti-Scrub!)
    const curveGroup = new THREE.Group();
    curveGroup.visible = false;
    for (let s = 0; s < 16; s++) {
      const t = s / 15;
      const zPos = -t * 16.5;
      const yPos =
        enc.encounterType === "rainbow_arch"
          ? 0.9 + Math.sin(t * Math.PI) * (ringH + 1.1)
          : 0.9 + t * ringH;
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.18, 1.15),
        new THREE.MeshBasicMaterial({
          color: enc.encounterType === "rainbow_arch" ? 0xffb36b : 0x45f0df,
          transparent: true,
          opacity: 0.78,
        })
      );
      seg.position.set(0, yPos, zPos);
      curveGroup.add(seg);
    }
    g.add(curveGroup);
    slot.extrudedBridge = curveGroup;
  }

  _populateAstrolabeMesh(g, enc, slot) {
    // Giant Rotating 3D Brass & Starlight Astrolabe Gimbal Rings!
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf5c451,
      emissive: 0x9e6f14,
      emissiveIntensity: 0.45,
      metalness: 0.65,
      roughness: 0.25,
    });
    const starMat = new THREE.MeshStandardMaterial({
      color: 0x5ce1e6,
      emissive: 0x2ec4b6,
      emissiveIntensity: 0.8,
    });

    const outer = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.24, 12, 40), brassMat);
    outer.position.set(0, 5.2, 0);
    const mid = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.2, 12, 36), brassMat);
    mid.position.set(0, 5.2, 0);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.18, 10, 32), starMat);
    inner.position.set(0, 5.2, 0);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), starMat);
    core.position.set(0, 5.2, 0);

    g.add(outer, mid, inner, core);
    slot.astrolabeRings = { outer, mid, inner, core };
  }

  _populateHarpoonCliffMesh(g, enc, slot) {
    // Sheer Crystal Glacier Spire + Golden Anchor Ring at Summit
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 12.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x2b5d8c, roughness: 0.3, metalness: 0.25 })
    );
    spire.position.set(0, 6.25, -3.5);
    g.add(spire);

    const anchor = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.24, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xf4a62a, emissiveIntensity: 0.9 })
    );
    anchor.position.set(0, 12.2, -3.5);
    g.add(anchor);
    slot.harpoonAnchor = anchor;
  }

  /**
   * Updates ONLY the Near-Field Tangent Stub / Astrolabe gimbal tilt when player dials!
   * Strictly obeys Anti-Scrub: never draws the full chasm trajectory prior to commit.
   */
  updateDialPreview(val) {
    this.dialPreviewValue = Number(val) || 0;
    const slot = this.activeGateSlot;
    if (!slot) return;

    if (slot.tangentStub) {
      const clampedAngle = Math.max(-0.65, Math.min(0.75, this.dialPreviewValue * 0.14));
      slot.tangentStub.rotation.x = clampedAngle;
    }
    if (slot.astrolabeRings) {
      const rad = (this.dialPreviewValue * Math.PI) / 180;
      slot.astrolabeRings.mid.rotation.z = rad;
      slot.astrolabeRings.inner.rotation.y = rad * 1.3;
    }
  }

  /**
   * Steers rig automatically to the nearest uncleared 3D encounter!
   */
  engageAutopilotToNextGate() {
    const openSlots = this.gateSlots.filter((s) => !s.cleared);
    if (!openSlots.length) return null;
    let best = openSlots[0];
    let bestD = Infinity;
    for (const s of openSlots) {
      const approachX = s.x + Math.sin(s.rotY) * 6.5;
      const approachZ = s.z + Math.cos(s.rotY) * 6.5;
      const d = Math.hypot(approachX - this.rigState.x, approachZ - this.rigState.z);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    this.autopilotTarget = {
      x: best.x + Math.sin(best.rotY) * 6.2,
      z: best.z + Math.cos(best.rotY) * 6.2,
      slot: best,
    };
    return best;
  }

  setDriveInputs(steer, throttle, boosting = false) {
    if (Math.abs(steer) > 0.05 || Math.abs(throttle) > 0.05) {
      this.autopilotTarget = null; // Manual thumbstick/keys immediately take control!
    }
    this.rigState.steerInput = Math.max(-1, Math.min(1, steer));
    this.rigState.throttleInput = Math.max(-1, Math.min(1, throttle));
    this.rigState.boosting = Boolean(boosting);
  }

  /**
   * Fires Twin Cyan/Gold Headlight Beams into both 3D Cryo-Towers on a symmetric step!
   */
  playTwinBeamVisual(isRepel = false) {
    const slot = this.activeGateSlot;
    if (!slot || !this.scene) return;
    const color = isRepel ? 0xffae42 : 0x45f0df;

    for (const offset of [-3.8, 3.8]) {
      const start = new THREE.Vector3(this.rigState.x, this.rigState.y + 1.3, this.rigState.z);
      const end = new THREE.Vector3(slot.x + offset * Math.cos(slot.rotY), slot.y + 3.2, slot.z - offset * Math.sin(slot.rotY));
      const dist = start.distanceTo(end);
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, dist, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
      );
      cyl.position.copy(start).lerp(end, 0.5);
      cyl.lookAt(end);
      cyl.rotateX(Math.PI / 2);
      this.scene.add(cyl);
      this.laserBeams.push({ mesh: cyl, life: 0.36 });
    }

    if (isRepel) {
      this._spawnCrystalBurst(slot.x, slot.y + 3.2, slot.z, 18);
    }
  }

  /**
   * Plays physical 3D commit consequence:
   * - clear -> Ram shatter / Surf extruded 3D ramp / Fire golden harpoon + wake Fox!
   * - nudge -> Physical 3D Ice-Jack / Δy Caliper offset!
   * - warm_reveal -> Friendly Spirit-Fox bounds in with glowing golden shards!
   */
  playCommitVisual(result) {
    const slot = this.activeGateSlot;
    if (!slot) return;

    if (result.outcome === "clear" || result.outcome === "warm_reveal") {
      slot.cleared = true;
      const enc = slot.encounter;

      if (slot.extrudedBridge) {
        slot.extrudedBridge.visible = true;
        // Surf the rig physically along the extruded 3D Holo-Ramp / Rainbow Arch!
        this.rigAnim = {
          kind: "surf_ramp",
          t: 0,
          dur: 1.15,
          startX: this.rigState.x,
          startZ: this.rigState.z,
          slot,
          peakH: enc.encounterType === "rainbow_arch" ? 8.0 : 6.4,
        };
      } else {
        // Surge rig through the Cryo-Gate / Shrine and shatter barrier into 3D shards!
        if (slot.barrierMesh) slot.barrierMesh.visible = false;
        this._spawnCrystalBurst(slot.x, slot.y + 3.0, slot.z, result.overdrive ? 72 : 42);
        this.rigAnim = {
          kind: "ram_surge",
          t: 0,
          dur: 0.65,
          startX: this.rigState.x,
          startZ: this.rigState.z,
          endX: slot.x - Math.sin(slot.rotY) * 3.5,
          endZ: slot.z - Math.cos(slot.rotY) * 3.5,
        };
      }

      if (this.scene) {
        const fox = this._createSpiritFoxMesh();
        fox.position.set(slot.x + 2.6, slot.y, slot.z + 1.8);
        this.scene.add(fox);
        this.wokenFoxes.push({ mesh: fox, baseY: slot.y, phase: Math.random() * 6 });
      }
      return;
    }

    // Nudge path: deterministic 3D physical caliper offset!
    if (slot.caliperMesh) {
      slot.caliperMesh.visible = true;
      const offsetClamped = Math.max(-2.2, Math.min(2.6, (result.delta || 1) * 0.18));
      slot.caliperMesh.position.y = 3.0 + offsetClamped;
    }
    this.rigAnim = {
      kind: "recoil_jack",
      t: 0,
      dur: 0.48,
      baseY: this.rigState.y,
      deltaSign: (result.delta || 1) >= 0 ? 1 : -1,
    };
  }

  _spawnCrystalBurst(cx, cy, cz, count = 48) {
    if (!this.shardPool) return;
    let spawned = 0;
    for (const p of this.shardPool) {
      if (p.life > 0) continue;
      p.life = 1.1 + Math.random() * 0.45;
      p.mesh.visible = true;
      p.mesh.position.set(cx + (Math.random() - 0.5) * 3.2, cy + (Math.random() - 0.5) * 2.2, cz + (Math.random() - 0.5) * 1.2);
      const ang = Math.random() * Math.PI * 2;
      const spd = 5 + Math.random() * 11;
      p.vx = Math.cos(ang) * spd;
      p.vy = 4 + Math.random() * 9;
      p.vz = Math.sin(ang) * spd;
      spawned += 1;
      if (spawned >= count) break;
    }
  }

  _spawnSnowSpray(lx, ly, lz, intensity) {
    if (!this.sprayPool) return;
    for (const s of this.sprayPool) {
      if (s.life > 0) continue;
      s.life = 0.48 + Math.random() * 0.25;
      s.mesh.visible = true;
      s.mesh.position.set(lx, ly + 0.35, lz);
      s.vx = (Math.random() - 0.5) * 6 * intensity;
      s.vy = 2.8 + Math.random() * 4.2 * intensity;
      s.vz = (Math.random() - 0.5) * 6 * intensity;
      break;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta();
    const tick = () => {
      if (!this.running) return;
      const dt = Math.min(0.05, this.clock.getDelta());
      this._update(dt);
      if (this.webglAvailable && this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    this.audio.stopHum();
  }

  _update(dt) {
    const elapsed = this.clock.elapsedTime;
    const spec = RIG_CHASSIS.find((c) => c.id === this.rigState.chassisId) || RIG_CHASSIS[0];
    const hasWide = this.rigState.upgrades.includes("wide_blade");
    const hasBoost = this.rigState.upgrades.includes("ion_boosters");

    // 1. Update Rig Motion (either special commit animation or smooth driving)
    if (this.rigAnim) {
      this.rigAnim.t += dt;
      const p = Math.min(1, this.rigAnim.t / this.rigAnim.dur);

      if (this.rigAnim.kind === "surf_ramp") {
        const { slot, startX, startZ, peakH } = this.rigAnim;
        const endX = slot.x - Math.sin(slot.rotY) * 15;
        const endZ = slot.z - Math.cos(slot.rotY) * 15;
        this.rigState.x = startX + (endX - startX) * p;
        this.rigState.z = startZ + (endZ - startZ) * p;
        const ground = this._baseHeight(this.rigState.x, this.rigState.z);
        this.rigState.y = ground + Math.sin(p * Math.PI) * peakH;
        if (p >= 0.52 && p <= 0.62) {
          this._spawnCrystalBurst(this.rigState.x, this.rigState.y + 1, this.rigState.z, 16);
        }
      } else if (this.rigAnim.kind === "ram_surge") {
        this.rigState.x = this.rigAnim.startX + (this.rigAnim.endX - this.rigAnim.startX) * p;
        this.rigState.z = this.rigAnim.startZ + (this.rigAnim.endZ - this.rigAnim.startZ) * p;
        this.rigState.y = this._baseHeight(this.rigState.x, this.rigState.z) + 0.15;
      } else if (this.rigAnim.kind === "recoil_jack") {
        const lift = Math.sin(p * Math.PI) * 1.35 * this.rigAnim.deltaSign;
        this.rigState.y = this._baseHeight(this.rigState.x, this.rigState.z) + Math.max(0, 0.25 + lift);
      }

      if (p >= 1) {
        this.rigAnim = null;
      }
    } else {
      let steer = this.rigState.steerInput;
      let throttle = this.rigState.throttleInput;
      let boostMul = this.rigState.boosting || this.rigState.inSurge ? 1.32 : 1.0;

      if (this.autopilotTarget) {
        const dx = this.autopilotTarget.x - this.rigState.x;
        const dz = this.autopilotTarget.z - this.rigState.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.2) {
          this.rigState.heading = this.autopilotTarget.slot.rotY + Math.PI;
          this.rigState.speed = 0;
          this.autopilotTarget = null;
          throttle = 0;
        } else {
          // Forward vector for heading h in Three.js rig space is (-sin(h), -cos(h))
          const desiredHeading = Math.atan2(-dx, -dz);
          let diff = desiredHeading - this.rigState.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          steer = Math.max(-1, Math.min(1, diff * 1.9));
          throttle = dist > 7 ? 1.0 : 0.55;
          boostMul = 1.2;
        }
      }

      const maxSpd = spec.topSpeed * (hasBoost ? 1.28 : 1.0) * boostMul;
      const targetSpd = throttle * maxSpd;
      const accel = Math.abs(targetSpd) > Math.abs(this.rigState.speed) ? 6.5 : 8.5;
      this.rigState.speed += (targetSpd - this.rigState.speed) * Math.min(1, accel * dt);

      if (Math.abs(this.rigState.speed) > 0.25) {
        const dirSign = this.rigState.speed >= 0 ? 1 : -1;
        this.rigState.heading -= steer * spec.turnRate * dt * dirSign;
      }

      const fwdX = -Math.sin(this.rigState.heading);
      const fwdZ = -Math.cos(this.rigState.heading);
      this.rigState.x += fwdX * this.rigState.speed * dt;
      this.rigState.z += fwdZ * this.rigState.speed * dt;

      // Soft valley boundary cushion
      const radial = Math.hypot(this.rigState.x, this.rigState.z);
      if (radial > 52) {
        const pull = 52 / radial;
        this.rigState.x *= pull;
        this.rigState.z *= pull;
        this.rigState.speed *= 0.6;
      }

      const hoverBob = this.rigState.chassisId === "aurora_sled" ? Math.sin(elapsed * 4.5) * 0.12 + 0.18 : 0.14;
      this.rigState.y = this._baseHeight(this.rigState.x, this.rigState.z) + hoverBob;

      // Carve deformable snow + spray snow chunks off the plow blade!
      if (Math.abs(this.rigState.speed) > 1.1) {
        const plowX = this.rigState.x + fwdX * 1.9;
        const plowZ = this.rigState.z + fwdZ * 1.9;
        const carveRadius = spec.plowWidth * (hasWide ? 1.5 : 1.0) * 0.62;
        this._carveSnowAt(plowX, plowZ, carveRadius);

        if (Math.random() < 0.7) {
          const sideX = Math.cos(this.rigState.heading) * (Math.random() < 0.5 ? -1.6 : 1.6);
          const sideZ = -Math.sin(this.rigState.heading) * (Math.random() < 0.5 ? -1.6 : 1.6);
          this._spawnSnowSpray(plowX + sideX, this.rigState.y, plowZ + sideZ, Math.abs(this.rigState.speed) / maxSpd);
        }
      }

      this.audio.updateRigHum(Math.abs(this.rigState.speed) / maxSpd, this.rigState.chassisId);
    }

    if (this.rigGroup) {
      this.rigGroup.position.set(this.rigState.x, this.rigState.y, this.rigState.z);
      this.rigGroup.rotation.y = this.rigState.heading;
      for (const w of this.rigWheels || []) {
        w.rotation.x -= this.rigState.speed * dt * 1.4;
      }
      if (this.companionFox) {
        this.companionFox.position.y = Math.abs(Math.sin(elapsed * 7.5)) * 0.35;
      }
    }

    // 2. Check Unspoken Moon-in-the-Middle Mystery at (0, 0)
    if (Math.hypot(this.rigState.x, this.rigState.z) < 4.6 && Math.abs(this.rigState.speed) < 2.5) {
      this.moonDwellSec += dt;
      if (this.moonDwellSec > 1.4) {
        this.onMysteryFound("moon_center");
      }
    } else {
      this.moonDwellSec = 0;
    }

    // 3. Check proximity to 3D Encounter Gates
    let nearest = null;
    let nearestDist = Infinity;
    for (const slot of this.gateSlots) {
      if (slot.cleared) continue;
      const appX = slot.x + Math.sin(slot.rotY) * 6.0;
      const appZ = slot.z + Math.cos(slot.rotY) * 6.0;
      const d = Math.hypot(appX - this.rigState.x, appZ - this.rigState.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = slot;
      }
      if (slot.targetRing) slot.targetRing.rotation.y += dt * 1.3;
      if (slot.astrolabeRings) slot.astrolabeRings.core.rotation.y += dt * 1.8;
    }

    if (nearest && nearestDist < 9.2) {
      if (this.activeGateSlot !== nearest) {
        this.activeGateSlot = nearest;
        this.onApproachGate(nearest.encounter, nearest);
      }
    } else if (this.activeGateSlot && nearestDist > 12.0 && !this.rigAnim) {
      this.activeGateSlot = null;
      this.onLeaveGate();
    }

    // 4. Smooth Chase Camera (frames gate tower overhead when in Approach Zone!)
    if (this.camera) {
      const fwdX = -Math.sin(this.rigState.heading);
      const fwdZ = -Math.cos(this.rigState.heading);
      let desiredCamX = this.rigState.x - fwdX * 13.5;
      let desiredCamZ = this.rigState.z - fwdZ * 13.5;
      let desiredCamY = this.rigState.y + 7.2;
      let lookX = this.rigState.x + fwdX * 6.0;
      let lookY = this.rigState.y + 2.1;
      let lookZ = this.rigState.z + fwdZ * 6.0;

      if (this.activeGateSlot) {
        const s = this.activeGateSlot;
        desiredCamX = this.rigState.x - fwdX * 11.5 + Math.cos(this.rigState.heading) * 2.2;
        desiredCamY = this.rigState.y + 6.6;
        desiredCamZ = this.rigState.z - fwdZ * 11.5;
        lookX = (this.rigState.x + s.x) * 0.5;
        lookY = s.y + 3.6;
        lookZ = (this.rigState.z + s.z) * 0.5;
      }

      this.camera.position.lerp(new THREE.Vector3(desiredCamX, desiredCamY, desiredCamZ), Math.min(1, dt * 4.8));
      this.camera.lookAt(lookX, lookY, lookZ);
    }

    // 5. Animate Aurora, Snowfall, Particles, Lasers, Foxes & Sky-Whale
    if (this.moonTotem) this.moonTotem.rotation.y = elapsed * 0.8;

    for (const r of this.auroraRibbons || []) {
      const pAttr = r.geo.attributes.position;
      for (let i = 0; i < pAttr.count; i++) {
        const x = pAttr.getX(i);
        pAttr.setZ(i, Math.sin(x * 0.045 + elapsed * 0.9 + r.phase) * 4.5);
      }
      pAttr.needsUpdate = true;
    }

    if (this.snowfall) {
      const sp = this.snowfall.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) {
        let y = sp.getY(i) - dt * 2.6;
        if (y < 0.5) y = 28;
        sp.setY(i, y);
      }
      sp.needsUpdate = true;
    }

    for (const p of [...(this.sprayPool || []), ...(this.shardPool || [])]) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.vy -= 18 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.2, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 4;
      p.mesh.rotation.y += dt * 5;
    }

    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const b = this.laserBeams[i];
      b.life -= dt;
      b.mesh.material.opacity = Math.max(0, b.life * 2.5);
      if (b.life <= 0) {
        if (this.scene) this.scene.remove(b.mesh);
        this.laserBeams.splice(i, 1);
      }
    }

    for (const f of this.wokenFoxes) {
      f.mesh.position.y = f.baseY + Math.abs(Math.sin(elapsed * 5 + f.phase)) * 0.55;
      f.mesh.rotation.y += dt * 1.4;
    }

    if (this.whaleTimer > 0 && this.skyWhale) {
      this.whaleTimer -= dt;
      const u = 1 - this.whaleTimer / 11.0;
      this.skyWhale.position.set(-55 + u * 110, 26 + Math.sin(u * Math.PI) * 14, -36);
      this.skyWhale.rotation.y = Math.PI / 2;
      this.skyWhale.rotation.x = -Math.cos(u * Math.PI) * 0.32;
      if (this.whaleTimer <= 0) this.skyWhale.visible = false;
    }
  }
}
