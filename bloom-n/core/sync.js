/**
 * Bloom N — Yomple Household Handoff, Sibling Toy Borrow & Dual-Compatible Supabase Cloud Sync
 * Works seamlessly in browser ES modules and pure Node.js test environments (zero unguarded DOM globals),
 * syncing with native bloomn_players RPCs and pre-migration fallback via field_players.fun.bloom_n.
 */

import {
  createInitialProgress,
  computeHeroTitle,
  mergeProgress,
  WORLDS,
} from "./engine.js";

export const SB_URL = "https://digcgqltrlmhgmzgmvwc.supabase.co";
export const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZ2NncWx0cmxtaGdtemdtdndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODY4NjEsImV4cCI6MjA4OTE2Mjg2MX0.suxy0jXsIJqrJYbQuCc54sHbN5miCICxLUdOc9gUTkY";

export const STORE_KEY = "bloom-n-v1";
export const HUB_KEY = "yomple-hub-v1";
export const MAX_FUN_BYTES = 38000; // Strictly < 38 KB (38,912 bytes)

let saveTimer = null;
let syncListeners = [];
let rpcTransportOverride = null;
const sessionBorrowLedger = new WeakMap();

export function onSyncUpdate(fn) {
  syncListeners.push(fn);
}

export function setRpcTransport(transportFn) {
  rpcTransportOverride = typeof transportFn === "function" ? transportFn : null;
}

export function clearPendingSyncTimer() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

function notifySync(status) {
  for (const fn of syncListeners) {
    try {
      fn(status);
    } catch (_) {}
  }
}

export function slugName(s) {
  return (
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 18) || "player"
  );
}

export async function sbRpc(fn, args, token) {
  if (rpcTransportOverride) {
    try {
      return await rpcTransportOverride(fn, args || {}, token);
    } catch (_) {
      return null;
    }
  }
  if (typeof fetch !== "function") return null;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${token || SB_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args || {}),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (_) {
    return null;
  }
}

function inferPresetForName(username, displayName) {
  const probe = `${username} ${displayName}`.toLowerCase();
  if (probe.includes("sarah")) return "sarah";
  if (probe.includes("david")) return "david";
  return "auto";
}

function defaultRigForName(username, displayName) {
  const probe = `${username} ${displayName}`.toLowerCase();
  if (probe.includes("sarah")) return "aurora_sled";
  return "terra_dozer";
}

function defaultMountForName(username, displayName) {
  const probe = `${username} ${displayName}`.toLowerCase();
  if (probe.includes("sarah")) return "starlight_glider";
  return "bramble_boar";
}

function safeReadLocalStorage(key) {
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.getItem === "function") {
      return localStorage.getItem(key);
    }
  } catch (_) {}
  return null;
}

function safeWriteLocalStorage(key, value) {
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.setItem === "function") {
      localStorage.setItem(key, value);
    }
  } catch (_) {}
}

export function loadStore() {
  let raw = null;
  try {
    raw = JSON.parse(safeReadLocalStorage(STORE_KEY) || "null");
  } catch (_) {}

  const store = Object.assign(
    {
      familyCode: "",
      parentEmail: "",
      activeUsername: "",
      muted: false,
      profiles: [],
      progressByUser: {},
      householdWonder: {
        totalFlux: 60,
        observatoryTier: 1,
        heroes: {},
        sharedToys: {},
      },
      lastSyncStatus: "local",
    },
    raw || {}
  );

  store.householdWonder = Object.assign(
    {
      totalFlux: 60,
      observatoryTier: 1,
      heroes: {},
      sharedToys: {},
    },
    store.householdWonder || {}
  );
  store.householdWonder.heroes = store.householdWonder.heroes || {};
  store.householdWonder.sharedToys = store.householdWonder.sharedToys || {};

  // Inherit household code from Yomple Hub or sister apps if empty
  if (!store.familyCode) {
    try {
      const hub = JSON.parse(safeReadLocalStorage(HUB_KEY) || "null");
      if (hub && hub.familyCode) {
        store.familyCode = String(hub.familyCode).toUpperCase();
        store.parentEmail = hub.parentEmail || store.parentEmail;
      } else if (typeof window !== "undefined" && typeof window.readSisterHousehold === "function") {
        const sis = window.readSisterHousehold();
        if (sis && sis.code) {
          store.familyCode = sis.code;
          store.parentEmail = sis.email || store.parentEmail;
        }
      }
    } catch (_) {}
  }

  return store;
}

export function saveStore(store, triggerCloud = true) {
  if (!store || typeof store !== "object") return;
  updateHouseholdLocalHero(store);
  safeWriteLocalStorage(STORE_KEY, JSON.stringify(store));
  if (triggerCloud) scheduleCloudSync(store);
}

export function ensureProfile(store, { username, name, avatar, pin = "", hasPin = false }) {
  const u = slugName(username || name);
  let prof = store.profiles.find((p) => p.username === u);
  if (!prof) {
    prof = {
      username: u,
      name: name || u,
      avatar: avatar || (u.includes("sarah") ? "🦄" : u.includes("david") ? "🦁" : "❄️"),
      pin: pin || "",
      hasPin: Boolean(hasPin),
    };
    store.profiles.push(prof);
  } else {
    if (name) prof.name = name;
    if (avatar) prof.avatar = avatar;
    if (pin) prof.pin = pin;
    if (hasPin) prof.hasPin = true;
  }

  if (!store.progressByUser[u]) {
    const preset = inferPresetForName(u, prof.name);
    const prog = createInitialProgress(preset);
    prog.equippedChassis = defaultRigForName(u, prof.name);
    if (prog.games?.frostwake) {
      prog.games.frostwake.equippedChassis = prog.equippedChassis;
    }
    if (prog.games?.oddroot) {
      prog.games.oddroot.equippedMount = defaultMountForName(u, prof.name);
    }
    if (!prog.unlockedWorlds.includes("W2")) prog.unlockedWorlds.push("W2");
    store.progressByUser[u] = prog;
  }

  return prof;
}

export function getActiveProfile(store) {
  if (!store.activeUsername && store.profiles.length > 0) {
    store.activeUsername = store.profiles[0].username;
  }
  return store.profiles.find((p) => p.username === store.activeUsername) || null;
}

export function getActiveProgress(store) {
  const prof = getActiveProfile(store);
  if (!prof) return createInitialProgress("auto");
  if (!store.progressByUser[prof.username]) {
    store.progressByUser[prof.username] = createInitialProgress(inferPresetForName(prof.username, prof.name));
  }
  return store.progressByUser[prof.username];
}

function highestUnlockedWorldIndex(prog) {
  let maxIdx = 1;
  for (const wid of prog.unlockedWorlds || []) {
    const w = WORLDS.find((x) => x.id === wid);
    if (w && w.index > maxIdx) maxIdx = w.index;
  }
  return maxIdx;
}

export function updateHouseholdLocalHero(store) {
  const prevWonder = store.householdWonder || {};
  const wonder = {
    totalFlux: prevWonder.totalFlux || 0,
    observatoryTier: prevWonder.observatoryTier || 1,
    heroes: { ...(prevWonder.heroes || {}) },
    sharedToys: { ...(prevWonder.sharedToys || {}) },
  };
  let sumLocalFlux = 0;
  for (const prof of store.profiles || []) {
    const prog = store.progressByUser?.[prof.username];
    if (!prog) continue;
    sumLocalFlux += prog.fluxShards || 0;
    wonder.heroes[prof.username] = {
      display_name: prof.name,
      avatar: prof.avatar,
      hero_title: computeHeroTitle(prog),
      world_max: highestUnlockedWorldIndex(prog),
    };
  }
  wonder.totalFlux = Math.max(wonder.totalFlux || 0, sumLocalFlux);
  wonder.observatoryTier = computeObservatoryTier(wonder.totalFlux);
  store.householdWonder = wonder;
}

export function computeObservatoryTier(totalFlux) {
  if (totalFlux >= 5000) return 6;
  if (totalFlux >= 2500) return 5;
  if (totalFlux >= 1200) return 4;
  if (totalFlux >= 500) return 3;
  if (totalFlux >= 180) return 2;
  return 1;
}

/**
 * Friendly 1-Tap Sibling Toy Borrow:
 * - Credits +5💎 warm gift to lender once per (borrower, lender) session pair
 * - Returns null on invalid input, unknown lender, or self-borrow (safe for `if (borrowedToy)`)
 * - Never mutates borrower's progress or shards!
 */
export function borrowSiblingToy(store, borrowerUser, lenderUser, realmId = "frostwake") {
  if (!store || typeof store !== "object") return null;
  const rawBorrower = String(borrowerUser || "").trim();
  const rawLender = String(lenderUser || "").trim();
  if (!rawBorrower || !rawLender) return null;

  const bSlug = slugName(rawBorrower);
  const lSlug = slugName(rawLender);
  if (bSlug === lSlug) return null;

  const lenderProg = store.progressByUser?.[lSlug];
  if (!lenderProg) return null;

  const lenderProf = (store.profiles || []).find((p) => p.username === lSlug) || null;
  const normRealm = String(realmId || "frostwake").trim().toLowerCase() === "oddroot" ? "oddroot" : "frostwake";

  let pairSet = sessionBorrowLedger.get(store);
  if (!pairSet) {
    pairSet = new Set();
    sessionBorrowLedger.set(store, pairSet);
  }
  const pairKey = `${bSlug}->${lSlug}`;
  const alreadyGifted = pairSet.has(pairKey);
  let giftShards = 0;

  if (!alreadyGifted) {
    pairSet.add(pairKey);
    giftShards = 5;
    lenderProg.fluxShards = (lenderProg.fluxShards || 0) + giftShards;
    lenderProg.unsyncedFlux = (lenderProg.unsyncedFlux || 0) + giftShards;
  }

  const displayName = lenderProf?.name || lSlug;
  const avatar = lenderProf?.avatar || "⭐";
  const chassisId =
    lenderProg.games?.frostwake?.equippedChassis ||
    lenderProg.equippedChassis ||
    defaultRigForName(lSlug, displayName);
  const mountId =
    lenderProg.games?.oddroot?.equippedMount || defaultMountForName(lSlug, displayName);
  const staffId = lenderProg.games?.oddroot?.equippedStaff || "sun_siphon";

  const fwUpgrades = Array.isArray(lenderProg.ownedUpgrades) ? lenderProg.ownedUpgrades : [];
  const orUpgrades = Array.isArray(lenderProg.games?.oddroot?.sanctuaryUpgrades)
    ? lenderProg.games.oddroot.sanctuaryUpgrades
    : [];
  const combinedUpgrades = Array.from(new Set([...fwUpgrades, ...orUpgrades]));

  const hatched = Array.isArray(lenderProg.games?.oddroot?.hatchedCreatures)
    ? lenderProg.games.oddroot.hatchedCreatures
    : [];
  const companionId =
    hatched.length > 0
      ? hatched[hatched.length - 1]
      : combinedUpgrades.includes("or_crystal_fox")
      ? "crystal_fox"
      : combinedUpgrades.includes("spirit_fox")
      ? "spirit_fox"
      : null;

  store.householdWonder = store.householdWonder || {
    totalFlux: 60,
    observatoryTier: 1,
    heroes: {},
    sharedToys: {},
  };
  store.householdWonder.sharedToys = store.householdWonder.sharedToys || {};
  store.householdWonder.sharedToys[bSlug] = {
    owner: lSlug,
    displayName,
    avatar,
    realmId: normRealm,
    chassisId,
    mountId,
    staffId,
    companionId,
    upgrades: [...combinedUpgrades],
    borrowedAt: Date.now(),
  };

  saveStore(store, false);

  return {
    ok: true,
    owner: lSlug,
    displayName,
    avatar,
    realmId: normRealm,
    giftShards,
    alreadyGifted,
    chassisId,
    upgrades: [...combinedUpgrades],
    frostwakeRig: {
      chassisId,
      upgrades: [...combinedUpgrades],
    },
    mountId,
    staffId,
    companionId,
    oddrootLoadout: {
      mountId,
      staffId,
      companionId,
      upgrades: [...combinedUpgrades],
    },
  };
}

function roundNum2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function compactKeyframeEntry(entry) {
  if (Array.isArray(entry)) {
    return entry.slice(0, 6).map((x) => roundNum2(x));
  }
  if (entry && typeof entry === "object") {
    const compact = {};
    for (const key of ["t", "x", "y", "z", "heading", "yaw", "pitch", "speed"]) {
      if (entry[key] !== undefined) {
        compact[key] = roundNum2(entry[key]);
      }
    }
    return compact;
  }
  return roundNum2(entry);
}

function downsampleFrameArray(arr, maxLen) {
  if (!Array.isArray(arr) || maxLen <= 0 || arr.length === 0) return [];
  if (arr.length <= maxLen) {
    return arr.map(compactKeyframeEntry);
  }
  const out = [];
  const lastIdx = arr.length - 1;
  for (let i = 0; i < maxLen; i++) {
    const idx = i === maxLen - 1 ? lastIdx : Math.round((i * lastIdx) / (maxLen - 1));
    out.push(compactKeyframeEntry(arr[idx]));
  }
  return out;
}

function compactGhostBestValue(ghostBest, maxLen) {
  if (!ghostBest) return null;
  if (Array.isArray(ghostBest)) {
    return maxLen > 0 ? downsampleFrameArray(ghostBest, maxLen) : [];
  }
  if (typeof ghostBest === "object") {
    const clone = {};
    for (const [k, v] of Object.entries(ghostBest)) {
      if (k === "frames" || k === "keyframes" || k === "path" || k === "ghostFrames") {
        clone[k] = maxLen > 0 ? downsampleFrameArray(v, maxLen) : [];
      } else if (typeof v === "number") {
        clone[k] = roundNum2(v);
      } else if (typeof v === "string" || typeof v === "boolean" || v === null) {
        clone[k] = v;
      }
    }
    return clone;
  }
  return null;
}

function utf8ByteLength(obj) {
  const json = JSON.stringify(obj);
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(json).length;
  }
  return json.length * 2;
}

function cloneRealmCompact(realmObj, maxFrames) {
  if (!realmObj || typeof realmObj !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(realmObj)) {
    if (k === "ghostFrames") {
      out.ghostFrames = maxFrames > 0 ? downsampleFrameArray(v, maxFrames) : [];
    } else if (k === "ghostBest") {
      out.ghostBest = compactGhostBestValue(v, maxFrames);
    } else if (Array.isArray(v)) {
      out[k] = v.slice(0, 64);
    } else if (v && typeof v === "object") {
      out[k] = { ...v };
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Bounds cross-realm `games` state (including both `ghostFrames` and `ghostBest` across
 * `frostwake` and `oddroot`) so `p_fun` is strictly `< 38 KB` without mutating live arrays!
 */
export function compactGamesForCloud(games, maxBytes = 36000) {
  if (!games || typeof games !== "object") {
    return { frostwake: {}, oddroot: {} };
  }
  const budget = Math.min(maxBytes, MAX_FUN_BYTES - 1500);
  for (const frameCap of [120, 40, 0]) {
    const candidate = {};
    for (const [realmKey, realmVal] of Object.entries(games)) {
      candidate[realmKey] = cloneRealmCompact(realmVal, frameCap);
    }
    if (utf8ByteLength(candidate) <= budget || frameCap === 0) {
      return candidate;
    }
  }
  return { frostwake: {}, oddroot: {} };
}

function pickBestPositiveRun(olderRealm, newerRealm, secKey) {
  const aSec = Number(olderRealm?.[secKey]);
  const bSec = Number(newerRealm?.[secKey]);
  const aOk = Number.isFinite(aSec) && aSec > 0;
  const bOk = Number.isFinite(bSec) && bSec > 0;

  let bestSec = null;
  let winner = newerRealm || olderRealm || {};
  const other = winner === newerRealm ? olderRealm || {} : newerRealm || {};

  if (aOk && bOk) {
    if (aSec <= bSec) {
      bestSec = aSec;
      winner = olderRealm;
    } else {
      bestSec = bSec;
      winner = newerRealm;
    }
  } else if (aOk) {
    bestSec = aSec;
    winner = olderRealm;
  } else if (bOk) {
    bestSec = bSec;
    winner = newerRealm;
  }

  const alt = winner === newerRealm ? olderRealm || {} : newerRealm || {};
  const ghostFrames =
    Array.isArray(winner?.ghostFrames) && winner.ghostFrames.length > 0
      ? [...winner.ghostFrames]
      : Array.isArray(alt?.ghostFrames)
      ? [...alt.ghostFrames]
      : Array.isArray(other?.ghostFrames)
      ? [...other.ghostFrames]
      : [];
  const ghostBest = winner?.ghostBest ?? alt?.ghostBest ?? null;
  return { bestSec, ghostFrames, ghostBest };
}

/**
 * Pure monotonic cross-realm merge helper for `games.{frostwake, oddroot}`.
 */
export function mergeGamesState(olderGames = {}, newerGames = {}) {
  const fwOld = olderGames?.frostwake || {};
  const fwNew = newerGames?.frostwake || {};
  const fwRun = pickBestPositiveRun(fwOld, fwNew, "bestWaveSec");

  const orOld = olderGames?.oddroot || {};
  const orNew = newerGames?.oddroot || {};
  const orRun = pickBestPositiveRun(orOld, orNew, "bestCircuitSec");

  const hatchedCreatures = Array.from(
    new Set([...(orOld.hatchedCreatures || []), ...(orNew.hatchedCreatures || [])])
  );
  const sanctuaryUpgrades = Array.from(
    new Set([...(orOld.sanctuaryUpgrades || []), ...(orNew.sanctuaryUpgrades || [])])
  );
  const creatureStages = {};
  for (const cid of new Set([
    ...Object.keys(orOld.creatureStages || {}),
    ...Object.keys(orNew.creatureStages || {}),
    ...hatchedCreatures,
  ])) {
    const sMax = Math.max(Number(orOld.creatureStages?.[cid]) || 0, Number(orNew.creatureStages?.[cid]) || 0);
    creatureStages[cid] = hatchedCreatures.includes(cid) ? Math.max(1, sMax) : sMax;
  }

  return {
    ...(olderGames || {}),
    ...(newerGames || {}),
    frostwake: {
      ...fwOld,
      ...fwNew,
      equippedChassis: fwNew.equippedChassis || fwOld.equippedChassis || "terra_dozer",
      snowClearedM2: Math.max(Number(fwOld.snowClearedM2) || 0, Number(fwNew.snowClearedM2) || 0),
      rimeCreepsCleared: Math.max(Number(fwOld.rimeCreepsCleared) || 0, Number(fwNew.rimeCreepsCleared) || 0),
      foxDensThawed: Math.max(Number(fwOld.foxDensThawed) || 0, Number(fwNew.foxDensThawed) || 0),
      bestWaveSec: fwRun.bestSec,
      ghostFrames: fwRun.ghostFrames,
      ghostBest: fwRun.ghostBest,
    },
    oddroot: {
      ...orOld,
      ...orNew,
      equippedMount: orNew.equippedMount || orOld.equippedMount || "bramble_boar",
      equippedStaff: orNew.equippedStaff || orOld.equippedStaff || "sun_siphon",
      cauldronsBrewed: Math.max(Number(orOld.cauldronsBrewed) || 0, Number(orNew.cauldronsBrewed) || 0),
      hatchedCreatures,
      creatureStages,
      sanctuaryUpgrades,
      blightClearedM2: Math.max(Number(orOld.blightClearedM2) || 0, Number(orNew.blightClearedM2) || 0),
      blightClearedCount: Math.max(Number(orOld.blightClearedCount) || 0, Number(orNew.blightClearedCount) || 0),
      longestVineGrindM: Math.max(Number(orOld.longestVineGrindM) || 0, Number(orNew.longestVineGrindM) || 0),
      bestCircuitSec: orRun.bestSec,
      ghostFrames: orRun.ghostFrames,
      ghostBest: orRun.ghostBest,
      mosaicForged:
        typeof orOld.mosaicForged === "number" || typeof orNew.mosaicForged === "number"
          ? Math.max(Number(orOld.mosaicForged) || 0, Number(orNew.mosaicForged) || 0)
          : Boolean(orOld.mosaicForged || orNew.mosaicForged),
    },
  };
}

export function readArrivalIdentity(searchOverride = null) {
  const rawSearch =
    typeof searchOverride === "string"
      ? searchOverride
      : typeof window !== "undefined" && window.location && typeof window.location.search === "string"
      ? window.location.search
      : "";
  const q = new URLSearchParams(rawSearch);
  const u = (q.get("u") || q.get("who") || "").trim();
  const f = (q.get("f") || q.get("family") || "").trim().toUpperCase();

  let hubData = null;
  try {
    hubData = JSON.parse(safeReadLocalStorage(HUB_KEY) || "null");
  } catch (_) {}

  const hubProfiles = (hubData && Array.isArray(hubData.profiles) ? hubData.profiles : []).map((p) => ({
    username: slugName(p.username || p.name),
    name: p.name || p.username,
    avatar: p.avatar || "⭐",
    pin: p.pin || "",
    hasPin: Boolean(p.hasPin),
  }));

  if (u) {
    const matchHub = hubProfiles.find((p) => p.username === slugName(u));
    return {
      username: slugName(u),
      displayName: matchHub ? matchHub.name : u,
      avatar: matchHub ? matchHub.avatar : "",
      pin: matchHub ? matchHub.pin : "",
      familyCode: f || (hubData && hubData.familyCode) || "",
      hubProfiles,
    };
  }

  if (hubData && hubData.activeUser) {
    const matchHub = hubProfiles.find((p) => p.username === slugName(hubData.activeUser));
    return {
      username: slugName(hubData.activeUser),
      displayName: matchHub ? matchHub.name : hubData.activeUser,
      avatar: matchHub ? matchHub.avatar : "",
      pin: matchHub ? matchHub.pin : "",
      familyCode: f || hubData.familyCode || "",
      hubProfiles,
    };
  }

  return { username: "", familyCode: f, hubProfiles };
}

/**
 * Bootstraps player & household state from Yomple Hub + Supabase cloud.
 */
export async function bootstrapYompleSession(store) {
  const arrival = readArrivalIdentity();

  if (arrival.familyCode && arrival.familyCode.length >= 2) {
    store.familyCode = arrival.familyCode;
  }

  for (const hp of arrival.hubProfiles) {
    ensureProfile(store, hp);
  }

  if (arrival.username) {
    const prof = ensureProfile(store, {
      username: arrival.username,
      name: arrival.displayName,
      avatar: arrival.avatar,
      pin: arrival.pin,
    });
    store.activeUsername = prof.username;
  } else if (store.profiles.length === 0) {
    ensureProfile(store, { username: "david", name: "David", avatar: "🦁" });
    ensureProfile(store, { username: "sarah", name: "Sarah", avatar: "🦄" });
    store.activeUsername = "david";
  }

  const active = getActiveProfile(store);
  if (active && typeof window !== "undefined" && window.YompleStay) {
    window.YompleStay.arrived(active.username, store.familyCode || "");
  }

  saveStore(store, false);

  if (active) {
    pullPlayerCloud(store, active.username).then((updated) => {
      if (updated) notifySync("synced");
    });
  }

  return store;
}

export async function pullPlayerCloud(store, username) {
  const prof = store.profiles.find((p) => p.username === username);
  if (!prof) return false;

  // 1. Try native bloomn_players first
  let row = await sbRpc("yomple_player_find", {
    p_table: "bloomn_players",
    p_username: username,
  });
  let sourceTable = "bloomn_players";

  // 2. Fallback to field_players (stores namespaced fun.bloom_n before migration runs)
  if (!row) {
    const anyHit = await sbRpc("yomple_player_find_any", {
      p_username: username,
      p_prefer: "field_players",
    });
    if (anyHit) {
      row = anyHit;
      sourceTable = anyHit.table || "field_players";
    }
  }

  if (!row) return false;

  if (row.has_pin) {
    const cachedPin = prof.pin || "";
    if (!cachedPin) return false;
    const claimed = await sbRpc("yomple_player_claim", {
      p_table: sourceTable,
      p_username: username,
      p_pin: cachedPin,
    });
    if (!claimed) return false;
    row = claimed;
  }

  if (row.display_name) prof.name = row.display_name;
  if (row.avatar) prof.avatar = row.avatar;
  if (row.family_code && !store.familyCode) store.familyCode = row.family_code;

  const remoteProgress =
    sourceTable === "bloomn_players"
      ? row.progress
      : row.fun && row.fun.bloom_n && row.fun.bloom_n.progress
      ? row.fun.bloom_n.progress
      : null;

  const remoteFunGames =
    sourceTable === "bloomn_players"
      ? row.fun?.games
      : row.fun?.bloom_n?.games || row.fun?.bloom_n?.progress?.games;

  let currentProg = store.progressByUser[username] || createInitialProgress(inferPresetForName(username, prof.name));
  if (remoteProgress && Object.keys(remoteProgress).length > 0) {
    currentProg = mergeProgress(currentProg, remoteProgress);
  }
  if (remoteFunGames && typeof remoteFunGames === "object") {
    currentProg.games = mergeGamesState(currentProg.games, remoteFunGames);
    currentProg.snowClearedM2 = Math.max(
      currentProg.snowClearedM2 || 0,
      currentProg.games.frostwake?.snowClearedM2 || 0
    );
  }
  store.progressByUser[username] = currentProg;

  store.lastSyncStatus = sourceTable === "bloomn_players" ? "cloud:bloomn" : "cloud:yomple";
  saveStore(store, false);
  return true;
}

export function scheduleCloudSync(store) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    pushActiveCloud(store);
  }, 900);
  if (saveTimer && typeof saveTimer.unref === "function") {
    try {
      saveTimer.unref();
    } catch (_) {}
  }
}

export async function pushActiveCloud(store) {
  const prof = getActiveProfile(store);
  if (!prof) return false;
  const prog = getActiveProgress(store);
  const heroTitle = computeHeroTitle(prog);
  const worldMax = highestUnlockedWorldIndex(prog);

  const compactedGames = compactGamesForCloud(prog.games, 34000);
  const cloudProg = {
    ...prog,
    games: compactedGames,
  };
  const funPayload = {
    heroTitle,
    equippedChassis: prog.equippedChassis,
    games: compactedGames,
  };

  // 1. Try native bloomn_player_merge RPC
  const merged = await sbRpc("bloomn_player_merge", {
    p_username: prof.username,
    p_pin: prof.pin || null,
    p_family: store.familyCode || null,
    p_display_name: prof.name,
    p_avatar: prof.avatar,
    p_progress: cloudProg,
    p_fun: funPayload,
  });

  if (merged && merged.ok) {
    if (merged.progress) {
      const nextProg = mergeProgress(prog, merged.progress);
      if (merged.fun?.games) {
        nextProg.games = mergeGamesState(nextProg.games, merged.fun.games);
      }
      // Preserve live high-res ghost arrays when local run is still the fastest!
      if (
        prog.games?.frostwake?.ghostFrames?.length > (nextProg.games?.frostwake?.ghostFrames?.length || 0) &&
        prog.games.frostwake.bestWaveSec === nextProg.games?.frostwake?.bestWaveSec
      ) {
        nextProg.games.frostwake.ghostFrames = prog.games.frostwake.ghostFrames;
        nextProg.games.frostwake.ghostBest = prog.games.frostwake.ghostBest;
      }
      if (
        prog.games?.oddroot?.ghostFrames?.length > (nextProg.games?.oddroot?.ghostFrames?.length || 0) &&
        prog.games.oddroot.bestCircuitSec === nextProg.games?.oddroot?.bestCircuitSec
      ) {
        nextProg.games.oddroot.ghostFrames = prog.games.oddroot.ghostFrames;
        nextProg.games.oddroot.ghostBest = prog.games.oddroot.ghostBest;
      }
      store.progressByUser[prof.username] = nextProg;
    }
    if (store.familyCode) {
      const famRes = await sbRpc("bloomn_household_sync", {
        p_family: store.familyCode,
        p_username: prof.username,
        p_display_name: prof.name,
        p_avatar: prof.avatar,
        p_flux_delta: prog.unsyncedFlux || 0,
        p_hero_title: heroTitle,
        p_world_max: worldMax,
      });
      if (famRes && famRes.ok) {
        store.progressByUser[prof.username].unsyncedFlux = 0;
        prog.unsyncedFlux = 0;
        store.householdWonder = {
          totalFlux: famRes.total_flux,
          observatoryTier: famRes.observatory_tier,
          heroes: famRes.heroes || store.householdWonder?.heroes || {},
          sharedToys: store.householdWonder?.sharedToys || {},
        };
      }
    }
    store.lastSyncStatus = "cloud:bloomn";
    saveStore(store, false);
    notifySync("synced");
    return true;
  }

  // 2. Graceful pre-migration fallback via field_players.fun.bloom_n (never clobbers Quiet Field!)
  const existingField = await sbRpc("yomple_player_find", {
    p_table: "field_players",
    p_username: prof.username,
  });

  let baseProgress = {};
  let baseFun = {};
  if (existingField) {
    if (existingField.has_pin) {
      if (!prof.pin) {
        store.lastSyncStatus = "local";
        notifySync("local");
        return false;
      }
      const claimed = await sbRpc("yomple_player_claim", {
        p_table: "field_players",
        p_username: prof.username,
        p_pin: prof.pin,
      });
      if (!claimed) {
        store.lastSyncStatus = "local";
        notifySync("local");
        return false;
      }
      baseProgress = claimed.progress || {};
      baseFun = claimed.fun || {};
    } else {
      baseProgress = existingField.progress || {};
      baseFun = existingField.fun || {};
    }
  }

  const prevBloomNFun = baseFun?.bloom_n || {};
  const mergedFallbackProg = prevBloomNFun.progress
    ? mergeProgress(prevBloomNFun.progress, cloudProg)
    : cloudProg;
  const mergedFallbackGames = prevBloomNFun.games
    ? mergeGamesState(prevBloomNFun.games, compactedGames)
    : compactedGames;
  const compactedFallbackGames = compactGamesForCloud(mergedFallbackGames, 34000);

  const hydratedLocal = mergeProgress(prog, mergedFallbackProg);
  hydratedLocal.games = mergeGamesState(hydratedLocal.games, mergedFallbackGames);
  store.progressByUser[prof.username] = hydratedLocal;

  const nextFun = {
    ...baseFun,
    bloom_n: {
      progress: {
        ...mergedFallbackProg,
        games: compactedFallbackGames,
      },
      games: compactedFallbackGames,
      heroTitle,
      worldMax,
      updatedAt: new Date().toISOString(),
    },
  };

  const fallbackRes = await sbRpc("yomple_player_upsert", {
    p_table: "field_players",
    p_username: prof.username,
    p_pin: prof.pin || null,
    p_row: {
      display_name: prof.name,
      avatar: prof.avatar,
      family_code: store.familyCode || null,
      progress: baseProgress,
      fun: nextFun,
    },
  });

  if (fallbackRes && fallbackRes.ok) {
    store.progressByUser[prof.username].unsyncedFlux = 0;
    prog.unsyncedFlux = 0;
    store.lastSyncStatus = "cloud:yomple";
    saveStore(store, false);
    notifySync("synced");
    return true;
  }

  store.lastSyncStatus = "local";
  notifySync("local");
  return false;
}

export function buildYompleHubReturnUrl(store) {
  const prof = getActiveProfile(store);
  if (!prof) return "/";
  const q = new URLSearchParams();
  q.set("u", prof.username);
  if (store.familyCode) q.set("f", store.familyCode);
  return `/?${q.toString()}`;
}
