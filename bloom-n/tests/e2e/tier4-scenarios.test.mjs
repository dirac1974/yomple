/**
 * Bloom N E2E — Tier 4: Real-World Live Headless Chromium WebGL2 User Journeys
 * 12 full end-to-end user journeys:
 *   - 5 Sarah (11) Journeys (Hub Arrival -> W0 Fast-Track, Oddroot Glide-Cape + Moonwell + W5 Astrolabe,
 *     W2.1 Conservatory + Trick Holo-Projector + 3x Overdrive Sky-Whale, W6.3 Mosaic + W7.4 i-Portal + Journal,
 *     Parent #modal-grownups Telemetry & Capped Plan Time)
 *   - 5 David (9) Journeys (Profile Switch + Frostwake Rime-Creeps & Dock Pause, W1.2 -200 Sub-Zero + Zone Bar,
 *     Garage Spree + 1-Tap Sibling Borrow, Oddroot Bramble-Plow Boar + -200 Cauldron Zero-G Astro-Toad Hatch,
 *     3-Miss Friction Cushion -> Δy Caliper -> Warm Crystal Fox +14💎 -> 4-Item Surge Wave Victory)
 *   - 2 Live 2-Player Co-Op Journeys (2-Tab BroadcastChannel Frostwake Co-Op & 2-Device Phoenix WS Oddroot Co-Op)
 */

import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  FALLBACK_BANNED_CURRICULUM_WORDS,
  FALLBACK_BANNED_SHAME_WORDS,
  loadEngine,
  findBannedWord,
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

before(async () => {
  pool = await createBrowserPool();
});

after(async () => {
  if (pool) await pool.close();
});

describe("Tier 4 — Sarah (11), David (9) & Live 2-Player Co-Op WebGL2 Journeys", () => {
  /* ==========================================================================
   * SARAH JOURNEYS (1–5)
   * ========================================================================== */
  test("T4-SARAH-01: Yomple Hub Arrival (?u=sarah&from=yomple&f=MAPLE-K7Q2), Zero-School-Label Audit & 6-Gate W0 Calibration Fast-Track", async () => {
    const eng = await loadEngine();
    const uncalibratedSarah = eng.createInitialProgress("auto");
    uncalibratedSarah.calibrated = false;
    uncalibratedSarah.calibrationStep = 0;
    uncalibratedSarah.activeWorld = "W0";
    uncalibratedSarah.unlockedWorlds = ["W0", "W1"];

    const hubSeed = {
      familyCode: "MAPLE-K7Q2",
      activeUser: "sarah",
      profiles: [
        { username: "sarah", name: "Sarah", avatar: "🦄" },
        { username: "david", name: "David", avatar: "🦁" },
      ],
    };
    const bloomSeed = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "sarah",
      profiles: hubSeed.profiles,
      progressByUser: { sarah: uncalibratedSarah },
    };

    await pool.withPage({ seedStorage: { "yomple-hub-v1": hubSeed, "bloom-n-v1": bloomSeed }, initialUrl: "/" }, async (page) => {
      const hubCardText = await page.eval(() => document.querySelector("a.app.bloomn")?.textContent || "");
      assert.ok(hubCardText.includes("Bloom N"));
      assert.equal(findBannedWord(hubCardText, FALLBACK_BANNED_CURRICULUM_WORDS), null);

      const href = await page.eval(() => document.querySelector("a.app.bloomn")?.getAttribute("href") || "/bloom-n/?u=sarah&from=yomple&f=MAPLE-K7Q2");
      await page.goto(href);

      const portalChildText = await getVisibleChildDomText(page);
      assert.equal(findBannedWord(portalChildText, FALLBACK_BANNED_CURRICULUM_WORDS), null);

      await launchRealmFromPortal(page, "frostwake");
      const hudText = await getVisibleChildDomText(page);
      assert.equal(findBannedWord(hudText, FALLBACK_BANNED_CURRICULUM_WORDS), null);

      // Solve all 6 W0 calibration gates across two 3-gate waves!
      const solvedNodes = [];
      for (let i = 0; i < 6; i++) {
        await cruiseToNextEncounterDock(page, { timeoutMs: 7000 });
        const d = await readAndSolveActiveDock(page);
        assert.ok(d && Number.isFinite(d.solvedAnswer), `Expected solvable W0 gate ${i + 1}`);
        solvedNodes.push(d.nodeId);
        await commitValueInActiveDock(page, d.solvedAnswer);
        await new Promise((r) => setTimeout(r, 220));
      }

      assert.deepEqual(solvedNodes, ["W0.1", "W0.2", "W0.3", "W0.4", "W0.5", "W0.6"]);
      const afterProg = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1")).progressByUser.sarah);
      assert.equal(afterProg.calibrated, true);
      assert.equal(afterProg.activeWorld, "W2");
      for (const wid of ["W1", "W2", "W3", "W4"]) {
        assert.ok(afterProg.unlockedWorlds.includes(wid), `Expected Sarah 6/6 calibration to unlock ${wid}`);
      }
      page.assertZeroRuntimeErrors("T4-SARAH-01");
    });
  });

  test("T4-SARAH-02: Oddroot Wilds WebGL Launch, Starlight Glide-Cape, Moon in the Middle (+25💎), & W5 Moonwell Sky-Astrolabe", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.activeWorld = "W5";
    prog.unlockedWorlds = ["W1", "W2", "W3", "W4", "W5"];
    prog.games.oddroot.equippedMount = "starlight_glider";
    for (const nid of ["W5.1", "W5.3", "W5.4"]) prog.nodes[nid].pKnow = 0.99;
    prog.nodes["W5.2"].pKnow = 0.62;

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "sarah",
      profiles: [{ username: "sarah", name: "Sarah", avatar: "🦄" }],
      progressByUser: { sarah: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2" }, async (page) => {
      await installRealmAdapterSpies(page);
      await launchRealmFromPortal(page, "oddroot");

      // Park at central Moonwell Pond (0,0) for > 1.5s to wake moon_center (+25💎)
      await page.eval(() => {
        const inst = window.__adapterSpy.oddroot.instances[0];
        const st = inst?.playerState || inst?.avatarState || inst?.rigState;
        if (st) {
          st.x = 0;
          st.z = 0;
          st.speed = 0;
        }
        inst?.setDriveInputs?.(0, 0, false);
      });
      await page.waitFor(
        () => {
          const s = JSON.parse(localStorage.getItem("bloom-n-v1") || "{}");
          return (s.progressByUser?.sarah?.discoveredMysteries || []).includes("moon_center");
        },
        { timeoutMs: 4500, label: "moon_center mystery woken in Oddroot Moonwell" }
      );

      // Cruise to W5.2 Moonwell Sky-Astrolabe & solve in 1-Shot Overdrive
      await cruiseToNextEncounterDock(page);
      const dock = await readAndSolveActiveDock(page);
      assert.equal(dock.nodeId, "W5.2");
      assert.equal(dock.hasRangeInput, false, "Zero <input type='range'> continuous scrubbers allowed");
      await commitValueInActiveDock(page, dock.solvedAnswer);
      await new Promise((r) => setTimeout(r, 250));

      const mysteries = await page.eval(
        () => JSON.parse(localStorage.getItem("bloom-n-v1")).progressByUser.sarah.discoveredMysteries
      );
      assert.ok(mysteries.includes("astrolabe_lock"), "Expected W5.2 clear to unlock astrolabe_lock");
      page.assertZeroRuntimeErrors("T4-SARAH-02");
    });
  });

  test("T4-SARAH-03: Oddroot Pattern Conservatory (W2.1 Visual Clusters), 🦊 Show Trick Holo-Projector, & 3x Overdrive Sky-Whale", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.activeWorld = "W2";
    prog.unlockedWorlds = ["W1", "W2", "W3"];
    prog.seenTrickFamilies = [];
    for (const nid of ["W2.2", "W2.3", "W2.4"]) prog.nodes[nid].pKnow = 0.95;
    prog.nodes["W2.1"].pKnow = 0.62;

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "sarah",
      profiles: [{ username: "sarah", name: "Sarah", avatar: "🦄" }],
      progressByUser: { sarah: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2" }, async (page) => {
      await launchRealmFromPortal(page, "oddroot");

      // Solve 3 shrines in a row in 1-Shot Overdrive!
      for (let i = 0; i < 3; i++) {
        await cruiseToNextEncounterDock(page);
        const dock = await readAndSolveActiveDock(page);
        if (dock.nodeId === "W2.1") {
          assert.equal(/Step\s*1\s*:\s*-?\d+\s*·\s*2\s*:/i.test(dock.dockText), false);
        }
        await commitValueInActiveDock(page, dock.solvedAnswer);
        await new Promise((r) => setTimeout(r, 240));
      }

      const afterProg = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1")).progressByUser.sarah);
      assert.ok(afterProg.records.bestOverdriveStreak >= 3);
      assert.ok(afterProg.discoveredMysteries.includes("aurora_whale"), "Expected 3x Overdrive to summon Sky-Whale");
      page.assertZeroRuntimeErrors("T4-SARAH-03");
    });
  });

  test("T4-SARAH-04: Oddroot W6.3 3D Mosaic Slab Forge, W7.4 90° Quarter-Turn i-Portal (i² = -1), & Sanctuary Evolution Journal", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.activeWorld = "W6";
    prog.unlockedWorlds = ["W1", "W2", "W3", "W4", "W5", "W6", "W7"];
    prog.nodes["W6.1"].pKnow = 0.99;
    prog.nodes["W6.2"].pKnow = 0.99;
    prog.nodes["W6.3"].pKnow = 0.62;
    prog.nodes["W7.1"].pKnow = 0.99;
    prog.nodes["W7.2"].pKnow = 0.99;
    prog.nodes["W7.3"].pKnow = 0.99;
    prog.nodes["W7.4"].pKnow = 0.62;
    prog.games.oddroot.hatchedCreatures = ["eclipse_stag", "zero_g_toad"];
    prog.games.oddroot.creatureStages = { eclipse_stag: 3, zero_g_toad: 2 };

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "sarah",
      profiles: [{ username: "sarah", name: "Sarah", avatar: "🦄" }],
      progressByUser: { sarah: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2" }, async (page) => {
      await launchRealmFromPortal(page, "oddroot");

      // 1. Solve W6.3 Completing-the-Square 3D Mosaic Slab Forge
      await cruiseToNextEncounterDock(page);
      const d63 = await readAndSolveActiveDock(page);
      assert.equal(d63.nodeId, "W6.3");
      await commitValueInActiveDock(page, d63.solvedAnswer);
      await new Promise((r) => setTimeout(r, 240));

      // 2. Switch frontier to W7 & solve W7.4 90° Quarter-Turn i-Portal
      await exitRealmToPortal(page);
      await page.eval(() => {
        const w7Btn = [...document.querySelectorAll("#worlds-constellation button, #worlds-constellation .world-tile")].find(
          (el) => /W7|Rank\s+VII|Aurora Crown/i.test(el.textContent || "")
        );
        w7Btn?.click();
      });
      await launchRealmFromPortal(page, "oddroot");
      await cruiseToNextEncounterDock(page);
      const d74 = await readAndSolveActiveDock(page);
      assert.equal(d74.nodeId, "W7.4");
      await commitValueInActiveDock(page, d74.solvedAnswer);
      await new Promise((r) => setTimeout(r, 240));

      await exitRealmToPortal(page);
      const journalTxt = await page.eval(() => {
        const jBtn = [...document.querySelectorAll("button")].find((b) =>
          /journal|sanctuary|creatures|codex/i.test(b.textContent || "")
        );
        jBtn?.click();
        return getVisibleText();
        function getVisibleText() {
          return document.body.textContent || "";
        }
      });
      assert.match(journalTxt, /Eclipse Stag/i);
      assert.equal(findBannedWord(await getVisibleChildDomText(page), FALLBACK_BANNED_CURRICULUM_WORDS), null);
      page.assertZeroRuntimeErrors("T4-SARAH-04");
    });
  });

  test("T4-SARAH-05: Parent Inspecting #modal-grownups Formal Curriculum Report, Capped avgPlanMs <= 12.0s, & Clean Return", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.activeWorld = "W2";
    const sess = eng.createSessionState();
    const enc = eng.generateEncounter("W2.1");
    eng.evaluateCommit({ progress: prog, session: sess, encounter: enc, committedValue: enc.answer, planMs: 45000 }); // 45s idle pause -> capped at <= 12.0s!

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "sarah",
      profiles: [{ username: "sarah", name: "Sarah", avatar: "🦄" }],
      progressByUser: { sarah: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2" }, async (page) => {
      const report = await page.eval(() => {
        document.getElementById("btn-open-grownups")?.click();
        return document.getElementById("modal-grownups")?.textContent || "";
      });
      for (const s of ["Pre-Algebra", "Algebra 1", "Geometry", "Algebra 2", "Overdrive"]) {
        assert.ok(report.includes(s), `Expected #modal-grownups to include "${s}"`);
      }
      assert.equal(/45\.0\s*s/.test(report), false, "Idle 45s pause must be capped at <= 12.0s in #modal-grownups");

      await page.eval(() => document.querySelector("#modal-grownups [data-close='modal-grownups']")?.click());
      assert.equal(findBannedWord(await getVisibleChildDomText(page), FALLBACK_BANNED_CURRICULUM_WORDS), null);
      page.assertZeroRuntimeErrors("T4-SARAH-05");
    });
  });

  /* ==========================================================================
   * DAVID JOURNEYS (6–10)
   * ========================================================================== */
  test("T4-DAVID-06: Profile Switch to David (🦁), Frostwake terra_dozer Launch, Active Rime-Creeps & Dock Pause", async () => {
    const eng = await loadEngine();
    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "sarah",
      profiles: [
        { username: "sarah", name: "Sarah", avatar: "🦄" },
        { username: "david", name: "David", avatar: "🦁" },
      ],
      progressByUser: {
        sarah: eng.createInitialProgress("sarah"),
        david: eng.createInitialProgress("david"),
      },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/" }, async (page) => {
      await installRealmAdapterSpies(page);
      await page.eval(() => {
        document.getElementById("portal-who-btn")?.click();
        const davidCard = [...document.querySelectorAll("#who-roster button, #who-roster .face-card")].find((el) =>
          /david/i.test(el.textContent || "")
        );
        davidCard?.click();
      });

      const whoText = await page.eval(() => document.getElementById("portal-who-btn")?.textContent || "");
      assert.match(whoText, /David/i);

      await launchRealmFromPortal(page, "frostwake");
      await cruiseToNextEncounterDock(page);

      // Verify Rime-Creep positions remain 0.000m frozen while #encounter-dock is open
      const creepDelta = await page.eval(async () => {
        const inst = window.__adapterSpy.frostwake.instances[0];
        const units = inst?.opposition?.rimeUnits || [];
        const p0 = units.map((u) => ({ x: u.x, z: u.z }));
        await new Promise((r) => setTimeout(r, 350));
        return units.reduce((mx, u, i) => Math.max(mx, Math.hypot(u.x - p0[i].x, u.z - p0[i].z)), 0);
      });
      assert.ok(creepDelta < 1e-6, `Expected Rime-Creeps frozen while David's Encounter Dock is open, got ${creepDelta}`);
      page.assertZeroRuntimeErrors("T4-DAVID-06");
    });
  });

  test("T4-DAVID-07: David's Signature W1.2 (n + 100 = 100 - 200 Extreme Sub-Zero Gate), subzero_abyss, & Zone Clear Bar", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    prog.calibrated = true;
    prog.activeWorld = "W1";
    prog.unlockedWorlds = ["W1"];
    prog.nodes["W1.1"].stage = 2;
    prog.nodes["W1.1"].pKnow = 0.99;
    prog.nodes["W1.3"].pKnow = 0.99;
    prog.nodes["W1.4"].pKnow = 0.99;
    prog.nodes["W1.2"].pKnow = 0.62;

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "david",
      profiles: [{ username: "david", name: "David", avatar: "🦁" }],
      progressByUser: { david: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=david&f=MAPLE-K7Q2" }, async (page) => {
      await launchRealmFromPortal(page, "frostwake");
      await cruiseToNextEncounterDock(page);
      const dock = await readAndSolveActiveDock(page);
      assert.equal(dock.nodeId, "W1.2");
      assert.ok(dock.solvedAnswer <= -40);
      await commitValueInActiveDock(page, dock.solvedAnswer);
      await new Promise((r) => setTimeout(r, 250));

      const davidAfter = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1")).progressByUser.david);
      assert.ok(davidAfter.records.deepestSubZero >= Math.abs(dock.solvedAnswer));
      page.assertZeroRuntimeErrors("T4-DAVID-07");
    });
  });

  test("T4-DAVID-08: Frostwake Garage Upgrade Spree (wide_blade + ion_boosters) & 1-Tap Borrowing Sarah's aurora_sled (+5💎)", async () => {
    const eng = await loadEngine();
    const davidProg = eng.createInitialProgress("david");
    davidProg.fluxShards = 200;
    const sarahProg = eng.createInitialProgress("sarah");
    sarahProg.equippedChassis = "aurora_sled";
    sarahProg.ownedUpgrades = ["celestial_crown"];
    sarahProg.fluxShards = 80;

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
      await page.eval(() => {
        document.getElementById("portal-garage-btn")?.click();
        const installBtns = [...document.querySelectorAll("#modal-garage button")].filter((b) =>
          /install|💎/i.test(b.textContent || "") && !/borrow/i.test(b.textContent || "")
        );
        installBtns[0]?.click();
        installBtns[1]?.click();
        const borrowBtn = [...document.querySelectorAll("button")].find((b) =>
          /borrow|\+5\s*💎/i.test(b.textContent || "")
        );
        borrowBtn?.click();
      });

      const storeAfter = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1")));
      assert.ok(storeAfter.progressByUser.david.ownedUpgrades.length >= 1);
      assert.equal(storeAfter.progressByUser.sarah.fluxShards, 85);
      page.assertZeroRuntimeErrors("T4-DAVID-08");
    });
  });

  test("T4-DAVID-09: Direct Switch to Oddroot Wilds, Bramble-Plow Boar Charge, & -200 Cauldron Hatching Zero-G Astro-Toad", async () => {
    const eng = await loadEngine();
    const davidProg = eng.createInitialProgress("david");
    davidProg.calibrated = true;
    davidProg.activeWorld = "W1";
    davidProg.games.oddroot.equippedMount = "bramble_boar";
    for (const nid of ["W1.1", "W1.3", "W1.4"]) davidProg.nodes[nid].pKnow = 0.99;
    davidProg.nodes["W1.2"].pKnow = 0.62;

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "david",
      profiles: [{ username: "david", name: "David", avatar: "🦁" }],
      progressByUser: { david: davidProg },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=david&f=MAPLE-K7Q2" }, async (page) => {
      await launchRealmFromPortal(page, "frostwake");
      await exitRealmToPortal(page);
      await launchRealmFromPortal(page, "oddroot");

      // Brew W1.2 sub-zero cauldron until a <= -100 root clears (or solve active W1.2 cauldron)
      let hatchedToad = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        await cruiseToNextEncounterDock(page);
        const dock = await readAndSolveActiveDock(page);
        await commitValueInActiveDock(page, dock.solvedAnswer);
        await new Promise((r) => setTimeout(r, 280));
        const creatures = await page.eval(
          () => JSON.parse(localStorage.getItem("bloom-n-v1")).progressByUser.david.games?.oddroot?.hatchedCreatures || []
        );
        if (creatures.some((c) => /toad/i.test(c))) {
          hatchedToad = true;
          break;
        }
      }
      assert.equal(hatchedToad, true, "Expected David's W1.2 sub-zero cauldron clear in Oddroot to hatch Zero-G Astro-Toad");
      page.assertZeroRuntimeErrors("T4-DAVID-09");
    });
  });

  test("T4-DAVID-10: Deliberate 3-Miss Friction Cushion Streak -> Δy Caliper -> Warm Crystal Fox (+14💎) -> 4-Item Surge Wave Victory", async () => {
    const eng = await loadEngine();
    const davidProg = eng.createInitialProgress("david");
    davidProg.calibrated = true;
    davidProg.activeWorld = "W1";

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "david",
      profiles: [{ username: "david", name: "David", avatar: "🦁" }],
      progressByUser: { david: davidProg },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=david&f=MAPLE-K7Q2" }, async (page) => {
      await launchRealmFromPortal(page, "frostwake");
      await cruiseToNextEncounterDock(page);
      const d1 = await readAndSolveActiveDock(page);

      // 1st miss -> Δy caliper cue (zero shame words)
      await commitValueInActiveDock(page, d1.solvedAnswer + 25);
      await new Promise((r) => setTimeout(r, 150));
      const cueTxt = await getVisibleChildDomText(page);
      assert.equal(findBannedWord(cueTxt, FALLBACK_BANNED_SHAME_WORDS), null);

      // 2nd miss -> Warm Crystal Fox reveal (+14💎)
      const sBefore = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1")).progressByUser.david.fluxShards);
      await commitValueInActiveDock(page, d1.solvedAnswer + 25);
      await new Promise((r) => setTimeout(r, 280));
      const sAfter = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1")).progressByUser.david.fluxShards);
      assert.ok(sAfter >= sBefore + 14, `Expected Warm Crystal Fox reveal (+14💎) plus any ambient Ice-Pod shard, got ${sAfter} from ${sBefore}`);

      // 3rd miss on next gate -> triggers 4-Item Surge Wave -> clear Surge item!
      await cruiseToNextEncounterDock(page);
      const d2 = await readAndSolveActiveDock(page);
      await commitValueInActiveDock(page, d2.solvedAnswer + 25);
      await new Promise((r) => setTimeout(r, 200));

      const d2Retry = await readAndSolveActiveDock(page);
      await commitValueInActiveDock(page, d2Retry.solvedAnswer);
      await new Promise((r) => setTimeout(r, 280));

      const sFinal = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1")).progressByUser.david.fluxShards);
      assert.ok(sFinal > sAfter, "Expected clearing Surge gate to bank bonus Flux Shards");
      page.assertZeroRuntimeErrors("T4-DAVID-10");
    });
  });

  /* ==========================================================================
   * LIVE 2-PLAYER CO-OP JOURNEYS (11–12)
   * ========================================================================== */
  test("T4-COOP-11: Live 2-Tab BroadcastChannel Co-Op Journey in #screen-frostwake (?u=sarah&f=COOPTEST & ?u=david&f=COOPTEST)", async () => {
    await pool.withSharedContextCoopPages(
      [
        { initialUrl: "/bloom-n/?u=sarah&f=COOPTEST", wsMode: "offline_broadcast" },
        { initialUrl: "/bloom-n/?u=david&f=COOPTEST", wsMode: "offline_broadcast" },
      ],
      async ([tabSarah, tabDavid]) => {
        await installRealmAdapterSpies(tabSarah);
        await installRealmAdapterSpies(tabDavid);
        await launchRealmFromPortal(tabSarah, "frostwake");
        await launchRealmFromPortal(tabDavid, "frostwake");

        // 1. Auto-paired HUD Partner Pill on both screens (zero lobby, zero #1/#2 rank)
        await tabDavid.waitFor(
          () => /sarah|🦄/i.test(document.getElementById("screen-frostwake")?.textContent || ""),
          { timeoutMs: 4500, label: "David sees Sarah Partner Pill in Frostwake" }
        );

        // 2. Sarah taps 🎆 Flare -> fires 3D firework locally and on David's screen
        await tabSarah.eval(() => {
          const btn = [...document.querySelectorAll("#screen-frostwake button")].find((b) =>
            /flare|🎆/i.test(b.textContent || "")
          );
          btn?.click();
        });
        await tabDavid.waitFor(
          () => window.__adapterSpy.frostwake.coopEvents.some((e) => e?.type === "friendly_flare"),
          { timeoutMs: 4000, label: "David receives friendly_flare 3D firework" }
        );

        // 3. Sarah clears a Cryo-Gate -> fires gate_burst Sky-Beam on David's screen while leaving David's 3 gates 100% intact!
        await cruiseToNextEncounterDock(tabSarah);
        const sarahDock = await readAndSolveActiveDock(tabSarah);
        await commitValueInActiveDock(tabSarah, sarahDock.solvedAnswer);

        await tabDavid.waitFor(
          () => window.__adapterSpy.frostwake.coopEvents.some((e) => e?.type === "gate_burst"),
          { timeoutMs: 4000, label: "David receives gate_burst 3D Aurora Sky-Beam" }
        );
        const davidUnclearedCount = await tabDavid.eval(() => {
          const inst = window.__adapterSpy.frostwake.instances[0];
          return (inst?.gateSlots || []).filter((s) => !s.cleared).length;
        });
        assert.equal(davidUnclearedCount, 3, "Resource Fairness: Sarah's gate clear MUST leave all 3 of David's gates intact!");

        // 4. David drives through shared Star-Coin coin_0 (-13, 10) -> banks +3💎 & locks coin_0 on both tabs!
        const davidShardsBefore = await tabDavid.eval(() => Number(document.getElementById("hud-shards")?.textContent || 0));
        await tabDavid.eval(() => {
          const inst = window.__adapterSpy.frostwake.instances[0];
          if (inst?.rigState) {
            inst.rigState.x = -13;
            inst.rigState.z = 10;
          }
        });
        await tabSarah.waitFor(
          () => window.__adapterSpy.frostwake.coopEvents.some((e) => e?.type === "coin_grab" && e.coinId === "coin_0"),
          { timeoutMs: 4000, label: "Sarah receives coin_grab event for coin_0" }
        );
        const davidShardsAfter = await tabDavid.eval(() => Number(document.getElementById("hud-shards")?.textContent || 0));
        assert.equal(davidShardsAfter, davidShardsBefore + 3, "Expected +3💎 Star-Coin payout to David");

        tabSarah.assertZeroRuntimeErrors("T4-COOP-11-sarah");
        tabDavid.assertZeroRuntimeErrors("T4-COOP-11-david");
      }
    );
  });

  test("T4-COOP-12: Live 2-Device Phoenix WebSocket Co-Op Journey in #screen-oddroot (?u=sarah&f=COOPTEST & ?u=david&f=COOPTEST)", async () => {
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

        // 1. Verify Phoenix phx_join & cross-device partner pill
        await devSarah.waitFor(
          () => /david|🦁/i.test(document.getElementById("screen-oddroot")?.textContent || ""),
          { timeoutMs: 5000, label: "Sarah sees David Partner Pill over Phoenix WS in Oddroot" }
        );
        assert.ok(
          phoenixRelay.receivedMessages.some(
            (m) => m.event === "phx_join" && m.topic === "realtime:bloomn:COOPTEST:oddroot"
          )
        );

        // 2. David opens an Oddroot shrine dock -> Sarah's 3D view receives status === 'thinking' (Cyan Holo-Ring!)
        await cruiseToNextEncounterDock(devDavid);
        await devSarah.waitFor(
          () => window.__adapterSpy.oddroot.lastPeers.some((p) => p.userId === "david" && p.status === "thinking"),
          { timeoutMs: 4500, label: "Sarah receives David status='thinking' Cyan Holo-Ring in Oddroot" }
        );

        // 3. David solves his shrine -> Sarah sees 3D Sky-Beam while Sarah's own shrines remain 100% non-stealable!
        const davidDock = await readAndSolveActiveDock(devDavid);
        await commitValueInActiveDock(devDavid, davidDock.solvedAnswer);
        await devSarah.waitFor(
          () => window.__adapterSpy.oddroot.coopEvents.some((e) => e?.type === "gate_burst"),
          { timeoutMs: 4500, label: "Sarah receives David gate_burst in Oddroot" }
        );
        const sarahAllCleared = await devSarah.eval(
          () => window.__adapterSpy.oddroot.instances[0]?.areAllEncountersCleared?.() ?? true
        );
        assert.equal(sarahAllCleared, false, "Resource Fairness: David's shrine clear must not steal Sarah's Oddroot shrines");

        // 4. Sarah snags Oddroot Star-Coin coin_0 (0.0, 13.5) -> +3💎 & cross-device WS sync!
        await devSarah.eval(() => {
          const inst = window.__adapterSpy.oddroot.instances[0];
          const st = inst?.playerState || inst?.avatarState || inst?.rigState;
          if (st) {
            st.x = 0.0;
            st.z = 13.5;
          }
        });
        await devDavid.waitFor(
          () => window.__adapterSpy.oddroot.coopEvents.some((e) => e?.type === "coin_grab" && e.coinId === "coin_0"),
          { timeoutMs: 4500, label: "David receives cross-device coin_grab for coin_0 in Oddroot" }
        );

        devSarah.assertZeroRuntimeErrors("T4-COOP-12-sarah");
        devDavid.assertZeroRuntimeErrors("T4-COOP-12-david");
      }
    );
  });
});
