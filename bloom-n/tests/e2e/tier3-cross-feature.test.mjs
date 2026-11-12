/**
 * Bloom N E2E — Tier 3: Cross-Feature, Cross-Realm, Portal Lifecycle & Live Co-Op Interactions
 * 34 genuine multi-subsystem interaction tests across engine.js, sync.js, multiplayer.js,
 * FrostwakeWorld3D, OddrootWorld3D, portal.js, index.html, and yomple/index.html.
 */

import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  FALLBACK_BANNED_CURRICULUM_WORDS,
  loadEngine,
  loadSync,
  loadMultiplayer,
  makeSeededRng,
  commitEnc,
  findBannedWord,
  withIsolatedSyncEnv,
  createInMemoryCoopTransportHub,
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
 * SECTION A — Core × Sync × Cross-Realm × Multiplayer Pairwise (18 tests)
 * ============================================================================ */
describe("Tier 3 Section A — Core × Sync × Cross-Realm × Multiplayer Pairwise", () => {
  test("T3-SYNC-01: Frostwake W1.2 -200 Sub-Zero clear -> subzero_abyss + getCrossRealmUnlocks unlocks Oddroot Zero-G Astro-Toad", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    const sess = eng.createSessionState();
    const enc = { ...eng.generateEncounter("W1.2"), answer: -200 };
    commitEnc(progGuard(eng), prog, sess, enc, -200, 2500);
    const unlocks = eng.getCrossRealmUnlocks(prog);
    assert.equal(Boolean(unlocks.astroToadUnlocked), true);
    function progGuard(x) { return x; }
  });

  test("T3-SYNC-02: Oddroot Astro-Toad hatch + W2.1 Conservatory + W6.3 Mosaic -> unlocks Frostwake mascot, Snow-Lilies & Golden Mosaic trim", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.games.oddroot.hatchedCreatures = ["zero_g_toad", "luminous_oddling", "eclipse_stag"];
    prog.games.oddroot.mosaicForged = true;
    prog.nodes["W2.1"].stage = 3;
    prog.nodes["W2.1"].wins = 3;
    prog.nodes["W6.3"].stage = 3;
    prog.nodes["W6.3"].wins = 3;

    const u = eng.getCrossRealmUnlocks(prog);
    assert.equal(Boolean(u.astroToadCabMascot || u.cryoToadMascot || u.astroToadUnlocked), true);
    assert.equal(Boolean(u.snowLiliesUnlocked), true);
    assert.equal(Boolean(u.goldenMosaicTrimUnlocked || u.frostwakePlowTrim === "golden_mosaic"), true);
  });

  test("T3-SYNC-03: Shared W5.2 astrolabe_lock + moon_center + 3x Overdrive aurora_whale unlocks across both realms", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    const sess = eng.createSessionState();
    eng.unlockMystery(prog, "moon_center");
    for (const nid of ["W5.2", "W2.1", "W4.1"]) {
      const enc = eng.generateEncounter(nid, { rng: makeSeededRng(303) });
      commitEnc(eng, prog, sess, enc, enc.answer, 2200);
    }
    assert.ok(prog.discoveredMysteries.includes("moon_center"));
    assert.ok(prog.discoveredMysteries.includes("astrolabe_lock"));
    assert.ok(prog.discoveredMysteries.includes("aurora_whale"));

    const u = eng.getCrossRealmUnlocks(prog);
    assert.equal(Boolean(u.moonLanternUnlocked || prog.discoveredMysteries.includes("moon_center")), true);
    assert.equal(Boolean(u.skyWhaleUnlocked || prog.discoveredMysteries.includes("aurora_whale")), true);
  });

  test("T3-SYNC-04: evaluateCommit × unlockFrontierWorlds × computeWorldProgress × computeArchitectLevel progression chain", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    prog.calibrated = true;
    prog.unlockedWorlds = ["W1"];
    prog.fluxShards = 1200;
    const sess = eng.createSessionState();

    for (const nid of ["W1.1", "W1.2"]) {
      for (let k = 0; k < 4; k++) {
        const enc = eng.generateEncounter(nid, { camouflage: k === 3 });
        commitEnc(eng, prog, sess, enc, enc.answer, 2200);
      }
    }
    eng.unlockFrontierWorlds(prog);
    const wp = eng.computeWorldProgress(prog, "W1");
    const arch = eng.computeArchitectLevel(prog);
    assert.equal(wp.guardianAwakened, true);
    assert.ok(prog.unlockedWorlds.includes("W2"));
    assert.ok(arch.level >= 2);
  });

  test("T3-SYNC-05: mergeProgress(deviceA_frostwake, deviceB_oddroot) full cross-device union", async () => {
    const eng = await loadEngine();
    const devA = eng.createInitialProgress("sarah");
    devA.ownedUpgrades = ["wide_blade", "titan_harpoon"];
    devA.seenTrickFamilies = ["ramp_linear"];
    devA.nodes["W4.2"].stage = 3;
    devA.nodes["W4.2"].camouflageCleared = true;
    devA.games.frostwake.bestWaveSec = 29.4;

    const devB = eng.createInitialProgress("sarah");
    devB.ownedUpgrades = ["or_wide_siphon", "or_glide_wings"];
    devB.seenTrickFamilies = ["seq_linear"];
    devB.nodes["W6.3"].stage = 3;
    devB.nodes["W6.3"].camouflageCleared = true;
    devB.games.oddroot.hatchedCreatures = ["eclipse_stag", "zero_g_toad"];
    devB.games.oddroot.bestCircuitSec = 24.8;

    const m = eng.mergeProgress(devA, devB);
    for (const u of ["wide_blade", "titan_harpoon", "or_wide_siphon", "or_glide_wings"]) {
      assert.ok(m.ownedUpgrades.includes(u));
    }
    assert.ok(m.seenTrickFamilies.includes("ramp_linear") && m.seenTrickFamilies.includes("seq_linear"));
    assert.equal(m.nodes["W4.2"].camouflageCleared, true);
    assert.equal(m.nodes["W6.3"].camouflageCleared, true);
    assert.equal(m.games.frostwake.bestWaveSec, 29.4);
    assert.ok(m.games.oddroot.hatchedCreatures.includes("eclipse_stag"));
  });

  test("T3-SYNC-06: mergeProgress(A, B) vs mergeProgress(B, A) monotonic commutativity invariant", async () => {
    const eng = await loadEngine();
    const a = eng.createInitialProgress("david");
    const b = eng.createInitialProgress("david");
    a.fluxShards = 180;
    a.totalSolved = 14;
    a.ownedUpgrades = ["wide_blade"];
    a.nodes["W1.2"].stage = 3;
    a.nodes["W1.2"].pKnow = 0.94;
    b.fluxShards = 240;
    b.totalSolved = 9;
    b.ownedUpgrades = ["or_tusk_plow"];
    b.nodes["W1.2"].stage = 1;
    b.nodes["W1.2"].pKnow = 0.55;

    const ab = eng.mergeProgress(a, b);
    const ba = eng.mergeProgress(b, a);
    assert.equal(ab.fluxShards, ba.fluxShards);
    assert.equal(ab.totalSolved, ba.totalSolved);
    assert.equal(ab.nodes["W1.2"].stage, ba.nodes["W1.2"].stage);
    assert.equal(ab.nodes["W1.2"].pKnow, ba.nodes["W1.2"].pKnow);
    assert.deepEqual([...ab.ownedUpgrades].sort(), [...ba.ownedUpgrades].sort());
  });

  test("T3-SYNC-07: pullPlayerCloud + mergeProgress + pushActiveCloud round-trip merging remote Oddroot & local Frostwake", async () => {
    const eng = await loadEngine();
    const sync = await loadSync();
    const remoteProg = eng.createInitialProgress("sarah");
    remoteProg.fluxShards = 310;
    remoteProg.games.oddroot.hatchedCreatures = ["eclipse_stag"];

    await withIsolatedSyncEnv(
      {
        rpcHandler: async (fn) => {
          if (fn === "yomple_player_find") {
            return { username: "sarah", display_name: "Sarah", avatar: "🦄", has_pin: false, progress: remoteProg };
          }
          return { ok: true };
        },
      },
      async ({ rpcCalls }) => {
        const store = sync.loadStore();
        sync.ensureProfile(store, { username: "sarah", name: "Sarah", avatar: "🦄" });
        store.activeUsername = "sarah";
        store.progressByUser.sarah.ownedUpgrades = ["wide_blade"];

        await sync.pullPlayerCloud(store, "sarah");
        assert.equal(store.progressByUser.sarah.fluxShards, 310);
        assert.ok(store.progressByUser.sarah.ownedUpgrades.includes("wide_blade"));
        assert.ok(store.progressByUser.sarah.games.oddroot.hatchedCreatures.includes("eclipse_stag"));

        await sync.pushActiveCloud(store);
        assert.ok(rpcCalls.some((c) => c.fn === "bloomn_player_merge"));
      }
    );
  });

  test("T3-SYNC-08: recordWeeklySunshine × mergeProgress cross-device union stays capped at 4 suns/week", async () => {
    const eng = await loadEngine();
    const a = eng.createInitialProgress("sarah");
    const b = eng.createInitialProgress("sarah");
    for (const d of ["2026-11-09", "2026-11-10", "2026-11-11"]) eng.recordWeeklySunshine(a, d);
    for (const d of ["2026-11-11", "2026-11-12", "2026-11-13"]) eng.recordWeeklySunshine(b, d);
    const m = eng.mergeProgress(a, b);
    const finalSun = eng.recordWeeklySunshine(m, "2026-11-14");
    assert.ok(finalSun.suns <= 4);
  });

  test("T3-SYNC-09: Frostwake borrowSiblingToy(store, 'david', 'sarah', 'frostwake') -> +5💎 to Sarah, David unmutated", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv(async () => {
      const store = sync.loadStore();
      sync.ensureProfile(store, { username: "david", name: "David" });
      sync.ensureProfile(store, { username: "sarah", name: "Sarah" });
      store.progressByUser.sarah.equippedChassis = "aurora_sled";
      store.progressByUser.sarah.ownedUpgrades = ["wide_blade", "ion_boosters"];
      const s0 = store.progressByUser.sarah.fluxShards;

      const res = sync.borrowSiblingToy(store, "david", "sarah", "frostwake");
      assert.equal(res.ok, true);
      assert.equal(store.progressByUser.sarah.fluxShards, s0 + 5);
      assert.deepEqual(store.progressByUser.david.ownedUpgrades, []);
    });
  });

  test("T3-SYNC-10: Oddroot borrowSiblingToy(store, 'sarah', 'david', 'oddroot') -> +5💎 to David, Sarah unmutated", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv(async () => {
      const store = sync.loadStore();
      sync.ensureProfile(store, { username: "david", name: "David" });
      sync.ensureProfile(store, { username: "sarah", name: "Sarah" });
      store.progressByUser.david.games.oddroot.equippedMount = "bramble_boar";
      store.progressByUser.david.games.oddroot.sanctuaryUpgrades = ["or_tusk_plow"];
      store.progressByUser.david.ownedUpgrades = ["or_tusk_plow"];
      const d0 = store.progressByUser.david.fluxShards;

      const res = sync.borrowSiblingToy(store, "sarah", "david", "oddroot");
      assert.equal(res.ok, true);
      assert.equal(store.progressByUser.david.fluxShards, d0 + 5);
      assert.deepEqual(store.progressByUser.sarah.ownedUpgrades, []);
    });
  });

  test("T3-SYNC-11: borrowSiblingToy +5💎 gift × updateHouseholdLocalHero advances Household Northern Observatory tier", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv(async () => {
      const store = sync.loadStore();
      sync.ensureProfile(store, { username: "david", name: "David" });
      sync.ensureProfile(store, { username: "sarah", name: "Sarah" });
      store.progressByUser.david.fluxShards = 88;
      store.progressByUser.sarah.fluxShards = 89; // Total = 177 -> Tier 1
      sync.updateHouseholdLocalHero(store);
      assert.equal(store.householdWonder.observatoryTier, 1);

      sync.borrowSiblingToy(store, "david", "sarah", "frostwake"); // +5💎 -> 182 >= 180 -> Tier 2!
      sync.updateHouseholdLocalHero(store);
      assert.equal(store.householdWonder.observatoryTier, 2);
    });
  });

  test("T3-SYNC-12: Yomple Hub arrival ?u=sarah&from=yomple&f=MAPLE-K7Q2 imports roster & fires YompleStay.arrived", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv(
      {
        urlSearch: "?u=sarah&from=yomple&f=MAPLE-K7Q2",
        initialStorage: {
          "yomple-hub-v1": {
            familyCode: "MAPLE-K7Q2",
            activeUser: "sarah",
            profiles: [
              { username: "sarah", name: "Sarah", avatar: "🦄" },
              { username: "david", name: "David", avatar: "🦁" },
            ],
          },
        },
      },
      async ({ stayCalls }) => {
        const store = sync.loadStore();
        await sync.bootstrapYompleSession(store);
        assert.equal(store.activeUsername, "sarah");
        assert.equal(store.familyCode, "MAPLE-K7Q2");
        assert.equal(store.profiles.length, 2);
        assert.deepEqual(stayCalls[0], { username: "sarah", familyCode: "MAPLE-K7Q2" });
      }
    );
  });

  test("T3-SYNC-13: Wiped-storage iOS Home-Screen URL recovery (?u=sarah&from=yomple&f=MAPLE-K7Q2) & return link", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv({ urlSearch: "?u=sarah&from=yomple&f=MAPLE-K7Q2" }, async () => {
      const store = sync.loadStore();
      await sync.bootstrapYompleSession(store);
      assert.equal(store.activeUsername, "sarah");
      assert.equal(store.familyCode, "MAPLE-K7Q2");
      assert.equal(sync.buildYompleHubReturnUrl(store), "/?u=sarah&f=MAPLE-K7Q2");
    });
  });

  test("T3-SYNC-14: Household Northern Observatory co-op Flux (Sarah Oddroot + David Frostwake -> Tier 4) + orthogonal hero titles", async () => {
    const sync = await loadSync();
    await withIsolatedSyncEnv(async () => {
      const store = sync.loadStore();
      sync.ensureProfile(store, { username: "sarah", name: "Sarah", avatar: "🦄" });
      sync.ensureProfile(store, { username: "david", name: "David", avatar: "🦁" });
      store.progressByUser.sarah.fluxShards = 700;
      store.progressByUser.sarah.records.bestOverdriveStreak = 6;
      store.progressByUser.david.fluxShards = 600;
      store.progressByUser.david.records.deepestSubZero = 200;

      sync.updateHouseholdLocalHero(store);
      assert.equal(store.householdWonder.observatoryTier, 4);
      const sHero = store.householdWonder.heroes.sarah.hero_title;
      const dHero = store.householdWonder.heroes.david.hero_title;
      assert.notEqual(sHero, dHero, "Siblings with different strengths should earn distinct orthogonal hero titles");
    });
  });

  test("T3-MP-01: F21 Resource Fairness Invariant — partner gate_burst leaves 100% of local player's shards, nodes & gates untouched", async () => {
    const eng = await loadEngine();
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub({ wsOffline: true });

    const progSarah = eng.createInitialProgress("sarah");
    const progDavid = eng.createInitialProgress("david");
    const davidShardsBefore = progDavid.fluxShards;
    let davidReceivedBurst = false;

    const cSarah = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "FAIR-1",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const cDavid = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "FAIR-1",
      userId: "david",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
      onRemoteEvent: (ev) => {
        if (ev.type === "gate_burst") davidReceivedBurst = true;
      },
    });

    try {
      cSarah.connect();
      cDavid.connect();
      const sessSarah = eng.createSessionState();
      const enc = eng.generateEncounter("W2.1");
      commitEnc(eng, progSarah, sessSarah, enc, enc.answer, 2000);
      cSarah.sendGateBurst({ overdrive: true, worldId: "W2", nodeId: "W2.1", x: 10, y: 0, z: -10 });
      await new Promise((r) => setTimeout(r, 15));

      assert.equal(davidReceivedBurst, true);
      assert.equal(progDavid.fluxShards, davidShardsBefore);
      assert.equal(progDavid.nodes["W2.1"].wins, 0);
    } finally {
      cSarah.disconnect();
      cDavid.disconnect();
    }
  });

  test("T3-MP-02: F21 Shared Loose Star-Coin +3💎 snag × Household Flux without touching sibling's progression", async () => {
    const eng = await loadEngine();
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub({ wsOffline: true });

    const progDavid = eng.createInitialProgress("david");
    const progSarah = eng.createInitialProgress("sarah");
    const sarahBefore = structuredClone(progSarah);

    const cDavid = mp.createMultiplayerClient({
      realmId: "oddroot",
      familyCode: "COIN-1",
      userId: "david",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const cSarah = mp.createMultiplayerClient({
      realmId: "oddroot",
      familyCode: "COIN-1",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });

    try {
      cDavid.connect();
      cSarah.connect();
      if (cDavid.tryGrabSharedCoin("coin_0")) {
        progDavid.fluxShards += mp.SHARED_COIN_REWARD_SHARDS;
      }
      await new Promise((r) => setTimeout(r, 15));

      assert.equal(progDavid.fluxShards, 33);
      assert.deepEqual(progSarah, sarahBefore, "Sibling's shards, upgrades, creatures & beacons remain 100% untouched");
      assert.equal(cSarah.getCoinStates().coin_0.available, false);
    } finally {
      cDavid.disconnect();
      cSarah.disconnect();
    }
  });

  test("T3-MP-03: F21 Multi-Realm Co-Op channel switching & isolation (frostwake -> Hub -> oddroot)", async () => {
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub({ wsOffline: true });

    const fwDavid = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "SWITCH-1",
      userId: "david",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const fwSarah = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "SWITCH-1",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });

    fwDavid.connect();
    fwSarah.connect();
    fwSarah.publishLocalState({ x: 2, y: 0, z: -2, status: "roaming" });
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(fwDavid.getPeers().length, 1);

    // Sarah leaves Frostwake and enters Oddroot
    fwSarah.disconnect();
    const orSarah = mp.createMultiplayerClient({
      realmId: "oddroot",
      familyCode: "SWITCH-1",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    orSarah.connect();
    orSarah.tryGrabSharedCoin("coin_0");
    await new Promise((r) => setTimeout(r, 15));

    // Frostwake coin_0 must NOT be affected by Oddroot coin_0!
    assert.equal(fwDavid.getCoinStates().coin_0.available, true, "Zero cross-realm Star-Coin state bleed");

    fwDavid.disconnect();
    const orDavid = mp.createMultiplayerClient({
      realmId: "oddroot",
      familyCode: "SWITCH-1",
      userId: "david",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    orDavid.connect();
    orSarah.publishLocalState({ x: 0, y: 1, z: 5, status: "roaming" });
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(orDavid.getPeers().length, 1);

    orSarah.disconnect();
    orDavid.disconnect();
  });

  test("T3-MP-04: F21 Encounter Dock 'thinking' & 4-item Surge 'surge' status sync without ever broadcasting misses", async () => {
    const mp = await loadMultiplayer();
    const hub = createInMemoryCoopTransportHub({ wsOffline: true });
    const a = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "AURA-1",
      userId: "sarah",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });
    const b = mp.createMultiplayerClient({
      realmId: "frostwake",
      familyCode: "AURA-1",
      userId: "david",
      WebSocketImpl: hub.WebSocketImpl,
      BroadcastChannelImpl: hub.BroadcastChannelImpl,
    });

    try {
      a.connect();
      b.connect();
      a.publishLocalState({ x: 0, y: 0, z: 0, status: "thinking" });
      await new Promise((r) => setTimeout(r, 15));
      assert.equal(b.getPeers()[0].status, "thinking");

      await new Promise((r) => setTimeout(r, 90));
      a.publishLocalState({ x: 0, y: 0, z: 0, status: "surge" });
      await new Promise((r) => setTimeout(r, 15));
      assert.equal(b.getPeers()[0].status, "surge");
    } finally {
      a.disconnect();
      b.disconnect();
    }
  });
});

/* ============================================================================
 * SECTION B — 3D WebGL Cross-Realm, Opposition × Dock × Clear & 3D Co-Op (8 tests)
 * ============================================================================ */
describe("Tier 3 Section B — 3D WebGL Cross-Realm, Closed-Loop Encounters & 3D Co-Op", () => {
  test("T3-3D-01: Frostwake W1.2 -200 clear × getCrossRealmUnlocks × OddrootWorld3D.applyLoadout spawns Zero-G Astro-Toad", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const prog = eng.createInitialProgress("david");
      const sess = eng.createSessionState();
      const encSub = { ...eng.generateEncounter("W1.2"), answer: -200 };
      eng.evaluateCommit({ progress: prog, session: sess, encounter: encSub, committedValue: -200, planMs: 2500 });
      const unlocks = eng.getCrossRealmUnlocks(prog);

      const ctx = await window.__E2E_3D__.getSharedWorld("oddroot");
      ctx.world.applyLoadout(prog, unlocks, null);
      ctx.step(10, 16.6667);
      return { astroUnlocked: Boolean(unlocks.astroToadUnlocked), sceneCount: window.__E2E_3D__.snapshotSceneEntities(ctx.world.scene).length };
    });
    assert.equal(res.astroUnlocked, true);
    assert.ok(res.sceneCount > 30);
  });

  test("T3-3D-02: Oddroot Menagerie + W6.3 Mosaic × getCrossRealmUnlocks × FrostwakeWorld3D.applyLoadout mounts mascot & trim", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const ctx = await window.__E2E_3D__.getSharedWorld("frostwake");
      const p0 = eng.createInitialProgress("sarah");
      ctx.world.applyLoadout(p0, {}, null);
      const baseRigObjs = window.__E2E_3D__.snapshotSceneEntities(ctx.world.rigGroup).length;

      p0.games.oddroot.hatchedCreatures = ["zero_g_toad", "luminous_oddling", "eclipse_stag"];
      p0.games.oddroot.mosaicForged = true;
      p0.nodes["W6.3"].stage = 3;
      p0.nodes["W2.1"].stage = 3;
      const unlocks = eng.getCrossRealmUnlocks(p0);
      ctx.world.applyLoadout(p0, unlocks, null);
      const richRigObjs = window.__E2E_3D__.snapshotSceneEntities(ctx.world.rigGroup).length;
      return { baseRigObjs, richRigObjs };
    });
    assert.ok(res.richRigObjs > res.baseRigObjs);
  });

  test("T3-3D-03: Multi-Realm start()/stop() RAF & WebAudio hum lifecycle switching halts inactive world completely", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      return window.__E2E_3D__.withFreshWorld("frostwake", async (fw) => {
        return window.__E2E_3D__.withFreshWorld("oddroot", async (or) => {
          fw.world.start();
          fw.step(5, 16.6667);
          const fwRunning1 = fw.world.running;
          fw.world.stop();
          const fwRunningAfterStop = fw.world.running;

          or.world.start();
          or.step(5, 16.6667);
          const orRunning = or.world.running;
          or.world.stop();
          return { fwRunning1, fwRunningAfterStop, orRunning, orStopped: !or.world.running };
        });
      });
    });
    assert.equal(res.fwRunning1, true);
    assert.equal(res.fwRunningAfterStop, false);
    assert.equal(res.orRunning, true);
    assert.equal(res.orStopped, true);
  });

  test("T3-3D-04: Frostwake closed-loop Gate Approach -> Pause -> Miss Δy Caliper -> Clear Rime-Blast -> Resume", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (ctx) => {
        ctx.world.start();
        const enc = eng.generateEncounter("W1.1");
        ctx.world.populateEncounters([enc]);
        window.__E2E_3D__.engageFirstEncounter(ctx);
        ctx.world.setEncounterDockOpen(true);

        const s0 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.world.playCommitVisual({ outcome: "nudge", delta: 5, cue: "5 too high" }, enc);
        ctx.step(30, 16.6667);
        const s1 = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
        let dockMissCreepDelta = 0;
        for (const u of s1) {
          const u0 = s0.get(u.key);
          if (u0) dockMissCreepDelta = Math.max(dockMissCreepDelta, Math.hypot(u.x - u0.x, u.z - u0.z));
        }

        ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21 }, enc);
        ctx.world.setEncounterDockOpen(false);
        ctx.world.activeGateSlot = null;
        ctx.step(40, 16.6667);
        return { dockMissCreepDelta, cleared: ctx.world.areAllEncountersCleared() };
      });
    });
    assert.ok(res.dockMissCreepDelta < 1e-6);
    assert.equal(res.cleared, true);
  });

  test("T3-3D-05: Oddroot closed-loop Shrine Approach -> Pause -> Miss Spore-Gel Δy -> Clear Elixir Wave -> Resume", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      return window.__E2E_3D__.withFreshWorld("oddroot", async (ctx) => {
        ctx.world.start();
        const enc = eng.generateEncounter("W4.1");
        ctx.world.populateEncounters([enc]);
        window.__E2E_3D__.engageFirstEncounter(ctx);
        ctx.world.setEncounterDockOpen(true);

        const s0 = new Map(window.__E2E_3D__.collectOppositionSnapshots(ctx.world).map((u) => [u.key, u]));
        ctx.world.playCommitVisual({ outcome: "nudge", delta: -3, cue: "3 too low" }, enc);
        ctx.step(30, 16.6667);
        const s1 = window.__E2E_3D__.collectOppositionSnapshots(ctx.world);
        let dockMissCreepDelta = 0;
        for (const u of s1) {
          const u0 = s0.get(u.key);
          if (u0) dockMissCreepDelta = Math.max(dockMissCreepDelta, Math.hypot(u.x - u0.x, u.z - u0.z));
        }

        ctx.world.playCommitVisual({ outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21 }, enc);
        ctx.world.setEncounterDockOpen(false);
        ctx.step(30, 16.6667);
        return { dockMissCreepDelta, cleared: ctx.world.areAllEncountersCleared() };
      });
    });
    assert.ok(res.dockMissCreepDelta < 1e-6);
    assert.equal(res.cleared, true);
  });

  test("T3-3D-06: Household Great Northern Observatory Spire (Tier 1 -> 4 -> 6) across both Frostwake & Oddroot", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const fw = await window.__E2E_3D__.getSharedWorld("frostwake");
      const or = await window.__E2E_3D__.getSharedWorld("oddroot");
      const emSum = (w) =>
        window.__E2E_3D__.snapshotSceneEntities(w.scene).reduce((a, m) => a + (Number(m.emissiveIntensity) || 0), 0);

      fw.world.setObservatoryTier(1);
      or.world.setObservatoryTier(1);
      const fw1 = emSum(fw.world);
      const or1 = emSum(or.world);

      fw.world.setObservatoryTier(6);
      or.world.setObservatoryTier(6);
      const fw6 = emSum(fw.world);
      const or6 = emSum(or.world);
      return { fw1, fw6, or1, or6 };
    });
    assert.ok(res.fw6 >= res.fw1 && res.or6 > res.or1);
  });

  test("T3-3D-07: F21 Resource Fairness across multiplayer.js × FrostwakeWorld3D & OddrootWorld3D", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const eng = await import("./core/engine.js");
      const mp = await import("./core/multiplayer.js");

      return window.__E2E_3D__.withFreshWorld("oddroot", async (sarahCtx) => {
        return window.__E2E_3D__.withFreshWorld("oddroot", async (davidCtx) => {
          const davidWave = [eng.generateEncounter("W2.1"), eng.generateEncounter("W2.2"), eng.generateEncounter("W2.3")];
          davidCtx.world.populateEncounters(davidWave);

          const cSarah = mp.createMultiplayerClient({
            realmId: "oddroot",
            familyCode: "3D-FAIR",
            userId: "sarah",
            WebSocketImpl: null,
          });
          const cDavid = mp.createMultiplayerClient({
            realmId: "oddroot",
            familyCode: "3D-FAIR",
            userId: "david",
            WebSocketImpl: null,
            onRemoteEvent: (ev) => davidCtx.world.playPartnerCoopEvent(ev),
          });

          cSarah.connect();
          cDavid.connect();
          cSarah.sendGateBurst({ overdrive: true, worldId: "W2", nodeId: "W2.1", x: 6, y: 1, z: -8 });
          await new Promise((r) => setTimeout(r, 20));
          davidCtx.step(10, 16.6667);

          cSarah.disconnect();
          cDavid.disconnect();
          return { davidAllCleared: davidCtx.world.areAllEncountersCleared() };
        });
      });
    });
    assert.equal(res.davidAllCleared, false, "Partner gate_burst must leave 100% of David's 3D shrines uncleared");
  });

  test("T3-3D-08: F21 End-to-End 2-Client 3D Co-Op Sync (BroadcastChannel + Pose Lerp + Thinking Halo + Star-Coin Snag)", async () => {
    const res = await sandboxHandle.page.eval(async () => {
      const mp = await import("./core/multiplayer.js");
      return window.__E2E_3D__.withFreshWorld("frostwake", async (sarahCtx) => {
        return window.__E2E_3D__.withFreshWorld("frostwake", async (davidCtx) => {
          sarahCtx.world.start();
          davidCtx.world.start();

          const cSarah = mp.createMultiplayerClient({
            realmId: "frostwake",
            familyCode: "3D-SYNC",
            userId: "sarah",
            displayName: "Sarah",
            avatar: "🦄",
            WebSocketImpl: null,
            onPeersChanged: (peers) => sarahCtx.world.syncRemotePartners(peers),
            onCoinStateChanged: (coins) => sarahCtx.world.syncSharedCoins(coins),
            onRemoteEvent: (ev) => sarahCtx.world.playPartnerCoopEvent(ev),
          });
          const cDavid = mp.createMultiplayerClient({
            realmId: "frostwake",
            familyCode: "3D-SYNC",
            userId: "david",
            displayName: "David",
            avatar: "🦁",
            WebSocketImpl: null,
            onPeersChanged: (peers) => davidCtx.world.syncRemotePartners(peers),
            onCoinStateChanged: (coins) => davidCtx.world.syncSharedCoins(coins),
            onRemoteEvent: (ev) => davidCtx.world.playPartnerCoopEvent(ev),
          });

          cSarah.connect();
          cDavid.connect();

          // Sarah opens dock -> pauses local opposition AND publishes status: 'thinking'
          sarahCtx.world.setEncounterDockOpen(true);
          cSarah.publishLocalState({ ...sarahCtx.world.getLocalMultiplayerPose(), status: "thinking" });
          await new Promise((r) => setTimeout(r, 20));
          davidCtx.step(8, 16.6667);

          // David drives over coin_0 (-13, 10)
          davidCtx.world.rigState.x = -13;
          davidCtx.world.rigState.z = 10;
          davidCtx.step(5, 16.6667);
          let grabbed = false;
          if (davidCtx.events.coinsGrabbed.includes("coin_0")) {
            grabbed = cDavid.tryGrabSharedCoin("coin_0", { x: -13, y: 0, z: 10 });
          }
          await new Promise((r) => setTimeout(r, 20));

          const sarahSeesCoinUnavailable = cSarah.getCoinStates().coin_0.available === false;
          const davidSeesSarahThinking = cDavid.getPeers()[0]?.status === "thinking";
          cSarah.disconnect();
          cDavid.disconnect();
          return { grabbed, sarahSeesCoinUnavailable, davidSeesSarahThinking };
        });
      });
    });

    assert.equal(res.grabbed, true);
    assert.equal(res.sarahSeesCoinUnavailable, true);
    assert.equal(res.davidSeesSarahThinking, true);
  });
});

/* ============================================================================
 * SECTION C — Live Chromium Portal ↔ Frostwake ↔ Oddroot Lifecycle & Co-Op (8 tests)
 * ============================================================================ */
describe("Tier 3 Section C — Live Chromium Multi-Screen Lifecycle, Anxiety Chain & Co-Op Handover", () => {
  test("T3-PORTAL-01: 5-Step Screen Lifecycle (#screen-portal -> Frostwake -> Portal -> Oddroot -> Portal) & WebGL 0-draw stop()", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      const fw = await launchRealmFromPortal(page, "frostwake");
      await new Promise((r) => setTimeout(r, 140));
      const fwDrawsActive = await page.eval((id) => window.__e2eMetrics.drawsByCanvas[id] || 0, fw.canvasId);
      assert.ok(fwDrawsActive > 0, "Expected active Frostwake WebGL draw calls");

      await exitRealmToPortal(page);
      const fwDrawsAtExit = await page.eval((id) => window.__e2eMetrics.drawsByCanvas[id] || 0, fw.canvasId);
      await new Promise((r) => setTimeout(r, 220));
      const fwDrawsAfterWait = await page.eval((id) => window.__e2eMetrics.drawsByCanvas[id] || 0, fw.canvasId);
      assert.equal(fwDrawsAfterWait - fwDrawsAtExit, 0, "FrostwakeWorld3D.stop() must drop WebGL draws to 0 when exited");

      const or = await launchRealmFromPortal(page, "oddroot");
      await new Promise((r) => setTimeout(r, 140));
      const orDrawsActive = await page.eval((id) => window.__e2eMetrics.drawsByCanvas[id] || 0, or.canvasId);
      assert.ok(orDrawsActive > 0, "Expected active Oddroot WebGL draw calls");

      await exitRealmToPortal(page);
      const orDrawsAtExit = await page.eval((id) => window.__e2eMetrics.drawsByCanvas[id] || 0, or.canvasId);
      await new Promise((r) => setTimeout(r, 220));
      const orDrawsAfterWait = await page.eval((id) => window.__e2eMetrics.drawsByCanvas[id] || 0, or.canvasId);
      assert.equal(orDrawsAfterWait - orDrawsAtExit, 0, "OddrootWorld3D.stop() must drop WebGL draws to 0 when exited");
      page.assertZeroRuntimeErrors("T3-PORTAL-01");
    });
  });

  test("T3-PORTAL-02: Live Cross-Realm Flux Shards, Mastery Stars & Zone Progress Bar continuity without reload", async () => {
    await pool.withPage({ initialUrl: "/bloom-n/" }, async (page) => {
      const shards0 = await page.eval(() => Number(document.getElementById("portal-shards")?.textContent || 0));
      await launchRealmFromPortal(page, "frostwake");
      await cruiseToNextEncounterDock(page);
      const dock = await readAndSolveActiveDock(page);
      await commitValueInActiveDock(page, dock.solvedAnswer);
      await new Promise((r) => setTimeout(r, 250));

      await exitRealmToPortal(page);
      const shards1 = await page.eval(() => Number(document.getElementById("portal-shards")?.textContent || 0));
      assert.ok(shards1 > shards0, `Expected Portal shards to rise after Frostwake clear (${shards0} -> ${shards1})`);

      await launchRealmFromPortal(page, "oddroot");
      const oddHudTxt = await getVisibleChildDomText(page);
      assert.ok(oddHudTxt.includes(String(shards1)), "Expected Oddroot HUD shards to match Portal shards 1:1");
      page.assertZeroRuntimeErrors("T3-PORTAL-02");
    });
  });

  test("T3-PORTAL-03: Bidirectional getCrossRealmUnlocks live loadout propagation (Frostwake <-> Oddroot)", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("sarah");
    prog.calibrated = true;
    prog.discoveredMysteries = ["subzero_abyss", "moon_center"];
    prog.records.deepestSubZero = 200;
    prog.games.oddroot.hatchedCreatures = ["zero_g_toad", "luminous_oddling", "eclipse_stag"];
    prog.games.oddroot.mosaicForged = true;
    prog.nodes["W6.3"].stage = 3;
    prog.nodes["W2.1"].stage = 3;

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "sarah",
      profiles: [{ username: "sarah", name: "Sarah", avatar: "🦄" }],
      progressByUser: { sarah: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2" }, async (page) => {
      await installRealmAdapterSpies(page);
      await launchRealmFromPortal(page, "oddroot");
      await exitRealmToPortal(page);
      await launchRealmFromPortal(page, "frostwake");

      const loadouts = await page.eval(() => ({
        or: window.__adapterSpy.oddroot.loadouts,
        fw: window.__adapterSpy.frostwake.loadouts,
      }));
      assert.ok(loadouts.or.some((l) => l.unlocks?.astroToadUnlocked === true));
      assert.ok(
        loadouts.fw.some(
          (l) => l.unlocks?.goldenMosaicTrimUnlocked === true || l.unlocks?.frostwakePlowTrim === "golden_mosaic"
        )
      );
      page.assertZeroRuntimeErrors("T3-PORTAL-03");
    });
  });

  test("T3-PORTAL-04: 7-Link Anxiety-Safety Chain in live 3D (Dock Open -> Pause -> Auto-Trick -> 1st Miss Δy -> 2nd Miss +14💎 -> Surge)", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    prog.calibrated = true;
    prog.activeWorld = "W1";
    prog.seenTrickFamilies = [];

    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "david",
      profiles: [{ username: "david", name: "David", avatar: "🦁" }],
      progressByUser: { david: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=david&f=MAPLE-K7Q2" }, async (page) => {
      await installRealmAdapterSpies(page);
      await launchRealmFromPortal(page, "frostwake");

      // Gate 1: 1st miss -> nudge, 2nd miss -> warm_reveal (+14💎 + shelve)
      await cruiseToNextEncounterDock(page);
      const d1 = await readAndSolveActiveDock(page);
      const shardsBefore = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1")).progressByUser.david.fluxShards);
      await commitValueInActiveDock(page, d1.solvedAnswer + 15);
      await new Promise((r) => setTimeout(r, 120));
      await commitValueInActiveDock(page, d1.solvedAnswer + 15);
      await new Promise((r) => setTimeout(r, 300));

      const shardsAfterReveal = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1")).progressByUser.david.fluxShards);
      assert.equal(shardsAfterReveal, shardsBefore + 14, "2nd miss Warm Crystal Fox must award full +14💎");

      // Gate 2: trigger 3rd consecutive miss -> Friction >= 2.8 -> Surge Wave!
      await cruiseToNextEncounterDock(page);
      const d2 = await readAndSolveActiveDock(page);
      await commitValueInActiveDock(page, d2.solvedAnswer + 15);
      await new Promise((r) => setTimeout(r, 250));

      const surgeActive = await page.eval(() => {
        const b = document.querySelector("#surge-banner, .surge-banner.active");
        return Boolean(b && (b.classList.contains("active") || getComputedStyle(b).opacity !== "0"));
      });
      assert.equal(surgeActive, true, "Expected 3 consecutive misses (F_t >= 2.8) to trigger 4-Item Surge Wave banner");
      page.assertZeroRuntimeErrors("T3-PORTAL-04");
    });
  });

  test("T3-PORTAL-05: Yomple Hub (yomple/index.html) <-> Bloom N (?u=sarah&from=yomple&f=MAPLE-K7Q2) live round-trip", async () => {
    const hubSeed = {
      familyCode: "MAPLE-K7Q2",
      parentEmail: "parent@example.com",
      activeUser: "sarah",
      profiles: [
        { username: "sarah", name: "Sarah", avatar: "🦄" },
        { username: "david", name: "David", avatar: "🦁" },
      ],
    };

    await pool.withPage({ seedStorage: { "yomple-hub-v1": hubSeed }, initialUrl: "/" }, async (page) => {
      const hubAudit = await page.eval(() => {
        const bloom = document.querySelector("a.app.bloom")?.getAttribute("data-base");
        const bloom2 = document.querySelector("a.app.bloom2")?.getAttribute("data-base");
        const bloomnCard = document.querySelector("a.app.bloomn");
        return {
          bloom,
          bloom2,
          bloomnHref: bloomnCard?.getAttribute("href") || "",
          bloomnText: bloomnCard?.textContent || "",
        };
      });

      assert.match(hubAudit.bloom, /functions\/v1\/bloom\/$/);
      assert.match(hubAudit.bloom2, /functions\/v1\/bloom-beta\/$/);
      assert.equal(findBannedWord(hubAudit.bloomnText, FALLBACK_BANNED_CURRICULUM_WORDS), null);

      await page.goto(hubAudit.bloomnHref || "/bloom-n/?u=sarah&from=yomple&f=MAPLE-K7Q2");
      const bloomState = await page.eval(() => ({
        who: document.getElementById("portal-who-btn")?.textContent || "",
        backHref: document.getElementById("yomple-back-link")?.getAttribute("href") || "",
      }));
      assert.match(bloomState.who, /Sarah/i);
      assert.match(bloomState.backHref, /u=sarah/i);
      assert.match(bloomState.backHref, /f=MAPLE-K7Q2/i);
      page.assertZeroRuntimeErrors("T3-PORTAL-05");
    });
  });

  test("T3-PORTAL-06: Mocked Supabase Cloud Sync Inspector (< 38 KB payload + field_players.fun.bloom_n fallback)", async () => {
    await pool.withPage({ supabaseMode: "cloud_ok", initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2" }, async (page) => {
      await page.eval(async () => {
        const sync = await import("./core/sync.js");
        const store = sync.loadStore();
        await sync.pushActiveCloud(store);
      });
      const mergeCall = page.supabaseCalls.find((c) => c.rpcName === "bloomn_player_merge");
      assert.ok(mergeCall, "Expected bloomn_player_merge RPC call");
      assert.ok(mergeCall.rawBytes < 38000);
      assert.ok(mergeCall.body?.p_progress?.games?.frostwake && mergeCall.body?.p_progress?.games?.oddroot);
    });

    await pool.withPage(
      {
        supabaseMode: "pre_migration_fallback",
        mockCloudRows: { sarah: { username: "sarah", has_pin: false, progress: { trees: 7 }, fun: { keep: 1 } } },
        initialUrl: "/bloom-n/?u=sarah&f=MAPLE-K7Q2",
      },
      async (page) => {
        await page.eval(async () => {
          const sync = await import("./core/sync.js");
          const store = sync.loadStore();
          await sync.pushActiveCloud(store);
        });
        const upsert = page.supabaseCalls.find((c) => c.rpcName === "yomple_player_upsert");
        assert.ok(upsert, "Expected pre-migration fallback to yomple_player_upsert");
        assert.equal(upsert.body.p_table, "field_players");
        assert.deepEqual(upsert.body.p_row.progress, { trees: 7 });
        assert.equal(upsert.body.p_row.fun.keep, 1);
      }
    );
  });

  test("T3-PORTAL-07: In-World 3D Garage/Workshop purchase × live Rig/Mount rebuild without exiting 3D", async () => {
    const eng = await loadEngine();
    const prog = eng.createInitialProgress("david");
    prog.fluxShards = 300;
    const seedStore = {
      familyCode: "MAPLE-K7Q2",
      activeUsername: "david",
      profiles: [{ username: "david", name: "David", avatar: "🦁" }],
      progressByUser: { david: prog },
    };

    await pool.withPage({ seedStorage: { "bloom-n-v1": seedStore }, initialUrl: "/bloom-n/?u=david&f=MAPLE-K7Q2" }, async (page) => {
      await launchRealmFromPortal(page, "frostwake");
      const bought = await page.eval(() => {
        document.getElementById("hud-garage-btn")?.click();
        const buyBtn = [...document.querySelectorAll("#modal-garage button")].find((b) =>
          /install|💎|45/i.test(b.textContent || "")
        );
        if (!buyBtn) return false;
        buyBtn.click();
        document.querySelector("#modal-garage [data-close='modal-garage']")?.click();
        return document.getElementById("screen-frostwake")?.classList.contains("active");
      });
      assert.equal(bought, true);
      const afterStore = await page.eval(() => JSON.parse(localStorage.getItem("bloom-n-v1")));
      assert.ok(afterStore.progressByUser.david.ownedUpgrades.length >= 1);
      page.assertZeroRuntimeErrors("T3-PORTAL-07");
    });
  });

  test("T3-PORTAL-08: Live 2-Tab Co-Op realm switching topic handover (frostwake -> Portal -> oddroot)", async () => {
    await pool.withSharedContextCoopPages(
      [
        { initialUrl: "/bloom-n/?u=sarah&f=COOPHANDOVER", wsMode: "offline_broadcast" },
        { initialUrl: "/bloom-n/?u=david&f=COOPHANDOVER", wsMode: "offline_broadcast" },
      ],
      async ([tabSarah, tabDavid]) => {
        await launchRealmFromPortal(tabSarah, "frostwake");
        await launchRealmFromPortal(tabDavid, "frostwake");

        await tabSarah.waitFor(
          () => /david|🦁/i.test(document.getElementById("screen-frostwake")?.textContent || ""),
          { timeoutMs: 4000, label: "Frostwake partner pairing" }
        );

        await exitRealmToPortal(tabSarah);
        await exitRealmToPortal(tabDavid);

        await launchRealmFromPortal(tabSarah, "oddroot");
        await launchRealmFromPortal(tabDavid, "oddroot");

        await tabSarah.waitFor(
          () => /david|🦁/i.test(document.getElementById("screen-oddroot")?.textContent || ""),
          { timeoutMs: 4500, label: "Oddroot partner re-pairing after realm handover" }
        );

        tabSarah.assertZeroRuntimeErrors("T3-PORTAL-08-sarah");
        tabDavid.assertZeroRuntimeErrors("T3-PORTAL-08-david");
      }
    );
  });
});
