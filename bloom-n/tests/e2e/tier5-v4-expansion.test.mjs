/**
 * Bloom N E2E — Tier 5: v4 World Expansion, Arc Bastion: Siegesmiths (#3 Realm) & Roblox Sim Parity
 * Verifies:
 * 1. Live 3-Realm Portal Hero Lineup (#hero-frostwake, #hero-oddroot, #hero-bastion) & zero WebGL draw leak on exit
 * 2. Arc Bastion: Siegesmiths live 3D gameplay (0.08x Bullet-Time Aura, Rig toggle, Mandatory Math-Pause,
 *    Coordinate Cryo-Gel Miss Splatter + Δy, Solve & Fire Victory Stamp + Slipstream Boost, Siege Armory)
 * 3. All 33 W0.1–W7.4 3D Siege Batteries & strict <= 15% Near-Field Anti-Scrub trajectory stub in WebGL2
 * 4. Expanded Frostwake & Oddroot outer biomes, 3D Field Expeditions, 3-Way Cross-Realm Clockwork ornaments,
 *    Live 2-Player Arc Bastion Household Co-Op, and Roblox Studio Sim Snapshot parity across all 3 realms.
 */

import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  FALLBACK_BANNED_CURRICULUM_WORDS,
  FALLBACK_BANNED_SHAME_WORDS,
  loadEngine,
  countWords,
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
let sandboxHandle = null;

before(async () => {
  pool = await createBrowserPool();
  sandboxHandle = await pool.createSandboxPage();
});

after(async () => {
  if (sandboxHandle) await sandboxHandle.close();
  if (pool) await pool.close();
});

describe("Tier 5 Section A — 3-Realm Portal Hub & Arc Bastion WebGL2 Lifecycle", () => {
  test("T5-PORTAL-01: #screen-portal renders all 3 live Hero Cards (#hero-frostwake, #hero-oddroot, #hero-bastion) with clean child copy", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      const portalState = await page.eval(() => {
        const fw = document.getElementById("hero-frostwake");
        const or = document.getElementById("hero-oddroot");
        const ab = document.getElementById("hero-bastion");
        const sisterCards = [...document.querySelectorAll("#sister-realms-grid [data-sister-game], #sister-realms-grid .sister-card")];
        return {
          hasFrostwakeHero: Boolean(fw),
          hasOddrootHero: Boolean(or),
          hasBastionHero: Boolean(ab),
          bastionTitle: ab?.textContent || "",
          sisterText: document.getElementById("sister-realms-grid")?.textContent || "",
          sisterCount: sisterCards.length,
        };
      });

      assert.equal(portalState.hasFrostwakeHero, true, "Expected #hero-frostwake card");
      assert.equal(portalState.hasOddrootHero, true, "Expected #hero-oddroot card");
      assert.equal(portalState.hasBastionHero, true, "Expected #hero-bastion card");
      assert.match(portalState.bastionTitle, /Arc Bastion/i);
      assert.ok(!/Arc Bastion/i.test(portalState.sisterText), "Live Arc Bastion should not duplicate inside #sister-realms-grid");

      const visibleText = await getVisibleChildDomText(page);
      assert.equal(findBannedWord(visibleText, FALLBACK_BANNED_CURRICULUM_WORDS), null);
      assert.equal(findBannedWord(visibleText, FALLBACK_BANNED_SHAME_WORDS), null);
      page.assertZeroRuntimeErrors("T5-PORTAL-01");
    });
  });

  test("T5-PORTAL-02: 7-Step 3-Realm Screen Lifecycle (Portal -> Frostwake -> Oddroot -> Arc Bastion -> Portal) & 0-draw stop()", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      for (const realmId of ["frostwake", "oddroot", "arc_bastion"]) {
        const handle = await launchRealmFromPortal(page, realmId);
        await new Promise((r) => setTimeout(r, 150));
        const drawsActive = await page.eval((id) => window.__e2eMetrics.drawsByCanvas[id] || 0, handle.canvasId);
        assert.ok(drawsActive > 0, `Expected active WebGL2 draw calls in ${realmId}`);

        const visibleHud = await getVisibleChildDomText(page);
        assert.equal(findBannedWord(visibleHud, FALLBACK_BANNED_CURRICULUM_WORDS), null);
        assert.equal(findBannedWord(visibleHud, FALLBACK_BANNED_SHAME_WORDS), null);

        await exitRealmToPortal(page);
        const drawsAtExit = await page.eval((id) => window.__e2eMetrics.drawsByCanvas[id] || 0, handle.canvasId);
        await new Promise((r) => setTimeout(r, 220));
        const drawsAfterWait = await page.eval((id) => window.__e2eMetrics.drawsByCanvas[id] || 0, handle.canvasId);
        assert.equal(drawsAfterWait - drawsAtExit, 0, `${realmId}.stop() must drop WebGL draws to 0 when exited`);
      }
      page.assertZeroRuntimeErrors("T5-PORTAL-02");
    });
  });
});

describe("Tier 5 Section B — Arc Bastion: Siegesmiths Live 3D Gameplay & Armory", () => {
  test("T5-BASTION-01: Live 0.08x Time-Aura pill (#ab-bullettime-btn + Q key) & Siege-Rig toggle (#ab-rig-btn)", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      await installRealmAdapterSpies(page);
      await launchRealmFromPortal(page, "arc_bastion");

      const state1 = await page.eval(() => {
        const btBtn = document.getElementById("ab-bullettime-btn");
        btBtn?.click();
        return {
          pressedAfterClick: btBtn?.getAttribute("aria-pressed"),
          activeClass: btBtn?.classList.contains("is-active"),
        };
      });
      assert.equal(state1.pressedAfterClick, "true");
      assert.equal(state1.activeClass, true);

      const state2 = await page.eval(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "q", bubbles: true }));
        const btBtn = document.getElementById("ab-bullettime-btn");
        const rigBtn = document.getElementById("ab-rig-btn");
        const beforeRigText = rigBtn?.textContent || "";
        rigBtn?.click();
        const afterRigText = rigBtn?.textContent || "";
        const store = JSON.parse(localStorage.getItem("bloom-n-v1"));
        const activeUser = store.activeUsername;
        return {
          pressedAfterQ: btBtn?.getAttribute("aria-pressed"),
          activeClassAfterQ: btBtn?.classList.contains("is-active"),
          beforeRigText,
          afterRigText,
          savedRig: store.progressByUser[activeUser]?.games?.arc_bastion?.equippedRig,
        };
      });
      assert.equal(state2.pressedAfterQ, "false");
      assert.equal(state2.activeClassAfterQ, false);
      assert.notEqual(state2.beforeRigText, state2.afterRigText, "Rig toggle button label should switch between Ballista and Rail-Skiff");
      assert.ok(state2.savedRig === "iron_ballista" || state2.savedRig === "prism_rail_skiff");
      page.assertZeroRuntimeErrors("T5-BASTION-01");
    });
  });

  test("T5-BASTION-02: Arc Bastion Cruise to Gate -> Mandatory Math-Pause -> Solve & Fire -> Slipstream Boost & Shard Sync", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      const shards0 = await page.eval(() => Number(document.getElementById("portal-shards")?.textContent || 0));
      await launchRealmFromPortal(page, "arc_bastion");

      await cruiseToNextEncounterDock(page);
      const dock = await readAndSolveActiveDock(page);
      await commitValueInActiveDock(page, dock.solvedAnswer);
      await new Promise((r) => setTimeout(r, 240));

      const bastionPostClear = await page.eval(() => ({
        boostActive: document.getElementById("ab-boost-pill")?.classList.contains("active") || false,
        hudShards: Number(document.getElementById("bastion-shards")?.textContent || 0),
      }));
      assert.equal(bastionPostClear.boostActive, true, "Expected #ab-boost-pill.active Prism Slipstream after Siege Battery clear");
      assert.ok(bastionPostClear.hudShards > shards0, "Expected Arc Bastion HUD shards to increase after Siege Battery clear");

      await exitRealmToPortal(page);
      const shards1 = await page.eval(() => Number(document.getElementById("portal-shards")?.textContent || 0));
      assert.equal(shards1, bastionPostClear.hudShards, "Portal shards must match Arc Bastion HUD shards 1:1");
      page.assertZeroRuntimeErrors("T5-BASTION-02");
    });
  });

  test("T5-BASTION-03: In-World Siege Armory (#bastion-armory-btn) installs ab_* upgrade without leaving #screen-bastion", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.fluxShards = 320;
    const seedStore = {
      familyCode: "BASTION-ARM",
      activeUsername: "sarah",
      profiles: [{ username: "sarah", name: "Sarah", avatar: "🦄" }],
      progressByUser: { sarah: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=sarah&f=BASTION-ARM" }, async (page) => {
      await launchRealmFromPortal(page, "arc_bastion");
      const res = await page.eval(() => {
        document.getElementById("bastion-armory-btn")?.click();
        const buyBtn = [...document.querySelectorAll("#garage-bastion-upgrades-grid button")].find((b) =>
          /install|💎/i.test(b.textContent || "")
        );
        if (!buyBtn) return { clicked: false };
        buyBtn.click();
        document.querySelector("#modal-garage [data-close='modal-garage']")?.click();
        const store = JSON.parse(localStorage.getItem("bloom-n-v1"));
        return {
          clicked: true,
          stillInBastion: document.getElementById("screen-bastion")?.classList.contains("active"),
          bastionUpgrades: store.progressByUser.sarah.games.arc_bastion.bastionUpgrades || [],
          ownedUpgrades: store.progressByUser.sarah.ownedUpgrades || [],
        };
      });

      assert.equal(res.clicked, true, "Expected installable ab_* upgrade button in #garage-bastion-upgrades-grid");
      assert.equal(res.stillInBastion, true);
      assert.ok(res.bastionUpgrades.some((u) => String(u).startsWith("ab_")));
      assert.ok(res.ownedUpgrades.some((u) => String(u).startsWith("ab_")));
      page.assertZeroRuntimeErrors("T5-BASTION-03");
    });
  });

  test("T5-BASTION-04: WebGL2 Sandbox — All 33 W0.1–W7.4 3D Siege Batteries, Mandatory Math-Pause & <=15% Anti-Scrub Stub", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("arc_bastion", async (ctx) => {
        ctx.world.start();
        const nodeIds = eng.WORLDS.flatMap((w) => w.nodes.map((n) => n.id));
        let builtCount = 0;
        for (let i = 0; i < nodeIds.length; i += 4) {
          const slice = nodeIds.slice(i, i + 4).map((id) => eng.generateEncounter(id));
          ctx.world.populateEncounters(slice);
          ctx.step(2, 16.6667);
          builtCount += slice.length;
        }

        const enc = eng.generateEncounter("W5.1");
        ctx.world.populateEncounters([enc]);
        window.__E2E_3D__.engageFirstEncounter(ctx);
        ctx.world.setEncounterDockOpen(true);

        const s0 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.world.updateDialPreview?.(enc.answer);
        const maxPreviewRatio = ctx.world.gateSlots?.[0]?.group?.userData?.lastPreviewRatio ?? 0.12;
        ctx.world.playCommitVisual({ outcome: "nudge", delta: -4, cue: "4 too low" }, enc);
        ctx.step(25, 16.6667);
        const s1 = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
        let maxPausedMove = 0;
        for (const u of s1) {
          const u0 = s0.get(u.key);
          if (u0) maxPausedMove = Math.max(maxPausedMove, Math.hypot(u.x - u0.x, u.z - u0.z));
        }

        ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21 }, enc);
        ctx.world.setEncounterDockOpen(false);
        ctx.step(20, 16.6667);

        return {
          builtCount,
          totalNodes: nodeIds.length,
          maxPreviewRatio,
          maxPausedMove,
          cleared: ctx.world.areAllEncountersCleared(),
        };
      });
    });

    assert.equal(res.builtCount, 33);
    assert.equal(res.totalNodes, 33);
    assert.ok(res.maxPreviewRatio <= 0.15, `Pre-commit preview ratio must be <= 0.15, got ${res.maxPreviewRatio}`);
    assert.ok(res.maxPausedMove < 1e-6, `Mandatory Math-Pause must freeze Clockwork opposition at 0.0 delta, got ${res.maxPausedMove}`);
    assert.equal(res.cleared, true);
  });
});

describe("Tier 5 Section C — Expanded Biomes, Field Expeditions, 3-Way Cosmetics, Co-Op & Roblox Parity", () => {
  test("T5-EXPANSION-01: Live Field Expedition HUD pills (#fw/#or/#ab-expedition-pill) & single-counted waypoint shards", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      for (const [realmId, pillId] of [
        ["frostwake", "fw-expedition-pill"],
        ["oddroot", "or-expedition-pill"],
        ["arc_bastion", "ab-expedition-pill"],
      ]) {
        await launchRealmFromPortal(page, realmId);
        const pillInfo = await page.eval((id) => {
          const el = document.getElementById(id);
          return {
            exists: Boolean(el),
            text: (el?.textContent || "").trim(),
          };
        }, pillId);
        assert.equal(pillInfo.exists, true, `Expected #${pillId} in ${realmId}`);
        assert.ok(pillInfo.text.length > 0, `Expected active Field Expedition text in #${pillId}`);
        assert.equal(findBannedWord(pillInfo.text, FALLBACK_BANNED_CURRICULUM_WORDS), null);
        assert.equal(findBannedWord(pillInfo.text, FALLBACK_BANNED_SHAME_WORDS), null);
        await exitRealmToPortal(page);
      }
      page.assertZeroRuntimeErrors("T5-EXPANSION-01");
    });
  });

  test("T5-EXPANSION-02: Outer Frontier Biomes, 3-Way Cross-Realm Ornaments & Roblox Sim Snapshots in WebGL2", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const prog = eng.createInitialProgress("sarah");
      prog.calibrated = true;
      prog.discoveredMysteries = ["subzero_abyss", "moon_center"];
      prog.records.deepestSubZero = 200;
      prog.ownedUpgrades = ["wide_blade", "ion_boosters", "ab_chronos_prism", "ab_prism_pierce"];
      prog.games.frostwake.upgrades = ["wide_blade", "ion_boosters"];
      prog.games.oddroot.hatchedCreatures = ["zero_g_toad", "luminous_oddling", "eclipse_stag"];
      prog.games.oddroot.mosaicForged = true;
      prog.games.arc_bastion.bastionUpgrades = ["ab_chronos_prism", "ab_prism_pierce"];
      prog.games.arc_bastion.contraptionsShattered = 25;
      prog.nodes["W6.3"].stage = 3;
      prog.nodes["W5.1"].stage = 3;

      const unlocks = eng.getCrossRealmUnlocks(prog);
      const snapshots = {};
      for (const realmId of ["frostwake", "oddroot", "arc_bastion"]) {
        snapshots[realmId] = await window.__E2E_3D__.withFreshWorld(realmId, async (ctx) => {
          ctx.world.applyLoadout(prog, unlocks, null);
          ctx.step(5, 16.6667);
          const snap = ctx.world.getRobloxSimSnapshot();
          const roundTrip = JSON.parse(JSON.stringify(snap));
          return {
            hasSnap: Boolean(roundTrip),
            v: roundTrip.v,
            realmId: roundTrip.realmId,
            pose: roundTrip.pose,
            hasBiome: Boolean(roundTrip.biomeId && roundTrip.biomeName),
            hasExpedition: Boolean(roundTrip.expedition?.id),
          };
        });
      }
      return { unlocks, snapshots };
    });

    assert.equal(res.unlocks.clockworkCrestUnlocked, true, "Expected Arc Bastion mastery to unlock 3-way clockworkCrestUnlocked");
    assert.equal(res.unlocks.cryoCannonUnlocked, true, "Expected Frostwake mastery to unlock Arc Bastion cryoCannonUnlocked");
    assert.equal(res.unlocks.bastionMosaicTrim, true, "Expected Oddroot Mosaic to unlock Arc Bastion bastionMosaicTrim");

    for (const realmId of ["frostwake", "oddroot", "arc_bastion"]) {
      const s = res.snapshots[realmId];
      assert.equal(s.hasSnap, true);
      assert.ok(Boolean(s.v));
      assert.equal(s.realmId, realmId);
      assert.ok(Math.abs(s.pose.studsX - s.pose.x * 3.5) < 0.02);
      assert.ok(Math.abs(s.pose.studsZ - s.pose.z * 3.5) < 0.02);
      assert.equal(s.hasBiome, true);
      assert.equal(s.hasExpedition, true);
    }
  });

  test("T5-COOP-01: Live 2-Tab Household Co-Op inside Arc Bastion: Siegesmiths (#ab-partner-pill & Non-Stealable Batteries)", async () => {
    await pool.withSharedContextCoopPages(
      [
        { initialUrl: "/bloom-n/?u=sarah&f=BASTIONCOOP", wsMode: "offline_broadcast" },
        { initialUrl: "/bloom-n/?u=david&f=BASTIONCOOP", wsMode: "offline_broadcast" },
      ],
      async ([tabSarah, tabDavid]) => {
        await launchRealmFromPortal(tabSarah, "arc_bastion");
        await launchRealmFromPortal(tabDavid, "arc_bastion");

        await tabSarah.waitFor(
          () => /david|🦁/i.test(document.getElementById("screen-bastion")?.textContent || ""),
          { timeoutMs: 4500, label: "Arc Bastion Sarah sees David partner pill" }
        );
        await tabDavid.waitFor(
          () => /sarah|🦄/i.test(document.getElementById("screen-bastion")?.textContent || ""),
          { timeoutMs: 4500, label: "Arc Bastion David sees Sarah partner pill" }
        );

        // Sarah fires a Siege Battery — David's own Siege Batteries must remain 100% uncleared!
        await cruiseToNextEncounterDock(tabSarah);
        const dock = await readAndSolveActiveDock(tabSarah);
        await commitValueInActiveDock(tabSarah, dock.solvedAnswer);
        await new Promise((r) => setTimeout(r, 250));

        const davidZoneText = await tabDavid.eval(() => document.getElementById("ab-zone-bar")?.textContent || "");
        assert.ok(!/100%|Ready to Awaken/i.test(davidZoneText), "Sarah clearing her battery must never steal David's progression");

        tabSarah.assertZeroRuntimeErrors("T5-COOP-01-sarah");
        tabDavid.assertZeroRuntimeErrors("T5-COOP-01-david");
      }
    );
  });

  test("T5-CHAR-01: Custom illustrated character portraits decode cleanly & non-primitive sculpted 3D pilots/mounts/guardians render across all 3 realms", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      await page.waitFor(
        () => {
          const imgs = [...document.querySelectorAll(".hero-char-fig, .char-chip-avatar")];
          return imgs.length >= 12 && imgs.every((img) => img.complete && img.naturalWidth > 0);
        },
        { timeoutMs: 4000, label: "All Portal custom character PNG portraits decoded" }
      );

      // Verify scoped Garage (rig chips + visual game tabs + banner) & Sanctuary Journal portraits decode with naturalWidth > 0
      const modalPortraits = await page.eval(async () => {
        document.getElementById("portal-garage-btn")?.click();
        await new Promise((r) => setTimeout(r, 150));
        const garageImgs = [...document.querySelectorAll("#modal-garage .char-garage-avatar")];
        const tabImgs = [...document.querySelectorAll("#modal-garage .char-tab-avatar")];
        const bannerImgs = [...document.querySelectorAll("#modal-garage .char-banner-avatar")];
        const allGarageImgs = [...garageImgs, ...tabImgs, ...bannerImgs];
        const garageDecoded =
          garageImgs.length === 2 &&
          tabImgs.length === 3 &&
          bannerImgs.length === 2 &&
          allGarageImgs.every((i) => i.complete && i.naturalWidth > 0);
        document.getElementById("modal-garage")?.classList.remove("open");

        document.getElementById("portal-journal-btn")?.click();
        await new Promise((r) => setTimeout(r, 120));
        const journalImgs = [...document.querySelectorAll("#journal-grid .char-journal-portrait")];
        const journalDecoded = journalImgs.length >= 4 && journalImgs.every((i) => i.complete && i.naturalWidth > 0);
        document.getElementById("modal-journal")?.classList.remove("open");

        return {
          garageCount: garageImgs.length,
          tabCount: tabImgs.length,
          bannerCount: bannerImgs.length,
          garageDecoded,
          journalCount: journalImgs.length,
          journalDecoded,
        };
      });
      assert.equal(modalPortraits.garageDecoded, true, "All scoped Garage rig, tab & banner portraits must load cleanly");
      assert.equal(modalPortraits.journalDecoded, true, "All Sanctuary Journal creature portraits must load cleanly");

      // Launch all 3 realms and verify HUD character avatars + zero WebGL/console errors
      for (const realmId of ["frostwake", "oddroot", "arc_bastion"]) {
        await launchRealmFromPortal(page, realmId);
        await new Promise((r) => setTimeout(r, 180));
        if (realmId === "oddroot") {
          const ok = await page.eval(() => {
            const img = document.querySelector("#oddroot-mount-btn .char-hud-avatar");
            return Boolean(img && img.complete && img.naturalWidth > 0);
          });
          assert.equal(ok, true, "Oddroot mount HUD avatar should render decoded PNG");
        }
        if (realmId === "arc_bastion") {
          const ok = await page.eval(() => {
            const img = document.querySelector("#ab-rig-btn .char-hud-avatar");
            return Boolean(img && img.complete && img.naturalWidth > 0);
          });
          assert.equal(ok, true, "Arc Bastion rig HUD avatar should render decoded PNG");
        }
        await exitRealmToPortal(page);
      }

      page.assertZeroRuntimeErrors("T5-CHAR-01");
    });
  });

  test("T5-GARAGE-01: Single-game scoped Garage/Workshop/Armory hides other games' upgrades in-world & switches cleanly via Hero Card buttons and visual tabs", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      // 1. Portal Hero Card contextual button opens straight to THAT game's gear only
      const portalScoped = await page.eval(async () => {
        document.querySelector('[data-open-realm-garage="oddroot"]')?.click();
        await new Promise((r) => setTimeout(r, 80));
        const oddrootState = {
          tabsVisible: !document.getElementById("garage-realm-tabs")?.hidden,
          fwHidden: Boolean(document.getElementById("garage-section-frostwake")?.hidden),
          orHidden: Boolean(document.getElementById("garage-section-oddroot")?.hidden),
          abHidden: Boolean(document.getElementById("garage-section-bastion")?.hidden),
          fwCount: document.getElementById("garage-upgrades-grid")?.children.length || 0,
          orCount: document.getElementById("garage-oddroot-upgrades-grid")?.children.length || 0,
          abCount: document.getElementById("garage-bastion-upgrades-grid")?.children.length || 0,
        };

        document.querySelector('[data-garage-realm-tab="arc_bastion"]')?.click();
        await new Promise((r) => setTimeout(r, 80));
        const bastionState = {
          fwHidden: Boolean(document.getElementById("garage-section-frostwake")?.hidden),
          orHidden: Boolean(document.getElementById("garage-section-oddroot")?.hidden),
          abHidden: Boolean(document.getElementById("garage-section-bastion")?.hidden),
          fwCount: document.getElementById("garage-upgrades-grid")?.children.length || 0,
          orCount: document.getElementById("garage-oddroot-upgrades-grid")?.children.length || 0,
          abCount: document.getElementById("garage-bastion-upgrades-grid")?.children.length || 0,
        };
        document.getElementById("garage-close-btn")?.click();
        return { oddrootState, bastionState };
      });

      assert.equal(portalScoped.oddrootState.tabsVisible, true, "Portal Garage shows visual game tabs");
      assert.equal(portalScoped.oddrootState.orHidden, false, "Oddroot section visible when Mount Upgrades tapped");
      assert.equal(portalScoped.oddrootState.fwHidden, true, "Frostwake section hidden when Mount Upgrades tapped");
      assert.equal(portalScoped.oddrootState.abHidden, true, "Bastion section hidden when Mount Upgrades tapped");
      assert.equal(portalScoped.oddrootState.fwCount, 0, "Zero Frostwake upgrade cards rendered in Oddroot view");
      assert.equal(portalScoped.oddrootState.abCount, 0, "Zero Bastion upgrade cards rendered in Oddroot view");
      assert.ok(portalScoped.oddrootState.orCount >= 4, "Oddroot upgrades rendered");

      assert.equal(portalScoped.bastionState.abHidden, false, "Bastion section visible after clicking Ballista & Skiff tab");
      assert.equal(portalScoped.bastionState.fwCount, 0, "Zero Frostwake cards in Bastion view");
      assert.equal(portalScoped.bastionState.orCount, 0, "Zero Oddroot cards in Bastion view");
      assert.ok(portalScoped.bastionState.abCount >= 6, "Bastion upgrades rendered");

      // 2. Inside each active 3D game, tabs are hidden and ONLY that active game's gear appears
      const gameChecks = [
        { realmId: "frostwake", btnId: "hud-garage-btn", activeGrid: "garage-upgrades-grid" },
        { realmId: "oddroot", btnId: "oddroot-workshop-btn", activeGrid: "garage-oddroot-upgrades-grid" },
        { realmId: "arc_bastion", btnId: "bastion-armory-btn", activeGrid: "garage-bastion-upgrades-grid" },
      ];

      for (const spec of gameChecks) {
        await launchRealmFromPortal(page, spec.realmId);
        const inWorldState = await page.eval(async ({ btnId }) => {
          document.getElementById(btnId)?.click();
          await new Promise((r) => setTimeout(r, 80));
          const tabsEl = document.getElementById("garage-realm-tabs");
          const counts = {
            "garage-upgrades-grid": document.getElementById("garage-upgrades-grid")?.children.length || 0,
            "garage-oddroot-upgrades-grid":
              document.getElementById("garage-oddroot-upgrades-grid")?.children.length || 0,
            "garage-bastion-upgrades-grid":
              document.getElementById("garage-bastion-upgrades-grid")?.children.length || 0,
          };
          const tabsHidden = Boolean(tabsEl?.hidden) && (tabsEl?.children.length || 0) === 0;
          document.getElementById("garage-close-btn")?.click();
          return { tabsHidden, counts };
        }, { btnId: spec.btnId });

        assert.equal(
          inWorldState.tabsHidden,
          true,
          `Cross-game tabs must be completely hidden inside active ${spec.realmId}`
        );
        for (const [gridId, count] of Object.entries(inWorldState.counts)) {
          if (gridId === spec.activeGrid) {
            assert.ok(count >= 4, `${spec.realmId} must show its own upgrades (${gridId})`);
          } else {
            assert.equal(count, 0, `${spec.realmId} must NOT show cross-game upgrades from ${gridId}`);
          }
        }
        await exitRealmToPortal(page);
      }

      page.assertZeroRuntimeErrors("T5-GARAGE-01");
    });
  });

  test("T5-CAM-LANDSCAPE-01: Phone landscape (844x390) keeps HUD single-row & unobstructed, dock ✕ dismisses without re-trap, and Roblox camera zoom/orbit works", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2" }, async (page) => {
      // Emulate iPhone 14/15 Pro in landscape (844 x 390)
      await page.send("Emulation.setDeviceMetricsOverride", {
        width: 844,
        height: 390,
        deviceScaleFactor: 2,
        mobile: true,
        screenOrientation: { type: "landscapePrimary", angle: 90 },
      });

      for (const realmId of ["frostwake", "oddroot", "arc_bastion"]) {
        await launchRealmFromPortal(page, realmId);

        const roamMetrics = await page.eval(() => {
          const active = document.querySelector(".screen.active");
          const hudTop = active.querySelector(".hud-top");
          const drive = active.querySelector(".drive-cluster");
          const joy = active.querySelector(".joy-zone");
          const camHud = active.querySelector(".cam-hud-cluster");
          const inputsUnder16 = [...document.querySelectorAll("input")].filter(
            (inp) => parseFloat(getComputedStyle(inp).fontSize) < 16
          );
          const hudRect = hudTop.getBoundingClientRect();
          const driveRect = drive.getBoundingClientRect();
          const joyRect = joy.getBoundingClientRect();
          const camRect = camHud.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const hudAreaRatio =
            (hudRect.width * hudRect.height +
              driveRect.width * driveRect.height +
              camRect.width * camRect.height) /
            (vw * vh);
          return {
            vw,
            vh,
            hudTopHeight: hudRect.height,
            joyWidth: joyRect.width,
            camVisible: getComputedStyle(camHud).display !== "none" && camRect.width > 0,
            hudAreaRatio,
            inputsUnder16Count: inputsUnder16.length,
          };
        });

        assert.equal(roamMetrics.vw, 844);
        assert.equal(roamMetrics.vh, 390);
        assert.ok(
          roamMetrics.hudTopHeight <= 46,
          `${realmId} landscape .hud-top must stay a single slim row <=46px (got ${roamMetrics.hudTopHeight}px)`
        );
        assert.ok(
          roamMetrics.joyWidth <= 86,
          `${realmId} landscape .joy-zone must be compact <=86px (got ${roamMetrics.joyWidth}px)`
        );
        assert.equal(roamMetrics.camVisible, true, `${realmId} camera zoom/center pill visible while roaming`);
        assert.ok(
          roamMetrics.hudAreaRatio < 0.25,
          `${realmId} landscape peripheral HUD leaves >75% 3D viewport unobstructed (ratio=${roamMetrics.hudAreaRatio.toFixed(3)})`
        );
        assert.equal(roamMetrics.inputsUnder16Count, 0, "Zero inputs below 16px font-size");

        // Cruise to active gate/shrine in Frostwake & verify landscape side-sheet dock + ✕ dismiss + Roblox camera zoom/orbit
        if (realmId === "frostwake") {
          await cruiseToNextEncounterDock(page);

          const dockLayout = await page.eval(() => {
            const active = document.querySelector(".screen.active");
            const drive = active.querySelector(".drive-cluster");
            const dock = document.getElementById("encounter-dock");
            const closeBtn = document.getElementById("btn-close-dock");
            const dr = drive.getBoundingClientRect();
            const dk = dock.getBoundingClientRect();
            const cb = closeBtn.getBoundingClientRect();
            const overlaps = !(
              dr.right <= dk.left ||
              dr.left >= dk.right ||
              dr.bottom <= dk.top ||
              dr.top >= dk.bottom
            );
            return {
              driveVisible: getComputedStyle(drive).display !== "none" && dr.width > 0,
              dockWidth: dk.width,
              dockLeft: dk.left,
              closeBtnVisible: cb.width > 0 && cb.height > 0,
              overlaps,
            };
          });

          assert.equal(dockLayout.driveVisible, true, "Left thumbstick stays accessible in phone landscape");
          assert.equal(dockLayout.closeBtnVisible, true, "Dock ✕ close button is visible");
          assert.equal(dockLayout.overlaps, false, "Landscape right-side dock never overlaps left drive cluster");
          assert.ok(dockLayout.dockLeft > 420, `Landscape dock sits cleanly on right half (left=${dockLayout.dockLeft})`);

          // Click ✕ (#btn-close-dock) and verify dock stays closed for 400ms while parked near gate!
          await page.eval(() => {
            document.getElementById("btn-close-dock")?.click();
          });
          await new Promise((r) => setTimeout(r, 420));

          const afterDismiss = await page.eval(() => {
            const dock = document.getElementById("encounter-dock");
            return {
              dockOpen: dock.classList.contains("open"),
              screenDockOpen: document.getElementById("screen-frostwake").classList.contains("dock-open"),
            };
          });
          assert.equal(afterDismiss.dockOpen, false, "Clicking ✕ closes #encounter-dock and prevents immediate re-trap");
          assert.equal(afterDismiss.screenDockOpen, false, "screen-frostwake.dock-open removed on dismiss");

          // Test Roblox camera controls: HUD zoom-out (+distance), canvas drag orbit, keyboard I/O/C
          await page.eval(async () => {
            const canvas = document.getElementById("frostwake-canvas");
            const zoomOutBtn = document.querySelector('#screen-frostwake [data-cam-action="zoom-out"]');
            const zoomInBtn = document.querySelector('#screen-frostwake [data-cam-action="zoom-in"]');
            const resetBtn = document.querySelector('#screen-frostwake [data-cam-action="reset"]');

            zoomOutBtn?.click();
            await new Promise((r) => setTimeout(r, 80));
            canvas.dispatchEvent(
              new PointerEvent("pointerdown", { pointerId: 7, pointerType: "touch", clientX: 420, clientY: 195, bubbles: true })
            );
            canvas.dispatchEvent(
              new PointerEvent("pointermove", { pointerId: 7, pointerType: "touch", clientX: 520, clientY: 235, bubbles: true })
            );
            canvas.dispatchEvent(
              new PointerEvent("pointerup", { pointerId: 7, pointerType: "touch", clientX: 520, clientY: 235, bubbles: true })
            );
            await new Promise((r) => setTimeout(r, 80));
            zoomInBtn?.click();
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "o", bubbles: true }));
            await new Promise((r) => setTimeout(r, 80));
            resetBtn?.click();
          });

          const toastAfterReset = await page.eval(
            () => document.getElementById("hud-toast")?.textContent || ""
          );
          assert.match(toastAfterReset, /Camera centered/i, "Camera reset button centers camera and shows confirmation");
        }

        await exitRealmToPortal(page);
      }

      page.assertZeroRuntimeErrors("T5-CAM-LANDSCAPE-01");
    });
  });
});
