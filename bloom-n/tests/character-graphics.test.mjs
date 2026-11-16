import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHARACTER_PORTRAIT_PATHS,
  getCharacterToonGradient,
  loadCharacterSpriteTexture,
  buildCharacterEmblemSprite,
  getCharacterFaceTexture,
  getCustomSurfaceTexture,
  getCreatureSkinTexture,
  buildExplorerPilot3D,
  animateExplorerPilot3D,
  buildSpiritFox3D,
  buildSkyWhale3D,
  buildBrambleBoarMount3D,
  buildSanctuaryCreature3D,
  buildGuardianColossus3D,
  createSlimeDropletGeometry,
  createDirigibleHullGeometry,
} from "../core/character-graphics-3d.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOOM_N_DIR = path.resolve(__dirname, "..");

function countMeshesAndGeometries(root) {
  let meshCount = 0;
  const geoTypes = new Set();
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      meshCount += 1;
      geoTypes.add(obj.geometry.type || obj.geometry.constructor?.name || "BufferGeometry");
    }
  });
  return { meshCount, geoTypes: [...geoTypes] };
}

test("All custom character portrait PNG assets exist locally, are valid RGBA PNGs, and have zero external URLs", () => {
  const entries = Object.entries(CHARACTER_PORTRAIT_PATHS);
  assert.ok(entries.length >= 18, "Expected at least 18 mapped character portrait entries");

  for (const [key, relPath] of entries) {
    assert.ok(!/^https?:\/\//i.test(relPath), `Portrait ${key} must be local, got ${relPath}`);
    const fullPath = path.resolve(BLOOM_N_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `Missing character sprite on disk for ${key}: ${fullPath}`);
    const buf = fs.readFileSync(fullPath);
    assert.ok(buf.length > 2048, `Character sprite ${key} should be a non-trivial illustrated PNG`);
    // Verify PNG magic signature (89 50 4E 47 0D 0A 1A 0A) and IHDR colorType = 6 (RGBA)
    assert.equal(buf[0], 0x89);
    assert.equal(buf[1], 0x50);
    assert.equal(buf[2], 0x4e);
    assert.equal(buf[3], 0x47);
    const colorType = buf[25];
    assert.equal(colorType, 6, `Character sprite ${key} (${relPath}) must have RGBA alpha channel (colorType 6)`);
  }

  const src = fs.readFileSync(path.join(BLOOM_N_DIR, "core", "character-graphics-3d.js"), "utf8");
  assert.ok(!/https?:\/\//i.test(src), "character-graphics-3d.js must remain 100% offline/vendored");
});

test("Headless Node procedural painted textures & emblem sprites build cleanly without DOM canvas", () => {
  const grad = getCharacterToonGradient();
  assert.ok(grad && grad.isTexture);

  for (const style of ["arctic_engineer", "aurora_rider", "alchemist", "siegesmith", "chrono_tactician", "partner"]) {
    const tex = getCharacterFaceTexture(style);
    assert.ok(tex && tex.isTexture, `Face texture missing for ${style}`);
  }

  for (const theme of ["alchemist_robe", "butterfly_wing", "frostwake_hull", "aurora_wing", "bastion_brass_plate", "sapphire_filigree"]) {
    const tex = getCustomSurfaceTexture(theme);
    assert.ok(tex && tex.isTexture, `Surface texture missing for ${theme}`);
  }

  for (const sp of ["fox", "toad", "whale", "boar", "stag"]) {
    const tex = getCreatureSkinTexture(sp);
    assert.ok(tex && tex.isTexture, `Skin texture missing for ${sp}`);
  }

  const spriteTex = loadCharacterSpriteTexture("starlight_glider");
  assert.ok(spriteTex && spriteTex.isTexture);
  const emblem = buildCharacterEmblemSprite("crystal_fox", { scale: 1.5 });
  assert.ok(emblem && emblem.isSprite);
});

test("Articulated 3D Explorer Pilots build non-primitive sculpted meshes & animate smoothly across all roles", () => {
  const roles = [
    "arctic_engineer",
    "aurora_rider",
    "alchemist",
    "siegesmith",
    "chrono_tactician",
  ];

  for (const role of roles) {
    const pilot = buildExplorerPilot3D({
      role,
      seated: role !== "alchemist",
      includeWings: role === "alchemist",
      scale: 1.0,
    });
    assert.ok(pilot && pilot.isGroup, `Pilot group missing for ${role}`);
    const { meshCount, geoTypes } = countMeshesAndGeometries(pilot);
    assert.ok(meshCount >= 8, `Expected articulated multi-mesh character for ${role}, got ${meshCount}`);
    assert.ok(
      geoTypes.includes("LatheGeometry") || geoTypes.includes("ExtrudeGeometry") || geoTypes.includes("TubeGeometry"),
      `Expected sculpted Lathe/Extrude/Tube geometry on ${role}, got ${geoTypes.join(",")}`
    );

    animateExplorerPilot3D(pilot, 1.25, 0.85, 0.4, role === "alchemist");
    assert.ok(Number.isFinite(pilot.userData.animRefs.headPivot.rotation.y));
  }
});

test("Spirit Fox, Sky Whale, Bramble-Boar Mount, Sanctuary Menagerie, and Realm Guardians sculpt cleanly", () => {
  const fox = buildSpiritFox3D({ scale: 1.0 });
  assert.ok(countMeshesAndGeometries(fox).meshCount >= 9);
  assert.ok(fox.userData.head && fox.userData.tail);

  for (const theme of ["frostwake", "oddroot", "arc_bastion"]) {
    const whale = buildSkyWhale3D({ theme });
    assert.ok(countMeshesAndGeometries(whale).meshCount >= 6);
    assert.ok(whale.userData.fins.leftFin && whale.userData.fins.rightFin && whale.userData.fins.tailFluke);

    const guardian = buildGuardianColossus3D({ realm: theme });
    const gStats = countMeshesAndGeometries(guardian);
    assert.ok(gStats.meshCount >= 8, `Guardian for ${theme} should be richly sculpted`);
  }
  assert.ok(buildGuardianColossus3D({ realm: "frostwake" }).userData.core);
  assert.ok(buildGuardianColossus3D({ realm: "arc_bastion" }).userData.halo);

  const boar = buildBrambleBoarMount3D({ withRider: true });
  assert.ok(countMeshesAndGeometries(boar).meshCount >= 16);
  assert.equal(boar.userData.legs.length, 4);
  assert.ok(boar.userData.rider);

  for (const sp of ["zero_g_toad", "luminous_oddling", "eclipse_stag", "crystal_fox", "starlight_whale"]) {
    const c3 = buildSanctuaryCreature3D(sp, 3);
    assert.ok(countMeshesAndGeometries(c3).meshCount >= 6, `Creature ${sp} stage 3 should build sculpted meshes`);
  }

  const slimeGeo = createSlimeDropletGeometry(0.7);
  const hullGeo = createDirigibleHullGeometry(1.1, 2.5);
  assert.equal(slimeGeo.type, "LatheGeometry");
  assert.equal(hullGeo.type, "LatheGeometry");
});
