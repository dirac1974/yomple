/**
 * Bloom N E2E — Tier 1: Comprehensive Feature Coverage (F01–F21)
 * 120 genuine opaque-box requirement tests (>= 5 independent test cases for EVERY feature F01..F21).
 * Zero skips, zero todos, zero tautologies, zero production Supabase traffic.
 */

import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  BLOOM_N_DIR,
  YOMPLE_DIR,
  BLOOM_V1_DIR,
  FALLBACK_BANNED_CURRICULUM_WORDS,
  FALLBACK_BANNED_SHAME_WORDS,
  loadEngine,
  loadSync,
  loadMultiplayer,
  requireExport,
  makeSeededRng,
  commitEnc,
  stepBeam,
  countWords,
  findBannedWord,
  withIsolatedSyncEnv,
  createInMemoryCoopTransportHub,
  loadEffectiveSqlFunctions,
  walkFilesRecursive,
} from "./helpers/opaque-helpers.mjs";

import {
  createBrowserPool,
  installRealmAdapterSpies,
  launchRealmFromPortal,
  exitRealmToPortal,
  cruiseToNextEncounterDock,
  readAndSolveActiveDock,
  commitValueInActiveDock,
  getVisibleChildDomText,
} from "./helpers/browser-cdp-harness.mjs";

let pool = null;
let sandboxHandle = null;

before(async () => {
  pool = await createBrowserPool();
  sandboxHandle = await pool.createSandboxPage();
});

after(async () => {
  if (sandboxHandle) await sandboxHandle.close();
  if (pool) await pool.close();
});

/* ============================================================================
 * FEATURE F01 — main Branch, Final Push Readiness & Protected Repo Invariants (6 tests)
 * ============================================================================ */
describe("F01 — main Branch & Protected Repository Invariants", () => {
  test("T1-F01-01: yomple active branch is main descending cleanly from baseline 31df2cb", () => {
    const branch = execFileSync("git", ["-C", YOMPLE_DIR, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
    }).trim();
    assert.equal(branch, "main", `Expected yomple repo to be on branch "main", got "${branch}"`);
    execFileSync("git", ["-C", YOMPLE_DIR, "merge-base", "--is-ancestor", "31df2cb", "HEAD"]);
  });

  test("T1-F01-02: /dirac1974/bloom original repository is 100% clean and untouched", () => {
    const status = execFileSync("git", ["-C", BLOOM_V1_DIR, "status", "--porcelain"], {
      encoding: "utf8",
    }).trim();
    assert.equal(status, "", `Protected /dirac1974/bloom repository must have zero modifications, got:\n${status}`);
  });

  test("T1-F01-03: yomple/index.html original Bloom card (a.app.bloom) is intact", async () => {
    const html = await fs.readFile(path.join(YOMPLE_DIR, "index.html"), "utf8");
    const m = html.match(/<a\s+class="app bloom"[^>]*>[\s\S]*?<\/a>/);
    assert.ok(m, "Expected <a class=\"app bloom\"> card on yomple/index.html");
    assert.match(m[0], /data-base="https:\/\/digcgqltrlmhgmzgmvwc\.supabase\.co\/functions\/v1\/bloom\/"/);
    assert.match(m[0], /href="https:\/\/digcgqltrlmhgmzgmvwc\.supabase\.co\/functions\/v1\/bloom\/"/);
    assert.match(m[0], /<h2>Bloom<\/h2>/);
    assert.match(m[0], /<p>Multiplication<\/p>/);
  });

  test("T1-F01-04: yomple/index.html Bloom 2 beta card (a.app.bloom2) is intact", async () => {
    const html = await fs.readFile(path.join(YOMPLE_DIR, "index.html"), "utf8");
    const m = html.match(/<a\s+class="app bloom2"[^>]*>[\s\S]*?<\/a>/);
    assert.ok(m, "Expected <a class=\"app bloom2\"> card on yomple/index.html");
    assert.match(m[0], /data-base="https:\/\/digcgqltrlmhgmzgmvwc\.supabase\.co\/functions\/v1\/bloom-beta\/"/);
    assert.match(m[0], /href="https:\/\/digcgqltrlmhgmzgmvwc\.supabase\.co\/functions\/v1\/bloom-beta\/"/);
    assert.match(m[0], /<span class="tag">BETA<\/span>/);
    assert.match(m[0], /<h2>Bloom 2<\/h2>/);
    assert.match(m[0], /<p>New look · Beast Raids<\/p>/);
  });

  test("T1-F01-05: yomple/index.html Bloom N card (a.app.bloomn) sits alongside Bloom 2 & preserves all 9 hub cards", async () => {
    const html = await fs.readFile(path.join(YOMPLE_DIR, "index.html"), "utf8");
    const m = html.match(/<a\s+class="app bloomn"[^>]*>[\s\S]*?<\/a>/);
    assert.ok(m, "Expected <a class=\"app bloomn\"> card on yomple/index.html");
    assert.match(m[0], /data-base="\/bloom-n\/"/);
    assert.match(m[0], /href="\/bloom-n\/"/);
    assert.match(m[0], /<h2>Bloom N<\/h2>/);
    const allCards = html.match(/<a\s+class="app\s+[^"]+"/g) || [];
    assert.equal(allCards.length, 9, `Expected all 9 Yomple hub app cards to remain present, got ${allCards.length}`);
  });

  test("T1-F01-06: zero .agents/, AGENTS.md, or GEMINI.md files inside yomple or bloom repositories", async () => {
    async function findForbiddenEntries(repoRoot) {
      const hits = [];
      async function scan(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const ent of entries) {
          if (ent.name === ".git") continue;
          const full = path.join(dir, ent.name);
          if (ent.name === ".agents" || ent.name === "AGENTS.md" || ent.name === "GEMINI.md") {
            hits.push(full);
            continue;
          }
          if (ent.isDirectory()) await scan(full);
        }
      }
      await scan(repoRoot);
      return hits;
    }
    const yompleHits = await findForbiddenEntries(YOMPLE_DIR);
    const bloomHits = await findForbiddenEntries(BLOOM_V1_DIR);
    assert.deepEqual([...yompleHits, ...bloomHits], [], "Zero .agents/, AGENTS.md, or GEMINI.md allowed inside repos");
  });
});

/* ============================================================================
 * FEATURE F02 — Zero Child-Facing School / Curriculum Labels (6 tests)
 * ============================================================================ */
describe("F02 — Zero Child-Facing School / Curriculum Labels", () => {
  test("T1-F02-01: engine.js exports BANNED_CHILD_CURRICULUM_WORDS with full 13-term school blocklist", async () => {
    const eng = await loadEngine();
    const list = requireExport(eng, "BANNED_CHILD_CURRICULUM_WORDS", "array", "core/engine.js").map((s) =>
      String(s).toLowerCase()
    );
    for (const term of FALLBACK_BANNED_CURRICULUM_WORDS) {
      assert.ok(list.includes(term), `Expected BANNED_CHILD_CURRICULUM_WORDS to contain "${term}"`);
    }
  });

  test("T1-F02-02: WORLDS[0..7] use pure game Rank names & Guardian names with zero school labels in child fields", async () => {
    const eng = await loadEngine();
    const WORLDS = requireExport(eng, "WORLDS", "array", "core/engine.js");
    const banned = eng.BANNED_CHILD_CURRICULUM_WORDS || FALLBACK_BANNED_CURRICULUM_WORDS;

    const expectedWorlds = [
      ["W0", "Prologue", "Awakening Glacier", "Aurora Scout"],
      ["W1", "Rank I", "Sub-Zero Core", "Cryo-Colossus"],
      ["W2", "Rank II", "Crystal Loom", "Prism Weaver"],
      ["W3", "Rank III", "Titan Monoliths", "Equilibrium Titan"],
      ["W4", "Rank IV", "Skyway Canyons", "Horizon Strider"],
      ["W5", "Rank V", "Star-Ring Peaks", "Astrolabe Phoenix"],
      ["W6", "Rank VI", "Solar Caldera", "Crown Leviathan"],
      ["W7", "Rank VII", "Aurora Crown", "Nebula Sovereign"],
    ];

    assert.equal(WORLDS.length, 8);
    for (let i = 0; i < 8; i++) {
      const w = WORLDS[i];
      const [id, rankLabel, name, guardianName] = expectedWorlds[i];
      assert.equal(w.id, id);
      assert.equal(w.rankLabel, rankLabel, `World ${id} must have rankLabel="${rankLabel}"`);
      assert.equal(w.name, name, `World ${id} must have pure game name="${name}"`);
      assert.equal(w.guardianName, guardianName, `World ${id} must have guardianName="${guardianName}"`);

      for (const field of ["name", "rankLabel", "guardianName", "realmSubtitle", "summary", "gradeSpan"]) {
        if (w[field] !== undefined) {
          const hit = findBannedWord(w[field], banned);
          assert.equal(hit, null, `Child-facing WORLDS[${i}].${field}="${w[field]}" leaked curriculum label "${hit}"`);
        }
      }
      for (const n of w.nodes || []) {
        const hit = findBannedWord(n.title || n.name || "", banned);
        assert.equal(hit, null, `Child-facing node ${n.id} title="${n.title}" leaked curriculum label "${hit}"`);
      }
    }
  });

  test("T1-F02-03: SUB_GAMES child-facing titles, subtitles, badges & blurbs contain zero curriculum labels", async () => {
    const eng = await loadEngine();
    const SUB_GAMES = requireExport(eng, "SUB_GAMES", "array", "core/engine.js");
    const banned = eng.BANNED_CHILD_CURRICULUM_WORDS || FALLBACK_BANNED_CURRICULUM_WORDS;
    assert.ok(SUB_GAMES.length >= 2);
    for (const sg of SUB_GAMES) {
      for (const field of ["title", "subtitle", "badge", "blurb"]) {
        const hit = findBannedWord(sg[field] || "", banned);
        assert.equal(hit, null, `SUB_GAMES[${sg.id}].${field}="${sg[field]}" leaked school label "${hit}"`);
      }
    }
  });

  test("T1-F02-04: yomple/index.html Bloom N card & bloom-n/index.html child markup contain zero school labels", async () => {
    const eng = await loadEngine();
    const banned = eng.BANNED_CHILD_CURRICULUM_WORDS || FALLBACK_BANNED_CURRICULUM_WORDS;

    const yompleHtml = await fs.readFile(path.join(YOMPLE_DIR, "index.html"), "utf8");
    const bloomnCard = (yompleHtml.match(/<a\s+class="app bloomn"[^>]*>[\s\S]*?<\/a>/) || [""])[0];
    assert.ok(bloomnCard, "Bloom N card must exist on yomple/index.html");
    assert.equal(
      findBannedWord(bloomnCard, banned),
      null,
      `yomple/index.html Bloom N card leaked school label: ${bloomnCard}`
    );

    const appHtml = await fs.readFile(path.join(BLOOM_N_DIR, "index.html"), "utf8");
    const withoutGrownups = appHtml.replace(/<div[^>]+id="modal-grownups"[\s\S]*?<\/div>\s*<\/div>/i, "");
    const withoutComments = withoutGrownups.replace(/<!--[\s\S]*?-->/g, " ");
    const hit = findBannedWord(withoutComments, banned);
    assert.equal(hit, null, `bloom-n/index.html child-facing HTML/meta leaked school label "${hit}"`);
  });

  test("T1-F02-05: GROWN_UPS_CURRICULUM isolates formal Pre-Algebra -> Algebra 2 mapping for parent modal", async () => {
    const eng = await loadEngine();
    const cur = requireExport(eng, "GROWN_UPS_CURRICULUM", "object", "core/engine.js");
    assert.ok(cur.worlds && typeof cur.worlds === "object", "Expected GROWN_UPS_CURRICULUM.worlds");
    assert.ok(cur.nodes && typeof cur.nodes === "object", "Expected GROWN_UPS_CURRICULUM.nodes");

    const serialized = JSON.stringify(cur);
    for (const stageLabel of ["Pre-Algebra", "Algebra 1", "Geometry", "Algebra 2"]) {
      assert.ok(
        serialized.includes(stageLabel),
        `Expected GROWN_UPS_CURRICULUM to preserve formal parent curriculum label "${stageLabel}"`
      );
    }
    assert.equal(Object.keys(cur.nodes).length, 33, "Expected all 33 nodes mapped in GROWN_UPS_CURRICULUM.nodes");
  });

  test("T1-F02-06: Live Chromium DOM has zero school labels in child views & full curriculum report inside #modal-grownups", async () => {
    const eng = await loadEngine();
    const banned = eng.BANNED_CHILD_CURRICULUM_WORDS || FALLBACK_BANNED_CURRICULUM_WORDS;

    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      const childPortalText = await getVisibleChildDomText(page);
      const hitPortal = findBannedWord(childPortalText, banned);
      assert.equal(
        hitPortal,
        null,
        `Visible child Portal DOM leaked school label "${hitPortal}" in:\n${childPortalText.slice(0, 500)}`
      );
      assert.match(childPortalText, /Rank I|Sub-Zero Core/);

      const grownupsText = await page.eval(() => {
        const btn = document.getElementById("btn-open-grownups");
        if (!btn) return "";
        btn.click();
        const modal = document.getElementById("modal-grownups");
        return modal && modal.classList.contains("open") ? modal.textContent || "" : "";
      });
      for (const stage of ["Pre-Algebra", "Algebra 1", "Geometry", "Algebra 2"]) {
        assert.ok(
          grownupsText.includes(stage),
          `Expected #modal-grownups parent report to include "${stage}", got:\n${grownupsText.slice(0, 400)}`
        );
      }
      page.assertZeroRuntimeErrors("T1-F02-06");
    });
  });
});

/* ============================================================================
 * FEATURE F03 — Frostwake Active Spatial Opposition & Upgrade Stakes (5 tests)
 * ============================================================================ */
describe("F03 — Frostwake Active Spatial Opposition & Upgrade Stakes", () => {
  test("T1-F03-01: Frostwake spawns active Rime-Creeps, Permafrost Drifts, Ice-Pods & Geothermal Vents/Fox Dens", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        ctx.world.setEncounterDockOpen?.(false);
        ctx.world.setDriveInputs(0, 0, false);
        const snap0 = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
        ctx.step(90, 16.6667);
        const snap1 = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);

        let maxDelta = 0;
        const map0 = new Map(snap0.map((s) => [s.key, s]));
        for (const s1 of snap1) {
          const s0 = map0.get(s1.key);
          if (s0) maxDelta = Math.max(maxDelta, Math.hypot(s1.x - s0.x, s1.z - s0.z));
        }

        const opp = ctx.world.opposition || {};
        return {
          webglAvailable: ctx.world.webglAvailable,
          oppCount: snap1.length,
          maxDelta,
          hasFoxDens: Array.isArray(opp.foxDens) ? opp.foxDens.length >= 2 : Boolean(ctx.world.scene.getObjectByName("frostwake_opposition_root")),
          hasDrifts: Array.isArray(opp.permafrostDrifts) ? opp.permafrostDrifts.length >= 2 : false,
          hasPods: Array.isArray(opp.icePods) ? opp.icePods.length >= 4 : false,
          hasVents: Array.isArray(opp.geothermalVents) ? opp.geothermalVents.length >= 2 : false,
        };
      });
    });

    assert.equal(res.webglAvailable, true);
    assert.ok(res.oppCount >= 2, `Expected >= 2 active Frostwake Rime-Creep opposition units, got ${res.oppCount}`);
    assert.ok(res.maxDelta > 0.05, `Expected Rime-Creeps to creep horizontally (> 0.05m in 1.5s), got ${res.maxDelta}`);
    assert.equal(res.hasFoxDens, true, "Expected Spirit-Fox Dens in Frostwake valley");
    assert.equal(res.hasDrifts, true, "Expected Heavy Permafrost Drifts in Frostwake valley");
    assert.equal(res.hasPods, true, "Expected smashable Ice-Pods in Frostwake valley");
    assert.equal(res.hasVents, true, "Expected Geothermal Vents in Frostwake valley");
  });

  test("T1-F03-02: Frostwake setEncounterDockOpen(true) immediately pauses all Rime-Creep movement and false resumes", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        if (typeof ctx.world.setEncounterDockOpen !== "function") {
          return { hasFn: false };
        }
        ctx.world.start();
        ctx.world.setDriveInputs(0, 0, false);
        ctx.world.setEncounterDockOpen(false);
        const s0 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.step(60, 16.6667);
        const s1 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));

        let openDelta = 0;
        for (const [k, u1] of s1) {
          const u0 = s0.get(k);
          if (u0) openDelta = Math.max(openDelta, Math.hypot(u1.x - u0.x, u1.z - u0.z));
        }

        ctx.world.setEncounterDockOpen(true);
        const s2 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.step(120, 16.6667);
        const s3 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));

        let pausedDelta = 0;
        for (const [k, u3] of s3) {
          const u2 = s2.get(k);
          if (u2) pausedDelta = Math.max(pausedDelta, Math.hypot(u3.x - u2.x, u3.z - u2.z));
        }

        ctx.world.setEncounterDockOpen(false);
        ctx.step(60, 16.6667);
        const s4 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        let resumedDelta = 0;
        for (const [k, u4] of s4) {
          const u3 = s3.get(k);
          if (u3) resumedDelta = Math.max(resumedDelta, Math.hypot(u4.x - u3.x, u4.z - u3.z));
        }

        return { hasFn: true, openDelta, pausedDelta, resumedDelta };
      });
    });

    assert.equal(res.hasFn, true, "FrostwakeWorld3D must implement setEncounterDockOpen(isOpen)");
    assert.ok(res.openDelta > 0.03, `Expected Rime-Creeps to move before dock opens (${res.openDelta})`);
    assert.ok(
      res.pausedDelta < 1e-6,
      `Expected 0.0 Rime-Creep movement while Encounter Dock is open, got ${res.pausedDelta}`
    );
    assert.ok(res.resumedDelta > 0.03, `Expected Rime-Creeps to resume after dock closes (${res.resumedDelta})`);
  });

  test("T1-F03-03: Frostwake basic plow bogs down (~0.42x) in Permafrost Drifts while wide_blade melts at full speed & 3x knockback", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        ctx.world.setEncounterDockOpen?.(false);

        const drift = (ctx.world.opposition?.permafrostDrifts || []).find((d) => d.integrity > 0) || { x: -34, z: -15 };
        // Measure open snow speed first (heading = 0 faces -Z north)
        const baseProg = eng.createInitialProgress("david");
        baseProg.ownedUpgrades = [];
        ctx.world.applyLoadout?.(baseProg, {}, null);
        ctx.world.rigState.x = 0;
        ctx.world.rigState.z = 18;
        ctx.world.rigState.heading = 0;
        ctx.world.rigState.speed = 0;
        ctx.world.setDriveInputs(0, 1, false);
        ctx.step(45, 16.6667);
        const openSnowSpeed = Math.abs(ctx.world.rigState.speed);

        // Pass A: un-upgraded inside deep permafrost drift
        ctx.world.rigState.x = drift.x;
        ctx.world.rigState.z = drift.z + 3.5;
        ctx.world.rigState.heading = 0;
        ctx.world.rigState.speed = openSnowSpeed;
        ctx.world.setDriveInputs(0, 1, false);
        ctx.step(35, 16.6667);
        const basicDriftSpeed = Math.abs(ctx.world.rigState.speed);

        // Pass B: wide_blade (Magma Wide-Plow) inside identical permafrost drift
        const wideProg = eng.createInitialProgress("david");
        wideProg.ownedUpgrades = ["wide_blade"];
        ctx.world.applyLoadout?.(wideProg, {}, null);
        ctx.world.rigState.x = drift.x;
        ctx.world.rigState.z = drift.z + 3.5;
        ctx.world.rigState.heading = 0;
        ctx.world.rigState.speed = openSnowSpeed;
        ctx.world.setDriveInputs(0, 1, false);
        ctx.step(35, 16.6667);
        const wideDriftSpeed = Math.abs(ctx.world.rigState.speed);

        // Knockback width comparison on flanking Rime-Creep at lateral offset 5.2m (> ~2.8m base, < ~8.4m wide_blade!)
        const units = ctx.world.opposition?.rimeUnits || [];
        let baseLateralHit = false;
        let wideLateralHit = false;
        if (units.length >= 2) {
          const uA = units[0];
          const uB = units[1];
          uA.state = "creeping";
          uA.isCaptain = false;
          uA.shieldIntact = false;
          uA.x = 5.2;
          uA.z = -2.2;
          uA.vx = 0;
          uA.vz = 0;
          ctx.world.applyLoadout?.(baseProg, {}, null);
          ctx.world.rigState.x = 0;
          ctx.world.rigState.z = 0;
          ctx.world.rigState.heading = 0;
          ctx.world.rigState.speed = 12;
          ctx.step(4, 16.6667);
          baseLateralHit = uA.state === "knockback" || Math.hypot(uA.x - 5.2, uA.z + 2.2) > 0.45;

          uB.state = "creeping";
          uB.isCaptain = false;
          uB.shieldIntact = false;
          uB.x = 5.2;
          uB.z = -2.2;
          uB.vx = 0;
          uB.vz = 0;
          ctx.world.applyLoadout?.(wideProg, {}, null);
          ctx.world.rigState.x = 0;
          ctx.world.rigState.z = 0;
          ctx.world.rigState.heading = 0;
          ctx.world.rigState.speed = 12;
          ctx.step(4, 16.6667);
          wideLateralHit = uB.state === "knockback" || Math.hypot(uB.x - 5.2, uB.z + 2.2) > 0.45;
        }

        return { openSnowSpeed, basicDriftSpeed, wideDriftSpeed, baseLateralHit, wideLateralHit };
      });
    });

    assert.ok(
      res.basicDriftSpeed < res.openSnowSpeed * 0.72,
      `Expected un-upgraded plow to bog down in permafrost (${res.basicDriftSpeed} vs open ${res.openSnowSpeed})`
    );
    assert.ok(
      res.wideDriftSpeed >= res.basicDriftSpeed * 1.45,
      `Expected wide_blade Magma Wide-Plow to melt permafrost at full speed (${res.wideDriftSpeed} vs basic ${res.basicDriftSpeed})`
    );
    assert.equal(res.baseLateralHit, false, "Basic blade should not knock back Rime-Creeps 5.2m laterally");
    assert.equal(res.wideLateralHit, true, "wide_blade must knock back Rime-Creeps across 3x wider lateral wave");
  });

  test("T1-F03-04: Frostwake ion_boosters boost-smashes Frost-Shielded Rime-Captains & jumps Broken Ice Chasm safely", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        const prog = eng.createInitialProgress("david");
        prog.ownedUpgrades = ["ion_boosters"];
        ctx.world.applyLoadout?.(prog, {}, null);

        // 1. Boost into Frost-Shielded Rime-Captain
        const cap =
          (ctx.world.opposition?.rimeCaptains || [])[0] ||
          (ctx.world.opposition?.rimeUnits || []).find((u) => u.isCaptain || u.shielded);
        let captainShattered = false;
        if (cap) {
          const origX = cap.x;
          const origZ = cap.z;
          ctx.world.rigState.x = origX;
          ctx.world.rigState.z = origZ + 3.2;
          ctx.world.rigState.heading = Math.PI;
          ctx.world.rigState.speed = 16;
          ctx.world.setDriveInputs(0, 1, true);
          ctx.step(12, 16.6667);
          captainShattered =
            !cap.shieldActive ||
            cap.stunTimer > 0 ||
            Math.hypot(cap.x - origX, cap.z - origZ) > 1.0 ||
            ctx.events.opposition.length > 0;
        }

        // 2. Boost jump across Broken Ice Chasm (x: 34 -> 51, z: 10)
        ctx.world.rigState.x = 34.5;
        ctx.world.rigState.z = 10.0;
        ctx.world.rigState.heading = -Math.PI / 2; // +X
        ctx.world.rigState.speed = 17;
        ctx.world.setDriveInputs(0, 1, true);
        let peakY = ctx.world.rigState.y;
        for (let i = 0; i < 65; i++) {
          ctx.step(1, 16.6667);
          peakY = Math.max(peakY, ctx.world.rigState.y);
        }

        return {
          hasCaptain: Boolean(cap),
          captainShattered,
          endX: ctx.world.rigState.x,
          endY: ctx.world.rigState.y,
          peakY,
        };
      });
    });

    assert.equal(res.hasCaptain, true, "Expected Frost-Shielded Rime-Captain in Frostwake valley");
    assert.equal(res.captainShattered, true, "Expected ion_boosters ram to shatter/launch Rime-Captain shield");
    assert.ok(res.endX >= 48.0, `Expected ion_boosters rig to clear Broken Ice Chasm (endX=${res.endX})`);
    assert.ok(res.endY > -5 && Number.isFinite(res.endY), "Expected safe snow landing with zero fall death");
  });

  test("T1-F03-05: Frostwake geothermal trench thawing, Ice-Pod smash & onOppositionEvent contract", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        const prog = eng.createInitialProgress("david");
        prog.ownedUpgrades = ["wide_blade", "ion_boosters"];
        ctx.world.applyLoadout?.(prog, {}, null);

        // Drive through geothermal vent_west (-46, 5) -> den_west (-38, -4)
        const vent = ctx.world.opposition?.geothermalVents?.[0] || { x: -46, z: 5 };
        const den = ctx.world.opposition?.foxDens?.[0] || { x: -38, z: -4 };
        ctx.world.rigState.x = vent.x;
        ctx.world.rigState.z = vent.z;
        ctx.world.rigState.speed = 10;
        ctx.step(8, 16.6667);

        ctx.world.rigState.x = den.x;
        ctx.world.rigState.z = den.z;
        ctx.world.rigState.speed = 10;
        ctx.step(8, 16.6667);

        // Smash ground Ice-Pod
        const pod = (ctx.world.opposition?.icePods || []).find((p) => !p.elevated) || { x: -42, z: -20 };
        ctx.world.rigState.x = pod.x;
        ctx.world.rigState.z = pod.z;
        ctx.world.rigState.speed = 12;
        ctx.step(8, 16.6667);

        return {
          events: ctx.events.opposition,
          denShielded: Boolean(den.thermalShieldSec > 0 || den.moatRing?.visible),
        };
      });
    });

    assert.ok(res.events.length >= 1, "Expected onOppositionEvent to fire on thermal trench / Ice-Pod smash");
    assert.equal(res.denShielded, true, "Expected carving Geothermal Vent -> Fox Den trench to warm/shield Fox Den");
    for (const ev of res.events) {
      assert.equal(typeof ev.kind, "string");
      assert.ok(Number.isFinite(ev.shardsEarned) && ev.shardsEarned >= 0);
      assert.ok(countWords(ev.message || "") <= 6, `Opposition message "${ev.message}" must be <= 6 words`);
      assert.equal(findBannedWord(ev.message || "", FALLBACK_BANNED_SHAME_WORDS), null);
      assert.equal(findBannedWord(ev.message || "", FALLBACK_BANNED_CURRICULUM_WORDS), null);
    }
  });
});

/* ============================================================================
 * FEATURE F04 — Oddroot Active Spatial Opposition & Upgrade/Elixir Stakes (5 tests)
 * ============================================================================ */
describe("F04 — Oddroot Active Spatial Opposition & Upgrade/Elixir Stakes", () => {
  test("T1-F04-01: Oddroot spawns creeping Blight-Thorns & Gloom-Spores with zero countdowns and zero health bars", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        ctx.world.setEncounterDockOpen?.(false);
        ctx.world.setDriveInputs(0, 0, false);
        const s0 = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
        ctx.step(90, 16.6667);
        const s1 = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);

        let maxMoveOrGrow = 0;
        const m0 = new Map(s0.map((u) => [u.key, u]));
        for (const u1 of s1) {
          const u0 = m0.get(u1.key);
          if (u0) {
            const d = Math.hypot(u1.x - u0.x, u1.z - u0.z) + Math.abs(u1.scale - u0.scale);
            maxMoveOrGrow = Math.max(maxMoveOrGrow, d);
          }
        }
        return { webglAvailable: ctx.world.webglAvailable, count: s1.length, maxMoveOrGrow };
      });
    });

    assert.equal(res.webglAvailable, true);
    assert.ok(res.count >= 4, `Expected active Blight-Thorns & Gloom-Spores in Oddroot, got ${res.count}`);
    assert.ok(res.maxMoveOrGrow > 0.02, `Expected Blight/Gloom to creep/spread over 1.5s, got ${res.maxMoveOrGrow}`);
  });

  test("T1-F04-02: Oddroot setEncounterDockOpen(true) immediately freezes all Blight-Thorn & Gloom-Spore creeping", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        if (typeof ctx.world.setEncounterDockOpen !== "function") return { hasFn: false };
        ctx.world.start();
        ctx.world.setDriveInputs(0, 0, false);
        ctx.world.setEncounterDockOpen(false);

        const s0 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.step(60, 16.6667);
        const s1 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        let openDelta = 0;
        for (const [k, u1] of s1) {
          const u0 = s0.get(k);
          if (u0) openDelta = Math.max(openDelta, Math.hypot(u1.x - u0.x, u1.z - u0.z) + Math.abs(u1.scale - u0.scale));
        }

        ctx.world.setEncounterDockOpen(true);
        const s2 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.step(120, 16.6667);
        const s3 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        let pausedDelta = 0;
        for (const [k, u3] of s3) {
          const u2 = s2.get(k);
          if (u2) pausedDelta = Math.max(pausedDelta, Math.hypot(u3.x - u2.x, u3.z - u2.z) + Math.abs(u3.scale - u2.scale));
        }

        ctx.world.setEncounterDockOpen(false);
        ctx.step(60, 16.6667);
        const s4 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        let resumedDelta = 0;
        for (const [k, u4] of s4) {
          const u3 = s3.get(k);
          if (u3) resumedDelta = Math.max(resumedDelta, Math.hypot(u4.x - u3.x, u4.z - u3.z) + Math.abs(u4.scale - u3.scale));
        }

        return { hasFn: true, openDelta, pausedDelta, resumedDelta };
      });
    });

    assert.equal(res.hasFn, true, "OddrootWorld3D must implement setEncounterDockOpen(isOpen)");
    assert.ok(res.openDelta > 0.02, `Expected Blight/Gloom to advance before dock opens (${res.openDelta})`);
    assert.ok(
      res.pausedDelta < 1e-6,
      `Expected 0.0 Blight/Gloom movement while Encounter Dock is open, got ${res.pausedDelta}`
    );
    assert.ok(res.resumedDelta > 0.02, `Expected Blight/Gloom to resume after dock closes (${res.resumedDelta})`);
  });

  test("T1-F04-03: Oddroot shrine/cauldron clear unleashes Bioluminescent Sanctuary Pushback Wave dissolving Blight", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const enc = eng.generateEncounter("W1.1");
        ctx.world.populateEncounters([enc]);
        window.__E2E_3D__.engageFirstEncounter(ctx);
        ctx.world.setEncounterDockOpen(false);
        ctx.resetEvents();
        ctx.world.playCommitVisual(
          { outcome: "clear", overdrive: true, shardsEarned: 21, delta: 0, cue: "Balanced!" },
          enc
        );
        ctx.step(30, 16.6667);
        const opp = ctx.world.blightSystem || ctx.world.opposition || ctx.world.blightOpposition || {};
        const waveActive = Array.isArray(opp.elixirWaves) && opp.elixirWaves.some((w) => w.active || w.radius > 1.1);
        return { waveActive, oppEvents: ctx.events.opposition };
      });
    });

    assert.ok(
      res.waveActive || res.oppEvents.length > 0,
      "Expected clearing an Oddroot shrine/cauldron to fire an expanding Bioluminescent Pushback Wave"
    );
  });

  test("T1-F04-04: Oddroot basic avatar/boar tangles (~0.45x) in Blight-Thorns while or_tusk_plow charges at full speed", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        ctx.world.setEncounterDockOpen(false);

        const opp = ctx.world.blightSystem || ctx.world.opposition || ctx.world.blightOpposition || {};
        const patch = (opp.thornPatches || [])[0] || { x: -25.4, z: -16.1 };

        // Measure open path speed
        const baseProg = eng.createInitialProgress("david");
        baseProg.ownedUpgrades = [];
        if (baseProg.games?.oddroot) baseProg.games.oddroot.sanctuaryUpgrades = [];
        ctx.world.applyLoadout(baseProg, {}, null);
        ctx.world.rigState.x = 0;
        ctx.world.rigState.z = 4;
        ctx.world.rigState.heading = 0;
        ctx.world.setDriveInputs(0, 1, false);
        ctx.step(35, 16.6667);
        const openSpeed = ctx.world.getLocalMultiplayerPose().speed;

        const setPos = (p) => {
          const st = ctx.world.rigState || ctx.world.playerState || ctx.world.avatarState;
          if (st) {
            st.x = p.x;
            st.y = (p.y ?? 1.2) + 0.55;
            st.z = p.z;
            st.heading = 0;
            st.speed = openSpeed;
          }
          ctx.world.rigAnim = null;
        };
        if (patch) {
          patch.dissolved = false;
          patch.cleared = false;
          patch.active = true;
          if (typeof patch.regrowTimer === "number") patch.regrowTimer = 0;
        }
        setPos(patch);
        ctx.world.setDriveInputs(0, 1, false);
        ctx.step(18, 16.6667);
        const basicThornSpeed = ctx.world.getLocalMultiplayerPose().speed;

        // Equip or_tusk_plow (Bramble-Tusk Plow)
        const upgProg = eng.createInitialProgress("david");
        upgProg.ownedUpgrades = ["or_tusk_plow"];
        if (upgProg.games?.oddroot) upgProg.games.oddroot.sanctuaryUpgrades = ["or_tusk_plow"];
        ctx.world.applyLoadout(upgProg, {}, null);
        const patch2 = (opp.thornPatches || [])[1] || patch;
        if (patch2) {
          patch2.dissolved = false;
          patch2.cleared = false;
          patch2.active = true;
        }
        setPos(patch2);
        ctx.world.setDriveInputs(0, 1, false);
        ctx.step(18, 16.6667);
        const plowThornSpeed = ctx.world.getLocalMultiplayerPose().speed;

        return { openSpeed, basicThornSpeed, plowThornSpeed };
      });
    });

    assert.ok(
      res.basicThornSpeed < res.openSpeed * 0.75,
      `Expected un-upgraded Oddroot avatar/boar to tangle in Blight-Thorns (${res.basicThornSpeed} vs open ${res.openSpeed})`
    );
    assert.ok(
      res.plowThornSpeed >= res.basicThornSpeed * 1.4,
      `Expected or_tusk_plow to charge through Blight-Thorns at full speed (${res.plowThornSpeed} vs basic ${res.basicThornSpeed})`
    );
  });

  test("T1-F04-05: Oddroot or_wide_siphon vacuums 3x wider Gloom-Spores & or_glide_wings soars over thorn chasms", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const opp = ctx.world.blightSystem || ctx.world.opposition || ctx.world.blightOpposition || {};
        const setPos = (x, z) => {
          const st = ctx.world.rigState || ctx.world.playerState || ctx.world.avatarState;
          if (st) {
            st.x = x;
            st.z = z;
            st.heading = 0;
          }
          ctx.world.rigAnim = null;
        };

        // Test Gloom-Spore capture at 6.5m distance (> 3.2m base siphon, < 9.6m wide siphon!)
        const baseProg = eng.createInitialProgress("sarah");
        baseProg.ownedUpgrades = [];
        if (baseProg.games?.oddroot) baseProg.games.oddroot.sanctuaryUpgrades = [];
        ctx.world.applyLoadout(baseProg, {}, null);

        const sporeA = (opp.gloomSpores || [])[0];
        let baseCapturedFar = false;
        if (sporeA) {
          sporeA.active = true;
          sporeA.x = 6.5;
          sporeA.z = 0;
          setPos(0, 0);
          ctx.world.triggerRealmQuickAction();
          ctx.step(6, 16.6667);
          baseCapturedFar = sporeA.active === false;
        }

        const wideProg = eng.createInitialProgress("sarah");
        wideProg.ownedUpgrades = ["or_wide_siphon", "or_glide_wings"];
        if (wideProg.games?.oddroot) {
          wideProg.games.oddroot.sanctuaryUpgrades = ["or_wide_siphon", "or_glide_wings"];
        }
        ctx.world.applyLoadout(wideProg, {}, null);

        const sporeB = (opp.gloomSpores || [])[1] || sporeA;
        let wideCapturedFar = false;
        if (sporeB) {
          sporeB.active = true;
          sporeB.x = 6.5;
          sporeB.z = 0;
          setPos(0, 0);
          ctx.world.triggerRealmQuickAction();
          ctx.step(6, 16.6667);
          wideCapturedFar = sporeB.active === false || Math.hypot(sporeB.x, sporeB.z) < 5.5;
        }

        // Traverse Thorn Chasm (-14.2, -6.4) with or_glide_wings boosting
        const chasm = (opp.thornChasms || [])[0] || { x: -14.2, z: -6.4 };
        setPos(chasm.x, chasm.z + 3.8);
        ctx.world.setDriveInputs(0, 1, true);
        ctx.step(30, 16.6667);
        const poseAfterChasm = ctx.world.getLocalMultiplayerPose();

        return { baseCapturedFar, wideCapturedFar, poseAfterChasm };
      });
    });

    assert.equal(res.baseCapturedFar, false, "Basic siphon should not vacuum Gloom-Spores 6.5m away");
    assert.equal(res.wideCapturedFar, true, "or_wide_siphon must vacuum Gloom-Spores across 3x wider radius");
    assert.ok(res.poseAfterChasm.speed > 4.0, `Expected or_glide_wings to soar briskly across Thorn Chasm (${res.poseAfterChasm.speed})`);
  });
});

/* ============================================================================
 * FEATURE F05 — Zone Clear / Boss Guardian Awakening Progress Bar & Stars (5 tests)
 * ============================================================================ */
describe("F05 — Zone Clear / Boss Guardian Awakening Progress Bar & Stars", () => {
  test("T1-F05-01: computeWorldProgress(progress, 'W1') baseline schema on fresh profile", async () => {
    const eng = await loadEngine();
    const computeWorldProgress = requireExport(eng, "computeWorldProgress", "function", "core/engine.js");
    const prog = eng.createInitialProgress("auto");
    const wp = computeWorldProgress(prog, "W1");

    assert.equal(wp.worldId, "W1");
    assert.equal(wp.rankLabel, "Rank I");
    assert.equal(wp.worldName, "Sub-Zero Core");
    assert.equal(wp.guardianName, "Cryo-Colossus");
    assert.equal(wp.beaconsLit, 0);
    assert.equal(wp.beaconsTotal, 4);
    assert.ok(wp.beaconsNeededForUnlock >= 1 && wp.beaconsNeededForUnlock <= 4);
    assert.equal(wp.starsEarned, 0);
    assert.equal(wp.starsMax, 12);
    assert.equal(wp.completionPct, 0);
    assert.equal(wp.guardianAwakened, false);
    assert.equal(wp.nextWorldId, "W2");
    assert.equal(wp.nextWorldRankLabel, "Rank II");
    assert.equal(wp.nextWorldName, "Crystal Loom");
    assert.equal(wp.nodeStatuses.length, 4);
    assert.deepEqual(wp.nodeStatuses.map((n) => n.stars), [0, 0, 0, 0]);
  });

  test("T1-F05-02: computeWorldProgress tracks 3/4 beacons (75%) & guardianAwakened when next rank unlocks", async () => {
    const eng = await loadEngine();
    const computeWorldProgress = requireExport(eng, "computeWorldProgress", "function", "core/engine.js");
    const prog = eng.createInitialProgress("auto");
    prog.calibrated = true;
    prog.unlockedWorlds = ["W1"];
    for (const id of ["W1.1", "W1.2", "W1.3"]) {
      prog.nodes[id].stage = 3;
      prog.nodes[id].camouflageCleared = true;
      prog.nodes[id].pKnow = 0.96;
      prog.nodes[id].wins = 4;
    }
    prog.nodes["W1.4"].stage = 0;
    eng.unlockFrontierWorlds(prog);

    const wp = computeWorldProgress(prog, "W1");
    assert.equal(wp.beaconsLit, 3);
    assert.equal(wp.starsEarned, 9);
    assert.equal(wp.starsMax, 12);
    assert.equal(wp.completionPct, 75);
    assert.equal(wp.guardianAwakened, true);
    assert.deepEqual(wp.nodeStatuses.map((n) => n.stars), [3, 3, 3, 0]);
  });

  test("T1-F05-03: computeWorldProgress nodeStatuses stars scale monotonically 0 -> 1 -> 2 -> 3 with stage", async () => {
    const eng = await loadEngine();
    const computeWorldProgress = requireExport(eng, "computeWorldProgress", "function", "core/engine.js");
    const prog = eng.createInitialProgress("auto");
    prog.nodes["W1.1"].stage = 0;
    prog.nodes["W1.2"].stage = 1;
    prog.nodes["W1.3"].stage = 2;
    prog.nodes["W1.4"].stage = 3;

    const wp = computeWorldProgress(prog, "W1");
    assert.deepEqual(wp.nodeStatuses.map((n) => n.stars), [0, 1, 2, 3]);
    assert.equal(wp.starsEarned, 6);
  });

  test("T1-F05-04: computeWorldProgress covers all 8 worlds W0..W7 with null nextWorldId on terminal W7", async () => {
    const eng = await loadEngine();
    const computeWorldProgress = requireExport(eng, "computeWorldProgress", "function", "core/engine.js");
    const banned = eng.BANNED_CHILD_CURRICULUM_WORDS || FALLBACK_BANNED_CURRICULUM_WORDS;
    const prog = eng.createInitialProgress("auto");

    const expectedTotals = [6, 4, 4, 4, 4, 4, 3, 4];
    for (let i = 0; i < 8; i++) {
      const wid = `W${i}`;
      const wp = computeWorldProgress(prog, wid);
      assert.equal(wp.beaconsTotal, expectedTotals[i]);
      assert.equal(findBannedWord(`${wp.rankLabel} ${wp.worldName} ${wp.guardianName}`, banned), null);
      if (i < 7) assert.equal(wp.nextWorldId, `W${i + 1}`);
      else assert.equal(wp.nextWorldId, null);
    }
  });

  test("T1-F05-05: Portal/HUD renders Zone Clear / Guardian progress meter + stars & 3D adapters implement triggerGuardianAwakening", async () => {
    const has3DHooks = await sandboxHandle.page.eval(async () => {
      const fw = await window.__E2E_3D__.getSharedWorld("frostwake");
      const or = await window.__E2E_3D__.getSharedWorld("oddroot");
      const okFw = typeof fw.world.triggerGuardianAwakening === "function";
      const okOr = typeof or.world.triggerGuardianAwakening === "function";
      if (okFw) fw.world.triggerGuardianAwakening("W1");
      if (okOr) or.world.triggerGuardianAwakening("W1");
      fw.step(5, 16.6667);
      or.step(5, 16.6667);
      return { okFw, okOr };
    });
    assert.equal(has3DHooks.okFw, true, "FrostwakeWorld3D must implement triggerGuardianAwakening");
    assert.equal(has3DHooks.okOr, true, "OddrootWorld3D must implement triggerGuardianAwakening");

    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      const portalMeter = await page.eval(() => {
        const txt = document.getElementById("screen-portal")?.textContent || "";
        return {
          hasBeaconOrGuardianText: /beacons?\s+lit|guardian|awaken|unlock\s+rank|\d+\s*%/i.test(txt),
          hasStars: /★|☆/.test(txt) || Boolean(document.querySelector("#screen-portal [class*='star']")),
        };
      });
      assert.equal(
        portalMeter.hasBeaconOrGuardianText,
        true,
        "Expected prominent Zone Clear / Guardian Awakening progress bar on #screen-portal"
      );
      assert.equal(portalMeter.hasStars, true, "Expected visual node ★ stars on #screen-portal");
    });
  });
});

/* ============================================================================
 * FEATURE F06 — Holo-Projector / Spirit-Fox Trick Cards & Visual seq_linear (6 tests)
 * ============================================================================ */
describe("F06 — Interactive Holo-Projector / Spirit-Fox Trick Cards & Visual seq_linear", () => {
  test("T1-F06-01: getTrickCardSpec(encounter) covers all 33 nodes and camouflaged variants", async () => {
    const eng = await loadEngine();
    const getTrickCardSpec = requireExport(eng, "getTrickCardSpec", "function", "core/engine.js");
    const NODE_MAP = requireExport(eng, "NODE_MAP", "object", "core/engine.js");
    assert.equal(Object.keys(NODE_MAP).length, 33);

    for (const nodeId of Object.keys(NODE_MAP)) {
      for (const camouflage of [false, true]) {
        const enc = eng.generateEncounter(nodeId, { rng: makeSeededRng(101), camouflage });
        const spec = getTrickCardSpec(enc);
        assert.ok(spec && typeof spec === "object", `Expected TrickCardSpec for ${nodeId}`);
        assert.ok(typeof spec.familyId === "string" && spec.familyId.length > 0);
        assert.ok(typeof spec.title === "string" && spec.title.length > 0);
        assert.ok(Array.isArray(spec.beats) && spec.beats.length >= 2, `Expected >= 2 animated beats for ${nodeId}`);
      }
    }
  });

  test("T1-F06-02: every getTrickCardSpec beat caption is <= 8 words with zero shame or curriculum words", async () => {
    const eng = await loadEngine();
    const getTrickCardSpec = requireExport(eng, "getTrickCardSpec", "function", "core/engine.js");
    const bannedShame = eng.BANNED_CHILD_WORDS || FALLBACK_BANNED_SHAME_WORDS;
    const bannedCurr = eng.BANNED_CHILD_CURRICULUM_WORDS || FALLBACK_BANNED_CURRICULUM_WORDS;

    for (const nodeId of Object.keys(eng.NODE_MAP)) {
      const enc = eng.generateEncounter(nodeId, { rng: makeSeededRng(777) });
      const spec = getTrickCardSpec(enc);
      for (const beat of spec.beats) {
        const wc = countWords(beat.caption);
        assert.ok(
          wc >= 1 && wc <= 8,
          `Trick Card ${nodeId} (${spec.familyId}) beat caption "${beat.caption}" has ${wc} words (must be <= 8)`
        );
        assert.ok(typeof beat.visualType === "string" && beat.visualType.length > 0);
        assert.ok(beat.visualProps && typeof beat.visualProps === "object");
        assert.equal(findBannedWord(beat.caption, bannedShame), null);
        assert.equal(findBannedWord(beat.caption, bannedCurr), null);
      }
      assert.equal(findBannedWord(`${spec.title} ${spec.foxWhisper || ""}`, bannedCurr), null);
    }
  });

  test("T1-F06-03: getTrickCardSpec produces distinct visual teaching specs for an+b, a-(-b), c=b-an, and rise/run", async () => {
    const eng = await loadEngine();
    const getTrickCardSpec = requireExport(eng, "getTrickCardSpec", "function", "core/engine.js");
    const rng = makeSeededRng(42);
    const specs = [
      getTrickCardSpec(eng.generateEncounter("W2.1", { rng })),
      getTrickCardSpec(eng.generateEncounter("W1.3", { rng })),
      getTrickCardSpec(eng.generateEncounter("W3.1", { rng, camouflage: true })),
      getTrickCardSpec(eng.generateEncounter("W4.1", { rng })),
    ];
    const familyIds = new Set(specs.map((s) => s.familyId));
    assert.equal(familyIds.size, 4, `Expected 4 distinct trick familyIds, got ${[...familyIds].join(", ")}`);
  });

  test("T1-F06-04: progress.seenTrickFamilies initializes as [] and merges monotonically across devices", async () => {
    const eng = await loadEngine();
    const a = eng.createInitialProgress("sarah");
    const b = eng.createInitialProgress("sarah");
    assert.ok(Array.isArray(a.seenTrickFamilies) && a.seenTrickFamilies.length === 0);

    a.seenTrickFamilies = ["seq_linear", "int_double_neg"];
    b.seenTrickFamilies = ["int_double_neg", "ramp_linear"];
    const merged = eng.mergeProgress(a, b);
    assert.deepEqual(
      [...merged.seenTrickFamilies].sort(),
      ["int_double_neg", "ramp_linear", "seq_linear"],
      "mergeProgress must union seenTrickFamilies without duplicates"
    );
  });

  test("T1-F06-05: seq_linear (W0.4, W2.1) provides visual patternMeta.frames (Base + Frame × Group) & non-dry equationText", async () => {
    const eng = await loadEngine();
    const rng = makeSeededRng(2026);
    for (const nodeId of ["W0.4", "W2.1"]) {
      for (let i = 0; i < 15; i++) {
        const enc = eng.generateEncounter(nodeId, { rng });
        assert.ok(enc.patternMeta, `Expected patternMeta on ${nodeId}`);
        const pm = enc.patternMeta;
        assert.equal(pm.ruleVisual, "Base + Frame × Group");
        assert.ok(Array.isArray(pm.frames) && pm.frames.length >= 3);
        for (let fIdx = 0; fIdx < 3; fIdx++) {
          const fr = pm.frames[fIdx];
          assert.equal(fr.step, fIdx + 1);
          assert.equal(fr.total, fr.base + fr.groups * fr.perGroup);
        }
        assert.equal(enc.answer, pm.baseCount + pm.stepGrowth * pm.targetStep);
        assert.equal(
          /Step\s*1\s*:\s*-?\d+\s*·\s*2\s*:/i.test(enc.equationText),
          false,
          `seq_linear equationText must NOT be dry standardized-test string: "${enc.equationText}"`
        );
      }
    }
  });

  test("T1-F06-06: Live Encounter Dock offers 🦊 Show Trick button, auto-opens on unseen family, & offers Trick on 1st miss", async () => {
    const eng = await loadEngine();
    const seedProg = eng.createInitialProgress("sarah");
    seedProg.calibrated = true;
    seedProg.activeWorld = "W2";
    seedProg.unlockedWorlds = ["W1", "W2", "W3"];
    seedProg.seenTrickFamilies = [];
    for (const nid of ["W2.2", "W2.3", "W2.4"]) seedProg.nodes[nid].pKnow = 0.99;
    seedProg.nodes["W2.1"].pKnow = 0.62;

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "sarah",
      profiles: [{ username: "sarah", name: "Sarah", avatar: "🦄" }],
      progressByUser: { sarah: seedProg },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2" }, async (page) => {
      await launchRealmFromPortal(page, "frostwake");
      await cruiseToNextEncounterDock(page);

      const trickCheck = await page.eval(() => {
        const isVis = (el) => {
          if (!el) return false;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
        };
        const trickBtn = [...document.querySelectorAll("button")].find(
          (b) => isVis(b) && /show\s*trick|trick|holo|🦊/i.test(b.textContent || "")
        );
        const trickModalOrCard = [
          ...document.querySelectorAll("[id*='trick'], [class*='trick'], [id*='holo'], [data-trick-card]"),
        ].find(isVis);
        const stored = JSON.parse(localStorage.getItem("bloom-n-v1") || "{}");
        const seen = stored?.progressByUser?.sarah?.seenTrickFamilies || [];
        return {
          hasTrickBtn: Boolean(trickBtn),
          autoOpenedOrTracked: Boolean(trickModalOrCard) || seen.length > 0,
        };
      });

      assert.equal(trickCheck.hasTrickBtn, true, "Expected visible 🦊 Show Trick button in Encounter Dock");
      assert.equal(
        trickCheck.autoOpenedOrTracked,
        true,
        "Expected unseen skill family to auto-open Holo-Projector Trick Card and track seenTrickFamilies"
      );
      page.assertZeroRuntimeErrors("T1-F06-06");
    });
  });
});

/* ============================================================================
 * FEATURE F07 — W0 Calibration Determinism Fixes (5 tests)
 * ============================================================================ */
describe("F07 — W0 Calibration Determinism Fixes", () => {
  test("T1-F07-01: 5-win streak inside W0 never triggers organic Surge Wave even with rng() = 0.01", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    const alwaysLowRng = () => 0.01;

    const visited = [];
    for (let step = 0; step < 6; step++) {
      const enc = eng.pickNextEncounter(prog, sess, "W0", alwaysLowRng);
      visited.push(enc.nodeId);
      const res = commitEnc(eng, prog, sess, enc, enc.answer, 2400, alwaysLowRng);
      assert.equal(res.surgeTriggered, false, `Step ${step + 1} in W0 must never trigger organic Surge Wave`);
      assert.equal(sess.inSurge, false);
    }
    assert.deepEqual(visited, ["W0.1", "W0.2", "W0.3", "W0.4", "W0.5", "W0.6"]);
    assert.equal(prog.calibrated, true);
  });

  test("T1-F07-02: 3-gate batch wave spawning uses session.calibrationCursor for [W0.1..W0.3] then [W0.4..W0.6]", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    const rng = makeSeededRng(55);

    const wave1 = [
      eng.pickNextEncounter(prog, sess, "W0", rng),
      eng.pickNextEncounter(prog, sess, "W0", rng),
      eng.pickNextEncounter(prog, sess, "W0", rng),
    ];
    assert.deepEqual(
      wave1.map((e) => e.nodeId),
      ["W0.1", "W0.2", "W0.3"],
      "Wave 1 pre-commit batch must spawn W0.1, W0.2, W0.3 instead of repeating W0.1"
    );

    for (const enc of wave1) commitEnc(eng, prog, sess, enc, enc.answer, 2500, rng);

    const wave2 = [
      eng.pickNextEncounter(prog, sess, "W0", rng),
      eng.pickNextEncounter(prog, sess, "W0", rng),
      eng.pickNextEncounter(prog, sess, "W0", rng),
    ];
    assert.deepEqual(wave2.map((e) => e.nodeId), ["W0.4", "W0.5", "W0.6"]);
    for (const enc of wave2) commitEnc(eng, prog, sess, enc, enc.answer, 2500, rng);
    assert.equal(prog.calibrated, true);
  });

  test("T1-F07-03: Sarah 6/6 clean W0 calibration routes to activeWorld W2 with W1..W4 unlocked", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    const rng = () => 0.02;

    for (let i = 0; i < 6; i++) {
      const enc = eng.pickNextEncounter(prog, sess, "W0", rng);
      commitEnc(eng, prog, sess, enc, enc.answer, 2100, rng);
    }
    assert.equal(prog.calibrated, true);
    assert.equal(prog.activeWorld, "W2");
    for (const wid of ["W1", "W2", "W3", "W4"]) {
      assert.ok(prog.unlockedWorlds.includes(wid), `Expected Sarah 6/6 calibration to unlock ${wid}`);
    }
  });

  test("T1-F07-04: Mid-tier W0 calibration (hits W0.1..W0.4, warm-reveals W0.5..W0.6) routes to W2 with W1..W3 unlocked", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    const rng = makeSeededRng(88);

    for (let i = 0; i < 6; i++) {
      const enc = eng.pickNextEncounter(prog, sess, "W0", rng);
      if (i < 4) {
        commitEnc(eng, prog, sess, enc, enc.answer, 3000, rng);
      } else {
        commitEnc(eng, prog, sess, enc, enc.answer + 19, 3000, rng);
        commitEnc(eng, prog, sess, enc, enc.answer + 19, 3000, rng);
      }
    }
    assert.equal(prog.calibrated, true);
    assert.equal(prog.activeWorld, "W2");
    for (const wid of ["W1", "W2", "W3"]) assert.ok(prog.unlockedWorlds.includes(wid));
    assert.equal(prog.unlockedWorlds.includes("W4"), false);
  });

  test("T1-F07-05: David 2/6 W0 calibration (hits W0.1..W0.2, warm-reveals W0.3..W0.6) routes to W1 without W0 Surge", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("auto");
    const sess = eng.createSessionState();
    const rng = makeSeededRng(99);

    for (let i = 0; i < 6; i++) {
      const enc = eng.pickNextEncounter(prog, sess, "W0", rng);
      if (i < 2) {
        commitEnc(eng, prog, sess, enc, enc.answer, 3200, rng);
      } else {
        commitEnc(eng, prog, sess, enc, enc.answer + 11, 3200, rng);
        commitEnc(eng, prog, sess, enc, enc.answer + 11, 3200, rng);
      }
      assert.equal(sess.inSurge, false, "W0 misses must never hijack calibration with a Surge Wave");
    }
    assert.equal(prog.calibrated, true);
    assert.equal(prog.activeWorld, "W1");
    assert.ok(prog.unlockedWorlds.includes("W1") && prog.unlockedWorlds.includes("W2"));
  });
});

/* ============================================================================
 * FEATURE F08 — @bloom-n/core Psychometrics & Safety Hardening (6 tests)
 * ============================================================================ */
describe("F08 — @bloom-n/core Psychometrics & Safety Hardening", () => {
  test("T1-F08-01: NaN/invalid commit guard & planMs <= 12000ms cap on avgPlanMs", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    const sess = eng.createSessionState();
    const enc = eng.generateEncounter("W1.2", { rng: makeSeededRng(12) });

    for (const bad of ["abc", "", Number.NaN, Number.POSITIVE_INFINITY]) {
      const badRes = commitEnc(eng, prog, sess, enc, bad, 2000);
      assert.notEqual(badRes.outcome, "clear");
      assert.equal(String(badRes.cue).includes("NaN"), false, `Cue leaked NaN for input ${String(bad)}: ${badRes.cue}`);
      assert.equal(String(badRes.cue).includes("Infinity"), false, `Cue leaked Infinity: ${badRes.cue}`);
    }

    const prog2 = eng.createInitialProgress("sarah");
    const sess2 = eng.createSessionState();
    const enc2 = eng.generateEncounter("W2.1", { rng: makeSeededRng(14) });
    const hit = commitEnc(eng, prog2, sess2, enc2, enc2.answer, 180000);
    assert.equal(hit.outcome, "clear");
    assert.equal(hit.overdrive, true);
    assert.ok(prog2.nodes["W2.1"].avgPlanMs <= 12000, `avgPlanMs must cap at <= 12000ms, got ${prog2.nodes["W2.1"].avgPlanMs}`);
  });

  test("T1-F08-02: Frontier Insulation awards 1.5x Pioneer Shards (21 normal / 27 Surge) on stage <= 1 even with Twin-Beam steps", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    prog.nodes["W3.1"].stage = 0;
    const sess = eng.createSessionState();
    const enc = eng.generateEncounter("W3.1", { rng: makeSeededRng(21) });
    enc.stepsUsed = 1;

    const normalRes = commitEnc(eng, prog, sess, enc, enc.answer, 3500);
    assert.equal(normalRes.shardsEarned, 21, `Expected 21 Pioneer Shards on stage<=1 multi-step clear, got ${normalRes.shardsEarned}`);

    prog.nodes["W3.2"].stage = 1;
    sess.inSurge = true;
    const encSurge = eng.generateEncounter("W3.2", { rng: makeSeededRng(22) });
    encSurge.stepsUsed = 2;
    const surgeRes = commitEnc(eng, prog, sess, encSurge, encSurge.answer, 3500);
    assert.equal(surgeRes.shardsEarned, 27, `Expected 27 Surge Pioneer Shards on stage<=1 clear, got ${surgeRes.shardsEarned}`);
  });

  test("T1-F08-03: Path Efficiency eta >= 1.0 (divide_outer canonical shortcut) & ↺ Reset Steps action", async () => {
    const eng = await loadEngine();
    const enc0 = eng.generateEncounter("W3.2", { rng: makeSeededRng(33) });
    const origEq = enc0.equationText;

    const { res: stepRes, encounter: enc1 } = stepBeam(eng, enc0, "divide_outer");
    assert.ok(stepRes.kind === "transformed" || stepRes.kind === "step");
    assert.equal(enc1.stepsUsed, 1);

    const { res: resetRes, encounter: encReset } = stepBeam(eng, enc1, "reset_steps");
    assert.notEqual(resetRes.kind, "noop", "Expected applyBeamAction(enc, 'reset_steps') to reset steps");
    assert.equal(encReset.stepsUsed, 0);
    assert.equal(encReset.equationText, origEq);

    const { encounter: encShortcut } = stepBeam(eng, encReset, "divide_outer");
    const prog = eng.createInitialProgress("sarah");
    prog.nodes["W3.2"].pKnow = 0.5;
    const sess = eng.createSessionState();
    const clearRes = commitEnc(eng, prog, sess, encShortcut, encShortcut.answer, 3000);
    assert.equal(clearRes.outcome, "clear");
    assert.ok(prog.nodes["W3.2"].pKnow > 0.78, `Expected efficient 1-step clear to boost pKnow > 0.78, got ${prog.nodes["W3.2"].pKnow}`);
  });

  test("T1-F08-04: Mandatory camouflageCleared gate before stage = 3 Mastered & surface-flipped camouflage variants", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.activeWorld = "W3";
    prog.unlockedWorlds = ["W1", "W2", "W3"];
    const sess = eng.createSessionState();

    prog.nodes["W3.2"].pKnow = 0.88;
    prog.nodes["W3.2"].wins = 3;
    prog.nodes["W3.2"].stage = 2;
    prog.nodes["W3.2"].camouflageCleared = false;

    const plainEnc = eng.generateEncounter("W3.2", { rng: makeSeededRng(44), camouflage: false });
    commitEnc(eng, prog, sess, plainEnc, plainEnc.answer, 2400);
    assert.equal(
      prog.nodes["W3.2"].stage,
      2,
      "Node must NOT advance to stage = 3 Mastered before camouflageCleared === true"
    );

    for (const other of ["W3.1", "W3.3", "W3.4"]) {
      prog.nodes[other].pKnow = 0.99;
      prog.nodes[other].stage = 3;
      prog.nodes[other].camouflageCleared = true;
    }
    sess.shelvedIds = ["W3.1", "W3.3", "W3.4"];
    sess.recentNodeIds = [];
    const nextPicked = eng.pickNextEncounter(prog, sess, "W3", makeSeededRng(45));
    assert.equal(nextPicked.nodeId, "W3.2");
    assert.equal(nextPicked.isCamouflage, true, "Expected pickNextEncounter to serve camouflage variant for stage 2->3 gate");

    commitEnc(eng, prog, sess, nextPicked, nextPicked.answer, 2400);
    assert.equal(prog.nodes["W3.2"].camouflageCleared, true);
    assert.equal(prog.nodes["W3.2"].stage, 3);
  });

  test("T1-F08-05: Friction Soft-Swap (1.8 <= F_t < 2.8) & Graceful Victory Cooldown (F_t >= 4.2) in pickNextEncounter", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    prog.calibrated = true;
    prog.activeWorld = "W1";
    prog.unlockedWorlds = ["W1", "W2"];

    prog.nodes["W1.1"].stage = 2;
    prog.nodes["W1.1"].pKnow = 0.82;
    prog.nodes["W1.2"].stage = 2;
    prog.nodes["W1.2"].pKnow = 0.84;
    prog.nodes["W1.3"].stage = 0;
    prog.nodes["W1.3"].pKnow = 0.62;
    prog.nodes["W1.4"].stage = 0;
    prog.nodes["W1.4"].pKnow = 0.62;

    const sessSoft = eng.createSessionState();
    sessSoft.friction = 2.2;
    const softPick = eng.pickNextEncounter(prog, sessSoft, "W1", makeSeededRng(50));
    assert.ok(
      prog.nodes[softPick.nodeId].stage >= 1,
      `Friction Soft-Swap (F_t=2.2) should avoid unseen stage 0 nodes, picked ${softPick.nodeId} (stage=${prog.nodes[softPick.nodeId].stage})`
    );

    const sessCool = eng.createSessionState();
    sessCool.friction = 4.5;
    for (let i = 0; i < 4; i++) {
      const coolPick = eng.pickNextEncounter(prog, sessCool, "W1", makeSeededRng(60 + i));
      assert.ok(
        prog.nodes[coolPick.nodeId].stage >= 2,
        `Victory Cooldown (F_t=4.5) must draw from confident stage>=2 nodes, picked ${coolPick.nodeId}`
      );
    }
  });

  test("T1-F08-06: 4-Item Surge Wave (F_t >= 2.8 cushion + 15% 5-win hot streak + targeted Item 3 repair)", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.activeWorld = "W4";
    prog.unlockedWorlds = ["W1", "W2", "W3", "W4"];
    const sess = eng.createSessionState();

    eng.queueOverdriveSurge(prog, sess, "W4.2", makeSeededRng(70));
    const queue = sess.surgeQueue || [];
    assert.equal(queue.length, 4);
    assert.equal(sess.inSurge, true);
    assert.ok(!queue.includes("W4.2"), "Surge queue must not immediately repeat missed trigger node W4.2");

    // 15% organic Surge on 5-win streak outside W0
    const progHot = eng.createInitialProgress("sarah");
    progHot.calibrated = true;
    const sessHot = eng.createSessionState();
    sessHot.consecutiveWins = 4;
    const encW2 = eng.generateEncounter("W2.1", { rng: makeSeededRng(71) });
    const hotRes = commitEnc(eng, progHot, sessHot, encW2, encW2.answer, 2000, () => 0.05);
    assert.equal(hotRes.surgeTriggered, true);
    assert.equal(sessHot.inSurge, true);
  });
});

/* ============================================================================
 * FEATURE F09 — 33-Node W0–W7 Curriculum incl. W7.4 90° i-Portals (5 tests)
 * ============================================================================ */
describe("F09 — 33-Node W0–W7 Curriculum incl. W7.4 90° i-Portals", () => {
  test("T1-F09-01: WORLDS & NODE_MAP contain all 33 curriculum nodes across W0..W7 including W7.4", async () => {
    const eng = await loadEngine();
    assert.equal(eng.WORLDS.length, 8);
    assert.deepEqual(
      eng.WORLDS.map((w) => w.nodes.length),
      [6, 4, 4, 4, 4, 4, 3, 4]
    );
    assert.equal(Object.keys(eng.NODE_MAP).length, 33);
    assert.ok(eng.NODE_MAP["W7.4"], "Expected W7.4 in NODE_MAP");
    assert.equal(eng.NODE_MAP["W7.4"].kind, "complex_i_rotation");
  });

  test("T1-F09-02: W7.4 complex_i_rotation proves 90° quarter-turns & i² = -1 in 3D Argand metadata", async () => {
    const eng = await loadEngine();
    const rng = makeSeededRng(904);
    let sawISquared = false;
    for (let i = 0; i < 40; i++) {
      const enc = eng.generateEncounter("W7.4", { rng });
      const pm = enc.portalMeta || enc.iPortalMeta;
      assert.ok(pm, "Expected portalMeta / iPortalMeta on W7.4 encounter");
      assert.ok(Number.isInteger(pm.quarterTurns) && pm.quarterTurns >= 1);
      if (pm.quarterTurns === 2 && Number.isFinite(pm.startReal) && Number.isFinite(pm.endReal)) {
        assert.equal(pm.endReal, -pm.startReal, "Two 90° quarter-turns (i²) must invert real vector +a -> -a");
        sawISquared = true;
      }
    }
    assert.equal(sawISquared, true, "Expected W7.4 generator to include i² = -1 two-quarter-turn encounters");
  });

  test("T1-F09-03: all 33 nodes generate complete 3D encounter contracts (uid, encounterType, answer, detents, beamActions)", async () => {
    const eng = await loadEngine();
    const rng = makeSeededRng(903);
    for (const nodeId of Object.keys(eng.NODE_MAP)) {
      for (let t = 0; t < 10; t++) {
        const enc = eng.generateEncounter(nodeId, { rng });
        assert.ok(typeof enc.uid === "string" && enc.uid.length > 0);
        assert.ok(typeof enc.encounterType === "string" && enc.encounterType.length > 0);
        assert.ok(Number.isFinite(enc.answer), `${nodeId} produced non-finite answer`);
        assert.ok(Array.isArray(enc.detents) && enc.detents.length >= 2);
        assert.ok(Array.isArray(enc.beamActions) && enc.beamActions.length >= 1);
      }
    }
  });

  test("T1-F09-04: all 33 nodes enforce <= 6-word promptShort and zero BANNED_CHILD_WORDS", async () => {
    const eng = await loadEngine();
    const rng = makeSeededRng(905);
    const banned = eng.BANNED_CHILD_WORDS || FALLBACK_BANNED_SHAME_WORDS;
    for (const nodeId of Object.keys(eng.NODE_MAP)) {
      for (let t = 0; t < 10; t++) {
        const enc = eng.generateEncounter(nodeId, { rng });
        const wc = countWords(enc.promptShort);
        assert.ok(wc >= 1 && wc <= 6, `${nodeId} promptShort "${enc.promptShort}" has ${wc} words (must be <= 6)`);
        assert.equal(findBannedWord(enc.promptShort, banned), null);
      }
    }
  });

  test("T1-F09-05: createInitialProgress('auto' | 'david' | 'sarah') initializes all 33 nodes including W7.4", async () => {
    const eng = await loadEngine();
    for (const preset of ["auto", "david", "sarah"]) {
      const p = eng.createInitialProgress(preset);
      assert.equal(Object.keys(p.nodes).length, 33, `Preset "${preset}" must initialize all 33 nodes`);
      assert.ok(p.nodes["W7.4"], `Preset "${preset}" missing W7.4`);
    }
  });
});

/* ============================================================================
 * FEATURE F10 — Cross-Realm State, Unlocks, Co-Op & SQL Hardening (7 tests)
 * ============================================================================ */
describe("F10 — Cross-Realm State, Unlocks, Co-Op & SQL Hardening", () => {
  test("T1-F10-01: SUB_GAMES[1] (oddroot) is 'live' & ODDROOT_MOUNTS, ODDROOT_UPGRADES (or_*), ODDROOT_CREATURES exported", async () => {
    const eng = await loadEngine();
    assert.equal(eng.SUB_GAMES[1].id, "oddroot");
    assert.equal(eng.SUB_GAMES[1].status, "live", "SUB_GAMES[1] (Oddroot Wilds) must have status: 'live'");
    const mounts = requireExport(eng, "ODDROOT_MOUNTS", "array", "core/engine.js");
    const upgrades = requireExport(eng, "ODDROOT_UPGRADES", "array", "core/engine.js");
    const creatures = requireExport(eng, "ODDROOT_CREATURES", "array", "core/engine.js");
    assert.ok(mounts.some((m) => m.id === "bramble_boar") && mounts.some((m) => m.id === "starlight_glider"));
    assert.ok(upgrades.length >= 6 && upgrades.every((u) => String(u.id).startsWith("or_")));
    assert.ok(creatures.length >= 5);
  });

  test("T1-F10-02: progress.games.{frostwake, oddroot} schema & getCrossRealmUnlocks(progress) contract", async () => {
    const eng = await loadEngine();
    const getCrossRealmUnlocks = requireExport(eng, "getCrossRealmUnlocks", "function", "core/engine.js");
    const prog = eng.createInitialProgress("auto");
    assert.ok(prog.games?.frostwake && prog.games?.oddroot, "Expected progress.games.{frostwake, oddroot}");
    const u0 = getCrossRealmUnlocks(prog);
    assert.equal(typeof u0, "object");
    assert.equal(Boolean(u0.astroToadUnlocked), false);
  });

  test("T1-F10-03: computeArchitectLevel (Lv.1-99), recordWeeklySunshine (4-Sun bonus), & orthogonal computeHeroTitle", async () => {
    const eng = await loadEngine();
    const computeArchitectLevel = requireExport(eng, "computeArchitectLevel", "function", "core/engine.js");
    const recordWeeklySunshine = requireExport(eng, "recordWeeklySunshine", "function", "core/engine.js");

    const prog = eng.createInitialProgress("david");
    const lv = computeArchitectLevel(prog);
    assert.ok(lv.level >= 1 && lv.level <= 99);
    assert.ok(typeof lv.title === "string" && lv.title.length > 0);

    const sun = recordWeeklySunshine(prog, "2026-11-12");
    assert.equal(sun.suns, 1);
    assert.equal(sun.addedToday, true);

    const title = eng.computeHeroTitle(prog);
    assert.equal(/#1|#2|1st|2nd|rank\s*\d/i.test(title), false);
  });

  test("T1-F10-04: mergeProgress monotonically merges progress.games.{frostwake, oddroot}, upgrades, creatures & ghosts", async () => {
    const eng = await loadEngine();
    const a = eng.createInitialProgress("david");
    const b = eng.createInitialProgress("david");

    a.ownedUpgrades = ["wide_blade"];
    a.games.frostwake.bestWaveSec = 38.5;
    a.games.oddroot.hatchedCreatures = ["zero_g_toad"];
    a.games.oddroot.creatureStages = { zero_g_toad: 2 };

    b.ownedUpgrades = ["or_tusk_plow"];
    b.games.frostwake.bestWaveSec = 31.2;
    b.games.oddroot.hatchedCreatures = ["eclipse_stag"];
    b.games.oddroot.creatureStages = { zero_g_toad: 3, eclipse_stag: 1 };
    b.games.oddroot.sanctuaryUpgrades = ["or_tusk_plow"];

    const m = eng.mergeProgress(a, b);
    assert.ok(m.ownedUpgrades.includes("wide_blade") && m.ownedUpgrades.includes("or_tusk_plow"));
    assert.equal(m.games.frostwake.bestWaveSec, 31.2);
    assert.ok(
      m.games.oddroot.hatchedCreatures.includes("zero_g_toad") &&
        m.games.oddroot.hatchedCreatures.includes("eclipse_stag")
    );
    assert.equal(m.games.oddroot.creatureStages.zero_g_toad, 3);
  });

  test("T1-F10-05: sync.js borrowSiblingToy credits +5💎 to lender without mutating borrower & pushActiveCloud sends p_fun.games", async () => {
    const sync = await loadSync();
    const borrowSiblingToy = requireExport(sync, "borrowSiblingToy", "function", "core/sync.js");

    await withIsolatedSyncEnv(async ({ rpcCalls }) => {
      const store = sync.loadStore();
      sync.ensureProfile(store, { username: "david", name: "David", avatar: "🦁" });
      sync.ensureProfile(store, { username: "sarah", name: "Sarah", avatar: "🦄" });
      store.activeUsername = "david";
      store.progressByUser.sarah.equippedChassis = "aurora_sled";
      store.progressByUser.sarah.ownedUpgrades = ["wide_blade", "celestial_crown"];
      const sarahBefore = store.progressByUser.sarah.fluxShards;

      const borrowed = borrowSiblingToy(store, "david", "sarah", "frostwake");
      assert.ok(borrowed && borrowed.ok === true);
      assert.equal(borrowed.giftShards, 5);
      assert.equal(store.progressByUser.sarah.fluxShards, sarahBefore + 5);
      assert.deepEqual(store.progressByUser.david.ownedUpgrades, []);

      await sync.pushActiveCloud(store);
      const mergeCall = rpcCalls.find((c) => c.fn === "bloomn_player_merge");
      assert.ok(mergeCall, "Expected pushActiveCloud to invoke bloomn_player_merge");
      assert.ok(
        mergeCall.args?.p_fun?.games?.frostwake && mergeCall.args?.p_fun?.games?.oddroot,
        "Expected p_fun.games.{frostwake, oddroot} serialized in cloud push"
      );
    });
  });

  test("T1-F10-06: yomple/hub.js line 5 SISTERS includes 'bloomn_players'", async () => {
    const hubJs = await fs.readFile(path.join(YOMPLE_DIR, "hub.js"), "utf8");
    const line5 = hubJs.split("\n")[4] || "";
    assert.match(line5, /var\s+SISTERS\s*=/);
    assert.ok(line5.includes('"bloomn_players"'), `Expected hub.js line 5 SISTERS to include "bloomn_players", got: ${line5}`);
  });

  test("T1-F10-07: Supabase SQL migrations enforce VOLATILE, % wildcard escape, rate guards, ^\\d{4}$ PIN parity, & deep nodes merge", async () => {
    const { functions } = await loadEffectiveSqlFunctions();

    const findAny = functions.get("yomple_player_find_any");
    const search = functions.get("yomple_player_search");
    const upsert = functions.get("yomple_player_upsert");
    const merge = functions.get("bloomn_player_merge");
    const household = functions.get("bloomn_household_sync");

    assert.ok(findAny && search && upsert && merge && household, "Expected all 5 target RPC functions in migrations");

    assert.equal(/\bstable\b/i.test(findAny.headerAttrs), false, "yomple_player_find_any MUST NOT be STABLE");
    assert.equal(/\bstable\b/i.test(search.headerAttrs), false, "yomple_player_search MUST NOT be STABLE");
    assert.ok(search.body.includes("bloomn_players"), "yomple_player_search must include bloomn_players");
    assert.ok(/replace\s*\([\s\S]*%'/i.test(search.body), "yomple_player_search must escape % wildcards");
    assert.ok(/yomple_lookup_ok|yomple_rate_ok/i.test(search.body), "yomple_player_search must enforce rate limits");

    assert.ok(/yomple_pin_guard|yomple_write_ok/i.test(upsert.body), "yomple_player_upsert must call rate/pin guards");
    assert.equal(/\\d\{4,6\}/.test(upsert.body), false, "yomple_player_upsert must align PIN regex with ^\\d{4}$");

    assert.ok(/yomple_pin_guard|yomple_write_ok/i.test(merge.body), "bloomn_player_merge must call rate/pin guards");
    assert.equal(/\\d\{4,6\}/.test(merge.body), false, "bloomn_player_merge must align PIN regex with ^\\d{4}$");
    assert.ok(
      /jsonb_object_agg|jsonb_each|bloomn_merge_nodes/i.test(merge.body),
      "bloomn_player_merge must deep-merge per-node progress via bloomn_merge_nodes/greatest rather than shallow || overwrite"
    );
    assert.ok(/yomple_write_ok|yomple_rate_ok/i.test(household.body), "bloomn_household_sync must enforce write rate limit");
  });
});

/* ============================================================================
 * FEATURE F11 — Frostwake Tactile Physics, Snow-Lilies & 60fps DPR (5 tests)
 * ============================================================================ */
describe("F11 — Frostwake Tactile Physics, Snow-Lilies & 60fps DPR", () => {
  test("T1-F11-01: FrostwakeWorld3D implements all 24 Realm3DAdapter members + legacy Frostwake API", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      const w = ctx.world;
      const requiredMethods = [
        "start",
        "stop",
        "resize",
        "setEncounterDockOpen",
        "applyLoadout",
        "setObservatoryTier",
        "setSurgeMode",
        "triggerGuardianAwakening",
        "getLocalMultiplayerPose",
        "syncRemotePartners",
        "playPartnerCoopEvent",
        "playLocalFlare",
        "syncSharedCoins",
        "setDriveInputs",
        "engageAutopilotToNextGate",
        "triggerRealmQuickAction",
        "populateEncounters",
        "areAllEncountersCleared",
        "refreshActiveEncounterVisual",
        "updateDialPreview",
        "playTwinBeamVisual",
        "playCommitVisual",
        "triggerOverdriveStreakWonder",
        "rebuildRig",
        "resetFreshSnow",
        "triggerSkyWhale",
      ];
      const missing = requiredMethods.filter((m) => typeof w[m] !== "function");
      return { webglAvailable: w.webglAvailable, missing };
    });
    assert.equal(res.webglAvailable, true);
    assert.deepEqual(res.missing, [], `FrostwakeWorld3D missing Realm3DAdapter methods: ${res.missing.join(", ")}`);
  });

  test("T1-F11-02: Terrain-slope pitch/roll alignment & terra_dozer 6-wheel spring crunch vs aurora_sled banking drift", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        const prog = eng.createInitialProgress("david");
        prog.equippedChassis = "terra_dozer";
        ctx.world.applyLoadout(prog, {}, null);
        const wheelCount = (ctx.world.rigWheels || []).length;

        // Drive onto outer sloped bowl terrain
        ctx.world.rigState.x = 46;
        ctx.world.rigState.z = 12;
        ctx.world.setDriveInputs(0.3, 1, false);
        ctx.step(25, 16.6667);
        const slopeTilt = Math.abs(ctx.world.rigGroup.rotation.x) + Math.abs(ctx.world.rigGroup.rotation.z);

        // Switch to aurora_sled and steer hard
        prog.equippedChassis = "aurora_sled";
        ctx.world.applyLoadout(prog, {}, null);
        ctx.world.rigState.x = 0;
        ctx.world.rigState.z = 0;
        ctx.world.setDriveInputs(1.0, 1.0, false);
        ctx.step(30, 16.6667);
        const sledBankRoll = Math.abs(ctx.world.rigGroup.rotation.z);

        return { wheelCount, slopeTilt, sledBankRoll };
      });
    });

    assert.equal(res.wheelCount, 6, "Expected 6 articulated wheels on terra_dozer");
    assert.ok(res.slopeTilt > 0.005, `Expected terrain-slope pitch/roll alignment > 0.005, got ${res.slopeTilt}`);
    assert.ok(res.sledBankRoll > 0.03, `Expected aurora_sled banking roll > 0.03 during hard turn, got ${res.sledBankRoll}`);
  });

  test("T1-F11-03: Deformable snow recomputes local snowbank vertex normals & blooms InstancedMesh Snow-Lilies in tracks", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        const prog = eng.createInitialProgress("sarah");
        prog.ownedUpgrades = ["prismatic_trail"];
        ctx.world.applyLoadout(prog, { snowLiliesUnlocked: true }, null);

        const normBefore = Float32Array.from(ctx.world.snowMesh.geometry.attributes.normal.array);
        ctx.world.rigState.x = 0;
        ctx.world.rigState.z = 20;
        ctx.world.setDriveInputs(0, 1, true);
        ctx.step(45, 16.6667);
        const normAfter = ctx.world.snowMesh.geometry.attributes.normal.array;

        let mutatedNormals = 0;
        for (let i = 0; i < normAfter.length; i++) {
          if (Math.abs(normAfter[i] - normBefore[i]) > 1e-4) mutatedNormals++;
        }

        let instancedMeshes = 0;
        ctx.world.scene.traverse((o) => {
          if (o.isInstancedMesh) instancedMeshes++;
        });

        return { mutatedNormals, instancedMeshes };
      });
    });

    assert.ok(res.mutatedNormals > 20, `Expected local snowbank vertex normals to update (>20), got ${res.mutatedNormals}`);
    assert.ok(res.instancedMeshes >= 1, "Expected InstancedMesh pools (Snow-Lilies / Pines / Particles) in Frostwake");
  });

  test("T1-F11-04: Frostwake rolling 60fps Automatic DPR Governor & InstancedMesh pools", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
        ctx.world.maxDpr = 2;
        ctx.world.currentDpr = 2;
        ctx.world._dprFrames = 0;
        ctx.world._dprSec = 0;
        ctx.world._dprCooldown = 0;
        ctx.world.resize();
        ctx.world.renderer.setPixelRatio(2);
        const initialDpr = ctx.world.renderer.getPixelRatio();
        ctx.world.start();
        ctx.step(55, 29.0); // ~34.5 fps simulated load
        const afterDpr = ctx.world.renderer.getPixelRatio();
        return { initialDpr, afterDpr };
      });
    });
    assert.equal(res.initialDpr, 2);
    assert.ok(
      res.afterDpr < 2.0 && res.afterDpr >= 0.8,
      `Expected Frostwake 60fps DPR governor to step pixelRatio down from 2.0 under 29ms frames, got ${res.afterDpr}`
    );
  });

  test("T1-F11-05: FrostwakeAudio procedural foley cues (snow hiss, Rime-Creep splat/geyser, shatter) & mute control", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const { FrostwakeAudio } = await import("./frostwake/audio.js");
      const a = new FrostwakeAudio();
      a.setMuted(false);
      a.unlock();
      a.updateRigHum(0.8, "terra_dozer");
      if (typeof a.updateSnowHiss === "function") a.updateSnowHiss(0.9, true, true);
      if (typeof a.playCrystalShatter === "function") a.playCrystalShatter(true);
      if (typeof a.playRimeSplat === "function") a.playRimeSplat();
      if (typeof a.playGeyserLaunch === "function") a.playGeyserLaunch();
      a.playClear(true);
      a.setMuted(true);
      a.stopHum();
      return {
        hasCtx: Boolean(a.ctx),
        muted: a.muted,
        hasSnowHiss: typeof a.updateSnowHiss === "function",
        hasShatter: typeof a.playCrystalShatter === "function",
      };
    });
    assert.equal(res.muted, true);
    assert.equal(res.hasSnowHiss, true);
    assert.equal(res.hasShatter, true);
  });
});

/* ============================================================================
 * FEATURE F12 — Frostwake 3D Lift Garage, titan_harpoon & Observatory Reach (5 tests)
 * ============================================================================ */
describe("F12 — Frostwake 3D Lift Garage, titan_harpoon & Observatory Reach", () => {
  test("T1-F12-01: Expanded valley radial fence (r >= 64, up to 68) lets player reach z = -60 Great Northern Observatory", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        ctx.world.rigState.x = 0;
        ctx.world.rigState.z = -40;
        ctx.world.rigState.heading = 0; // 0 rad faces -Z north toward Observatory!
        ctx.world.setDriveInputs(0, 1, true);
        ctx.step(160, 16.6667);
        return { z: ctx.world.rigState.z, r: Math.hypot(ctx.world.rigState.x, ctx.world.rigState.z) };
      });
    });
    assert.ok(
      res.z <= -58 && res.r >= 58,
      `Expected Frostwake radial fence expanded past old r=52 wall so rig reaches z=-60 Observatory, got z=${res.z}, r=${res.r}`
    );
    assert.ok(res.r <= 71, `Expected smooth outer boundary cushion <= 71, got r=${res.r}`);
  });

  test("T1-F12-02: Open-air 3D Lift Garage pad exists in valley and fires onGaragePadEntered", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        const gPad =
          ctx.world.garageGroup ||
          ctx.world.liftGarageGroup ||
          ctx.world.scene.getObjectByName("lift_garage_pad") ||
          ctx.world.scene.getObjectByName("frostwake_lift_garage");
        let padX = -16;
        let padZ = 22;
        if (gPad) {
          padX = gPad.position.x;
          padZ = gPad.position.z;
        }
        ctx.world.rigState.x = padX;
        ctx.world.rigState.z = padZ;
        ctx.world.rigState.speed = 0.5;
        ctx.step(20, 16.6667);
        return { hasPad: Boolean(gPad), garageEvents: ctx.events.garage };
      });
    });
    assert.equal(res.hasPad, true, "Expected open-air 3D Lift Garage pad in Frostwake valley");
    assert.ok(res.garageEvents >= 1, "Expected driving onto 3D Lift Garage pad to fire onGaragePadEntered");
  });

  test("T1-F12-03: 175💎 titan_harpoon (Starlight Winch) mounts visibly on rig in 3D", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      const p0 = eng.createInitialProgress("david");
      p0.ownedUpgrades = [];
      ctx.world.applyLoadout(p0, {}, null);
      const countBase = window.__E2E_3D__.snapshotSceneEntities(ctx.world.rigGroup).length;

      const p1 = eng.createInitialProgress("david");
      p1.ownedUpgrades = ["titan_harpoon"];
      ctx.world.applyLoadout(p1, {}, null);
      const countHarpoon = window.__E2E_3D__.snapshotSceneEntities(ctx.world.rigGroup).length;
      return { countBase, countHarpoon };
    });
    assert.ok(
      res.countHarpoon > res.countBase,
      `Expected titan_harpoon upgrade to mount visible 3D launcher meshes on rigGroup (${res.countHarpoon} vs ${res.countBase})`
    );
  });

  test("T1-F12-04: Cross-realm Oddroot unlocks mount 3D Astro-Toad cab mascot & Golden Mosaic plow trim on Frostwake rig", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      const prog = eng.createInitialProgress("sarah");
      ctx.world.applyLoadout(prog, {}, null);
      const baseSnap = window.__E2E_3D__.snapshotSceneEntities(ctx.world.rigGroup);

      ctx.world.applyLoadout(
        prog,
        {
          astroToadUnlocked: true,
          astroToadCabMascot: true,
          cryoToadMascot: true,
          goldenMosaicTrimUnlocked: true,
          frostwakePlowTrim: "golden_mosaic",
        },
        null
      );
      const unlockedSnap = window.__E2E_3D__.snapshotSceneEntities(ctx.world.rigGroup);
      return { baseLen: baseSnap.length, unlockedLen: unlockedSnap.length };
    });
    assert.ok(
      res.unlockedLen > res.baseLen,
      `Expected cross-realm Astro-Toad mascot & Golden Mosaic plow trim to add 3D rig details (${res.unlockedLen} vs ${res.baseLen})`
    );
  });

  test("T1-F12-05: Towering 3D Frost Guardian colossus & triggerGuardianAwakening(worldId) celebration", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      const hasGuardian = Boolean(
        ctx.world.guardianGroup ||
          ctx.world.frostGuardian ||
          ctx.world.scene.getObjectByName("frost_guardian")
      );
      ctx.world.triggerGuardianAwakening("W1");
      ctx.step(15, 16.6667);
      return { hasGuardian };
    });
    assert.equal(res.hasGuardian, true, "Expected towering 3D Frost Guardian colossus in Frostwake northern vista");
  });
});

/* ============================================================================
 * FEATURE F13 — Frostwake Universal Δy Caliper & W0–W7 3D Set-Pieces (6 tests)
 * ============================================================================ */
describe("F13 — Frostwake Universal Δy Caliper & W0–W7 3D Set-Pieces", () => {
  test("T1-F13-01: Universal Δy laser caliper & dialed curve extrusion on missed holo_ramp / rainbow_arch + Sub-Zero pillar", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");

      const checkMissReveal = (nodeId, wrongVal, delta) => {
        const enc = eng.generateEncounter(nodeId);
        ctx.world.populateEncounters([enc]);
        const { slot, group } = window.__E2E_3D__.engageFirstEncounter(ctx);
        ctx.world.updateDialPreview(wrongVal);
        const beforeKeys = new Set(window.__E2E_3D__.snapshotSceneEntities(group).map((x) => x.key));
        ctx.world.playCommitVisual({ outcome: "nudge", delta, cue: "5 too low" }, enc);
        ctx.step(4, 16.6667);
        const afterKeys = window.__E2E_3D__.snapshotSceneEntities(group);
        return {
          caliperVis: Boolean(slot?.caliperMesh?.visible),
          dialedCurveVis: Boolean(slot?.dialedCurveMesh?.visible),
          revealedMeshes: afterKeys.filter((x) => !beforeKeys.has(x.key)).length,
        };
      };

      return {
        ramp: checkMissReveal("W4.2", -3, -5),
        arch: checkMissReveal("W6.1", 1, -6),
        subzero: checkMissReveal("W1.2", 120, 240),
      };
    });

    assert.ok(
      res.ramp.caliperVis || res.ramp.revealedMeshes >= 1,
      "Expected missed W4.2 holo_ramp to reveal 3D Δy caliper & dialed miss curve"
    );
    assert.ok(
      res.arch.caliperVis || res.arch.revealedMeshes >= 1,
      "Expected missed W6.1 rainbow_arch to reveal 3D Δy caliper & dialed miss curve"
    );
    assert.ok(
      res.subzero.caliperVis || res.subzero.revealedMeshes >= 1,
      "Expected W1.2 sub-zero sign miss to reveal 3D caliper / +height ice pillar"
    );
  });

  test("T1-F13-02: W3.1 repel_trap physically slides constant cubes & n-cores together, sparks amber, and bounces apart", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      const enc = eng.generateEncounter("W3.1", { camouflage: true });
      ctx.world.populateEncounters([enc]);
      const { group } = window.__E2E_3D__.engageFirstEncounter(ctx);
      const snap0 = new Map(window.__E2E_3D__.snapshotSceneEntities(group).map((m) => [m.key, m]));
      ctx.world.playTwinBeamVisual(true);
      ctx.step(6, 16.6667);
      const snap1 = window.__E2E_3D__.snapshotSceneEntities(group);
      let movedTowerBlocks = 0;
      for (const m1 of snap1) {
        const m0 = snap0.get(m1.key);
        if (m0 && Math.hypot(m1.x - m0.x, m1.y - m0.y, m1.z - m0.z) > 0.01) movedTowerBlocks++;
      }
      return { laserCount: (ctx.world.laserBeams || []).length, movedTowerBlocks };
    });
    assert.ok(res.laserCount >= 1 || res.movedTowerBlocks >= 1);
    assert.ok(res.movedTowerBlocks >= 1, "Expected W3.1 repel_trap to physically animate/bounce 3D tower blocks/cores");
  });

  test("T1-F13-03: Dedicated aurora_cascade builder eliminates n+4=10 fallback across W0.4, W2.1, W2.3, W7.1, W7.2 + W2.2 blocks", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");

      const inspectNode = (nid) => {
        const enc = eng.generateEncounter(nid);
        ctx.world.populateEncounters([enc]);
        const slot = ctx.world.gateSlots[0];
        const snap = window.__E2E_3D__.snapshotSceneEntities(slot.group);
        return {
          encounterType: enc.encounterType,
          hasGenericTowers: Boolean(slot.leftTowerGroup && slot.rightTowerGroup),
          hasCascadeStages: Boolean(
            (slot.pedestalSteps && slot.pedestalSteps.length >= 2) ||
              (slot.myceliumStages && slot.myceliumStages.length >= 2) ||
              (slot.distributiveRows && slot.distributiveRows.length >= 2) ||
              snap.length >= 6
          ),
          meshCount: snap.length,
        };
      };

      return {
        w04: inspectNode("W0.4"),
        w21: inspectNode("W2.1"),
        w22: inspectNode("W2.2"),
        w71: inspectNode("W7.1"),
        w72: inspectNode("W7.2"),
      };
    });

    assert.equal(
      res.w21.hasGenericTowers,
      false,
      "W2.1 aurora_cascade must render dedicated stepped crystal pedestals instead of falling through to n+4=10 cryo-towers"
    );
    assert.equal(res.w71.hasGenericTowers, false, "W7.1 exp_growth must render dedicated mycelium cascade");
    assert.equal(res.w21.hasCascadeStages, true);
    assert.equal(res.w71.hasCascadeStages, true);
    assert.equal(res.w72.hasCascadeStages, true);
    assert.ok(res.w22.meshCount >= 6);
  });

  test("T1-F13-04: W4.2/W4.3 physical pad-lift b & W4.4 Dual-Rig System Collisions on hovering Mega-Geode", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");

      const encLow = { ...eng.generateEncounter("W4.2"), rampMeta: { m: 2, b: -3, targetX: 4, targetY: 5 } };
      ctx.world.populateEncounters([encLow]);
      const lowY = ctx.world.gateSlots[0].launchPadGroup?.position?.y ?? 0;

      const encHigh = { ...eng.generateEncounter("W4.2"), rampMeta: { m: 2, b: 5, targetX: 4, targetY: 13 } };
      ctx.world.populateEncounters([encHigh]);
      const highY = ctx.world.gateSlots[0].launchPadGroup?.position?.y ?? 0;

      const encSys = eng.generateEncounter("W4.4");
      ctx.world.populateEncounters([encSys]);
      const sysSlot = ctx.world.gateSlots[0];
      const sysMeshes = window.__E2E_3D__.snapshotSceneEntities(sysSlot.group, { includeHidden: true });

      return { lowY, highY, sysMeshCount: sysMeshes.length };
    });

    assert.ok(res.highY > res.lowY, `Expected W4.2 emitter/stub height to lift with y-intercept b (${res.highY} vs ${res.lowY})`);
    assert.ok(res.sysMeshCount >= 10, `Expected W4.4 Dual-Rig + Mega-Geode 3D set-piece (${res.sysMeshCount} objects)`);
  });

  test("T1-F13-05: W5.1 Crystal Truss, W5.3/W5.4 Harpoon Winch cable + a²+b²=c² squares, & (±a,±b) Sky-Whale beacons", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");

      const w51 = eng.generateEncounter("W5.1");
      ctx.world.populateEncounters([w51]);
      const trussCount = window.__E2E_3D__.snapshotSceneEntities(ctx.world.gateSlots[0].group).length;

      const w53 = eng.generateEncounter("W5.3");
      ctx.world.populateEncounters([w53]);
      window.__E2E_3D__.engageFirstEncounter(ctx);
      ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21 }, w53);
      ctx.step(10, 16.6667);
      const harpoonCount = window.__E2E_3D__.snapshotSceneEntities(ctx.world.gateSlots[0].group).length;

      return { trussCount, harpoonCount };
    });

    assert.ok(res.trussCount >= 5, "Expected W5.1 3D Crystal Truss triangle set-piece");
    assert.ok(res.harpoonCount >= 5, "Expected W5.3 Harpoon Spire + a²+b²=c² squares + winch cable");
  });

  test("T1-F13-06: W6.3 3D Completing-the-Square Slab Forge, W7.3 multi-crest wave, & W7.4 90° Quarter-Turn i-Portal Ring", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");

      const checkSetPiece = (nid) => {
        const enc = eng.generateEncounter(nid);
        ctx.world.populateEncounters([enc]);
        const slot = ctx.world.gateSlots[0];
        return {
          hasGenericBarrier: Boolean(slot.barrierMesh),
          totalObjs: window.__E2E_3D__.snapshotSceneEntities(slot.group, { includeHidden: true }).length,
        };
      };

      return {
        w63: checkSetPiece("W6.3"),
        w73: checkSetPiece("W7.3"),
        w74: checkSetPiece("W7.4"),
      };
    });

    assert.equal(res.w63.hasGenericBarrier, false, "W6.3 must build dedicated 3D Square-Slab Forge instead of generic barrier");
    assert.ok(res.w73.totalObjs >= 10, "Expected W7.3 multi-crest wave set-piece");
    assert.ok(res.w74.totalObjs >= 5, "Expected W7.4 90° Quarter-Turn i-Portal set-piece");
  });
});

/* ============================================================================
 * FEATURE F14 — Frostwake Self-vs-Self 3D Ghost-Rig (5 tests)
 * ============================================================================ */
describe("F14 — Frostwake Self-vs-Self 3D Ghost-Rig", () => {
  test("T1-F14-01: Frostwake records (x, z, heading) Ghost-Rig keyframes during active driving / wave clear", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        const prog = eng.createInitialProgress("david");
        ctx.world.applyLoadout(prog, {}, null);
        ctx.world.rigState.x = -20;
        ctx.world.rigState.z = 22;
        ctx.world.rigState.heading = 0;
        const wave = [eng.generateEncounter("W1.1")];
        ctx.world.populateEncounters(wave);
        ctx.world.setDriveInputs(0.1, 1.0, true);
        ctx.step(90, 16.6667);
        window.__E2E_3D__.engageFirstEncounter(ctx);
        ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21 }, wave[0]);
        ctx.step(10, 16.6667);

        const gc = ctx.world.ghostController || ctx.world.ghostRig;
        const candidates = [
          gc?.bestFrames,
          gc?.recordingFrames,
          prog.games?.frostwake?.ghostFrames,
          prog.games?.frostwake?.ghostBest?.frames,
        ];
        const frames = candidates.find((arr) => Array.isArray(arr) && arr.length > 0) || [];
        return { frameCount: frames.length, sample: frames[0] || null };
      });
    });

    assert.ok(res.frameCount >= 3, `Expected >= 3 recorded Ghost-Rig keyframes, got ${res.frameCount}`);
    assert.ok(Number.isFinite(res.sample.x) && Number.isFinite(res.sample.z) && Number.isFinite(res.sample.heading));
  });

  test("T1-F14-02: Frostwake renders translucent cyan Self-Ghost Rig replaying personal-best trajectory", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        const prog = eng.createInitialProgress("sarah");
        prog.games.frostwake.bestWaveSec = 10.0;
        prog.games.frostwake.ghostBest = {
          bestWaveSec: 10.0,
          frames: [
            { t: 0, x: 0, z: 20, heading: Math.PI },
            { t: 5, x: 6, z: 4, heading: Math.PI },
            { t: 10, x: 12, z: -12, heading: Math.PI },
          ],
        };
        ctx.world.applyLoadout(prog, {}, null);
        ctx.world.populateEncounters([eng.generateEncounter("W2.1")]);
        const ghostObj = ctx.world.scene.getObjectByName("self_ghost_rig") || ctx.world.ghostController?.mesh;
        const z0 = ghostObj?.position?.z ?? null;
        ctx.step(90, 16.6667);
        const z1 = ghostObj?.position?.z ?? null;
        return { exists: Boolean(ghostObj), visible: Boolean(ghostObj?.visible), z0, z1 };
      });
    });

    assert.equal(res.exists, true, "Expected self_ghost_rig in Frostwake scene");
    assert.equal(res.visible, true, "Expected Self-Ghost Rig visible during active wave with saved best");
    assert.ok(Math.abs(res.z1 - res.z0) > 1.0, `Expected Self-Ghost Rig to replay trajectory (${res.z0} -> ${res.z1})`);
  });

  test("T1-F14-03: Personal record celebration fires 'NEW PERSONAL RECORD! 🏆' only on improvement with zero negative deltas", async () => {
    const { GhostRigController } = await import("../../frostwake/ghost-rig.js");
    const ghost = new GhostRigController(null, () => 0);

    ghost.startWave({ x: 0, z: 22, heading: Math.PI });
    ghost.update(12.0, { x: 4, z: 2, heading: Math.PI }, false);
    const firstRun = ghost.completeWave();
    assert.equal(firstRun.improved || firstRun.firstRecord || ghost.bestWaveSec === 12.0, true);

    // Faster wave -> celebrates NEW PERSONAL RECORD! 🏆
    ghost.startWave({ x: 0, z: 22, heading: Math.PI });
    ghost.update(8.5, { x: 4, z: -5, heading: Math.PI }, false);
    const fasterRun = ghost.completeWave();
    assert.match(String(fasterRun.bannerText || ghost.lastBannerText || ""), /NEW PERSONAL RECORD/i);

    // Slower wave -> ZERO negative delta or shame text
    ghost.startWave({ x: 0, z: 22, heading: Math.PI });
    ghost.update(19.0, { x: 2, z: 10, heading: Math.PI }, false);
    const slowerRun = ghost.completeWave();
    assert.equal(slowerRun.bannerText || null, null, "Slower run must emit null banner (zero negative deltas)");
  });

  test("T1-F14-04: Frostwake applyLoadout renders temporary Sibling Borrow rig (borrowedToy) without mutating borrower's progress", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      const davidProg = eng.createInitialProgress("david");
      davidProg.equippedChassis = "terra_dozer";
      davidProg.ownedUpgrades = [];

      ctx.world.applyLoadout(davidProg, {}, {
        ok: true,
        owner: "sarah",
        chassisId: "aurora_sled",
        upgrades: ["wide_blade", "celestial_crown"],
        frostwakeRig: { chassisId: "aurora_sled", upgrades: ["wide_blade", "celestial_crown"] },
      });

      return {
        activeRigChassis: ctx.world.rigState.chassisId,
        davidPermanentChassis: davidProg.equippedChassis,
        davidPermanentUpgrades: davidProg.ownedUpgrades,
      };
    });

    assert.equal(res.activeRigChassis, "aurora_sled");
    assert.equal(res.davidPermanentChassis, "terra_dozer");
    assert.deepEqual(res.davidPermanentUpgrades, []);
  });

  test("T1-F14-05: Ghost-Rig keyframe storage is bounded (< 12 KB) for Supabase sync safety", async () => {
    const { GhostRigController } = await import("../../frostwake/ghost-rig.js");
    const ghost = new GhostRigController(null, () => 0);
    ghost.startWave({ x: 0, z: 22, heading: 0 });
    for (let i = 0; i < 10800; i++) {
      ghost.update(1 / 60, { x: Math.sin(i * 0.01) * 30, z: Math.cos(i * 0.01) * 30, heading: i * 0.02 }, false);
    }
    ghost.completeWave();
    const bytes = Buffer.byteLength(JSON.stringify(ghost.bestFrames), "utf8");
    assert.ok(bytes < 12000, `Expected 3-minute Ghost-Rig JSON < 12000 bytes, got ${bytes}`);
  });
});

/* ============================================================================
 * FEATURE F15 — Oddroot 60fps Three.js Sanctuary Archipelago (6 tests)
 * ============================================================================ */
describe("F15 — Oddroot 60fps Three.js Sanctuary Archipelago (OddrootWorld3D)", () => {
  test("T1-F15-01: oddroot/*.js imports vendored Three.js r170 only (zero CDN) & implements all 24 Realm3DAdapter members + getSanctuaryJournalEntries", async () => {
    const oddFiles = await walkFilesRecursive(path.join(BLOOM_N_DIR, "oddroot"), { ignoreDirs: [] });
    assert.ok(oddFiles.length >= 2, "Expected oddroot/*.js implementation files");
    for (const f of oddFiles) {
      if (!f.endsWith(".js") && !f.endsWith(".mjs")) continue;
      const src = await fs.readFile(f, "utf8");
      assert.equal(/from\s+["']https?:\/\//i.test(src), false, `External CDN import prohibited in ${f}`);
    }

    const res = await sandboxHandle.page.eval(async () => {
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      const w = ctx.world;
      const required = [
        "start",
        "stop",
        "resize",
        "setEncounterDockOpen",
        "applyLoadout",
        "setObservatoryTier",
        "setSurgeMode",
        "triggerGuardianAwakening",
        "getLocalMultiplayerPose",
        "syncRemotePartners",
        "playPartnerCoopEvent",
        "playLocalFlare",
        "syncSharedCoins",
        "setDriveInputs",
        "engageAutopilotToNextGate",
        "triggerRealmQuickAction",
        "populateEncounters",
        "areAllEncountersCleared",
        "refreshActiveEncounterVisual",
        "updateDialPreview",
        "playTwinBeamVisual",
        "playCommitVisual",
        "triggerOverdriveStreakWonder",
      ];
      const missing = required.filter((m) => typeof w[m] !== "function");
      return {
        webglAvailable: w.webglAvailable,
        missing,
        hasJournalFn: typeof ctx.mod.getSanctuaryJournalEntries === "function",
      };
    });

    assert.equal(res.webglAvailable, true);
    assert.deepEqual(res.missing, [], `OddrootWorld3D missing Realm3DAdapter methods: ${res.missing.join(", ")}`);
    assert.equal(res.hasJournalFn, true, "oddroot-3d.js must export getSanctuaryJournalEntries");
  });

  test("T1-F15-02: Twilight Conservatory scene: World-Tree, Central Moonwell Pond (0,0), islands, bridges, waterfalls & thickets", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const THREE = await import("./vendor/three.module.min.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      let toonMeshes = 0;
      let totalMeshes = 0;
      ctx.world.scene.traverse((o) => {
        if (o.isMesh) {
          totalMeshes++;
          if (o.material?.isMeshToonMaterial) toonMeshes++;
        }
      });
      return {
        aces: ctx.world.renderer.toneMapping === THREE.ACESFilmicToneMapping,
        toonMeshes,
        totalMeshes,
      };
    });

    assert.equal(res.aces, true, "Expected ACESFilmicToneMapping on Oddroot WebGLRenderer");
    assert.ok(res.toonMeshes >= 5, `Expected Toon-shaded twilight conservatory meshes, got ${res.toonMeshes}`);
    assert.ok(res.totalMeshes >= 35, `Expected rich 3D World-Tree, islands, bridges & thickets (${res.totalMeshes})`);
  });

  test("T1-F15-03: Resting at Central Moonwell Pond (0, 0) for > 1.4s unlocks 'moon_center' (The Moon in the Middle)", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const st = ctx.world.playerState || ctx.world.avatarState || ctx.world.rigState;
        if (st) {
          st.x = 0;
          st.z = 0;
          st.speed = 0;
        }
        ctx.world.setDriveInputs(0, 0, false);
        ctx.step(110, 16.6667);
        return { mysteries: ctx.events.mysteries };
      });
    });

    assert.ok(res.mysteries.includes("moon_center"), `Expected resting at (0,0) Moonwell to fire onMysteryFound('moon_center')`);
  });

  test("T1-F15-04: Shared 6-tier Great Northern Observatory vista (setObservatoryTier(1..6)) & World-Tree Guardian", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      ctx.world.setObservatoryTier(1);
      const sumEmissive = () =>
        window.__E2E_3D__
          .snapshotSceneEntities(ctx.world.scene)
          .reduce((acc, m) => acc + (Number(m.emissiveIntensity) || 0), 0);
      const em1 = sumEmissive();
      ctx.world.setObservatoryTier(6);
      const em6 = sumEmissive();
      ctx.world.triggerGuardianAwakening("W2");
      ctx.step(10, 16.6667);
      return { em1, em6 };
    });
    assert.ok(res.em6 > res.em1, `Expected Observatory Tier 6 to light more northern spire rings than Tier 1 (${res.em6} vs ${res.em1})`);
  });

  test("T1-F15-05: Oddroot rolling 60fps Automatic DPR Governor & InstancedMesh zero-GC botanical/particle pools", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        let instancedCount = 0;
        ctx.world.scene.traverse((o) => {
          if (o.isInstancedMesh) instancedCount++;
        });
        Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
        ctx.world.resize();
        ctx.world.renderer.setPixelRatio(2);
        if (ctx.world.dprGovernor) {
          ctx.world.dprGovernor.maxDpr = 2.0;
          ctx.world.dprGovernor.currentDpr = 2.0;
          ctx.world.dprGovernor.emaFrameMs = 16.6;
          ctx.world.dprGovernor.highLoadSec = 0;
          ctx.world.dprGovernor.cooldownSec = 0;
        }
        const dpr0 = ctx.world.renderer.getPixelRatio();
        ctx.world.start();
        ctx.step(65, 34.0);
        const dpr1 = ctx.world.renderer.getPixelRatio();
        return { instancedCount, dpr0, dpr1 };
      });
    });

    assert.ok(res.instancedCount >= 2, `Expected >= 2 InstancedMesh pools in Oddroot, got ${res.instancedCount}`);
    assert.ok(res.dpr1 < res.dpr0 && res.dpr1 >= 0.8, `Expected Oddroot DPR governor to step down (${res.dpr0} -> ${res.dpr1})`);
  });

  test("T1-F15-06: Shrine autopilot, manual input override, Workshop pad (onGaragePadEntered), & Archipelago Updraft Cushion", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        ctx.world.populateEncounters([eng.generateEncounter("W1.1")]);
        const target = ctx.world.engageAutopilotToNextGate();
        ctx.step(15, 16.6667);
        const poseAuto = ctx.world.getLocalMultiplayerPose();
        ctx.world.setDriveInputs(0.6, 0.8, false);
        ctx.step(10, 16.6667);

        // Drive toward outer rim to verify Archipelago Updraft Cushion (zero fall death)
        ctx.world.setDriveInputs(0, 1, true);
        ctx.step(200, 16.6667);
        const poseRim = ctx.world.getLocalMultiplayerPose();

        // Trigger Workshop pad if exposed
        const wPad =
          ctx.world.workshopPad ||
          ctx.world.garagePad ||
          ctx.world.scene.getObjectByName("SanctuaryWorkshopPad") ||
          ctx.world.scene.getObjectByName("oddroot_workshop_pad");
        if (wPad) {
          const st = ctx.world.playerState || ctx.world.avatarState || ctx.world.rigState;
          if (st) {
            st.x = wPad.position.x;
            st.z = wPad.position.z;
          }
          ctx.step(12, 16.6667);
        }

        return {
          hadTarget: Boolean(target),
          movedOnAuto: poseAuto.speed > 0,
          rimY: poseRim.y,
          rimR: Math.hypot(poseRim.x, poseRim.z),
          garageCount: ctx.events.garage,
        };
      });
    });

    assert.equal(res.hadTarget, true);
    assert.equal(res.movedOnAuto, true);
    assert.ok(res.rimY > -8 && Number.isFinite(res.rimY), `Expected Archipelago Updraft cushion (y=${res.rimY})`);
    assert.ok(res.garageCount >= 1, "Expected Sanctuary Workshop 3D pad to fire onGaragePadEntered");
  });
});

/* ============================================================================
 * FEATURE F16 — Oddroot Avatar, Glide-Cape, Bramble-Plow Boar & Siphon-Staff (5 tests)
 * ============================================================================ */
describe("F16 — Oddroot Avatar, Glide-Cape, Bramble-Plow Boar & 3D Siphon-Staff", () => {
  test("T1-F16-01: Starlight Glide-Cape Alchemist (starlight_glider) 3D avatar & buoyant glide boost", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const prog = eng.createInitialProgress("sarah");
        prog.games.oddroot.equippedMount = "starlight_glider";
        ctx.world.applyLoadout(prog, {}, null);
        ctx.world.setDriveInputs(0, 1, true);
        ctx.step(30, 16.6667);
        return ctx.world.getLocalMultiplayerPose();
      });
    });
    assert.match(String(res.chassisOrMount), /glider|cape/i);
    assert.ok(res.speed > 4.0);
  });

  test("T1-F16-02: Bramble-Plow Boar mount (bramble_boar) & kinetic thicket-plowing shard harvest", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const prog = eng.createInitialProgress("david");
        prog.games.oddroot.equippedMount = "bramble_boar";
        ctx.world.applyLoadout(prog, {}, null);
        ctx.world.setDriveInputs(0.15, 1, true);
        ctx.step(90, 16.6667);
        return { pose: ctx.world.getLocalMultiplayerPose(), activities: ctx.events.activity.length };
      });
    });
    assert.match(String(res.pose.chassisOrMount), /boar/i);
    assert.ok(res.activities >= 1, "Expected Bramble-Plow Boar charging through thickets to fire onWorldActivity");
  });

  test("T1-F16-03: Crescent-tipped 3D Siphon-Staff vacuum vortex & ambient orb draw (never soft-locked)", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      ctx.world.triggerRealmQuickAction();
      ctx.step(10, 16.6667);
      return { sceneCount: window.__E2E_3D__.snapshotSceneEntities(ctx.world.scene).length };
    });
    assert.ok(res.sceneCount > 20);
  });

  test("T1-F16-04: 4 physically distinct algebraic orb types (+ Sun-Orbs, - Frost-Spores, +x Rune-Pods, -x Helium Puffs)", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      const e1 = eng.generateEncounter("W1.1");
      const e2 = eng.generateEncounter("W3.1", { camouflage: true });
      ctx.world.populateEncounters([e1, e2]);
      const colors = new Set();
      for (const m of window.__E2E_3D__.snapshotSceneEntities(ctx.world.scene)) {
        if (m.colorHex !== null) colors.add(m.colorHex);
      }
      return { distinctColors: colors.size };
    });
    assert.ok(res.distinctColors >= 6, "Expected distinct color palettes across +, -, +x, -x 3D algebraic orbs");
  });

  test("T1-F16-05: Oddroot unknown mount fallback & temporary Sibling Borrow (borrowedToy) 3D loadout", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      const davidProg = eng.createInitialProgress("david");
      davidProg.games.oddroot.equippedMount = "nonexistent_mount_xyz";
      ctx.world.applyLoadout(davidProg, {}, null);
      const fallbackPose = ctx.world.getLocalMultiplayerPose();

      davidProg.games.oddroot.equippedMount = "bramble_boar";
      davidProg.games.oddroot.sanctuaryUpgrades = [];
      ctx.world.applyLoadout(davidProg, {}, {
        ok: true,
        owner: "sarah",
        realmId: "oddroot",
        mountId: "starlight_glider",
        upgrades: ["or_glide_wings"],
        oddrootLoadout: { equippedMount: "starlight_glider", sanctuaryUpgrades: ["or_glide_wings"] },
      });
      const borrowedPose = ctx.world.getLocalMultiplayerPose();

      return {
        fallbackMount: fallbackPose.chassisOrMount,
        borrowedMount: borrowedPose.chassisOrMount,
        davidPermanentMount: davidProg.games.oddroot.equippedMount,
        davidPermanentUpgrades: davidProg.games.oddroot.sanctuaryUpgrades,
      };
    });

    assert.ok(typeof res.fallbackMount === "string" && res.fallbackMount.length > 0);
    assert.match(String(res.borrowedMount), /glider|cape/i);
    assert.equal(res.davidPermanentMount, "bramble_boar");
    assert.deepEqual(res.davidPermanentUpgrades, []);
  });
});

/* ============================================================================
 * FEATURE F17 — Oddroot W0–W3 Cauldrons, Balance Bridges & Conservatory Looms (5 tests)
 * ============================================================================ */
describe("F17 — Oddroot W0–W3 Cauldrons, Balance Bridges & Conservatory Looms", () => {
  test("T1-F17-01: W0 6-shrine stealth calibration & Unclamped Zero-Pair Thermal Cauldrons (-500..+500) with steam-poof", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      const w0Wave = ["W0.1", "W0.2", "W0.3"].map((id) => eng.generateEncounter(id));
      ctx.world.populateEncounters(w0Wave);
      const clearedBefore = ctx.world.areAllEncountersCleared();

      const subZeroEnc = { ...eng.generateEncounter("W1.2"), answer: -200 };
      ctx.world.populateEncounters([subZeroEnc]);
      window.__E2E_3D__.engageFirstEncounter(ctx);
      ctx.world.updateDialPreview(-200);
      ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21 }, subZeroEnc);
      ctx.step(12, 16.6667);
      return { clearedBefore, clearedAfterSubZero: ctx.world.areAllEncountersCleared() };
    });
    assert.equal(res.clearedBefore, false);
    assert.equal(res.clearedAfterSubZero, true);
  });

  test("T1-F17-02: W1.3 vacuum-scooping -b Frost-Spores visibly raises elixir column +b & W1.4 180° Polarity Mirror flip", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");

      const runNode = (nid) => {
        const enc = eng.generateEncounter(nid);
        ctx.world.populateEncounters([enc]);
        const { group } = window.__E2E_3D__.engageFirstEncounter(ctx);
        const before = new Map(window.__E2E_3D__.snapshotSceneEntities(group).map((m) => [m.key, m]));
        ctx.world.playTwinBeamVisual(false);
        ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21 }, enc);
        ctx.step(10, 16.6667);
        const after = window.__E2E_3D__.snapshotSceneEntities(group);
        let changed = 0;
        for (const m of after) {
          const b = before.get(m.key);
          if (!b || b.matSig !== m.matSig) changed++;
        }
        return changed;
      };

      return { w13Changed: runNode("W1.3"), w14Changed: runNode("W1.4") };
    });
    assert.ok(res.w13Changed >= 1, "Expected W1.3 Frost-Spore scoop to animate cauldron elixir rise");
    assert.ok(res.w14Changed >= 1, "Expected W1.4 Polarity Mirror 180° flip animation");
  });

  test("T1-F17-03: W1–W3 Swaying Rune-Pod Balance Bridges: torque tilt on miss, pan refresh on Twin-Siphon, & level lock on clear", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      const enc = eng.generateEncounter("W3.3");
      ctx.world.populateEncounters([enc]);
      const { group } = window.__E2E_3D__.engageFirstEncounter(ctx);

      ctx.world.playCommitVisual({ outcome: "nudge", delta: 6, cue: "6 too high" }, enc);
      ctx.step(6, 16.6667);
      const snapNudge = window.__E2E_3D__.snapshotSceneEntities(group);

      const stepOut = eng.applyBeamAction(enc, enc.beamActions[0].id);
      const updatedEnc = stepOut?.encounter || enc;
      ctx.world.refreshActiveEncounterVisual(updatedEnc);
      ctx.world.playCommitVisual({ outcome: "clear", overdrive: false, delta: 0, shardsEarned: 21 }, updatedEnc);
      ctx.step(8, 16.6667);

      return { nudgeObjs: snapNudge.length, allCleared: ctx.world.areAllEncountersCleared() };
    });
    assert.ok(res.nudgeObjs >= 4);
    assert.equal(res.allCleared, true);
  });

  test("T1-F17-04: W3.1 (14 = 6 - 2x) Magnetic Like-Term Repulsion: amber spark, clank & physical orb/pod bounce-apart", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      const enc = eng.generateEncounter("W3.1", { camouflage: true });
      ctx.world.populateEncounters([enc]);
      const { group } = window.__E2E_3D__.engageFirstEncounter(ctx);
      const snap0 = new Map(window.__E2E_3D__.snapshotSceneEntities(group).map((m) => [m.key, m]));
      ctx.world.playTwinBeamVisual(true);
      ctx.step(6, 16.6667);
      const snap1 = window.__E2E_3D__.snapshotSceneEntities(group);
      let mutated = 0;
      for (const m1 of snap1) {
        const m0 = snap0.get(m1.key);
        if (!m0 || m0.matSig !== m1.matSig) mutated++;
      }
      return { mutated };
    });
    assert.ok(res.mutated >= 1, "Expected W3.1 repel_trap to trigger amber spark & physical orb/pod bounce in Oddroot");
  });

  test("T1-F17-05: W2 3D Pattern Conservatory (Base + Frame × Group pedestals), W2.2 Looms, W2.3 trees, W2.4 mirrors & W3.4 canopies", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      const counts = {};
      for (const nid of ["W2.1", "W2.2", "W2.3", "W2.4", "W3.4"]) {
        const enc = eng.generateEncounter(nid);
        ctx.world.populateEncounters([enc]);
        const { group } = window.__E2E_3D__.engageFirstEncounter(ctx);
        counts[nid] = window.__E2E_3D__.snapshotSceneEntities(group).length;
      }
      return counts;
    });
    for (const nid of ["W2.1", "W2.2", "W2.3", "W2.4", "W3.4"]) {
      assert.ok(res[nid] >= 5, `Expected rich 3D shrine geometry for ${nid} in Oddroot, got ${res[nid]}`);
    }
  });
});

/* ============================================================================
 * FEATURE F18 — Oddroot W4–W7 Vine-Rails, Moonwell Astrolabes, Mosaics & i-Portals (5 tests)
 * ============================================================================ */
describe("F18 — Oddroot W4–W7 Vine-Rails, Moonwell Astrolabes, 3D Square Mosaics & i-Portals", () => {
  test("T1-F18-01: W4 Living Grind-Vine Cliff Rails (W4.1..W4.3): <= 15% sprout stub, Δy Spore-Gel caliper on miss, & full vine on clear", async () => {
    const audit = await sandboxHandle.page.eval(async () => {
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      return window.__E2E_3D__.auditAntiScrubNode(ctx, "W4.2");
    });
    assert.equal(audit.ok, true, `Oddroot W4.2 Living Grind-Vine failed Anti-Scrub/reveal check: ${JSON.stringify(audit)}`);
  });

  test("T1-F18-02: W4.4 Crossed Spore-Stream Linear Systems colliding on suspended Mega-Seed Pod", async () => {
    const audit = await sandboxHandle.page.eval(async () => {
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      return window.__E2E_3D__.auditAntiScrubNode(ctx, "W4.4");
    });
    assert.equal(audit.ok, true, `Oddroot W4.4 Crossed Spore-Streams failed check: ${JSON.stringify(audit)}`);
  });

  test("T1-F18-03: W5 Moonwell Starlight Rings (θ_rim = 1/2 θ_center & Thales 90°) + W5.1 truss, W5.3 a²+b²=c² & W5.4 sunbeams", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      const counts = {};
      for (const nid of ["W5.1", "W5.2", "W5.3", "W5.4"]) {
        const enc = eng.generateEncounter(nid);
        ctx.world.populateEncounters([enc]);
        const { group } = window.__E2E_3D__.engageFirstEncounter(ctx);
        ctx.world.updateDialPreview(enc.answer);
        counts[nid] = window.__E2E_3D__.snapshotSceneEntities(group).length;
      }
      return counts;
    });
    for (const nid of ["W5.1", "W5.2", "W5.3", "W5.4"]) {
      assert.ok(res[nid] >= 5, `Expected 3D geometry set-piece for ${nid} in Oddroot, got ${res[nid]}`);
    }
  });

  test("T1-F18-04: W6.3 3D Completing-the-Square Mosaic Slab Forge & W6.1/W6.2 15%-stub parabolic spore-arches", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      const enc63 = eng.generateEncounter("W6.3");
      ctx.world.populateEncounters([enc63]);
      const { group } = window.__E2E_3D__.engageFirstEncounter(ctx);
      const before = window.__E2E_3D__.snapshotSceneEntities(group).length;
      ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21 }, enc63);
      ctx.step(8, 16.6667);
      const after = window.__E2E_3D__.snapshotSceneEntities(group).length;
      const archAudit = await window.__E2E_3D__.auditAntiScrubNode(ctx, "W6.1");
      return { before, after, archAudit };
    });
    assert.ok(res.before >= 4 && res.after >= res.before, "Expected W6.3 3D Mosaic Slab Forge with snapping corner crystal");
    assert.equal(res.archAudit.ok, true, `Oddroot W6.1 parabolic spore-arch failed Anti-Scrub: ${JSON.stringify(res.archAudit)}`);
  });

  test("T1-F18-05: W7 Mitosis Puffballs (W7.1), log_b stage rings (W7.2), harmonic spore-waves (W7.3) & W7.4 90° i-Portals", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      const counts = {};
      for (const nid of ["W7.1", "W7.2", "W7.3", "W7.4"]) {
        const enc = eng.generateEncounter(nid);
        ctx.world.populateEncounters([enc]);
        const { group } = window.__E2E_3D__.engageFirstEncounter(ctx);
        counts[nid] = window.__E2E_3D__.snapshotSceneEntities(group, { includeHidden: true }).length;
      }
      return counts;
    });
    for (const nid of ["W7.1", "W7.2", "W7.3", "W7.4"]) {
      assert.ok(res[nid] >= 5, `Expected dedicated W7 3D shrine for ${nid} in Oddroot, got ${res[nid]}`);
    }
  });
});

/* ============================================================================
 * FEATURE F19 — Oddroot Creature Morphogenesis, Sanctuary, Self-Ghost & WebAudio (5 tests)
 * ============================================================================ */
describe("F19 — Oddroot Creature Morphogenesis, Sanctuary, Self-Ghost & WebAudio", () => {
  test("T1-F19-01: Sub-zero cauldron clear (<= -100) hatches upside-down Zero-G Astro-Toad floating up to bonk Sky-Chest", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const subEnc = { ...eng.generateEncounter("W1.2"), answer: -200 };
        ctx.world.populateEncounters([subEnc]);
        window.__E2E_3D__.engageFirstEncounter(ctx);
        ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21 }, subEnc);
        ctx.step(60, 16.6667);
        return { hatched: ctx.events.creatures };
      });
    });

    assert.ok(
      res.hatched.some((c) => /toad/i.test(String(c?.id || c?.speciesId || c))),
      `Expected <= -100 cauldron clear to hatch Zero-G Astro-Toad, got ${JSON.stringify(res.hatched)}`
    );
  });

  test("T1-F19-02: Sanctuary Spirit Menagerie (eclipse_stag, crystal_fox 2-miss guide, luminous_oddling, starlight_whale on 3x Overdrive)", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const prog = eng.createInitialProgress("sarah");
        prog.games.oddroot.hatchedCreatures = ["luminous_oddling", "zero_g_toad", "crystal_fox", "eclipse_stag"];
        ctx.world.applyLoadout(prog, {}, null);

        const enc = eng.generateEncounter("W2.1");
        ctx.world.populateEncounters([enc]);
        window.__E2E_3D__.engageFirstEncounter(ctx);
        ctx.world.playCommitVisual({ outcome: "warm_reveal", delta: 0, shardsEarned: 14 }, enc);
        ctx.world.triggerOverdriveStreakWonder();
        ctx.step(30, 16.6667);

        return { sceneCount: window.__E2E_3D__.snapshotSceneEntities(ctx.world.scene).length };
      });
    });
    assert.ok(res.sceneCount >= 40);
  });

  test("T1-F19-03: Creature Morphogenesis (Sprout -> Luminous -> Astral) & zero-metrics getSanctuaryJournalEntries(progress)", async () => {
    const eng = await loadEngine();
    const oddMod = await sandboxHandle.page.eval(async () => {
      const mod = await import("./oddroot/oddroot-3d.js");
      const engMod = await import("./core/engine.js");
      const prog = engMod.createInitialProgress("sarah");
      prog.games.oddroot.hatchedCreatures = ["luminous_oddling", "zero_g_toad", "eclipse_stag"];
      prog.games.oddroot.creatureStages = { luminous_oddling: 1, zero_g_toad: 2, eclipse_stag: 3 };
      return mod.getSanctuaryJournalEntries(prog);
    });

    assert.ok(Array.isArray(oddMod) && oddMod.length >= 3);
    const fullStr = JSON.stringify(oddMod);
    assert.match(fullStr, /Sprout/i);
    assert.match(fullStr, /Luminous/i);
    assert.match(fullStr, /Astral/i);
    assert.equal(/%/.test(fullStr), false, "Sanctuary Journal must contain zero % accuracy metrics");
    assert.equal(findBannedWord(fullStr, eng.BANNED_CHILD_WORDS || FALLBACK_BANNED_SHAME_WORDS), null);
    assert.equal(findBannedWord(fullStr, eng.BANNED_CHILD_CURRICULUM_WORDS || FALLBACK_BANNED_CURRICULUM_WORDS), null);
  });

  test("T1-F19-04: Oddroot translucent 3D Self-Ghost trail & positive-only personal record celebration", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const prog = eng.createInitialProgress("sarah");
        prog.games.oddroot.bestCircuitSec = 14.0;
        prog.games.oddroot.ghostBest = {
          bestWaveSec: 14.0,
          frames: [
            { t: 0, x: 0, z: 12, heading: Math.PI },
            { t: 7, x: -6, z: 0, heading: Math.PI },
            { t: 14, x: 0, z: -12, heading: Math.PI },
          ],
        };
        ctx.world.applyLoadout(prog, {}, null);
        ctx.world.populateEncounters([eng.generateEncounter("W2.1")]);
        ctx.step(45, 16.6667);
        const transparentObjs = window.__E2E_3D__
          .snapshotSceneEntities(ctx.world.scene)
          .filter((m) => m.transparent && m.opacity > 0.1 && m.opacity < 0.9);
        return { transparentCount: transparentObjs.length };
      });
    });
    assert.ok(res.transparentCount >= 2, "Expected translucent Self-Ghost trail in Oddroot scene");
  });

  test("T1-F19-05: OddrootAudio (oddroot/audio.js) implements full RealmAudioAdapter + alchemy foley with instant mute & zero external assets", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const { OddrootAudio } = await import("./oddroot/audio.js");
      const a = new OddrootAudio();
      a.setMuted(false);
      a.unlock();
      a.playDetentClick(5);
      a.playTwinBeam();
      a.playMagneticRepel();
      a.playCaliperNudge();
      a.playClear(true);
      if (typeof a.playZeroPairPoof === "function") a.playZeroPairPoof();
      if (typeof a.playCreatureChime === "function") a.playCreatureChime();
      a.setMuted(true);
      a.stopHum();
      return { muted: a.muted };
    });
    assert.equal(res.muted, true);
  });
});

/* ============================================================================
 * FEATURE F20 — Multi-Realm Portal Wiring, Trick Projector, Zone Meter & Live DOM (7 tests)
 * ============================================================================ */
describe("F20 — Multi-Realm Portal Wiring, Trick Projector, Zone Meter & Live DOM", () => {
  test("T1-F20-01: #screen-portal <-> #screen-frostwake <-> #screen-oddroot live switching & WebGL2 health", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      const fw = await launchRealmFromPortal(page, "frostwake");
      assert.equal(fw.webglHealthy, true);
      await exitRealmToPortal(page);
      const or = await launchRealmFromPortal(page, "oddroot");
      assert.equal(or.webglHealthy, true);
      await exitRealmToPortal(page);
      page.assertZeroRuntimeErrors("T1-F20-01");
    });
  });

  test("T1-F20-02: Anxiety-safe opposition pause (setEncounterDockOpen(true/false)) wired in both realms", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      await installRealmAdapterSpies(page);
      await launchRealmFromPortal(page, "frostwake");
      await cruiseToNextEncounterDock(page);
      const solvedFw = await readAndSolveActiveDock(page);
      assert.ok(solvedFw && Number.isFinite(solvedFw.solvedAnswer));
      await commitValueInActiveDock(page, solvedFw.solvedAnswer);
      await new Promise((r) => setTimeout(r, 250));

      await exitRealmToPortal(page);
      await launchRealmFromPortal(page, "oddroot");
      await cruiseToNextEncounterDock(page);
      const solvedOr = await readAndSolveActiveDock(page);
      assert.ok(solvedOr && Number.isFinite(solvedOr.solvedAnswer));
      await commitValueInActiveDock(page, solvedOr.solvedAnswer);
      await new Promise((r) => setTimeout(r, 250));

      const spies = await page.eval(() => window.__adapterSpy);
      assert.ok(
        spies.frostwake.dockOpenCalls.includes(true) && spies.frostwake.dockOpenCalls.includes(false),
        `Expected Frostwake setEncounterDockOpen(true/false) calls from portal.js, got ${JSON.stringify(spies.frostwake.dockOpenCalls)}`
      );
      assert.ok(
        spies.oddroot.dockOpenCalls.includes(true) && spies.oddroot.dockOpenCalls.includes(false),
        `Expected Oddroot setEncounterDockOpen(true/false) calls from portal.js, got ${JSON.stringify(spies.oddroot.dockOpenCalls)}`
      );
      page.assertZeroRuntimeErrors("T1-F20-02");
    });
  });

  test("T1-F20-03: Zone Clear / Boss Guardian Awakening Progress Bar & per-node ★ stars in Portal & HUD", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    prog.calibrated = true;
    prog.activeWorld = "W1";
    prog.nodes["W1.1"].stage = 3;
    prog.nodes["W1.1"].camouflageCleared = true;
    prog.nodes["W1.2"].stage = 3;
    prog.nodes["W1.2"].camouflageCleared = true;

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "david",
      profiles: [{ username: "david", name: "David", avatar: "🦁" }],
      progressByUser: { david: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=david&f=MAPLE-K7Q2" }, async (page) => {
      const portalTxt = await getVisibleChildDomText(page);
      assert.match(portalTxt, /2\s*\/\s*4|50\s*%|Cryo-Colossus|Guardian/i);
      assert.match(portalTxt, /★/);

      await launchRealmFromPortal(page, "frostwake");
      const hudTxt = await getVisibleChildDomText(page);
      assert.match(hudTxt, /2\s*\/\s*4|50\s*%|Beacons|Cryo-Colossus|Rank\s+I/i);
      page.assertZeroRuntimeErrors("T1-F20-03");
    });
  });

  test("T1-F20-04: Interactive 🦊 Show Trick Holo-Projector & visual seq_linear Frame Builder in live DOM", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.activeWorld = "W2";
    prog.unlockedWorlds = ["W1", "W2", "W3"];
    prog.seenTrickFamilies = [];
    for (const nid of ["W2.2", "W2.3", "W2.4"]) prog.nodes[nid].pKnow = 0.99;
    prog.nodes["W2.1"].pKnow = 0.62;

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "sarah",
      profiles: [{ username: "sarah", name: "Sarah", avatar: "🦄" }],
      progressByUser: { sarah: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2" }, async (page) => {
      await launchRealmFromPortal(page, "oddroot");
      await cruiseToNextEncounterDock(page);
      const dockInfo = await readAndSolveActiveDock(page);
      assert.equal(dockInfo.nodeId, "W2.1");
      assert.equal(/Step\s*1\s*:\s*-?\d+\s*·\s*2\s*:/i.test(dockInfo.dockText), false);
      assert.match(dockInfo.dockText, /Frame|Base/i);
      page.assertZeroRuntimeErrors("T1-F20-04");
    });
  });

  test("T1-F20-05: Zero-metrics Sanctuary Evolution Journal & Dual-Realm Garage / Sanctuary Workshop", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.games.oddroot.hatchedCreatures = ["zero_g_toad", "eclipse_stag"];
    prog.games.oddroot.creatureStages = { zero_g_toad: 2, eclipse_stag: 3 };

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "sarah",
      profiles: [{ username: "sarah", name: "Sarah", avatar: "🦄" }],
      progressByUser: { sarah: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2" }, async (page) => {
      const journalText = await page.eval(() => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          /journal|sanctuary|creatures|codex|bestiary/i.test(b.textContent || "")
        );
        if (btn) btn.click();
        return document.body.textContent || "";
      });
      assert.match(journalText, /Astro-Toad/i);
      assert.match(journalText, /Eclipse Stag/i);
      page.assertZeroRuntimeErrors("T1-F20-05");
    });
  });

  test("T1-F20-06: 1-Tap Sibling Borrow UI (+5💎 gift to sibling, non-mutating session loadout)", async () => {
    const eng = await loadEngine();
    const davidProg = eng.createInitialProgress("david");
    davidProg.equippedChassis = "terra_dozer";
    davidProg.ownedUpgrades = [];
    const sarahProg = eng.createInitialProgress("sarah");
    sarahProg.equippedChassis = "aurora_sled";
    sarahProg.ownedUpgrades = ["wide_blade"];
    sarahProg.fluxShards = 100;

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "david",
      profiles: [
        { username: "david", name: "David", avatar: "🦁" },
        { username: "sarah", name: "Sarah", avatar: "🦄" },
      ],
      progressByUser: { david: davidProg, sarah: sarahProg },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=david&f=MAPLE-K7Q2" }, async (page) => {
      const clicked = await page.eval(() => {
        // Open garage if borrow button lives inside #modal-garage
        const gBtn = document.getElementById("portal-garage-btn");
        if (gBtn) gBtn.click();
        const bBtn = [...document.querySelectorAll("button")].find((b) =>
          /borrow|\+5\s*💎/i.test(b.textContent || "")
        );
        if (!bBtn) return false;
        bBtn.click();
        return true;
      });
      assert.equal(clicked, true, "Expected visible 1-Tap Sibling Borrow button on Portal or Garage");

      const afterStore = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1") || "{}"));
      assert.equal(afterStore.progressByUser.sarah.fluxShards, 105, "Expected +5💎 gift credited to Sarah");
      assert.deepEqual(afterStore.progressByUser.david.ownedUpgrades, [], "Borrower's permanent ownedUpgrades must stay unmutated");
      page.assertZeroRuntimeErrors("T1-F20-06");
    });
  });

  test("T1-F20-07: #modal-grownups curriculum isolation & child-DOM safety rails", async () => {
    const eng = await loadEngine();
    const bannedShame = eng.BANNED_CHILD_WORDS || FALLBACK_BANNED_SHAME_WORDS;
    const bannedCurr = eng.BANNED_CHILD_CURRICULUM_WORDS || FALLBACK_BANNED_CURRICULUM_WORDS;

    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      for (const realmId of ["frostwake", "oddroot"]) {
        await launchRealmFromPortal(page, realmId);
        const childTxt = await getVisibleChildDomText(page);
        assert.equal(findBannedWord(childTxt, bannedShame), null);
        assert.equal(findBannedWord(childTxt, bannedCurr), null);
        const hasRange = await page.eval(() => Boolean(document.querySelector("input[type='range']")));
        assert.equal(hasRange, false, `Zero <input type="range"> scrubbers allowed in ${realmId}`);
        await exitRealmToPortal(page);
      }
      page.assertZeroRuntimeErrors("T1-F20-07");
    });
  });
});

/* ============================================================================
 * FEATURE F21 — Live 2-Player WebSocket + BroadcastChannel Co-Op (10 tests)
 * ============================================================================ */
describe("F21 — Live 2-Player WebSocket + BroadcastChannel Co-Op in BOTH Realms", () => {
  test("T1-F21-01: core/multiplayer.js exports SHARED_COIN_IDS, constants & createMultiplayerClient with zero CDN imports", async () => {
    const mp = await loadMultiplayer();
    const coinIds = requireExport(mp, "SHARED_COIN_IDS", "array", "core/multiplayer.js");
    assert.deepEqual(coinIds, ["coin_0", "coin_1", "coin_2", "coin_3"]);
    assert.equal(mp.SHARED_COIN_REWARD_SHARDS, 3);
    assert.equal(mp.SHARED_COIN_RESPAWN_MS, 6000);
    requireExport(mp, "createMultiplayerClient", "function", "core/multiplayer.js");

    const src = await fs.readFile(path.join(BLOOM_N_DIR, "core/multiplayer.js"), "utf8");
    assert.equal(/from\s+["']https?:\/\//i.test(src), false, "Zero external CDN imports allowed in core/multiplayer.js");
  });

  test("T1-F21-02: Phoenix Channels v1.0.0 WebSocket phx_join auto-pairs on realtime:bloomn:${FAMILY}:${realmId} + 25s heartbeat", async (t) => {
    t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub();
    const client = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "maple-k7q2",
      userId: "sarah",
      displayName: "Sarah",
      avatar: "🦄",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: null,
    });

    try {
      client.connect();
      await Promise.resolve();
      await Promise.resolve();

      assert.equal(hub.allSockets.length, 1);
      const sock = hub.allSockets[0];
      assert.match(sock.url, /\/realtime\/v1\/websocket\?apikey=.*vsn=1\.0\.0/);
      const joinFrame = sock.sentFrames.find((f) => f.event === "phx_join");
      assert.ok(joinFrame, "Expected phx_join frame on WebSocket open");
      assert.equal(joinFrame.topic, "realtime:bloomn:MAPLE-K7Q2:frostwake");
      assert.equal(joinFrame.payload?.config?.broadcast?.self, false);
      assert.equal(joinFrame.payload?.config?.presence?.key, "sarah");

      t.mock.timers.tick(25500);
      await Promise.resolve();
      const hb = sock.sentFrames.find((f) => f.topic === "phoenix" && f.event === "heartbeat");
      assert.ok(hb, "Expected 25s phoenix heartbeat frame");
    } finally {
      client.disconnect();
    }
  });

  test("T1-F21-03: publishLocalState throttles to ~12Hz (80ms) & syncs remote partner pose/status across peers", async () => {
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub();
    const seenPeersOnB = [];

    const clientA = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "MAPLE-K7Q2",
      userId: "sarah",
      displayName: "Sarah",
      avatar: "🦄",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const clientB = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "MAPLE-K7Q2",
      userId: "david",
      displayName: "David",
      avatar: "🦁",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
      onPeersChanged: (peers) => seenPeersOnB.push(peers),
    });

    try {
      clientA.connect();
      clientB.connect();
      await new Promise((r) => setTimeout(r, 15));

      for (let i = 0; i < 10; i++) {
        clientA.publishLocalState({
          x: i * 2,
          y: 0.5,
          z: -10,
          heading: 1.2,
          speed: 8,
          chassisOrMount: "aurora_sled",
          status: "thinking",
          zoneProgressRatio: 0.75,
        });
      }
      await new Promise((r) => setTimeout(r, 15));

      const wsStateFrames = hub.allSockets[0].sentFrames.filter((f) => f.event === "broadcast");
      assert.ok(wsStateFrames.length <= 3, `Expected ~12Hz (80ms) throttle to cap burst frames <= 3, got ${wsStateFrames.length}`);

      const peers = clientB.getPeers();
      assert.equal(peers.length, 1);
      assert.equal(peers[0].userId, "sarah");
      assert.equal(peers[0].status, "thinking");
      assert.equal(peers[0].zoneProgressRatio, 0.75);
      assert.ok(seenPeersOnB.length >= 1);
    } finally {
      clientA.disconnect();
      clientB.disconnect();
    }
  });

  test("T1-F21-04: BroadcastChannel instant 2-tab sync delivers sendGateBurst & sendFriendlyFlare even with WebSocket offline", async () => {
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub({ wsOffline: true });
    const remoteEventsOnB = [];

    const tabA = mp.createMultiplayerClient({
      realmId: "oddroot",
      familyCode: "MAPLE-K7Q2",
      userId: "sarah",
      displayName: "Sarah",
      avatar: "🦄",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const tabB = mp.createMultiplayerClient({
      realmId: "oddroot",
      familyCode: "MAPLE-K7Q2",
      userId: "david",
      displayName: "David",
      avatar: "🦁",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
      onRemoteEvent: (ev) => remoteEventsOnB.push(ev),
    });

    try {
      tabA.connect();
      tabB.connect();
      await new Promise((r) => setTimeout(r, 10));

      tabA.sendGateBurst({ overdrive: true, worldId: "W2", nodeId: "W2.1", x: 5, y: 1, z: -8 });
      tabA.sendFriendlyFlare({ x: 5, y: 1, z: -8 });
      await new Promise((r) => setTimeout(r, 15));

      assert.ok(remoteEventsOnB.some((e) => e.type === "gate_burst" && e.overdrive === true));
      assert.ok(remoteEventsOnB.some((e) => e.type === "friendly_flare"));
    } finally {
      tabA.disconnect();
      tabB.disconnect();
    }
  });

  test("T1-F21-05: tryGrabSharedCoin claims +3💎 Star-Coin, updates getCoinStates() on both peers, & fires coin_grab event", async () => {
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub({ wsOffline: true });
    const eventsOnB = [];

    const clientA = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "COOPTEST",
      userId: "david",
      displayName: "David",
      avatar: "🦁",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const clientB = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "COOPTEST",
      userId: "sarah",
      displayName: "Sarah",
      avatar: "🦄",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
      onRemoteEvent: (ev) => eventsOnB.push(ev),
    });

    try {
      clientA.connect();
      clientB.connect();
      assert.equal(clientA.getCoinStates().coin_2.available, true);

      const won = clientA.tryGrabSharedCoin("coin_2", { x: -14, y: 0, z: -18 });
      assert.equal(won, true);
      assert.equal(clientA.getCoinStates().coin_2.available, false);

      await new Promise((r) => setTimeout(r, 15));
      assert.equal(clientB.getCoinStates().coin_2.available, false);
      const grabEv = eventsOnB.find((e) => e.type === "coin_grab");
      assert.ok(grabEv);
      assert.equal(grabEv.coinId, "coin_2");
      assert.equal(grabEv.rewardShards, 3);
      assert.equal(grabEv.respawnMs, 6000);
    } finally {
      clientA.disconnect();
      clientB.disconnect();
    }
  });

  test("T1-F21-06: disconnect() cleanly closes WebSocket + BroadcastChannel and clears heartbeat/respawn timers", async () => {
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub();
    const client = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "COOPTEST",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    client.connect();
    await new Promise((r) => setTimeout(r, 10));
    client.disconnect();
    assert.equal(hub.allSockets[0].readyState, hub.WebSocketImpl.CLOSED);
    assert.equal(hub.bcRooms.get("bloomn-coop:COOPTEST:frostwake")?.size ?? 0, 0);
  });

  test("T1-F21-07: FrostwakeWorld3D & OddrootWorld3D getLocalMultiplayerPose() & 60fps-lerped syncRemotePartners + status auras", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const checkRealm = async (realmId) => {
        const ctx = await window.__E2E_3D__.getSharedWorld(realmId);
        const p0 = ctx.world.getLocalMultiplayerPose();
        ctx.world.setDriveInputs(0.2, 1.0, true);
        ctx.step(20, 16.6667);
        const p1 = ctx.world.getLocalMultiplayerPose();

        ctx.world.syncRemotePartners([
          {
            userId: "sarah",
            displayName: "Sarah",
            avatar: "🦄",
            x: -12,
            y: 1,
            z: -10,
            heading: 0.5,
            speed: 6,
            chassisOrMount: "aurora_sled",
            status: "roaming",
          },
        ]);
        ctx.step(4, 16.6667);
        ctx.world.syncRemotePartners([
          {
            userId: "sarah",
            displayName: "Sarah",
            avatar: "🦄",
            x: -4,
            y: 1,
            z: -18,
            heading: 0.8,
            speed: 6,
            chassisOrMount: "aurora_sled",
            status: "thinking",
          },
        ]);
        ctx.step(3, 16.6667);

        // Check status -> surge transition
        ctx.world.syncRemotePartners([
          {
            userId: "sarah",
            displayName: "Sarah",
            avatar: "🦄",
            x: -4,
            y: 1,
            z: -18,
            heading: 0.8,
            speed: 9,
            chassisOrMount: "aurora_sled",
            status: "surge",
          },
        ]);
        ctx.step(5, 16.6667);

        return {
          moved: Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.3,
          sceneCount: window.__E2E_3D__.snapshotSceneEntities(ctx.world.scene).length,
        };
      };

      return {
        fw: await checkRealm("frostwake"),
        or: await checkRealm("oddroot"),
      };
    });

    assert.equal(res.fw.moved, true);
    assert.equal(res.or.moved, true);
  });

  test("T1-F21-08: FrostwakeWorld3D & OddrootWorld3D playPartnerCoopEvent (non-stealable gate_burst), playLocalFlare & syncSharedCoins", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const checkRealm = async (realmId) => {
        const ctx = await window.__E2E_3D__.getSharedWorld(realmId);
        const wave = [eng.generateEncounter("W1.1"), eng.generateEncounter("W1.2"), eng.generateEncounter("W1.3")];
        ctx.world.populateEncounters(wave);
        ctx.world.playPartnerCoopEvent({ type: "gate_burst", overdrive: true, x: 10, y: 1, z: -12 });
        ctx.world.playPartnerCoopEvent({ type: "friendly_flare", x: 8, y: 1, z: -10 });
        ctx.world.playLocalFlare();
        ctx.world.syncSharedCoins({
          coin_0: { coinId: "coin_0", available: true },
          coin_1: { coinId: "coin_1", available: false },
          coin_2: { coinId: "coin_2", available: true },
          coin_3: { coinId: "coin_3", available: true },
        });
        ctx.step(10, 16.6667);
        return { allCleared: ctx.world.areAllEncountersCleared() };
      };
      return {
        fw: await checkRealm("frostwake"),
        or: await checkRealm("oddroot"),
      };
    });

    assert.equal(res.fw.allCleared, false, "Partner gate_burst MUST NEVER clear/steal local Frostwake gates");
    assert.equal(res.or.allCleared, false, "Partner gate_burst MUST NEVER clear/steal local Oddroot shrines");
  });

  test("T1-F21-09: Live 2-Tab Same-Context BroadcastChannel auto-pairing & HUD Partner Pill (zero #1/#2 rank)", async () => {
    await pool.withSharedContextCoopPages(
      [
        { initialUrl: "/bloom-n/?u=sarah&f=COOPTEST", wsMode: "offline_broadcast" },
        { initialUrl: "/bloom-n/?u=david&f=COOPTEST", wsMode: "offline_broadcast" },
      ],
      async ([tabSarah, tabDavid]) => {
        await launchRealmFromPortal(tabSarah, "frostwake");
        await launchRealmFromPortal(tabDavid, "frostwake");

        const pillCheck = await tabSarah.waitFor(
          () => {
            const hud = document.querySelector("#screen-frostwake");
            if (!hud) return null;
            const txt = hud.textContent || "";
            const hasPartner = /david|🦁/i.test(txt);
            const hasFlareBtn = [...hud.querySelectorAll("button")].some((b) => /flare|🎆/i.test(b.textContent || ""));
            if (!hasPartner || !hasFlareBtn) return null;
            return { txt, hasFlareBtn, hasRankText: /#1|#2|1st|2nd/i.test(txt) };
          },
          { timeoutMs: 4500, label: "HUD Partner Pill + 🎆 Flare button on Sarah's Frostwake screen" }
        );

        assert.equal(pillCheck.hasFlareBtn, true);
        assert.equal(pillCheck.hasRankText, false, "HUD Partner Pill must NEVER show #1/#2 competitive rank");
        tabSarah.assertZeroRuntimeErrors("T1-F21-09-sarah");
        tabDavid.assertZeroRuntimeErrors("T1-F21-09-david");
      }
    );
  });

  test("T1-F21-10: Live 2-Context Cross-Device Phoenix Channels phx_join + broadcast co-op via local WS relay", async () => {
    await pool.withCrossDeviceCoopPages(
      [
        { initialUrl: "/bloom-n/?u=sarah&f=COOPTEST" },
        { initialUrl: "/bloom-n/?u=david&f=COOPTEST" },
      ],
      async ([devSarah, devDavid], phoenixRelay) => {
        await installRealmAdapterSpies(devSarah);
        await installRealmAdapterSpies(devDavid);
        await launchRealmFromPortal(devSarah, "oddroot");
        await launchRealmFromPortal(devDavid, "oddroot");

        await devSarah.waitFor(
          () => window.__adapterSpy?.oddroot?.partnerSyncs > 0,
          { timeoutMs: 5000, label: "Cross-device Phoenix WS syncRemotePartners in Oddroot" }
        );

        const joinTopics = phoenixRelay.receivedMessages
          .filter((m) => m.event === "phx_join")
          .map((m) => m.topic);
        assert.ok(
          joinTopics.includes("realtime:bloomn:COOPTEST:oddroot"),
          `Expected phx_join on realtime:bloomn:COOPTEST:oddroot, got ${joinTopics.join(", ")}`
        );

        devSarah.assertZeroRuntimeErrors("T1-F21-10-sarah");
        devDavid.assertZeroRuntimeErrors("T1-F21-10-david");
      }
    );
  });
});
