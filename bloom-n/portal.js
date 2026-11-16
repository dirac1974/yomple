/**
 * Bloom N — Universe Portal Controller & Multi-Realm 3D Gameplay Coordinator
 * Coordinates Frostwake: Flux Terra-Rigs (#1), Oddroot Wilds: Alchemy Sanctuary (#2),
 * and Arc Bastion: Siegesmiths (#3), shared adaptive engine, 2-beat Fox Trick Holo-Projector,
 * Sanctuary Evolution Journal, 1-Tap Sibling Toy Borrow, Field Expeditions, and Live 2-Player Co-Op.
 */

import {
  SUB_GAMES,
  RIG_CHASSIS,
  RIG_UPGRADES,
  ODDROOT_MOUNTS,
  ODDROOT_UPGRADES,
  BASTION_RIGS,
  BASTION_UPGRADES,
  MYSTERIES,
  WORLDS,
  GROWN_UPS_CURRICULUM,
  createSessionState,
  pickNextEncounter,
  applyBeamAction,
  evaluateCommit,
  queueOverdriveSurge,
  getTrickCardSpec,
  computeWorldProgress,
  computeArchitectLevel,
  recordWeeklySunshine,
  getCrossRealmUnlocks,
  unlockMystery,
  computeNextWonderTeaser,
} from "./core/engine.js";

import {
  loadStore,
  saveStore,
  ensureProfile,
  getActiveProfile,
  getActiveProgress,
  bootstrapYompleSession,
  pullPlayerCloud,
  buildYompleHubReturnUrl,
  borrowSiblingToy,
  updateHouseholdLocalHero,
  onSyncUpdate,
} from "./core/sync.js";

import {
  createMultiplayerClient,
  SHARED_COIN_REWARD_SHARDS,
} from "./core/multiplayer.js";

import { FrostwakeAudio } from "./frostwake/audio.js";
import { FrostwakeWorld3D } from "./frostwake/frostwake-3d.js";
import { OddrootAudio } from "./oddroot/audio.js";
import { OddrootWorld3D, getSanctuaryJournalEntries } from "./oddroot/oddroot-3d.js";
import { BastionAudio } from "./bastion/audio.js";
import { BastionWorld3D } from "./bastion/bastion-3d.js";
import { CHARACTER_PORTRAIT_PATHS } from "./core/character-graphics-3d.js";

function charImgHtml(key, cls = "char-chip-avatar") {
  const src = CHARACTER_PORTRAIT_PATHS[key];
  if (!src) return "";
  return `<img class="${cls}" src="${src}" alt="" loading="lazy" />`;
}

const store = loadStore();
const session = createSessionState();

const frostwakeAudio = new FrostwakeAudio();
const oddrootAudio = new OddrootAudio();
const bastionAudio = new BastionAudio();
frostwakeAudio.setMuted(store.muted);
oddrootAudio.setMuted(store.muted);
bastionAudio.setMuted(store.muted);

let activeRealmId = "portal";
let frostwakeWorld = null;
let oddrootWorld = null;
let bastionWorld = null;
let activeBorrowedToy = null;

let mpClient = null;
let mpStateTimer = null;

let currentEncounter = null;
let trickCardOpen = false;
let encounterOpenedAt = 0;
let firstInputAt = 0;
let toastTimer = null;
let waveReplenishTimer = null;
let victoryStampTimer = null;
let shardPopTimer = null;
let boostHudRafId = 0;

// Keyboard & virtual thumbstick state
const keys = { up: false, down: false, left: false, right: false, boost: false };
let joySteer = 0;
let joyThrottle = 0;
let holdBoostBtn = false;

function $(id) {
  return document.getElementById(id);
}

function getActiveAudio() {
  if (activeRealmId === "oddroot") return oddrootAudio;
  if (activeRealmId === "arc_bastion") return bastionAudio;
  return frostwakeAudio;
}

function getActiveWorld() {
  if (activeRealmId === "frostwake") return frostwakeWorld;
  if (activeRealmId === "oddroot") return oddrootWorld;
  if (activeRealmId === "arc_bastion") return bastionWorld;
  return null;
}

function getActiveScreenEl() {
  if (activeRealmId === "oddroot") return $("screen-oddroot");
  if (activeRealmId === "arc_bastion") return $("screen-bastion");
  if (activeRealmId === "frostwake") return $("screen-frostwake");
  return $("screen-portal");
}

function showToast(msg, duration = 2300) {
  const el = $("hud-toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), duration);
}

function isWorldUnlocked(prog, worldId) {
  if (prog.sandboxAllUnlocked) return true;
  return (prog.unlockedWorlds || []).includes(worldId);
}

function syncSurgeBanners() {
  const on = Boolean(session.inSurge);
  for (const id of ["surge-banner", "oddroot-surge-banner", "bastion-surge-banner"]) {
    const el = $(id);
    if (!el) continue;
    el.classList.toggle("on", on);
    el.classList.toggle("active", on);
  }
}

function handleWonderTeaserAction(teaser) {
  if (!teaser) return;
  getActiveAudio().playDetentClick?.(16);
  const prog = getActiveProgress(store);
  if (teaser.action === "garage") {
    openGarageModal();
    return;
  }
  if (teaser.action === "journal") {
    openJournalModal();
    return;
  }
  if (teaser.action === "worlds") {
    if (activeRealmId === "portal") {
      $("worlds-constellation")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    } else {
      renderWorldsGrid($("modal-worlds-grid"), true);
      openModal("modal-worlds");
    }
    return;
  }
  if (activeRealmId === "portal") {
    const prefersBastion = (prog.games?.arc_bastion?.batteriesCleared || 0) > 0 && prog.games?.arc_bastion?.equippedRig === "prism_rail_skiff";
    const prefersOddroot = prog.games?.oddroot?.equippedMount === "starlight_glider";
    if (prefersBastion) launchBastion();
    else if (prefersOddroot) launchOddroot();
    else launchFrostwake();
  } else {
    const target = getActiveWorld()?.engageAutopilotToNextGate?.();
    if (target) showToast(`Cruising toward ${target.encounter.title}!`);
  }
}

function renderPortalNextWonder(prog) {
  const card = $("portal-next-wonder");
  if (!card) return;
  const preferredRealm =
    (prog.games?.arc_bastion?.batteriesCleared || 0) > (prog.games?.oddroot?.cauldronsBrewed || 0) &&
    prog.games?.arc_bastion?.equippedRig === "prism_rail_skiff"
      ? "arc_bastion"
      : prog.games?.oddroot?.equippedMount === "starlight_glider"
      ? "oddroot"
      : "frostwake";
  const teaser = computeNextWonderTeaser(prog, session, preferredRealm);
  const pct = Math.max(12, Math.min(100, Math.round((teaser.ratio || 0.35) * 100)));
  const ctaLabel =
    teaser.action === "garage"
      ? "Open Workshop →"
      : teaser.action === "journal"
      ? "View Journal →"
      : teaser.action === "worlds"
      ? "Constellation →"
      : "Explore Now →";

  card.innerHTML = `
    <div class="wonder-orb-icon" aria-hidden="true">${teaser.icon || "🔮"}</div>
    <div class="wonder-copy-col">
      <div class="wonder-kicker-row">
        <span class="wonder-kicker">${teaser.kicker}</span>
        <span class="wonder-cta-chip">${ctaLabel}</span>
      </div>
      <strong class="wonder-headline">${teaser.headline}</strong>
      <span class="wonder-hint">${teaser.hint}</span>
      <div class="wonder-progress-track"><div class="wonder-progress-fill" style="width:${pct}%"></div></div>
    </div>
  `;
  card.onclick = () => handleWonderTeaserAction(teaser);
}

function renderHudWonderChip(elId, prog, realmId) {
  const chip = $(elId);
  if (!chip) return;
  const teaser = computeNextWonderTeaser(prog, session, realmId);
  const compactText =
    teaser.headline.length > 44 ? `${teaser.headline.slice(0, 42).trim()}…` : teaser.headline;
  chip.innerHTML = `<span class="wonder-chip-icon">${teaser.icon || "🔮"}</span><span>${compactText}</span>`;
  chip.title = `${teaser.headline} — ${teaser.hint}`;
  chip.onclick = () => handleWonderTeaserAction(teaser);
  chip.onkeydown = (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      handleWonderTeaserAction(teaser);
    }
  };
}

function getActiveShardPillId() {
  if (activeRealmId === "oddroot") return "or-shard-pill";
  if (activeRealmId === "arc_bastion") return "ab-shard-pill";
  return "fw-shard-pill";
}

function pulseActiveShardPill() {
  const pill = $(getActiveShardPillId());
  if (!pill) return;
  pill.classList.remove("shard-pop");
  void pill.offsetWidth;
  pill.classList.add("shard-pop");
  clearTimeout(shardPopTimer);
  shardPopTimer = setTimeout(() => pill.classList.remove("shard-pop"), 560);
}

function spawnFlyingShardBurst(count = 10, originYRatio = 0.56) {
  const layer = $("flying-gems-layer");
  if (!layer || activeRealmId === "portal") {
    pulseActiveShardPill();
    return;
  }
  const targetEl = $(getActiveShardPillId());
  const targetRect = targetEl?.getBoundingClientRect?.();
  const vw = Math.max(320, window.innerWidth || 1024);
  const vh = Math.max(240, window.innerHeight || 720);
  const tx = targetRect && targetRect.width > 0 ? targetRect.left + targetRect.width * 0.5 : vw - 140;
  const ty = targetRect && targetRect.height > 0 ? targetRect.top + targetRect.height * 0.5 : 28;
  const sxBase = vw * 0.5;
  const syBase = vh * originYRatio;

  const prefersReduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    pulseActiveShardPill();
    return;
  }

  const safeCount = Math.max(3, Math.min(14, count));
  for (let i = 0; i < safeCount; i++) {
    const gem = document.createElement("span");
    gem.className = "flying-shard-gem";
    gem.textContent = i % 4 === 0 ? "✦" : "💎";
    const angle = (i / safeCount) * Math.PI * 2 + (i % 2) * 0.25;
    const burstR = 26 + (i % 4) * 18;
    const sx = sxBase + Math.cos(angle) * 18;
    const sy = syBase + Math.sin(angle) * 12;
    const mx = sx + Math.cos(angle) * burstR * 1.45 + (tx - sx) * 0.32;
    const my = sy + Math.sin(angle) * burstR - 54 + (ty - sy) * 0.24;

    gem.style.left = "0px";
    gem.style.top = "0px";
    layer.appendChild(gem);

    const delay = i * 32;
    const duration = 560 + (i % 3) * 75;
    if (typeof gem.animate === "function") {
      const anim = gem.animate(
        [
          { transform: `translate3d(${sx}px, ${sy}px, 0) scale(0.45) rotate(0deg)`, opacity: 0 },
          {
            transform: `translate3d(${mx}px, ${my}px, 0) scale(1.22) rotate(${i % 2 ? 22 : -22}deg)`,
            opacity: 1,
            offset: 0.36,
          },
          { transform: `translate3d(${tx}px, ${ty}px, 0) scale(0.55) rotate(0deg)`, opacity: 0.15 },
        ],
        { duration, delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
      );
      anim.onfinish = () => {
        gem.remove();
        if (i === 0 || i === safeCount - 1) pulseActiveShardPill();
      };
    } else {
      setTimeout(() => {
        gem.remove();
        if (i === 0) pulseActiveShardPill();
      }, duration + delay);
    }
  }
}

function updateSlipstreamHudFrame() {
  boostHudRafId = 0;
  const world = getActiveWorld();
  const st = world?.getSlipstreamBoostState?.() || { active: false, ratio: 0, multiplier: 1, overdrive: false };
  const isOddroot = activeRealmId === "oddroot";
  const isBastion = activeRealmId === "arc_bastion";
  const pillMap = {
    frostwake: { pill: $("fw-boost-pill"), fill: $("fw-boost-fill") },
    oddroot: { pill: $("or-boost-pill"), fill: $("or-boost-fill") },
    arc_bastion: { pill: $("ab-boost-pill"), fill: $("ab-boost-fill") },
  };
  for (const [rKey, pair] of Object.entries(pillMap)) {
    if (rKey !== activeRealmId && pair.pill) {
      pair.pill.classList.remove("active", "overdrive");
    }
  }
  const activePair = pillMap[activeRealmId] || pillMap.frostwake;
  const activePill = activePair.pill;
  const activeFill = activePair.fill;
  const screenFx = $("slipstream-screen-fx");

  if (st.active && activeRealmId !== "portal") {
    const multStr = (st.multiplier || 1.38).toFixed(1);
    if (activePill) {
      activePill.classList.add("active");
      activePill.classList.toggle("overdrive", Boolean(st.overdrive));
      const lbl = activePill.querySelector(".boost-pill-label");
      if (lbl) {
        lbl.textContent = isBastion
          ? `🚀 Prism Slipstream · ${multStr}×`
          : isOddroot
          ? `🚀 Starlight Slipstream · ${multStr}×`
          : `🚀 Cryo-Plasma Boost · ${multStr}×`;
      }
    }
    if (activeFill) {
      activeFill.style.width = `${Math.max(8, Math.min(100, Math.round((st.ratio || 0) * 100)))}%`;
    }
    if (screenFx) {
      screenFx.classList.add("active");
      screenFx.classList.toggle("overdrive", Boolean(st.overdrive));
      screenFx.style.setProperty("--boost-alpha", String(Math.max(0.18, Math.min(0.95, st.ratio || 0.5))));
    }
    if (typeof requestAnimationFrame === "function") {
      boostHudRafId = requestAnimationFrame(updateSlipstreamHudFrame);
    }
  } else {
    if (activePill) activePill.classList.remove("active", "overdrive");
    if (screenFx) screenFx.classList.remove("active", "overdrive");
  }
}

function ensureSlipstreamHudLoop() {
  if (!boostHudRafId) {
    updateSlipstreamHudFrame();
  }
}

function triggerHudVictoryCelebration(res) {
  if (!res || activeRealmId === "portal") return;
  const card = $("victory-stamp-card");
  const kickerEl = $("victory-stamp-kicker");
  const cueEl = $("victory-stamp-cue");
  const shardsEl = $("victory-stamp-shards");
  const boostEl = $("victory-stamp-boost");
  const isOddroot = activeRealmId === "oddroot";
  const isBastion = activeRealmId === "arc_bastion";
  const isClear = res.outcome === "clear";
  const isOverdrive = Boolean(res.overdrive);

  if (kickerEl) {
    kickerEl.textContent = isOverdrive
      ? "⚡ MENTAL OVERDRIVE · 1.5× FLUX!"
      : isClear
      ? isBastion
        ? "✦ SIEGE BATTERY LOCKED!"
        : isOddroot
        ? "✦ SANCTUARY SHRINE AWAKENED!"
        : "✦ CRYO-TEMPLE AWAKENED!"
      : "🦊 AURORA SYNTHESIS SEALED!";
  }
  if (cueEl) {
    cueEl.textContent = res.cue || "Balance locked!";
  }
  if (shardsEl) {
    shardsEl.textContent = `+${res.shardsEarned || 0}💎`;
  }
  if (boostEl) {
    if (isClear) {
      const multLabel = isOverdrive ? "1.5×" : "1.4×";
      boostEl.textContent = isBastion
        ? `🚀 PRISM SLIPSTREAM · ${multLabel} SIEGE SURGE!`
        : isOddroot
        ? `🚀 STARLIGHT SLIPSTREAM · ${multLabel} GLIDE BOOST!`
        : `🚀 CRYO-PLASMA BOOST · ${multLabel} RIG SURGE!`;
    } else {
      boostEl.textContent = "✨ BEACON LIT · NEXT TEMPLE READY!";
    }
  }

  if (card) {
    card.classList.remove("show", "is-overdrive", "is-oddroot", "is-bastion");
    void card.offsetWidth;
    card.classList.toggle("is-overdrive", isOverdrive);
    card.classList.toggle("is-oddroot", isOddroot);
    card.classList.toggle("is-bastion", isBastion);
    card.classList.add("show");
    clearTimeout(victoryStampTimer);
    victoryStampTimer = setTimeout(() => {
      card.classList.remove("show");
    }, 2350);
  }

  spawnFlyingShardBurst(isOverdrive ? 13 : isClear ? 9 : 6, 0.54);
  if (isClear) {
    ensureSlipstreamHudLoop();
  }
}

function renderHudExpeditionPill(elId, world, fallbackCompleted = 0) {
  const el = $(elId);
  if (!el) return;
  const st = world?.getFieldExpeditionState?.();
  if (!st) {
    el.textContent = `🧭 Patrols · ${fallbackCompleted}✦`;
    return;
  }
  const done = st.collectedCount ?? st.waypointIndex ?? 0;
  const total = st.targetCount ?? st.totalWaypoints ?? 3;
  const icon = st.icon || "🧭";
  const shortTitle = (st.title || "Patrol").split(" ").slice(0, 2).join(" ");
  el.textContent = `${icon} ${shortTitle} ${done}/${total}`;
  el.title = `${st.title || "Field Expedition"}: ${st.promptShort || ""} (+${st.shardReward || 18}💎)`;
}

function syncBastionBulletTimePill() {
  const btn = $("ab-bullettime-btn");
  if (!btn) return;
  const bt = bastionWorld?.getBulletTimeState?.() || { requested: false, active: false };
  const isOn = Boolean(bt.requested);
  btn.classList.toggle("is-active", isOn);
  btn.setAttribute("aria-pressed", isOn ? "true" : "false");
  btn.textContent = isOn ? "⏳ 0.08× Aura ON" : "⏳ 0.08× Time-Aura";
}

function updateAllShardAndZoneDisplays() {
  const prog = getActiveProgress(store);
  const shards = String(prog.fluxShards || 0);
  if ($("portal-shards")) $("portal-shards").textContent = shards;
  if ($("hud-shards")) $("hud-shards").textContent = shards;
  if ($("oddroot-shards")) $("oddroot-shards").textContent = shards;
  if ($("bastion-shards")) $("bastion-shards").textContent = shards;
  if ($("garage-shards")) $("garage-shards").textContent = shards;

  const streak = String(session.overdriveStreak || 0);
  if ($("hud-streak")) $("hud-streak").textContent = streak;
  if ($("oddroot-streak")) $("oddroot-streak").textContent = streak;
  if ($("bastion-streak")) $("bastion-streak").textContent = streak;

  const arch = computeArchitectLevel(prog);
  if ($("portal-architect-pill")) {
    $("portal-architect-pill").textContent = `✦ Lv. ${arch.level} · ${arch.title}`;
  }

  const sun = recordWeeklySunshine(prog);
  if ($("portal-sunshine-pill")) {
    $("portal-sunshine-pill").textContent = `☀️ ${sun.suns}/${sun.maxSuns}`;
  }

  const wp = computeWorldProgress(prog, prog.activeWorld);
  renderPortalZoneProgress(wp);
  renderHudZonePill("fw-zone-bar", wp);
  renderHudZonePill("or-zone-bar", wp);
  renderHudZonePill("ab-zone-bar", wp);

  const zoneRatio =
    wp.worldId === "W0"
      ? wp.beaconsLit / Math.max(1, wp.beaconsTotal)
      : Math.max(
          wp.beaconsLit / Math.max(1, wp.beaconsTotal),
          wp.starsEarned / Math.max(1, wp.starsMax)
        );
  frostwakeWorld?.setZoneProgressRatio?.(zoneRatio);
  oddrootWorld?.setZoneProgressRatio?.(zoneRatio);
  bastionWorld?.setZoneProgressRatio?.(zoneRatio);

  renderPortalNextWonder(prog);
  renderHudWonderChip("fw-wonder-chip", prog, "frostwake");
  renderHudWonderChip("or-wonder-chip", prog, "oddroot");
  renderHudWonderChip("ab-wonder-chip", prog, "arc_bastion");

  renderHudExpeditionPill(
    "fw-expedition-pill",
    frostwakeWorld,
    prog.games?.frostwake?.expeditionsCompleted || 0
  );
  renderHudExpeditionPill(
    "or-expedition-pill",
    oddrootWorld,
    prog.games?.oddroot?.expeditionsCompleted || 0
  );
  renderHudExpeditionPill(
    "ab-expedition-pill",
    bastionWorld,
    prog.games?.arc_bastion?.expeditionsCompleted || 0
  );

  const worldLabel = `${wp.rankLabel} · ${wp.worldName}`;
  if ($("portal-active-world-label")) {
    $("portal-active-world-label").textContent = `Active Frontier: ${worldLabel}`;
  }
  if ($("portal-oddroot-world-label")) {
    $("portal-oddroot-world-label").textContent = `Sanctuary Frontier: ${worldLabel}`;
  }
  if ($("portal-bastion-world-label")) {
    $("portal-bastion-world-label").textContent = `Citadel Frontier: ${worldLabel}`;
  }
  if ($("hud-world-btn")) $("hud-world-btn").textContent = `${worldLabel} ▾`;
  if ($("oddroot-world-btn")) $("oddroot-world-btn").textContent = `${worldLabel} ▾`;
  if ($("bastion-world-btn")) $("bastion-world-btn").textContent = `${worldLabel} ▾`;

  if (oddrootWorld && oddrootWorld.rigState?.siphonOrbs) {
    const orbs = oddrootWorld.rigState.siphonOrbs;
    if ($("orb-sun-count")) $("orb-sun-count").textContent = String(orbs.sun_orb || 0);
    if ($("orb-frost-count")) $("orb-frost-count").textContent = String(orbs.frost_spore || 0);
    if ($("orb-pod-count")) $("orb-pod-count").textContent = String(orbs.rune_pod || 0);
    if ($("orb-puff-count")) $("orb-puff-count").textContent = String(orbs.helium_puff || 0);
  }

  const eqMount = prog.games?.oddroot?.equippedMount || "bramble_boar";
  const mountSpec = ODDROOT_MOUNTS.find((m) => m.id === eqMount) || ODDROOT_MOUNTS[0];
  const mountBtn = $("oddroot-mount-btn");
  if (mountBtn) {
    mountBtn.innerHTML = `${charImgHtml(mountSpec.id, "char-hud-avatar")}<span>${mountSpec.name}</span>`;
    mountBtn.classList.toggle("is-boar", mountSpec.id === "bramble_boar");
    mountBtn.classList.toggle("is-glider", mountSpec.id === "starlight_glider");
  }

  const eqBastionRig = prog.games?.arc_bastion?.equippedRig || "iron_ballista";
  const bastionSpec = BASTION_RIGS.find((r) => r.id === eqBastionRig) || BASTION_RIGS[0];
  const abRigBtn = $("ab-rig-btn");
  if (abRigBtn) {
    abRigBtn.innerHTML = `${charImgHtml(bastionSpec.id, "char-hud-avatar")}<span>${bastionSpec.name}</span>`;
    abRigBtn.classList.toggle("is-ballista", bastionSpec.id === "iron_ballista");
    abRigBtn.classList.toggle("is-skiff", bastionSpec.id === "prism_rail_skiff");
  }
  syncBastionBulletTimePill();
}

function renderPortalZoneProgress(wp) {
  const box = $("portal-zone-progress");
  if (!box) return;
  const pct = Math.max(0, Math.min(100, Math.round((wp.beaconsLit / Math.max(1, wp.beaconsNeededForUnlock)) * 100)));
  const statusCopy = wp.guardianAwakened
    ? wp.nextWorldName
      ? `✨ ${wp.guardianName} Awakened! Next Rank Open: ${wp.nextWorldRankLabel} · ${wp.nextWorldName}`
      : `👑 ${wp.guardianName} Awakened · Crown Frontier Radiant!`
    : `🛡️ ${wp.beaconsLit} / ${wp.beaconsNeededForUnlock} Solid Beacons to Wake ${wp.guardianName}`;

  const chipsHtml = wp.nodeStatuses
    .map((ns) => {
      const stars = ns.stars > 0 ? "★".repeat(ns.stars) + "☆".repeat(3 - ns.stars) : "☆☆☆";
      return `<span class="zone-node-chip${ns.stage >= 2 ? " lit" : ""}">${ns.name} ${stars}</span>`;
    })
    .join("");

  box.innerHTML = `
    <div class="zone-progress-top">
      <span>🧭 ${wp.rankLabel} · <strong>${wp.worldName}</strong> (${wp.starsEarned}/${wp.starsMax}★)</span>
      <span style="color:var(--amber)">${statusCopy}</span>
    </div>
    <div class="zone-bar-track">
      <div class="zone-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="zone-node-stars">${chipsHtml}</div>
  `;
}

function renderHudZonePill(elId, wp) {
  const el = $(elId);
  if (!el) return;
  const pct = Math.max(0, Math.min(100, Math.round((wp.beaconsLit / Math.max(1, wp.beaconsNeededForUnlock)) * 100)));
  const badge = wp.guardianAwakened ? "✨ Awake" : `${wp.beaconsLit}/${wp.beaconsNeededForUnlock} 🛡️`;
  el.innerHTML = `
    <span>${badge} · ${wp.starsEarned}★</span>
    <span class="hud-zone-mini-track"><span class="hud-zone-mini-fill" style="display:block;width:${pct}%"></span></span>
  `;
}

/* ==================== RENDER PORTAL HUB ==================== */
function renderPortal() {
  const prof = getActiveProfile(store);
  const prog = getActiveProgress(store);

  $("yomple-back-link").href = buildYompleHubReturnUrl(store);
  $("portal-who-btn").textContent = prof ? `${prof.avatar} ${prof.name}` : "❄️ Explorer";

  const muteIcon = store.muted ? "🔇" : "🔊";
  $("portal-mute-btn").textContent = muteIcon;
  $("hud-mute-btn").textContent = muteIcon;
  if ($("oddroot-mute-btn")) $("oddroot-mute-btn").textContent = muteIcon;
  if ($("bastion-mute-btn")) $("bastion-mute-btn").textContent = muteIcon;

  updateAllShardAndZoneDisplays();

  // Frostwake Rig Quick Picker
  const rigRow = $("portal-rig-picker");
  rigRow.innerHTML = "";
  for (const ch of RIG_CHASSIS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `rig-chip${prog.equippedChassis === ch.id ? " selected" : ""}`;
    btn.innerHTML = `${charImgHtml(ch.id, "char-chip-avatar")}<span>${ch.name}</span>`;
    btn.onclick = () => {
      frostwakeAudio.playDetentClick(12);
      prog.equippedChassis = ch.id;
      if (prog.games?.frostwake) prog.games.frostwake.equippedChassis = ch.id;
      activeBorrowedToy = null;
      saveStore(store);
      if (frostwakeWorld) {
        frostwakeWorld.applyLoadout(prog, getCrossRealmUnlocks(prog), null);
      }
      renderPortal();
    };
    rigRow.appendChild(btn);
  }

  // Oddroot Mount Quick Picker
  const mountRow = $("portal-mount-picker");
  if (mountRow) {
    mountRow.innerHTML = "";
    const curMount = prog.games?.oddroot?.equippedMount || "bramble_boar";
    for (const m of ODDROOT_MOUNTS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `rig-chip${curMount === m.id ? " selected" : ""}`;
      btn.innerHTML = `${charImgHtml(m.id, "char-chip-avatar")}<span>${m.name}</span>`;
      btn.onclick = () => {
        oddrootAudio.playDetentClick?.(14);
        prog.games = prog.games || {};
        prog.games.oddroot = prog.games.oddroot || {};
        prog.games.oddroot.equippedMount = m.id;
        activeBorrowedToy = null;
        saveStore(store);
        if (oddrootWorld) {
          oddrootWorld.applyLoadout(prog, getCrossRealmUnlocks(prog), null);
        }
        renderPortal();
      };
      mountRow.appendChild(btn);
    }
  }

  // Arc Bastion Siege-Rover Quick Picker
  const bastionRow = $("portal-bastion-picker");
  if (bastionRow) {
    bastionRow.innerHTML = "";
    const curRig = prog.games?.arc_bastion?.equippedRig || "iron_ballista";
    for (const r of BASTION_RIGS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `rig-chip${curRig === r.id ? " selected" : ""}`;
      btn.innerHTML = `${charImgHtml(r.id, "char-chip-avatar")}<span>${r.name}</span>`;
      btn.onclick = () => {
        bastionAudio.playDetentClick?.(14);
        prog.games = prog.games || {};
        prog.games.arc_bastion = prog.games.arc_bastion || {};
        prog.games.arc_bastion.equippedRig = r.id;
        activeBorrowedToy = null;
        saveStore(store);
        if (bastionWorld) {
          bastionWorld.applyLoadout(prog, getCrossRealmUnlocks(prog), null);
        }
        renderPortal();
      };
      bastionRow.appendChild(btn);
    }
  }

  // Sister Sub-Games (Stardrift + Astrolabes, plus any non-hero realm cards)
  const sisGrid = $("sister-realms-grid");
  sisGrid.innerHTML = "";
  const heroIds = new Set(["frostwake", "oddroot", "arc_bastion"]);
  for (const sg of SUB_GAMES.filter((g) => !heroIds.has(g.id))) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "realm-card";
    btn.style.backgroundImage = `url('${sg.banner}')`;
    btn.innerHTML = `
      <span class="realm-tag">${sg.badge}</span>
      <h3>${sg.title}</h3>
      <p>${sg.blurb}</p>
    `;
    btn.onclick = () => openSisterRealmModal(sg);
    sisGrid.appendChild(btn);
  }

  // 3-Strand World Constellation (Rank labels + stars, zero school labels!)
  renderWorldsGrid($("worlds-constellation"), false);

  // Household Northern Observatory Co-Op Wonder
  updateHouseholdLocalHero(store);
  const wonder = store.householdWonder || { totalFlux: 0, observatoryTier: 1, heroes: {} };
  $("portal-obs-tier").textContent = String(wonder.observatoryTier || 1);
  const tierTargets = [0, 180, 500, 1200, 2500, 5000];
  const nextThreshold = tierTargets[Math.min(5, wonder.observatoryTier || 1)] || 5000;
  const pct = Math.min(100, Math.max(12, Math.round(((wonder.totalFlux || 0) / nextThreshold) * 100)));
  $("obs-meter-fill").style.width = `${pct}%`;

  const heroList = $("household-heroes-list");
  heroList.innerHTML = "";
  const heroes = Object.values(wonder.heroes || {});
  if (heroes.length === 0 && prof) {
    heroes.push({ display_name: prof.name, avatar: prof.avatar, hero_title: "Frostwake Pioneer", world_max: 1 });
  }
  for (const h of heroes) {
    const row = document.createElement("div");
    row.className = "hero-row";
    row.innerHTML = `
      <span>${h.avatar || "❄️"} ${h.display_name} · Rank ${h.world_max || 1}</span>
      <span class="hero-title-tag">✦ ${h.hero_title}</span>
    `;
    heroList.appendChild(row);
  }

  // Monotonic Expedition Plaques
  const rec = prog.records || {};
  const hatchedCount = (prog.games?.oddroot?.hatchedCreatures || []).length;
  $("rec-overdrive").textContent = `${rec.bestOverdriveStreak || 0}×`;
  $("rec-ramp").textContent = `${rec.longestRampM || 0}m`;
  $("rec-subzero").textContent = rec.deepestSubZero ? `-${rec.deepestSubZero}` : "0";
  $("rec-foxes").textContent = String((rec.foxesWoken || 0) + hatchedCount);

  // Mysteries Strip
  const mystEl = $("mysteries-strip");
  mystEl.innerHTML = "";
  for (const m of MYSTERIES) {
    const found = (prog.discoveredMysteries || []).includes(m.id);
    const card = document.createElement("div");
    card.className = `mystery-pill${found ? " found" : ""}`;
    card.innerHTML = found ? `✦ ${m.title}<br><small>${m.reward}</small>` : `???<br><small>${m.clue}</small>`;
    mystEl.appendChild(card);
  }
}

function renderWorldsGrid(container, launchOnSelect = false) {
  if (!container) return;
  const prog = getActiveProgress(store);
  container.innerHTML = "";
  for (let idx = 0; idx < WORLDS.length; idx++) {
    const w = WORLDS[idx];
    const prevWorld = idx > 0 ? WORLDS[idx - 1] : null;
    const open = isWorldUnlocked(prog, w.id);
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `world-tile${prog.activeWorld === w.id ? " current" : ""}${open ? "" : " locked"}`;
    const dotsHtml = w.nodes
      .map((n) => {
        const st = prog.nodes?.[n.id]?.stage || 0;
        return `<span class="world-dot ${st > 0 ? "s" + st : ""}"></span>`;
      })
      .join("");
    const starsEarned = w.nodes.reduce((s, n) => s + Math.min(3, prog.nodes?.[n.id]?.stage || 0), 0);
    const subWhisper = open
      ? `🛡️ ${w.guardianName}`
      : prevWorld
      ? `🔮 Wake ${prevWorld.guardianName} → ${w.realmSubtitle || w.name}`
      : `🛡️ ${w.guardianName}`;
    tile.innerHTML = `
      <div class="world-top">
        <span>${w.id} · ${w.rankLabel}</span>
        <span>${open ? `${starsEarned}★` : "🔒"}</span>
      </div>
      <strong>${w.name}</strong>
      <div class="world-whisper">${subWhisper}</div>
      <div class="world-dots">${dotsHtml}</div>
    `;
    tile.onclick = () => {
      if (!open) {
        showToast(
          prevWorld
            ? `Wake ${prevWorld.guardianName} with 2 solid beacons to enter ${w.name}!`
            : `Wake the prior Guardian with 2 solid beacons first!`
        );
        return;
      }
      getActiveAudio().playDetentClick?.(18);
      prog.activeWorld = w.id;
      saveStore(store);
      renderPortal();
      if (launchOnSelect) {
        closeModal("modal-worlds");
        spawnActiveWave();
        showToast(`Frontier tuned to ${w.rankLabel} · ${w.name}`);
      }
    };
    container.appendChild(tile);
  }
}

/* ==================== LIVE 2-PLAYER CO-OP WIRING ==================== */
function disconnectMultiplayer() {
  if (mpStateTimer) {
    clearInterval(mpStateTimer);
    mpStateTimer = null;
  }
  if (mpClient) {
    mpClient.disconnect();
    mpClient = null;
  }
  renderPartnerPill("frostwake", []);
  renderPartnerPill("oddroot", []);
  renderPartnerPill("arc_bastion", []);
}

function getLocalCoopStatus() {
  if (currentEncounter) return "thinking";
  if (session.inSurge) return "surge";
  if (session.overdriveStreak >= 2) return "overdrive";
  return "roaming";
}

function publishImmediateMultiplayerState(overrideStatus = null) {
  if (!mpClient || !mpClient.isConnected()) return;
  const world = getActiveWorld();
  if (!world) return;
  const prog = getActiveProgress(store);
  const wp = computeWorldProgress(prog, prog.activeWorld);
  const pose = world.getLocalMultiplayerPose ? world.getLocalMultiplayerPose() : {};
  mpClient.publishLocalState({
    ...pose,
    status: overrideStatus || getLocalCoopStatus(),
    zoneProgressPct: wp.completionPct,
    streakActive: session.overdriveStreak >= 2,
  });
}

function renderPartnerPill(realmId, peers = []) {
  const pillId =
    realmId === "oddroot"
      ? "or-partner-pill"
      : realmId === "arc_bastion"
      ? "ab-partner-pill"
      : "fw-partner-pill";
  const pill = $(pillId);
  if (!pill) return;
  if (!Array.isArray(peers) || peers.length === 0) {
    pill.style.display = "none";
    pill.innerHTML = "";
    return;
  }
  const p = peers[0];
  const pct = Math.max(0, Math.min(100, Math.round(Number(p.zoneProgressPct) || 0)));
  const statusLabel =
    p.status === "thinking"
      ? "💭 Thinking"
      : p.status === "surge" || p.status === "overdrive"
      ? "⚡ Surge"
      : "🧭 Exploring";
  const streakSpark = p.streakActive ? `<span class="partner-streak-flame">🔥</span>` : "";

  pill.style.display = "inline-flex";
  pill.innerHTML = `
    <svg class="partner-zone-ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="3.2"></circle>
      <circle cx="18" cy="18" r="15.9" fill="none" stroke-width="3.4" stroke-linecap="round"
        stroke-dasharray="${pct}, 100" transform="rotate(-90 18 18)"></circle>
    </svg>
    <span>${p.avatar || "❄️"} ${p.displayName || p.userId} · ${statusLabel}</span>
    ${streakSpark}
  `;
}

function connectRealmMultiplayer(realmId) {
  disconnectMultiplayer();
  const prof = getActiveProfile(store);
  const world =
    realmId === "oddroot"
      ? oddrootWorld
      : realmId === "arc_bastion"
      ? bastionWorld
      : frostwakeWorld;
  if (!world) return;

  mpClient = createMultiplayerClient({
    realmId,
    familyCode: store.familyCode || "OPEN-HOUSE",
    userId: store.activeUsername || "explorer",
    displayName: prof?.name || store.activeUsername || "Explorer",
    avatar: prof?.avatar || "❄️",
    onPeersChanged: (peers) => {
      world.syncRemotePartners?.(peers);
      renderPartnerPill(realmId, peers);
    },
    onCoinStateChanged: (coins) => {
      world.syncSharedCoins?.(coins);
    },
    onRemoteEvent: (ev) => {
      world.playPartnerCoopEvent?.(ev);
      if (ev?.type === "friendly_flare") {
        showToast(`${ev.byAvatar || "🎆"} ${ev.byName || "Partner"} sent a Sky-Flare!`);
      } else if (ev?.type === "coin_grab" && ev.bannerText) {
        showToast(ev.bannerText);
      } else if (ev?.type === "gate_burst") {
        showToast(`✨ ${ev.byAvatar || "🌟"} ${ev.byName || "Partner"} lit a Sky-Beacon!`);
      }
    },
  });

  mpClient.connect();
  world.syncSharedCoins?.(mpClient.getCoinStates());
  publishImmediateMultiplayerState();

  mpStateTimer = setInterval(() => {
    publishImmediateMultiplayerState();
  }, 85);
}

function triggerFriendlyFlare() {
  const world = getActiveWorld();
  if (!world) return;
  getActiveAudio().unlock?.();
  const pose = world.getLocalMultiplayerPose ? world.getLocalMultiplayerPose() : { x: 0, y: 1, z: 0 };
  mpClient?.sendFriendlyFlare(pose);
  world.playPartnerCoopEvent?.({ type: "friendly_flare", ...pose });
  getActiveAudio().playClear?.(false);
  showToast("🎆 Sky-Flare launched!");
}

/* ==================== MOUNT SHARED DOCK INTO ACTIVE REALM ==================== */
function attachSharedOverlaysToScreen(screenEl) {
  if (!screenEl) return;
  const victoryLayer = $("victory-celebration-layer");
  const dock = $("encounter-dock");
  const toast = $("hud-toast");
  if (victoryLayer && victoryLayer.parentElement !== screenEl) screenEl.appendChild(victoryLayer);
  if (toast && toast.parentElement !== screenEl) screenEl.appendChild(toast);
  if (dock && dock.parentElement !== screenEl) screenEl.appendChild(dock);
}

/* ==================== LAUNCH & SWITCH 3D REALMS ==================== */
function handleSharedCoinGrabbed(coinId) {
  const world = getActiveWorld();
  const pose = world?.getLocalMultiplayerPose?.() || {};
  const claimed = !mpClient || mpClient.tryGrabSharedCoin(coinId, pose);
  if (!claimed) return;
  const p = getActiveProgress(store);
  p.fluxShards = (p.fluxShards || 0) + SHARED_COIN_REWARD_SHARDS;
  p.unsyncedFlux = (p.unsyncedFlux || 0) + SHARED_COIN_REWARD_SHARDS;
  getActiveAudio().playSnowShardTick?.();
  spawnFlyingShardBurst(5, 0.58);
  updateAllShardAndZoneDisplays();
  saveStore(store);
  showToast(`⭐ Grabbed Shared Star-Coin! +${SHARED_COIN_REWARD_SHARDS}💎`);
}

function handleMysteryFound(mysteryId) {
  const p = getActiveProgress(store);
  if (unlockMystery(p, mysteryId)) {
    p.fluxShards += 25;
    p.unsyncedFlux = (p.unsyncedFlux || 0) + 25;
    getActiveAudio().playClear?.(true);
    spawnFlyingShardBurst(12, 0.52);
    const myst = MYSTERIES.find((m) => m.id === mysteryId);
    showToast(`✦ Mystery Woken: ${myst ? myst.title : "Hidden Wonder"}! +25💎`, 3400);
    const w = getActiveWorld();
    w?.applyLoadout?.(p, getCrossRealmUnlocks(p), activeBorrowedToy);
    updateAllShardAndZoneDisplays();
    saveStore(store);
  }
}

function handleOppositionEvent(ev) {
  if (!ev) return;
  const p = getActiveProgress(store);
  if (Number(ev.shardsEarned) > 0) {
    p.fluxShards += Number(ev.shardsEarned);
    p.unsyncedFlux = (p.unsyncedFlux || 0) + Number(ev.shardsEarned);
    if (Number(ev.shardsEarned) >= 5) {
      getActiveAudio().playSlipstreamBoost?.(false);
      spawnFlyingShardBurst(7, 0.56);
    } else {
      pulseActiveShardPill();
    }
    updateAllShardAndZoneDisplays();
    saveStore(store);
  }
  if (ev.message) {
    showToast(ev.message, 2400);
  }
}

function launchFrostwake(overrideWorldId = null) {
  closeEncounterDock();
  if (oddrootWorld) oddrootWorld.stop();
  if (bastionWorld) bastionWorld.stop();
  frostwakeAudio.unlock();

  const prog = getActiveProgress(store);
  if (overrideWorldId) {
    if (!prog.unlockedWorlds.includes(overrideWorldId)) prog.unlockedWorlds.push(overrideWorldId);
    prog.activeWorld = overrideWorldId;
    saveStore(store);
  }

  activeRealmId = "frostwake";
  $("screen-portal").classList.remove("active");
  $("screen-oddroot").classList.remove("active");
  $("screen-bastion")?.classList.remove("active");
  $("screen-frostwake").classList.add("active");
  attachSharedOverlaysToScreen($("screen-frostwake"));

  if (!frostwakeWorld) {
    frostwakeWorld = new FrostwakeWorld3D({
      canvas: $("frostwake-canvas"),
      audio: frostwakeAudio,
      onWorldActivity: (amount, bonusFlux, metricKey) => {
        const p = getActiveProgress(store);
        p.games = p.games || {};
        p.games.frostwake = p.games.frostwake || {};
        if (metricKey === "snowClearedM2" && amount > 0) {
          p.snowClearedM2 = Math.round((p.snowClearedM2 || 0) + amount);
          p.games.frostwake.snowClearedM2 = p.snowClearedM2;
        } else if (metricKey === "rimeCreepsCleared") {
          p.games.frostwake.rimeCreepsCleared = (p.games.frostwake.rimeCreepsCleared || 0) + amount;
        } else if (metricKey === "foxDensThawed") {
          p.games.frostwake.foxDensThawed = (p.games.frostwake.foxDensThawed || 0) + amount;
        } else if (metricKey === "expeditionsCompleted" && amount > 0) {
          p.games.frostwake.expeditionsCompleted = Math.max(
            Number(p.games.frostwake.expeditionsCompleted) || 0,
            frostwakeWorld?.getFieldExpeditionState?.()?.completedTotal ||
              (Number(p.games.frostwake.expeditionsCompleted) || 0) + amount
          );
        }
        if (bonusFlux > 0) {
          p.fluxShards += bonusFlux;
          p.unsyncedFlux = (p.unsyncedFlux || 0) + bonusFlux;
          frostwakeAudio.playSnowShardTick();
        }
        updateAllShardAndZoneDisplays();
        saveStore(store);
      },
      onApproachGate: (enc) => openEncounterDock(enc),
      onLeaveGate: () => closeEncounterDock(),
      onMysteryFound: handleMysteryFound,
      onGaragePadEntered: () => openGarageModal(),
      onOppositionEvent: handleOppositionEvent,
      onSharedCoinGrabbed: handleSharedCoinGrabbed,
    });
  }

  frostwakeWorld.applyLoadout(prog, getCrossRealmUnlocks(prog), activeBorrowedToy);
  frostwakeWorld.setObservatoryTier(store.householdWonder?.observatoryTier || 1);
  frostwakeWorld.resize();
  spawnActiveWave();
  frostwakeWorld.start();
  connectRealmMultiplayer("frostwake");
  renderPortal();
  showToast("Carve snow, explore geysers & crystal ridges, or tap Cruise to Gate!");
}

function launchOddroot(overrideWorldId = null) {
  closeEncounterDock();
  if (frostwakeWorld) frostwakeWorld.stop();
  if (bastionWorld) bastionWorld.stop();
  oddrootAudio.unlock();

  const prog = getActiveProgress(store);
  if (overrideWorldId) {
    if (!prog.unlockedWorlds.includes(overrideWorldId)) prog.unlockedWorlds.push(overrideWorldId);
    prog.activeWorld = overrideWorldId;
    saveStore(store);
  }

  activeRealmId = "oddroot";
  $("screen-portal").classList.remove("active");
  $("screen-frostwake").classList.remove("active");
  $("screen-bastion")?.classList.remove("active");
  $("screen-oddroot").classList.add("active");
  attachSharedOverlaysToScreen($("screen-oddroot"));

  if (!oddrootWorld) {
    oddrootWorld = new OddrootWorld3D({
      canvas: $("oddroot-canvas"),
      audio: oddrootAudio,
      onWorldActivity: (amount, bonusFlux, metricKey) => {
        const p = getActiveProgress(store);
        p.games = p.games || {};
        p.games.oddroot = p.games.oddroot || {};
        if (metricKey === "blightClearedM2" && amount > 0) {
          p.games.oddroot.blightClearedM2 = Math.round((p.games.oddroot.blightClearedM2 || 0) + amount);
          p.games.oddroot.blightClearedCount = (p.games.oddroot.blightClearedCount || 0) + 1;
        } else if (metricKey === "expeditionsCompleted" && amount > 0) {
          p.games.oddroot.expeditionsCompleted = Math.max(
            Number(p.games.oddroot.expeditionsCompleted) || 0,
            oddrootWorld?.getFieldExpeditionState?.()?.completedTotal ||
              (Number(p.games.oddroot.expeditionsCompleted) || 0) + amount
          );
        }
        if (bonusFlux > 0) {
          p.fluxShards += bonusFlux;
          p.unsyncedFlux = (p.unsyncedFlux || 0) + bonusFlux;
          oddrootAudio.playSnowShardTick?.();
        }
        updateAllShardAndZoneDisplays();
        saveStore(store);
      },
      onOrbHarvested: () => {
        updateAllShardAndZoneDisplays();
      },
      onApproachGate: (enc) => openEncounterDock(enc),
      onLeaveGate: () => closeEncounterDock(),
      onMysteryFound: handleMysteryFound,
      onCreatureHatched: (hatchedSpec) => {
        const p = getActiveProgress(store);
        p.games = p.games || {};
        p.games.oddroot = p.games.oddroot || {};
        const list = Array.isArray(p.games.oddroot.hatchedCreatures) ? p.games.oddroot.hatchedCreatures : [];
        if (hatchedSpec?.id && !list.includes(hatchedSpec.id)) {
          list.push(hatchedSpec.id);
        }
        p.games.oddroot.hatchedCreatures = list;
        p.games.oddroot.creatureStages = p.games.oddroot.creatureStages || {};
        if (hatchedSpec?.id) {
          p.games.oddroot.creatureStages[hatchedSpec.id] = Math.max(
            Number(p.games.oddroot.creatureStages[hatchedSpec.id]) || 0,
            Number(hatchedSpec.stage) || 1
          );
        }
        p.records = p.records || {};
        p.records.creaturesHatched = Math.max(p.records.creaturesHatched || 0, list.length);
        saveStore(store);
        if (hatchedSpec?.name) {
          showToast(`🐾 Hatched in Sanctuary: ${hatchedSpec.icon || "✨"} ${hatchedSpec.name}!`, 3200);
        }
      },
      onGaragePadEntered: () => openGarageModal(),
      onOppositionEvent: handleOppositionEvent,
      onSharedCoinGrabbed: handleSharedCoinGrabbed,
    });
  }

  oddrootWorld.applyLoadout(prog, getCrossRealmUnlocks(prog), activeBorrowedToy);
  oddrootWorld.setObservatoryTier(store.householdWonder?.observatoryTier || 1);
  oddrootWorld.resize();
  spawnActiveWave();
  oddrootWorld.start();
  connectRealmMultiplayer("oddroot");
  renderPortal();
  showToast("Harvest orbs, glide sky-root rings, or tap Cruise to Shrine!");
}

function launchBastion(overrideWorldId = null) {
  closeEncounterDock();
  if (frostwakeWorld) frostwakeWorld.stop();
  if (oddrootWorld) oddrootWorld.stop();
  bastionAudio.unlock?.();

  const prog = getActiveProgress(store);
  if (overrideWorldId) {
    if (!prog.unlockedWorlds.includes(overrideWorldId)) prog.unlockedWorlds.push(overrideWorldId);
    prog.activeWorld = overrideWorldId;
    saveStore(store);
  }

  activeRealmId = "arc_bastion";
  $("screen-portal").classList.remove("active");
  $("screen-frostwake").classList.remove("active");
  $("screen-oddroot").classList.remove("active");
  $("screen-bastion")?.classList.add("active");
  attachSharedOverlaysToScreen($("screen-bastion"));

  if (!bastionWorld) {
    bastionWorld = new BastionWorld3D({
      canvas: $("bastion-canvas"),
      audio: bastionAudio,
      onWorldActivity: (amount, bonusFlux, metricKey) => {
        const p = getActiveProgress(store);
        p.games = p.games || {};
        p.games.arc_bastion = p.games.arc_bastion || {};
        if (metricKey === "contraptionsShattered" && amount > 0) {
          p.games.arc_bastion.contraptionsShattered =
            (p.games.arc_bastion.contraptionsShattered || 0) + amount;
        } else if (metricKey === "cryoGelSplats" && amount > 0) {
          p.games.arc_bastion.cryoGelSplats =
            (p.games.arc_bastion.cryoGelSplats || 0) + amount;
        } else if (metricKey === "expeditionsCompleted" && amount > 0) {
          p.games.arc_bastion.expeditionsCompleted = Math.max(
            Number(p.games.arc_bastion.expeditionsCompleted) || 0,
            bastionWorld?.getFieldExpeditionState?.()?.completedTotal ||
              (Number(p.games.arc_bastion.expeditionsCompleted) || 0) + amount
          );
        }
        if (bonusFlux > 0) {
          p.fluxShards += bonusFlux;
          p.unsyncedFlux = (p.unsyncedFlux || 0) + bonusFlux;
          bastionAudio.playSnowShardTick?.();
        }
        updateAllShardAndZoneDisplays();
        saveStore(store);
      },
      onApproachGate: (enc) => openEncounterDock(enc),
      onLeaveGate: () => closeEncounterDock(),
      onMysteryFound: handleMysteryFound,
      onGaragePadEntered: () => openGarageModal(),
      onOppositionEvent: handleOppositionEvent,
      onSharedCoinGrabbed: handleSharedCoinGrabbed,
    });
  }

  bastionWorld.applyLoadout(prog, getCrossRealmUnlocks(prog), activeBorrowedToy);
  bastionWorld.setObservatoryTier(store.householdWonder?.observatoryTier || 1);
  bastionWorld.resize();
  spawnActiveWave();
  bastionWorld.start();
  connectRealmMultiplayer("arc_bastion");
  renderPortal();
  showToast("Command the citadel, toggle 0.08× Time-Aura, or tap Cruise to Gate!");
}

function exitRealmToHub() {
  if (waveReplenishTimer) {
    clearTimeout(waveReplenishTimer);
    waveReplenishTimer = null;
  }
  if (victoryStampTimer) {
    clearTimeout(victoryStampTimer);
    victoryStampTimer = null;
  }
  if (boostHudRafId && typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(boostHudRafId);
    boostHudRafId = 0;
  }
  $("victory-stamp-card")?.classList.remove("show", "is-overdrive", "is-oddroot", "is-bastion");
  $("slipstream-screen-fx")?.classList.remove("active", "overdrive");
  $("fw-boost-pill")?.classList.remove("active", "overdrive");
  $("or-boost-pill")?.classList.remove("active", "overdrive");
  $("ab-boost-pill")?.classList.remove("active", "overdrive");
  closeEncounterDock();
  disconnectMultiplayer();
  if (frostwakeWorld) frostwakeWorld.stop();
  if (oddrootWorld) oddrootWorld.stop();
  if (bastionWorld) bastionWorld.stop();
  activeRealmId = "portal";
  $("screen-frostwake").classList.remove("active");
  $("screen-oddroot").classList.remove("active");
  $("screen-bastion")?.classList.remove("active");
  $("screen-portal").classList.add("active");
  renderPortal();
}

function spawnActiveWave() {
  if (waveReplenishTimer) {
    clearTimeout(waveReplenishTimer);
    waveReplenishTimer = null;
  }
  const world = getActiveWorld();
  if (!world) return;
  const prog = getActiveProgress(store);
  const wave = [
    pickNextEncounter(prog, session, prog.activeWorld),
    pickNextEncounter(prog, session, prog.activeWorld),
    pickNextEncounter(prog, session, prog.activeWorld),
  ];
  if (world.rigState) world.rigState.inSurge = Boolean(session.inSurge);
  syncSurgeBanners();
  world.populateEncounters(wave);
}

/* ==================== SPATIAL ENCOUNTER DOCK & HOLO-TRICK ==================== */
function openEncounterDock(enc) {
  currentEncounter = enc;
  encounterOpenedAt = performance.now();
  firstInputAt = 0;

  const prog = getActiveProgress(store);
  prog.seenTrickFamilies = Array.isArray(prog.seenTrickFamilies) ? prog.seenTrickFamilies : [];
  const spec = getTrickCardSpec(enc, prog);
  if (spec?.familyId && !prog.seenTrickFamilies.includes(spec.familyId)) {
    prog.seenTrickFamilies.push(spec.familyId);
    trickCardOpen = true;
    saveStore(store);
  } else {
    trickCardOpen = false;
  }

  const world = getActiveWorld();
  world?.setEncounterDockOpen?.(true);

  const screenEl = getActiveScreenEl();
  screenEl?.classList.add("dock-open");
  $("encounter-dock").classList.add("open");

  publishImmediateMultiplayerState("thinking");
  paintEncounterDock();
}

function closeEncounterDock() {
  currentEncounter = null;
  trickCardOpen = false;

  frostwakeWorld?.setEncounterDockOpen?.(false);
  oddrootWorld?.setEncounterDockOpen?.(false);
  bastionWorld?.setEncounterDockOpen?.(false);

  $("screen-frostwake")?.classList.remove("dock-open");
  $("screen-oddroot")?.classList.remove("dock-open");
  $("screen-bastion")?.classList.remove("dock-open");
  $("encounter-dock")?.classList.remove("open");

  publishImmediateMultiplayerState(session.inSurge ? "surge" : "roaming");
}

function markFirstInput() {
  if (!firstInputAt) firstInputAt = performance.now();
}

function renderVisualPatternClusters(enc) {
  const box = $("enc-visual-clusters");
  if (!box) return;
  if (enc.kind !== "seq_linear" || !enc.patternMeta?.frames) {
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }
  box.style.display = "grid";
  box.innerHTML = enc.patternMeta.frames
    .map((f) => {
      const baseGems = "🟡".repeat(Math.min(7, f.base));
      const groupClusters = Array.from({ length: f.groups }, () => "🔹".repeat(Math.min(6, f.perGroup))).join(" ");
      return `
        <div class="cluster-frame-card">
          <div><strong>Frame ${f.step}</strong> (${f.total})</div>
          <div class="cluster-dots">${baseGems}</div>
          <div class="cluster-dots">${groupClusters}</div>
        </div>
      `;
    })
    .join("");
}

function renderTrickHoloProjector(enc) {
  const card = $("enc-trick-card");
  const btn = $("btn-show-trick");
  if (!card || !btn) return;
  const prog = getActiveProgress(store);
  const spec = getTrickCardSpec(enc, prog);
  btn.textContent = trickCardOpen ? "🦊 Hide Trick" : "🦊 Show Trick";
  if (!trickCardOpen || !spec) {
    card.style.display = "none";
    card.innerHTML = "";
    return;
  }
  const twoBeats = (spec.beats || []).slice(0, 2);
  card.style.display = "block";
  card.innerHTML = `
    <div class="trick-holo-title">
      <span style="display:inline-flex;align-items:center;gap:6px">${charImgHtml("crystal_fox", "char-trick-fox")}<span>${spec.title}</span></span>
      <span style="color:var(--turquoise);font-size:0.74rem">${spec.foxWhisper || ""}</span>
    </div>
    <div class="trick-beats-grid">
      ${twoBeats
        .map(
          (b, idx) => `
            <div class="trick-beat-box">
              <div style="color:var(--amber);font-size:0.7rem;margin-bottom:2px">BEAT ${idx + 1}</div>
              <div>${b.caption}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function paintEncounterDock() {
  if (!currentEncounter) return;
  const enc = currentEncounter;
  const world = getActiveWorld();
  const audio = getActiveAudio();

  $("enc-prompt").textContent = enc.promptShort;
  $("enc-node-tag").textContent = enc.nodeId;
  $("enc-equation").textContent = enc.equationText;
  $("enc-target-label").textContent = `Dial ${enc.targetLabel || "n"}`;

  renderVisualPatternClusters(enc);
  renderTrickHoloProjector(enc);

  const bp = $("enc-blueprint");
  bp.innerHTML = "";
  if (enc.blueprintLog && enc.blueprintLog.length > 1) {
    for (const stepText of enc.blueprintLog.slice(-3)) {
      const chip = document.createElement("span");
      chip.className = "blueprint-step";
      chip.textContent = stepText;
      bp.appendChild(chip);
    }
  }

  // Voluntary Twin-Beam Slicer & Reset chips
  const beamRow = $("enc-beams");
  beamRow.innerHTML = "";
  const actionsToShow = [...(enc.beamActions || [])];
  if ((enc.stepsUsed || 0) > 0 && !actionsToShow.some((a) => a.id === "reset_steps")) {
    actionsToShow.push({ id: "reset_steps", label: "↺ Reset", kind: "reset" });
  }
  for (const act of actionsToShow) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "beam-chip";
    b.textContent = act.id === "reset_steps" ? act.label : `⚡ ${act.label}`;
    b.onclick = () => {
      markFirstInput();
      const prog = getActiveProgress(store);
      const res = applyBeamAction(currentEncounter, act.id, prog, session);
      currentEncounter = res.encounter;
      if (res.kind === "magnetic_repel") {
        audio.playMagneticRepel?.();
        world?.playTwinBeamVisual?.(true);
        showToast(res.cue);
      } else {
        audio.playTwinBeam?.();
        world?.playTwinBeamVisual?.(false);
        world?.refreshActiveEncounterVisual?.(currentEncounter);
        if (res.cue) showToast(res.cue);
      }
      paintEncounterDock();
      saveStore(store);
    };
    beamRow.appendChild(b);
  }

  // Dial input & Rotary Detents (strictly discrete, zero range scrubbers!)
  const dialInput = $("enc-dial-input");
  if (document.activeElement !== dialInput) {
    dialInput.value = String(enc.currentDial ?? enc.startDial ?? 0);
  }
  world?.updateDialPreview?.(Number(dialInput.value));

  const detGrid = $("enc-detents");
  detGrid.innerHTML = "";
  const detents = enc.detents || [-10, -5, -1, 1, 5, 10];
  for (const step of detents) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `detent-btn ${step < 0 ? "neg" : "pos"}`;
    btn.textContent = step > 0 ? `+${step}` : String(step);
    btn.onclick = () => {
      markFirstInput();
      const nextVal = (Number(dialInput.value) || 0) + step;
      enc.currentDial = nextVal;
      dialInput.value = String(nextVal);
      audio.playDetentClick?.(nextVal);
      if (activeRealmId === "oddroot") {
        oddrootWorld?.fireSiphonOrb?.(step < 0 ? "frost_spore" : "sun_orb");
      }
      world?.updateDialPreview?.(nextVal);
    };
    detGrid.appendChild(btn);
  }

  const isOddroot = activeRealmId === "oddroot";
  const isBastion = activeRealmId === "arc_bastion";
  const commitVerb =
    enc.encounterType === "holo_ramp" || enc.encounterType === "rainbow_arch"
      ? isBastion
        ? "🚀 Fire Parabolic Mortar"
        : isOddroot
        ? "🌿 Grow Vine-Bridge"
        : "🚀 Launch Across Curve"
      : enc.encounterType === "astrolabe_shrine"
      ? "✨ Lock Sky-Astrolabe"
      : enc.encounterType === "harpoon_cliff"
      ? isBastion
        ? "⚡ Fire Prism Rail"
        : isOddroot
        ? "🌟 Cast Starlight Vine"
        : "🪝 Fire Cliff Harpoon"
      : isBastion
      ? "🎯 Fire Siege Battery"
      : isOddroot
      ? "🧪 Brew Sanctuary Shrine"
      : "⚡ Ram Cryo-Gate";
  $("enc-commit-btn").textContent = commitVerb;
}

function handleCommit() {
  if (!currentEncounter) return;
  const now = performance.now();
  const planMs = Math.max(250, (firstInputAt || now) - encounterOpenedAt);
  const execMs = firstInputAt ? Math.max(150, now - firstInputAt) : 350;
  const rawInputStr = $("enc-dial-input").value;
  const val = rawInputStr === "" ? NaN : Number(rawInputStr);

  const prog = getActiveProgress(store);
  const prevUnlockedCount = (prog.unlockedWorlds || []).length;
  const solvedEnc = currentEncounter;

  const res = evaluateCommit({
    encounter: solvedEnc,
    committedValue: val,
    planMs,
    execMs,
    progress: prog,
    session,
  });

  // Live 3D 3-miss Friction Cushion trigger (activates 4-Item Surge Wave immediately on 3rd consecutive miss!)
  if (
    res.outcome === "nudge" &&
    !res.invalidInput &&
    solvedEnc.worldId !== "W0" &&
    !session.inSurge &&
    session.consecutiveMisses >= 3 &&
    session.friction >= 2.8
  ) {
    queueOverdriveSurge(prog, session, solvedEnc.nodeId);
    res.surgeTriggered = true;
  }

  const world = getActiveWorld();
  const audio = getActiveAudio();

  if (world?.rigState) world.rigState.inSurge = Boolean(session.inSurge);
  syncSurgeBanners();

  world?.playCommitVisual?.(res, solvedEnc);

  if (res.outcome === "clear") {
    if (activeRealmId === "oddroot") {
      prog.games.oddroot.cauldronsBrewed = (prog.games.oddroot.cauldronsBrewed || 0) + 1;
    } else if (activeRealmId === "arc_bastion") {
      prog.games.arc_bastion = prog.games.arc_bastion || {};
      prog.games.arc_bastion.batteriesCleared = (prog.games.arc_bastion.batteriesCleared || 0) + 1;
    }
    recordWeeklySunshine(prog);
    audio.playClear?.(res.overdrive);
    triggerHudVictoryCelebration(res);
    showToast(`${res.cue} +${res.shardsEarned}💎`);

    if (session.overdriveStreak >= 3) {
      world?.triggerSkyWhale?.();
    }
    if ((prog.unlockedWorlds || []).length > prevUnlockedCount) {
      const newestWorldId = prog.unlockedWorlds[prog.unlockedWorlds.length - 1];
      world?.triggerGuardianAwakening?.(newestWorldId);
    }

    const pose = world?.getLocalMultiplayerPose?.() || {};
    mpClient?.sendGateBurst({
      overdrive: Boolean(res.overdrive),
      worldId: prog.activeWorld,
      nodeId: solvedEnc.nodeId,
      ...pose,
    });

    world?.applyLoadout?.(prog, getCrossRealmUnlocks(prog), activeBorrowedToy);
    finishGateAndReplenishIfDone(res);
  } else if (res.outcome === "warm_reveal") {
    recordWeeklySunshine(prog);
    audio.playFoxReveal?.();
    triggerHudVictoryCelebration(res);
    showToast(`${res.cue} · +${res.shardsEarned}💎`, 3200);
    finishGateAndReplenishIfDone(res);
  } else {
    audio.playCaliperNudge?.();
    trickCardOpen = true;
    paintEncounterDock();
    showToast(res.cue);
  }

  updateAllShardAndZoneDisplays();
  saveStore(store);
}

function finishGateAndReplenishIfDone(res) {
  closeEncounterDock();
  const world = getActiveWorld();
  if (res.calibrationFinished) {
    const prog = getActiveProgress(store);
    const wObj = WORLDS.find((w) => w.id === prog.activeWorld) || WORLDS[1];
    showToast(`Frontier tuned → ${wObj.rankLabel} · ${wObj.name}!`, 3200);
    if (waveReplenishTimer) clearTimeout(waveReplenishTimer);
    waveReplenishTimer = setTimeout(() => {
      waveReplenishTimer = null;
      spawnActiveWave();
    }, 140);
    return;
  }
  if (res.surgeTriggered) {
    showToast("✨ Overdrive Surge Wave Ignited! ✨", 2800);
    if (waveReplenishTimer) clearTimeout(waveReplenishTimer);
    waveReplenishTimer = setTimeout(() => {
      waveReplenishTimer = null;
      spawnActiveWave();
    }, 140);
    return;
  }
  const allDone = world?.areAllEncountersCleared
    ? world.areAllEncountersCleared()
    : Boolean(world?.gateSlots?.every((s) => s.cleared));
  if (allDone) {
    if (waveReplenishTimer) clearTimeout(waveReplenishTimer);
    waveReplenishTimer = setTimeout(() => {
      waveReplenishTimer = null;
      spawnActiveWave();
      showToast("3 fresh beacons lit across the realm!");
    }, 140);
  }
}

/* ==================== MODALS ==================== */
function openModal(id) {
  $(id)?.classList.add("open");
}

function closeModal(id) {
  $(id)?.classList.remove("open");
}

function openWhoModal() {
  const box = $("who-roster");
  box.innerHTML = "";
  for (const p of store.profiles) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `roster-face${p.username === store.activeUsername ? " active" : ""}`;
    btn.textContent = `${p.avatar} ${p.name}`;
    btn.onclick = async () => {
      store.activeUsername = p.username;
      activeBorrowedToy = null;
      saveStore(store, false);
      if (window.YompleStay) window.YompleStay.stamp(p.username, store.familyCode || "");
      const localProg = getActiveProgress(store);
      getActiveWorld()?.applyLoadout?.(localProg, getCrossRealmUnlocks(localProg), null);
      if (activeRealmId !== "portal") {
        connectRealmMultiplayer(activeRealmId);
      }
      renderPortal();
      closeModal("modal-who");
      await pullPlayerCloud(store, p.username);
      const syncedProg = getActiveProgress(store);
      getActiveWorld()?.applyLoadout?.(syncedProg, getCrossRealmUnlocks(syncedProg), activeBorrowedToy);
      renderPortal();
    };
    box.appendChild(btn);
  }
  openModal("modal-who");
}

function applyLoadoutAcrossAllActiveWorlds(prog) {
  const unlocks = getCrossRealmUnlocks(prog);
  frostwakeWorld?.applyLoadout(prog, unlocks, activeBorrowedToy);
  oddrootWorld?.applyLoadout(prog, unlocks, activeBorrowedToy);
  bastionWorld?.applyLoadout(prog, unlocks, activeBorrowedToy);
}

function openGarageModal() {
  const prog = getActiveProgress(store);
  $("garage-shards").textContent = String(prog.fluxShards || 0);

  // Frostwake Chassis
  const chRow = $("garage-chassis-row");
  chRow.innerHTML = "";
  for (const ch of RIG_CHASSIS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `rig-chip${prog.equippedChassis === ch.id ? " selected" : ""}`;
    b.innerHTML = `${charImgHtml(ch.id, "char-garage-avatar")}<span>${ch.name} (${ch.tag})</span>`;
    b.onclick = () => {
      prog.equippedChassis = ch.id;
      if (prog.games?.frostwake) prog.games.frostwake.equippedChassis = ch.id;
      activeBorrowedToy = null;
      getActiveAudio().playDetentClick?.(15);
      saveStore(store);
      frostwakeWorld?.applyLoadout(prog, getCrossRealmUnlocks(prog), null);
      openGarageModal();
      renderPortal();
    };
    chRow.appendChild(b);
  }

  // Oddroot Mounts
  const mRow = $("garage-mounts-row");
  if (mRow) {
    mRow.innerHTML = "";
    const curMount = prog.games?.oddroot?.equippedMount || "bramble_boar";
    for (const m of ODDROOT_MOUNTS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `rig-chip${curMount === m.id ? " selected" : ""}`;
      b.innerHTML = `${charImgHtml(m.id, "char-garage-avatar")}<span>${m.name} (${m.tag})</span>`;
      b.onclick = () => {
        prog.games.oddroot.equippedMount = m.id;
        activeBorrowedToy = null;
        getActiveAudio().playDetentClick?.(15);
        saveStore(store);
        oddrootWorld?.applyLoadout(prog, getCrossRealmUnlocks(prog), null);
        openGarageModal();
        renderPortal();
      };
      mRow.appendChild(b);
    }
  }

  // Arc Bastion Siege-Rovers
  const abRow = $("garage-bastion-rigs-row");
  if (abRow) {
    abRow.innerHTML = "";
    const curRig = prog.games?.arc_bastion?.equippedRig || "iron_ballista";
    for (const r of BASTION_RIGS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `rig-chip${curRig === r.id ? " selected" : ""}`;
      b.innerHTML = `${charImgHtml(r.id, "char-garage-avatar")}<span>${r.name} (${r.tag})</span>`;
      b.onclick = () => {
        prog.games = prog.games || {};
        prog.games.arc_bastion = prog.games.arc_bastion || {};
        prog.games.arc_bastion.equippedRig = r.id;
        activeBorrowedToy = null;
        getActiveAudio().playDetentClick?.(15);
        saveStore(store);
        bastionWorld?.applyLoadout(prog, getCrossRealmUnlocks(prog), null);
        openGarageModal();
        renderPortal();
      };
      abRow.appendChild(b);
    }
  }

  // Frostwake Upgrades
  const grid = $("garage-upgrades-grid");
  grid.innerHTML = "";
  for (const upg of RIG_UPGRADES) {
    const owned = (prog.ownedUpgrades || []).includes(upg.id);
    const canBuy = !owned && (prog.fluxShards || 0) >= upg.cost;
    const card = document.createElement("div");
    card.className = `upg-card${owned ? " owned" : ""}`;
    card.innerHTML = `
      <div style="font-weight:900">${upg.icon} ${upg.name}</div>
      <div style="font-size:0.8rem;color:var(--ink-soft);font-weight:700">${upg.shortDesc}</div>
    `;
    const buyBtn = document.createElement("button");
    buyBtn.type = "button";
    buyBtn.className = "upg-buy-btn";
    buyBtn.textContent = owned ? "✓ Installed on Rig" : `Install · 💎 ${upg.cost}`;
    buyBtn.disabled = owned || !canBuy;
    buyBtn.onclick = () => {
      if ((prog.ownedUpgrades || []).includes(upg.id) || prog.fluxShards < upg.cost) return;
      prog.fluxShards -= upg.cost;
      prog.ownedUpgrades.push(upg.id);
      getActiveAudio().playClear?.(true);
      saveStore(store);
      applyLoadoutAcrossAllActiveWorlds(prog);
      openGarageModal();
      renderPortal();
    };
    card.appendChild(buyBtn);
    grid.appendChild(card);
  }

  // Oddroot Upgrades
  const orGrid = $("garage-oddroot-upgrades-grid");
  if (orGrid) {
    orGrid.innerHTML = "";
    const ownedSet = new Set([
      ...(prog.ownedUpgrades || []),
      ...(prog.games?.oddroot?.sanctuaryUpgrades || []),
    ]);
    for (const upg of ODDROOT_UPGRADES) {
      const owned = ownedSet.has(upg.id);
      const canBuy = !owned && (prog.fluxShards || 0) >= upg.cost;
      const card = document.createElement("div");
      card.className = `upg-card${owned ? " owned" : ""}`;
      card.innerHTML = `
        <div style="font-weight:900">${upg.icon} ${upg.name}</div>
        <div style="font-size:0.8rem;color:var(--ink-soft);font-weight:700">${upg.shortDesc}</div>
      `;
      const buyBtn = document.createElement("button");
      buyBtn.type = "button";
      buyBtn.className = "upg-buy-btn";
      buyBtn.textContent = owned ? "✓ Active in Sanctuary" : `Install · 💎 ${upg.cost}`;
      buyBtn.disabled = owned || !canBuy;
      buyBtn.onclick = () => {
        if (ownedSet.has(upg.id) || prog.fluxShards < upg.cost) return;
        prog.fluxShards -= upg.cost;
        prog.ownedUpgrades.push(upg.id);
        prog.games.oddroot.sanctuaryUpgrades = prog.games.oddroot.sanctuaryUpgrades || [];
        if (!prog.games.oddroot.sanctuaryUpgrades.includes(upg.id)) {
          prog.games.oddroot.sanctuaryUpgrades.push(upg.id);
        }
        getActiveAudio().playClear?.(true);
        saveStore(store);
        applyLoadoutAcrossAllActiveWorlds(prog);
        openGarageModal();
        renderPortal();
      };
      card.appendChild(buyBtn);
      orGrid.appendChild(card);
    }
  }

  // Arc Bastion Siegesmith Upgrades
  const abGrid = $("garage-bastion-upgrades-grid");
  if (abGrid) {
    abGrid.innerHTML = "";
    const abOwnedSet = new Set([
      ...(prog.ownedUpgrades || []),
      ...(prog.games?.arc_bastion?.bastionUpgrades || []),
    ]);
    for (const upg of BASTION_UPGRADES) {
      const owned = abOwnedSet.has(upg.id);
      const canBuy = !owned && (prog.fluxShards || 0) >= upg.cost;
      const card = document.createElement("div");
      card.className = `upg-card${owned ? " owned" : ""}`;
      card.innerHTML = `
        <div style="font-weight:900">${upg.icon} ${upg.name}</div>
        <div style="font-size:0.8rem;color:var(--ink-soft);font-weight:700">${upg.shortDesc}</div>
      `;
      const buyBtn = document.createElement("button");
      buyBtn.type = "button";
      buyBtn.className = "upg-buy-btn";
      buyBtn.textContent = owned ? "✓ Active on Citadel" : `Install · 💎 ${upg.cost}`;
      buyBtn.disabled = owned || !canBuy;
      buyBtn.onclick = () => {
        if (abOwnedSet.has(upg.id) || prog.fluxShards < upg.cost) return;
        prog.fluxShards -= upg.cost;
        prog.ownedUpgrades.push(upg.id);
        prog.games = prog.games || {};
        prog.games.arc_bastion = prog.games.arc_bastion || {};
        prog.games.arc_bastion.bastionUpgrades = prog.games.arc_bastion.bastionUpgrades || [];
        if (!prog.games.arc_bastion.bastionUpgrades.includes(upg.id)) {
          prog.games.arc_bastion.bastionUpgrades.push(upg.id);
        }
        getActiveAudio().playClear?.(true);
        saveStore(store);
        applyLoadoutAcrossAllActiveWorlds(prog);
        openGarageModal();
        renderPortal();
      };
      card.appendChild(buyBtn);
      abGrid.appendChild(card);
    }
  }

  // 1-Tap Sibling Toy Borrow (+5💎 Gift to Sibling!)
  const borrowBox = $("garage-borrow-box");
  if (borrowBox) {
    borrowBox.innerHTML = "";
    const siblings = (store.profiles || []).filter((p) => p.username !== store.activeUsername);
    const targetRealm =
      activeRealmId === "arc_bastion"
        ? "arc_bastion"
        : activeRealmId === "oddroot"
        ? "oddroot"
        : "frostwake";
    for (const sib of siblings) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "borrow-cta-btn";
      btn.textContent = `🤝 Borrow ${sib.avatar || "✨"} ${sib.name}'s Loadout (+5💎 Gift to ${sib.name})`;
      btn.onclick = () => {
        const res = borrowSiblingToy(store, store.activeUsername, sib.username, targetRealm);
        if (res.ok) {
          activeBorrowedToy = res.borrowedToy;
          getActiveAudio().playClear?.(true);
          applyLoadoutAcrossAllActiveWorlds(prog);
          renderPortal();
          showToast(`🤝 Borrowed ${sib.name}'s loadout! Sent +5💎 gift!`, 3000);
          openGarageModal();
        }
      };
      borrowBox.appendChild(btn);
    }
  }

  openModal("modal-garage");
}

function openJournalModal() {
  const prog = getActiveProgress(store);
  const entries = getSanctuaryJournalEntries(prog);
  const grid = $("journal-grid");
  if (grid) {
    grid.innerHTML = entries
      .map((c) => {
        const stageClass =
          c.stage >= 3 ? "stage-astral" : c.stage === 2 ? "stage-luminous" : "stage-sprout";
        const pipsHtml = (c.tierBadges || [])
          .map(
            (b) =>
              `<span class="creature-evo-pip${b.unlocked ? " unlocked" : ""}" title="${b.name}"></span>`
          )
          .join("");
        const portraitSrc = CHARACTER_PORTRAIT_PATHS[c.id] || CHARACTER_PORTRAIT_PATHS.crystal_fox;
        return `
          <article class="creature-card ${c.hatched ? "hatched" : "unhatched"}">
            <div class="creature-card-head">
              <img class="char-journal-portrait${c.hatched ? "" : " silhouette"}" src="${portraitSrc}" alt="" loading="lazy" />
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                  <strong style="font-size:0.96rem">${c.name}</strong>
                  <div class="creature-evo-pips">${pipsHtml}</div>
                </div>
                <span class="creature-stage-pill ${stageClass}" style="margin-top:5px;display:inline-block">${c.stageLabel} · ${c.habitat}</span>
              </div>
            </div>
            <p class="creature-whisper">${c.whisper}</p>
          </article>
        `;
      })
      .join("");
  }
  openModal("modal-journal");
}

function openSisterRealmModal(sg) {
  if (sg.id === "arc_bastion") {
    launchBastion();
    return;
  }
  $("realm-modal-title").textContent = sg.title;
  const isAstrolabe = sg.id === "stardrift";
  $("realm-modal-body").innerHTML = `
    <img src="${sg.banner}" alt="${sg.title}" style="width:100%;border-radius:18px;margin-bottom:12px" />
    <p style="margin:0 0 10px;color:var(--ink-soft);font-weight:700;line-height:1.45">
      ${sg.blurb} Every beacon lit in <strong>Frostwake</strong>, <strong>Oddroot Wilds</strong>, and <strong>Arc Bastion</strong> shares one unified
      <code>Bloomⁿ</code> constellation, carrying your Flux Shards, Spirit Creatures, and Hero Titles across realms.
    </p>
    ${
      isAstrolabe
        ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
             <button type="button" id="btn-try-astrolabe-fw" class="play-btn-giant" style="flex:1">
               ✨ Sky-Astrolabes in Frostwake (Rank V)
             </button>
             <button type="button" id="btn-try-astrolabe-or" class="play-btn-giant emerald-cta" style="flex:1">
               🌙 Moonwell Astrolabes in Oddroot (Rank V)
             </button>
             <button type="button" id="btn-try-astrolabe-ab" class="play-btn-giant sapphire-cta" style="flex:1">
               🛡️ Citadel Astrolabes in Arc Bastion (Rank V)
             </button>
           </div>`
        : `<div style="padding:10px 14px;border-radius:14px;background:rgba(255,255,255,0.06);font-weight:800;font-size:0.88rem;color:var(--amber)">
             Scheduled in Bloomⁿ Wave ${sg.order} — build your constellation across Frostwake, Oddroot &amp; Arc Bastion now!
           </div>`
    }
  `;
  openModal("modal-realm");
  const fwBtn = $("btn-try-astrolabe-fw");
  if (fwBtn) {
    fwBtn.onclick = () => {
      closeModal("modal-realm");
      launchFrostwake("W5");
    };
  }
  const orBtn = $("btn-try-astrolabe-or");
  if (orBtn) {
    orBtn.onclick = () => {
      closeModal("modal-realm");
      launchOddroot("W5");
    };
  }
  const abBtn = $("btn-try-astrolabe-ab");
  if (abBtn) {
    abBtn.onclick = () => {
      closeModal("modal-realm");
      launchBastion("W5");
    };
  }
}

function openGrownUpsModal() {
  const prof = getActiveProfile(store);
  const prog = getActiveProgress(store);
  const stageNames = ["Exploring", "Structuring", "Consolidating", "Mastered"];

  const rowsHtml = WORLDS.map((w) => {
    const curMeta = GROWN_UPS_CURRICULUM.worlds[w.id] || {};
    const states = w.nodes.map(
      (n) => prog.nodes?.[n.id] || { stage: 0, attempts: 0, wins: 0, overdrives: 0, avgPlanMs: 0 }
    );
    const mastered = states.filter((s) => s.stage >= 3).length;
    const solid = states.filter((s) => s.stage >= 2).length;
    const avgStage = Math.round(states.reduce((a, b) => a + (b.stage || 0), 0) / states.length);
    return `
      <tr>
        <td>
          <strong>${w.id} · ${w.name}</strong> (${w.rankLabel})<br>
          <small style="color:var(--turquoise)">${curMeta.grownUpsStage || ""} — ${curMeta.academicStrand || ""}</small>
        </td>
        <td>${stageNames[avgStage]}</td>
        <td>${solid}/${w.nodes.length} solid (${mastered}★)</td>
      </tr>
    `;
  }).join("");

  const allNodes = Object.values(prog.nodes || {});
  const seenNodes = allNodes.filter((n) => n.attempts > 0);
  const avgPlan = seenNodes.length
    ? (
        seenNodes.reduce((a, b) => a + Math.min(12000, b.avgPlanMs || 0), 0) /
        seenNodes.length /
        1000
      ).toFixed(1)
    : "—";
  const totalWins = allNodes.reduce((a, b) => a + (b.wins || 0), 0);
  const totalOverdrives = allNodes.reduce((a, b) => a + (b.overdrives || 0), 0);
  const overdrivePct = totalWins ? Math.round((totalOverdrives / totalWins) * 100) : 0;

  const tags = Object.entries(prog.misconceptionTags || {});
  const tagsText = tags.length ? tags.map(([k, v]) => `${k.replace(/_/g, " ")} (${v})`).join(", ") : "None flagged";
  const shelvedText = session.shelvedLog.length
    ? session.shelvedLog.map((s) => `${s.nodeId}: ${s.eq}`).join(" · ")
    : "None this session";

  const totalClearedArea =
    (prog.snowClearedM2 || 0) +
    (prog.games?.oddroot?.blightClearedM2 || 0) +
    (prog.games?.arc_bastion?.contraptionsShattered || 0) * 8;

  $("grownups-content").innerHTML = `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px;border-radius:16px;background:rgba(255,255,255,0.06);margin-bottom:12px">
      <div><strong>Player:</strong> ${prof ? `${prof.avatar} ${prof.name}` : "—"}</div>
      <div><strong>Household:</strong> ${store.familyCode || "Local (link via Yomple Hub)"}</div>
      <div><strong>Sync:</strong> ${store.lastSyncStatus}</div>
    </div>

    <div style="padding:10px 12px;border-radius:14px;background:rgba(255,255,255,0.04);margin-bottom:12px;font-size:0.8rem;color:var(--ink-soft)">
      <strong>Academic Spine (Hidden from Kids):</strong> ${GROWN_UPS_CURRICULUM.progressionSummary}
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
      <div class="rec-box"><span>Avg Plan Time</span><strong>${avgPlan}s</strong></div>
      <div class="rec-box"><span>1-Shot Overdrive</span><strong>${overdrivePct}%</strong></div>
      <div class="rec-box"><span>World Cleared</span><strong>${totalClearedArea}m²</strong></div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;border-radius:16px;background:hsla(172,78%,52%,0.12);margin-bottom:12px">
      <div>
        <strong>Open All Ranks Sandbox (W0–W7)</strong>
        <div style="font-size:0.8rem;color:var(--ink-soft)">Jump straight into Pre-Algebra, Algebra 1 Ramps, Geometry Astrolabes, or Algebra 2</div>
      </div>
      <button type="button" id="btn-toggle-sandbox" class="pill-btn">
        ${prog.sandboxAllUnlocked ? "✓ All Open" : "Unlock All"}
      </button>
    </div>

    <table class="parent-table">
      <thead><tr><th>Realm Rank &amp; Curriculum Topic</th><th>Stage</th><th>Nodes</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <p style="font-size:0.83rem;color:var(--ink-soft);margin:8px 0 4px">
      <strong>Pattern Notes:</strong> ${tagsText}
    </p>
    <p style="font-size:0.83rem;color:var(--ink-soft);margin:4px 0 0">
      <strong>Shelved for Rest of Session:</strong> ${shelvedText}
    </p>
  `;

  openModal("modal-grownups");

  $("btn-toggle-sandbox").onclick = () => {
    prog.sandboxAllUnlocked = !prog.sandboxAllUnlocked;
    saveStore(store);
    openGrownUpsModal();
    renderPortal();
  };
}

/* ==================== INPUT WIRING (REALM JOYSTICKS + KEYBOARD) ==================== */
function syncDriveVector() {
  const world = getActiveWorld();
  if (!world) return;
  const kSteer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const kThrot = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  const steer = Math.abs(joySteer) > 0.04 ? joySteer : kSteer;
  const throttle = Math.abs(joyThrottle) > 0.04 ? joyThrottle : kThrot;
  world.setDriveInputs(steer, throttle, keys.boost || holdBoostBtn);
}

function bindThumbstick(zoneId, knobId) {
  const zone = $(zoneId);
  const knob = $(knobId);
  if (!zone || !knob) return;
  let activePointer = null;

  const updateKnob = (clientX, clientY) => {
    const rect = zone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.max(24, rect.width * 0.38);
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joySteer = dx / maxR;
    joyThrottle = -dy / maxR;
    syncDriveVector();
  };

  const resetKnob = () => {
    activePointer = null;
    knob.style.transform = "translate(0px, 0px)";
    joySteer = 0;
    joyThrottle = 0;
    syncDriveVector();
  };

  zone.addEventListener("pointerdown", (e) => {
    getActiveAudio().unlock?.();
    activePointer = e.pointerId;
    zone.setPointerCapture?.(e.pointerId);
    updateKnob(e.clientX, e.clientY);
  });
  zone.addEventListener("pointermove", (e) => {
    if (e.pointerId !== activePointer) return;
    updateKnob(e.clientX, e.clientY);
  });
  zone.addEventListener("pointerup", resetKnob);
  zone.addEventListener("pointercancel", resetKnob);
}

function setupJoystickAndKeys() {
  bindThumbstick("joy-zone", "joy-knob");
  bindThumbstick("oddroot-joy-zone", "oddroot-joy-knob");
  bindThumbstick("bastion-joy-zone", "bastion-joy-knob");

  window.addEventListener("keydown", (e) => {
    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      if (e.key === "Enter" && currentEncounter) {
        e.preventDefault();
        handleCommit();
      }
      return;
    }
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = true;
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = true;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    if (e.key === " ") keys.boost = true;
    if ((e.key === "q" || e.key === "Q") && activeRealmId === "arc_bastion" && bastionWorld) {
      const bt = bastionWorld.toggleBulletTime();
      syncBastionBulletTimePill();
      showToast(bt.requested ? "⏳ 0.08× Crystal Bullet-Time Aura ON!" : "⏳ Full-speed Citadel clock restored!");
    }
    if (e.key === "Enter" && currentEncounter) handleCommit();
    syncDriveVector();
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = false;
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = false;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    if (e.key === " ") keys.boost = false;
    syncDriveVector();
  });
}

/* ==================== BOOTSTRAP ==================== */
async function init() {
  setupJoystickAndKeys();

  $("btn-launch-frostwake").onclick = () => launchFrostwake();
  $("btn-launch-oddroot").onclick = () => launchOddroot();
  if ($("btn-launch-bastion")) $("btn-launch-bastion").onclick = () => launchBastion();

  $("hud-exit-btn").onclick = () => exitRealmToHub();
  $("oddroot-exit-btn").onclick = () => exitRealmToHub();
  if ($("bastion-exit-btn")) $("bastion-exit-btn").onclick = () => exitRealmToHub();

  $("portal-who-btn").onclick = () => openWhoModal();
  $("portal-garage-btn").onclick = () => openGarageModal();
  $("hud-garage-btn").onclick = () => openGarageModal();
  $("oddroot-workshop-btn").onclick = () => openGarageModal();
  if ($("bastion-armory-btn")) $("bastion-armory-btn").onclick = () => openGarageModal();

  $("portal-journal-btn").onclick = () => openJournalModal();
  $("oddroot-journal-btn").onclick = () => openJournalModal();

  $("btn-open-grownups").onclick = () => openGrownUpsModal();

  const openWorldPicker = () => {
    renderWorldsGrid($("modal-worlds-grid"), true);
    openModal("modal-worlds");
  };
  $("hud-world-btn").onclick = openWorldPicker;
  $("oddroot-world-btn").onclick = openWorldPicker;
  if ($("bastion-world-btn")) $("bastion-world-btn").onclick = openWorldPicker;

  $("hud-snow-btn").onclick = () => {
    frostwakeWorld?.resetFreshSnow?.();
    frostwakeAudio.playClear(false);
    showToast("❄️ Fresh powder blanketed the valley!");
  };

  $("oddroot-siphon-btn").onclick = () => {
    const res = oddrootWorld?.triggerRealmQuickAction?.();
    const count = res?.purifiedSpores || 0;
    showToast(count > 0 ? `🌀 Siphon purified ${count} Gloom-Spores!` : "🌀 Siphon vortex pulsed across the grove!");
    updateAllShardAndZoneDisplays();
  };

  $("oddroot-mount-btn").onclick = () => {
    const prog = getActiveProgress(store);
    const cur = prog.games?.oddroot?.equippedMount || "bramble_boar";
    const next = cur === "bramble_boar" ? "starlight_glider" : "bramble_boar";
    prog.games.oddroot.equippedMount = next;
    activeBorrowedToy = null;
    oddrootAudio.playDetentClick?.(16);
    saveStore(store);
    oddrootWorld?.applyLoadout(prog, getCrossRealmUnlocks(prog), null);
    updateAllShardAndZoneDisplays();
  };

  if ($("ab-bullettime-btn")) {
    $("ab-bullettime-btn").onclick = () => {
      bastionAudio.unlock?.();
      const bt = bastionWorld?.toggleBulletTime?.();
      syncBastionBulletTimePill();
      if (bt) {
        showToast(
          bt.requested
            ? "⏳ 0.08× Crystal Bullet-Time Aura ON — contraptions slowed!"
            : "⏳ Citadel clock restored to 1.0× speed!"
        );
      }
    };
  }

  if ($("ab-rig-btn")) {
    $("ab-rig-btn").onclick = () => {
      const prog = getActiveProgress(store);
      prog.games = prog.games || {};
      prog.games.arc_bastion = prog.games.arc_bastion || {};
      const cur = prog.games.arc_bastion.equippedRig || "iron_ballista";
      const next = cur === "iron_ballista" ? "prism_rail_skiff" : "iron_ballista";
      prog.games.arc_bastion.equippedRig = next;
      activeBorrowedToy = null;
      bastionAudio.playDetentClick?.(16);
      saveStore(store);
      bastionWorld?.applyLoadout(prog, getCrossRealmUnlocks(prog), null);
      updateAllShardAndZoneDisplays();
    };
  }

  if ($("bastion-pulse-btn")) {
    $("bastion-pulse-btn").onclick = () => {
      bastionAudio.unlock?.();
      const prog = getActiveProgress(store);
      const hasPierce =
        prog.games?.arc_bastion?.equippedRig === "prism_rail_skiff" ||
        (prog.ownedUpgrades || []).includes("ab_prism_pierce") ||
        (prog.games?.arc_bastion?.bastionUpgrades || []).includes("ab_prism_pierce");
      if (hasPierce) {
        const res = bastionWorld?.triggerRealmQuickAction?.();
        const hits = res?.hitCount || 0;
        showToast(
          hits > 0
            ? `⚡ Piercing Prism Rail shattered ${hits} contraption${hits === 1 ? "" : "s"}!`
            : "⚡ Piercing Prism Rail swept the canyon!"
        );
      } else {
        bastionWorld?.resetFreshSnow?.();
        bastionAudio.playClear?.(false);
        showToast("⚙️ Fresh Golden Gear-Pods deployed across the ramparts!");
      }
      updateAllShardAndZoneDisplays();
    };
  }

  $("fw-flare-btn").onclick = () => triggerFriendlyFlare();
  $("or-flare-btn").onclick = () => triggerFriendlyFlare();
  if ($("ab-flare-btn")) $("ab-flare-btn").onclick = () => triggerFriendlyFlare();

  const toggleMute = () => {
    store.muted = !store.muted;
    frostwakeAudio.setMuted(store.muted);
    oddrootAudio.setMuted(store.muted);
    bastionAudio.setMuted(store.muted);
    saveStore(store, false);
    renderPortal();
  };
  $("portal-mute-btn").onclick = toggleMute;
  $("hud-mute-btn").onclick = toggleMute;
  $("oddroot-mute-btn").onclick = toggleMute;
  if ($("bastion-mute-btn")) $("bastion-mute-btn").onclick = toggleMute;

  const triggerAutopilot = () => {
    getActiveAudio().unlock?.();
    const world = getActiveWorld();
    if (!world) return;
    if (waveReplenishTimer) {
      clearTimeout(waveReplenishTimer);
      waveReplenishTimer = null;
      spawnActiveWave();
    }
    let target = world.engageAutopilotToNextGate();
    if (!target) {
      spawnActiveWave();
      target = world.engageAutopilotToNextGate();
    }
    if (target) showToast(`Cruising to ${target.encounter.title}!`);
  };
  $("btn-autopilot").onclick = triggerAutopilot;
  $("oddroot-autopilot-btn").onclick = triggerAutopilot;
  if ($("bastion-autopilot-btn")) $("bastion-autopilot-btn").onclick = triggerAutopilot;

  for (const boostId of ["btn-boost", "oddroot-boost-btn", "bastion-boost-btn"]) {
    const b = $(boostId);
    if (!b) continue;
    b.addEventListener("pointerdown", () => {
      getActiveAudio().unlock?.();
      holdBoostBtn = true;
      syncDriveVector();
    });
  }
  window.addEventListener("pointerup", () => {
    if (holdBoostBtn) {
      holdBoostBtn = false;
      syncDriveVector();
    }
  });

  $("btn-show-trick").onclick = () => {
    trickCardOpen = !trickCardOpen;
    getActiveAudio().playDetentClick?.(10);
    if (currentEncounter) renderTrickHoloProjector(currentEncounter);
  };

  $("enc-dial-input").addEventListener("input", (e) => {
    markFirstInput();
    const v = Number(e.target.value) || 0;
    if (currentEncounter) currentEncounter.currentDial = v;
    getActiveWorld()?.updateDialPreview?.(v);
  });

  $("enc-flip-sign").onclick = () => {
    markFirstInput();
    const inp = $("enc-dial-input");
    const flipped = -(Number(inp.value) || 0);
    inp.value = String(flipped);
    if (currentEncounter) currentEncounter.currentDial = flipped;
    getActiveAudio().playDetentClick?.(flipped);
    getActiveWorld()?.updateDialPreview?.(flipped);
  };

  $("enc-commit-btn").onclick = () => handleCommit();

  $("who-add-btn").onclick = async () => {
    const raw = ($("who-add-input").value || "").trim();
    if (!raw) return;
    const p = ensureProfile(store, { username: raw, name: raw });
    store.activeUsername = p.username;
    activeBorrowedToy = null;
    $("who-add-input").value = "";
    await pullPlayerCloud(store, p.username);
    saveStore(store);
    renderPortal();
    closeModal("modal-who");
  };

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.onclick = () => closeModal(btn.getAttribute("data-close"));
  });
  document.querySelectorAll(".modal-backdrop").forEach((bd) => {
    bd.addEventListener("click", (e) => {
      if (e.target === bd) bd.classList.remove("open");
    });
  });

  onSyncUpdate(() => renderPortal());

  await bootstrapYompleSession(store);
  renderPortal();
}

init();
