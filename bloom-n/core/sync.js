/**
 * Bloom N — Yomple Household Handoff & Dual-Compatible Supabase Cloud Sync
 * Works seamlessly with yomple-stay.js, yomple-family.js, yomple-hub-v1,
 * native bloomn_players RPCs, and automatic pre-migration fallback via field_players.fun.bloom_n.
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

let saveTimer = null;
let syncListeners = [];

export function onSyncUpdate(fn) {
  syncListeners.push(fn);
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

export function loadStore() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
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
      },
      lastSyncStatus: "local",
    },
    raw || {}
  );

  // Inherit household code from Yomple Hub or sister apps if empty
  if (!store.familyCode) {
    try {
      const hub = JSON.parse(localStorage.getItem(HUB_KEY) || "null");
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
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (_) {}
  updateHouseholdLocalHero(store);
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
  const wonder = store.householdWonder || { totalFlux: 0, observatoryTier: 1, heroes: {} };
  let sumLocalFlux = 0;
  for (const prof of store.profiles) {
    const prog = store.progressByUser[prof.username];
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

export function readArrivalIdentity() {
  const q = new URLSearchParams(window.location.search);
  const u = (q.get("u") || q.get("who") || "").trim();
  const f = (q.get("f") || q.get("family") || "").trim().toUpperCase();

  let hubData = null;
  try {
    hubData = JSON.parse(localStorage.getItem(HUB_KEY) || "null");
  } catch (_) {}

  // Import all known household profiles from Yomple Hub so sibling switcher works instantly!
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

  if (arrival.familyCode && arrival.familyCode.includes("-")) {
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
    // Seed gentle household defaults for standalone preview while remaining 100% replaceable by Yomple login
    ensureProfile(store, { username: "david", name: "David", avatar: "🦁" });
    ensureProfile(store, { username: "sarah", name: "Sarah", avatar: "🦄" });
    store.activeUsername = "david";
  }

  const active = getActiveProfile(store);
  if (active && typeof window !== "undefined" && window.YompleStay) {
    window.YompleStay.arrived(active.username, store.familyCode || "");
  }

  saveStore(store, false);

  // Pull cloud progress in background without blocking 60fps boot!
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
    if (cachedPin) {
      const claimed = await sbRpc("yomple_player_claim", {
        p_table: sourceTable,
        p_username: username,
        p_pin: cachedPin,
      });
      if (claimed) row = claimed;
    }
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

  if (remoteProgress && Object.keys(remoteProgress).length > 0) {
    store.progressByUser[username] = mergeProgress(store.progressByUser[username], remoteProgress);
  }

  store.lastSyncStatus = sourceTable === "bloomn_players" ? "cloud:bloomn" : "cloud:yomple";
  saveStore(store, false);
  return true;
}

export function scheduleCloudSync(store) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    pushActiveCloud(store);
  }, 900);
}

export async function pushActiveCloud(store) {
  const prof = getActiveProfile(store);
  if (!prof) return false;
  const prog = getActiveProgress(store);
  const heroTitle = computeHeroTitle(prog);
  const worldMax = highestUnlockedWorldIndex(prog);

  // 1. Try native bloomn_player_merge RPC
  const merged = await sbRpc("bloomn_player_merge", {
    p_username: prof.username,
    p_pin: prof.pin || null,
    p_family: store.familyCode || null,
    p_display_name: prof.name,
    p_avatar: prof.avatar,
    p_progress: prog,
    p_fun: { heroTitle, equippedChassis: prog.equippedChassis },
  });

  if (merged && merged.ok) {
    if (merged.progress) {
      store.progressByUser[prof.username] = mergeProgress(prog, merged.progress);
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
        prog.unsyncedFlux = 0;
        store.householdWonder = {
          totalFlux: famRes.total_flux,
          observatoryTier: famRes.observatory_tier,
          heroes: famRes.heroes || store.householdWonder.heroes,
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

  // Only write fallback if non-PIN or we hold the matching PIN
  let baseProgress = {};
  let baseFun = {};
  if (existingField) {
    if (existingField.has_pin && prof.pin) {
      const claimed = await sbRpc("yomple_player_claim", {
        p_table: "field_players",
        p_username: prof.username,
        p_pin: prof.pin,
      });
      if (claimed) {
        baseProgress = claimed.progress || {};
        baseFun = claimed.fun || {};
      }
    } else if (!existingField.has_pin) {
      baseProgress = existingField.progress || {};
      baseFun = existingField.fun || {};
    }
  }

  const nextFun = {
    ...baseFun,
    bloom_n: {
      progress: prog,
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
