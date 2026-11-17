/**
 * Unit & Headless 3D Engine Verification for `v5.2`:
 * - Roblox-Style Follow, 360° Orbit & Pinch/Wheel Zoom Camera (`core/camera-rig-3d.js`)
 * - Slightly More Zoomed-Out Default View (`18.5m`–`18.8m`)
 * - Anti-Stuck-Zoom Gate Framing Guard & `dismissActiveEncounter()` Across All 3 Realms
 * - Phone Landscape Layout & Anti-AutoZoom Static CSS Audit
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_CAMERA_DISTANCE,
  MIN_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
  DEFAULT_CAMERA_PITCH,
  RobloxFollowCameraRig,
  bindCanvasCameraGestures,
} from "../core/camera-rig-3d.js";
import { generateEncounter } from "../core/engine.js";
import { FrostwakeWorld3D } from "../frostwake/frostwake-3d.js";
import { OddrootWorld3D } from "../oddroot/oddroot-3d.js";
import { BastionWorld3D } from "../bastion/bastion-3d.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOOM_N_DIR = path.resolve(__dirname, "..");

test("1. RobloxFollowCameraRig starts at a comfortable zoomed-out default (18.5m) and clamps zoom [8.5, 32.0]", () => {
  const rig = new RobloxFollowCameraRig();
  assert.equal(DEFAULT_CAMERA_DISTANCE, 18.5);
  assert.ok(rig.distance >= 18.0, "Default camera distance should be >= 18.0m (wider than legacy 13.5m)");
  assert.equal(rig.pitch, DEFAULT_CAMERA_PITCH);
  assert.equal(rig.yawOffset, 0);

  // Zoom in beyond minimum clamps to MIN_CAMERA_DISTANCE
  rig.zoomBy(-50);
  assert.equal(rig.targetDistance, MIN_CAMERA_DISTANCE);

  // Zoom out beyond maximum clamps to MAX_CAMERA_DISTANCE
  rig.zoomBy(100);
  assert.equal(rig.targetDistance, MAX_CAMERA_DISTANCE);

  // Multiplicative pinch scale clamps cleanly
  rig.setZoomDistance(18.5);
  rig.zoomScale(0.5);
  assert.ok(Math.abs(rig.targetDistance - 9.25) < 1e-6);

  rig.resetBehindRig({ immediate: true });
  assert.equal(rig.distance, DEFAULT_CAMERA_DISTANCE);
  assert.equal(rig.yawOffset, 0);
  assert.equal(rig.pitch, DEFAULT_CAMERA_PITCH);
});

test("2. RobloxFollowCameraRig supports 360° yaw orbit, clamped vertical pitch, Follow auto-recenter & terrain anti-clip", () => {
  const rig = new RobloxFollowCameraRig();
  rig.orbitBy(Math.PI * 1.25, 2.0);
  assert.ok(Math.abs(rig.targetYawOffset) <= Math.PI + 1e-6, "Yaw offset wraps cleanly within [-pi, pi]");
  assert.equal(rig.targetPitch, rig.maxPitch, "Pitch clamps to maxPitch");

  // Step while holding orbit timer -> yawOffset converges toward targetYawOffset, not 0
  for (let i = 0; i < 30; i++) {
    rig.step({ dt: 1 / 60, rigState: { x: 0, y: 0, z: 20, heading: 0, speed: 10, steerInput: 0.8 } });
  }
  assert.ok(Math.abs(rig.yawOffset) > 0.4, "Orbit hold timer preserves manual aim right after dragging");

  // Advance past 1.85s hold window while steering -> Roblox Follow gently aligns behind vehicle
  for (let i = 0; i < 240; i++) {
    rig.step({ dt: 1 / 30, rigState: { x: 0, y: 0, z: 20, heading: 0, speed: 10, steerInput: 0.9 } });
  }
  assert.ok(Math.abs(rig.targetYawOffset) < 0.05, "Follow mode gently recenters yaw behind steering rig");

  // Terrain floor anti-clip prevents camera from dipping underground
  rig.orbitBy(0, -2.0); // minPitch low horizon
  const pose = rig.step({
    dt: 0.05,
    rigState: { x: 0, y: 0, z: 0, heading: 0, speed: 0 },
    groundHeightAt: () => 25.0,
  });
  assert.ok(pose.posY >= 26.65 - 1e-6, "Camera Y never clips below groundHeight + 1.65m");
});

test("3. Gate framing ONLY activates when BOTH activeGateSlot AND encounterDockOpen are true, and never tighter than 16m", () => {
  const rig = new RobloxFollowCameraRig();
  const slot = { x: 0, y: 0, z: 12, rotY: 0 };

  // activeGateSlot truthy, encounterDockOpen FALSE -> MUST NOT frame gate!
  const freePose = rig.step({
    dt: 1 / 60,
    rigState: { x: 0, y: 0, z: 18, heading: 0, speed: 0 },
    activeGateSlot: slot,
    encounterDockOpen: false,
  });
  assert.equal(freePose.framingGate, false, "Camera must never lock onto gate when dock is closed");

  // Both activeGateSlot and encounterDockOpen TRUE -> frames gate cleanly at >= 16m
  rig.setZoomDistance(9.0);
  rig.resetBehindRig({ immediate: true });
  rig.setZoomDistance(9.0);
  for (let i = 0; i < 30; i++) {
    rig.step({
      dt: 1 / 30,
      rigState: { x: 0, y: 0, z: 18, heading: 0, speed: 0 },
      activeGateSlot: slot,
      encounterDockOpen: true,
    });
  }
  const gatePose = rig.step({
    dt: 1 / 30,
    rigState: { x: 0, y: 0, z: 18, heading: 0, speed: 0 },
    activeGateSlot: slot,
    encounterDockOpen: true,
  });
  assert.equal(gatePose.framingGate, true);
  const distToAnchor = Math.hypot(
    gatePose.posX - 0,
    gatePose.posY - 1.95,
    gatePose.posZ - (18 * 0.55 + 12 * 0.45)
  );
  assert.ok(distToAnchor >= 15.8, `Gate camera never zooms in tighter than ~16m (got ${distToAnchor.toFixed(2)}m)`);
});

test("4. bindCanvasCameraGestures handles pointer drag orbit, 2-finger pinch zoom, and wheel zoom cleanly", () => {
  const rig = new RobloxFollowCameraRig();
  const listeners = {};
  const mockCanvas = {
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
    removeEventListener(type) {
      delete listeners[type];
    },
  };

  const unbind = bindCanvasCameraGestures(mockCanvas, () => rig);

  // 1-finger / mouse drag orbits camera
  listeners.pointerdown({ pointerId: 1, pointerType: "touch", clientX: 200, clientY: 200 });
  assert.equal(rig.isDragging, true);
  listeners.pointermove({ pointerId: 1, pointerType: "touch", clientX: 260, clientY: 230 });
  assert.ok(rig.targetYawOffset < -0.2, "Dragging right rotates view right");
  assert.ok(rig.targetPitch > DEFAULT_CAMERA_PITCH, "Dragging down raises overhead pitch");

  // Add second finger & spread apart -> zooms in smoothly
  const beforePinch = rig.targetDistance;
  listeners.pointerdown({ pointerId: 2, pointerType: "touch", clientX: 360, clientY: 230 });
  listeners.pointermove({ pointerId: 2, pointerType: "touch", clientX: 460, clientY: 230 });
  assert.ok(rig.targetDistance < beforePinch, "Spreading 2 fingers zooms in");

  // Lift second finger -> stays smooth with zero NaN
  listeners.pointerup({ pointerId: 2 });
  assert.equal(rig.isDragging, true);
  listeners.pointerup({ pointerId: 1 });
  assert.equal(rig.isDragging, false);

  // Wheel scroll zooms out
  const beforeWheel = rig.targetDistance;
  let prevented = false;
  listeners.wheel({
    deltaMode: 0,
    deltaY: 120,
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.ok(rig.targetDistance > beforeWheel, "Wheel scroll down zooms out");

  unbind();
  assert.equal(Object.keys(listeners).length, 0);
});

test("5. All 3 3D engines support dismissActiveEncounter() without re-trapping and Frostwake clears activeGateSlot on clear", () => {
  const wave = [
    generateEncounter("W1.1"),
    generateEncounter("W1.2"),
    generateEncounter("W1.3"),
  ];

  // FrostwakeWorld3D
  let fwApproaches = 0;
  const fw = new FrostwakeWorld3D({
    canvas: null,
    onApproachGate: () => {
      fwApproaches++;
      fw.setEncounterDockOpen(true);
    },
  });
  fw.populateEncounters(wave);
  const fwSlot = fw.gateSlots[0];
  fw.rigState.x = fwSlot.x + Math.sin(fwSlot.rotY) * 6.0;
  fw.rigState.z = fwSlot.z + Math.cos(fwSlot.rotY) * 6.0;
  fw.step(1 / 60);
  assert.equal(fw.activeGateSlot, fwSlot, "Approaching Frostwake gate activates slot");
  assert.equal(fwApproaches, 1);

  // Dismiss while parked right at gate -> stays dismissed across frames!
  fw.dismissActiveEncounter();
  assert.equal(fw.activeGateSlot, null);
  assert.equal(fw.encounterDockOpen, false);
  for (let i = 0; i < 15; i++) fw.step(1 / 60);
  assert.equal(fw.activeGateSlot, null, "Dismissed Frostwake gate must NOT re-trap stationary player");
  assert.equal(fwApproaches, 1);

  // Engaging autopilot re-arms dismissed gate
  fw.engageAutopilotToNextGate();
  fw.step(1 / 60);
  assert.equal(fw.activeGateSlot, fwSlot, "Autopilot re-arms previously dismissed gate");

  // Clearing gate immediately releases activeGateSlot in Frostwake
  fw.playCommitVisual({ outcome: "clear", overdrive: true }, fwSlot.encounter);
  assert.equal(fw.activeGateSlot, null, "Frostwake playCommitVisual immediately releases activeGateSlot");

  // OddrootWorld3D
  let orApproaches = 0;
  const orWorld = new OddrootWorld3D({
    canvas: null,
    onApproachGate: () => {
      orApproaches++;
      orWorld.setEncounterDockOpen(true);
    },
  });
  orWorld.populateEncounters(wave);
  const orSlot = orWorld.gateSlots[0];
  orWorld.rigState.x = orSlot.x + Math.sin(orSlot.rotY) * 6.0;
  orWorld.rigState.z = orSlot.z + Math.cos(orSlot.rotY) * 6.0;
  orWorld.step(1 / 60);
  assert.equal(orWorld.activeGateSlot, orSlot);
  orWorld.dismissActiveEncounter();
  for (let i = 0; i < 15; i++) orWorld.step(1 / 60);
  assert.equal(orWorld.activeGateSlot, null, "Dismissed Oddroot shrine must NOT re-trap stationary player");
  assert.equal(orApproaches, 1);

  // BastionWorld3D
  let abApproaches = 0;
  const abWorld = new BastionWorld3D({
    canvas: null,
    onApproachGate: () => {
      abApproaches++;
      abWorld.setEncounterDockOpen(true);
    },
  });
  abWorld.populateEncounters(wave);
  const abSlot = abWorld.gateSlots[0];
  abWorld.rigState.x = abSlot.x + Math.sin(abSlot.rotY) * 5.0;
  abWorld.rigState.z = abSlot.z + Math.cos(abSlot.rotY) * 5.0;
  abWorld.step(1 / 60);
  assert.equal(abWorld.activeGateSlot, abSlot);
  abWorld.dismissActiveEncounter();
  for (let i = 0; i < 15; i++) abWorld.step(1 / 60);
  assert.equal(abWorld.activeGateSlot, null, "Dismissed Bastion battery must NOT re-trap stationary player");
  assert.equal(abApproaches, 1);
});

test("6. index.html & styles.css enforce phone landscape media query, safe-area insets, >=16px inputs, and dock close / camera HUD", () => {
  const html = fs.readFileSync(path.join(BLOOM_N_DIR, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(BLOOM_N_DIR, "styles.css"), "utf8");

  assert.ok(html.includes('id="btn-close-dock"'), "index.html includes Encounter Dock close button");
  assert.equal(
    (html.match(/class="cam-hud-cluster"/g) || []).length,
    3,
    "All 3 3D screens include peripheral camera zoom/center cluster"
  );
  assert.ok(
    css.includes("@media (max-height: 540px) and (orientation: landscape)"),
    "styles.css includes dedicated phone landscape layout media query"
  );
  assert.ok(css.includes("env(safe-area-inset-left)"), "styles.css honors horizontal safe-area insets");
  assert.ok(css.includes("font-size: max(16px, 1rem)"), "styles.css prevents iOS Safari <16px input auto-zoom");
});
