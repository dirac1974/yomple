/**
 * Bloom N — Universe Portal Controller & Frostwake 3D Gameplay Coordinator
 */

import {
  SUB_GAMES,
  RIG_CHASSIS,
  RIG_UPGRADES,
  MYSTERIES,
  WORLDS,
  createSessionState,
  pickNextEncounter,
  applyBeamAction,
  evaluateCommit,
  unlockMystery,
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
  onSyncUpdate,
} from "./core/sync.js";

import { FrostwakeAudio } from "./frostwake/audio.js";
import { FrostwakeWorld3D } from "./frostwake/frostwake-3d.js";

const store = loadStore();
const session = createSessionState();
const audio = new FrostwakeAudio();
audio.setMuted(store.muted);

let world3d = null;
let currentEncounter = null;
let encounterOpenedAt = 0;
let firstInputAt = 0;
let toastTimer = null;

// Keyboard state for desktop driving
const keys = { up: false, down: false, left: false, right: false, boost: false };
let joySteer = 0;
let joyThrottle = 0;
let holdBoostBtn = false;

function $(id) {
  return document.getElementById(id);
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

/* ==================== RENDER PORTAL HUB ==================== */
function renderPortal() {
  const prof = getActiveProfile(store);
  const prog = getActiveProgress(store);

  $("yomple-back-link").href = buildYompleHubReturnUrl(store);
  $("portal-who-btn").textContent = prof ? `${prof.avatar} ${prof.name}` : "❄️ Explorer";
  $("portal-shards").textContent = String(prog.fluxShards || 0);
  $("hud-shards").textContent = String(prog.fluxShards || 0);
  $("garage-shards").textContent = String(prog.fluxShards || 0);

  const muteIcon = store.muted ? "🔇" : "🔊";
  $("portal-mute-btn").textContent = muteIcon;
  $("hud-mute-btn").textContent = muteIcon;

  const activeWorldObj = WORLDS.find((w) => w.id === prog.activeWorld) || WORLDS[1];
  $("portal-active-world-label").textContent = `Active Frontier: ${activeWorldObj.id} · ${activeWorldObj.name}`;
  $("hud-world-btn").textContent = `${activeWorldObj.id} · ${activeWorldObj.name} ▾`;

  // Rig Quick Picker
  const rigRow = $("portal-rig-picker");
  rigRow.innerHTML = "";
  for (const ch of RIG_CHASSIS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `rig-chip${prog.equippedChassis === ch.id ? " selected" : ""}`;
    btn.textContent = `${ch.icon} ${ch.name}`;
    btn.onclick = () => {
      audio.playDetentClick(12);
      prog.equippedChassis = ch.id;
      saveStore(store);
      if (world3d) world3d.rebuildRig(prog.equippedChassis, prog.ownedUpgrades);
      renderPortal();
    };
    rigRow.appendChild(btn);
  }

  // Sister Sub-Games (#2 Oddroot, #3 Stardrift + Astrolabes, #4 Arc Bastion)
  const sisGrid = $("sister-realms-grid");
  sisGrid.innerHTML = "";
  for (const sg of SUB_GAMES.slice(1)) {
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

  // 3-Strand World Constellation
  renderWorldsGrid($("worlds-constellation"), false);

  // Household Northern Observatory Co-Op Wonder
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
    heroes.push({ display_name: prof.name, avatar: prof.avatar, hero_title: "Frostwake Pioneer", world_max: 2 });
  }
  for (const h of heroes) {
    const row = document.createElement("div");
    row.className = "hero-row";
    row.innerHTML = `
      <span>${h.avatar || "❄️"} ${h.display_name} · W${h.world_max || 1}</span>
      <span class="hero-title-tag">✦ ${h.hero_title}</span>
    `;
    heroList.appendChild(row);
  }

  // Monotonic Expedition Plaques
  const rec = prog.records || {};
  $("rec-overdrive").textContent = `${rec.bestOverdriveStreak || 0}×`;
  $("rec-ramp").textContent = `${rec.longestRampM || 0}m`;
  $("rec-subzero").textContent = rec.deepestSubZero ? `-${rec.deepestSubZero}` : "0";
  $("rec-foxes").textContent = String(rec.foxesWoken || 0);

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
  const prog = getActiveProgress(store);
  container.innerHTML = "";
  for (const w of WORLDS) {
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
    tile.innerHTML = `
      <div class="world-top">
        <span>${w.id} · ${w.gradeSpan}</span>
        <span>${open ? "OPEN" : "🔒"}</span>
      </div>
      <strong>${w.name}</strong>
      <div class="world-dots">${dotsHtml}</div>
    `;
    tile.onclick = () => {
      if (!open) {
        showToast("Clear 2 nodes in prior world (or open in For Grown-Ups)");
        return;
      }
      audio.playDetentClick(18);
      prog.activeWorld = w.id;
      saveStore(store);
      renderPortal();
      if (launchOnSelect) {
        closeModal("modal-worlds");
        spawnValleyWave();
        showToast(`Valley tuned to ${w.id} · ${w.name}`);
      }
    };
    container.appendChild(tile);
  }
}

/* ==================== LAUNCH & RUN 3D FROSTWAKE ==================== */
function launchFrostwake(overrideWorldId = null) {
  audio.unlock();
  const prog = getActiveProgress(store);
  if (overrideWorldId) {
    if (!prog.unlockedWorlds.includes(overrideWorldId)) prog.unlockedWorlds.push(overrideWorldId);
    prog.activeWorld = overrideWorldId;
    saveStore(store);
  }

  $("screen-portal").classList.remove("active");
  $("screen-frostwake").classList.add("active");

  if (!world3d) {
    world3d = new FrostwakeWorld3D({
      canvas: $("frostwake-canvas"),
      audio,
      onSnowCleared: (m2, bonusFlux) => {
        const p = getActiveProgress(store);
        p.snowClearedM2 = Math.round((p.snowClearedM2 || 0) + m2);
        p.fluxShards += bonusFlux;
        p.unsyncedFlux = (p.unsyncedFlux || 0) + bonusFlux;
        audio.playSnowShardTick();
        $("hud-shards").textContent = String(p.fluxShards);
        saveStore(store);
      },
      onApproachGate: (enc) => openEncounterDock(enc),
      onLeaveGate: () => closeEncounterDock(),
      onMysteryFound: (mysteryId) => {
        const p = getActiveProgress(store);
        if (unlockMystery(p, mysteryId)) {
          p.fluxShards += 25;
          audio.playClear(true);
          showToast("✦ Mystery Woken: The Moon in the Middle! +25💎", 3400);
          $("hud-shards").textContent = String(p.fluxShards);
          saveStore(store);
        }
      },
    });
  }

  world3d.rebuildRig(prog.equippedChassis, prog.ownedUpgrades);
  world3d.setObservatoryTier(store.householdWonder?.observatoryTier || 1);
  world3d.resize();
  spawnValleyWave();
  world3d.start();
  renderPortal();
  showToast("Carve snow or tap Cruise to Gate!");
}

function exitFrostwakeToHub() {
  closeEncounterDock();
  if (world3d) world3d.stop();
  $("screen-frostwake").classList.remove("active");
  $("screen-portal").classList.add("active");
  renderPortal();
}

function spawnValleyWave() {
  if (!world3d) return;
  const prog = getActiveProgress(store);
  const wave = [
    pickNextEncounter(prog, session, prog.activeWorld),
    pickNextEncounter(prog, session, prog.activeWorld),
    pickNextEncounter(prog, session, prog.activeWorld),
  ];
  world3d.rigState.inSurge = session.inSurge;
  $("surge-banner").classList.toggle("on", Boolean(session.inSurge));
  world3d.populateEncounters(wave);
}

/* ==================== SPATIAL ENCOUNTER DOCK ==================== */
function openEncounterDock(enc) {
  currentEncounter = enc;
  encounterOpenedAt = performance.now();
  firstInputAt = 0;

  $("screen-frostwake").classList.add("dock-open");
  $("encounter-dock").classList.add("open");
  paintEncounterDock();
}

function closeEncounterDock() {
  currentEncounter = null;
  $("screen-frostwake").classList.remove("dock-open");
  $("encounter-dock").classList.remove("open");
}

function markFirstInput() {
  if (!firstInputAt) firstInputAt = performance.now();
}

function paintEncounterDock() {
  if (!currentEncounter) return;
  const enc = currentEncounter;

  $("enc-prompt").textContent = enc.promptShort;
  $("enc-node-tag").textContent = enc.nodeId;
  $("enc-equation").textContent = enc.equationText;
  $("enc-target-label").textContent = `Dial ${enc.targetLabel || "n"}`;

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

  // Voluntary Twin-Beam Slicer chips
  const beamRow = $("enc-beams");
  beamRow.innerHTML = "";
  for (const act of enc.beamActions || []) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "beam-chip";
    b.textContent = `⚡ ${act.label}`;
    b.onclick = () => {
      markFirstInput();
      const prog = getActiveProgress(store);
      const res = applyBeamAction(currentEncounter, act.id, prog);
      currentEncounter = res.encounter;
      if (res.kind === "magnetic_repel") {
        audio.playMagneticRepel();
        if (world3d) world3d.playTwinBeamVisual(true);
        showToast(res.cue);
      } else {
        audio.playTwinBeam();
        if (world3d) {
          world3d.playTwinBeamVisual(false);
          world3d.refreshActiveEncounterVisual(currentEncounter);
        }
        if (res.cue) showToast(res.cue);
      }
      paintEncounterDock();
      saveStore(store);
    };
    beamRow.appendChild(b);
  }

  // Dial input & Rotary Detents
  const dialInput = $("enc-dial-input");
  if (document.activeElement !== dialInput) {
    dialInput.value = String(enc.currentDial ?? enc.startDial ?? 0);
  }
  if (world3d) world3d.updateDialPreview(Number(dialInput.value));

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
      audio.playDetentClick(nextVal);
      if (world3d) world3d.updateDialPreview(nextVal);
    };
    detGrid.appendChild(btn);
  }

  const commitVerb =
    enc.encounterType === "holo_ramp" || enc.encounterType === "rainbow_arch"
      ? "🚀 Launch Across Curve"
      : enc.encounterType === "astrolabe_shrine"
      ? "✨ Lock Sky-Astrolabe"
      : enc.encounterType === "harpoon_cliff"
      ? "🪝 Fire Cliff Harpoon"
      : "⚡ Ram Cryo-Gate";
  $("enc-commit-btn").textContent = commitVerb;
}

function handleCommit() {
  if (!currentEncounter) return;
  const now = performance.now();
  const planMs = Math.max(250, (firstInputAt || now) - encounterOpenedAt);
  const execMs = firstInputAt ? Math.max(150, now - firstInputAt) : 350;
  const val = Number($("enc-dial-input").value);

  const prog = getActiveProgress(store);
  const res = evaluateCommit({
    encounter: currentEncounter,
    committedValue: val,
    planMs,
    execMs,
    progress: prog,
    session,
  });

  $("hud-shards").textContent = String(prog.fluxShards);
  $("hud-streak").textContent = String(session.overdriveStreak);
  $("surge-banner").classList.toggle("on", Boolean(session.inSurge));
  if (world3d) world3d.rigState.inSurge = session.inSurge;

  if (world3d) world3d.playCommitVisual(res);

  if (res.outcome === "clear") {
    audio.playClear(res.overdrive);
    showToast(`${res.cue} +${res.shardsEarned}💎`);
    if (session.overdriveStreak >= 3 && world3d) {
      world3d.triggerSkyWhale();
    }
    finishGateAndReplenishIfDone(res);
  } else if (res.outcome === "warm_reveal") {
    audio.playFoxReveal();
    showToast(`${res.cue} · +${res.shardsEarned}💎`, 3200);
    finishGateAndReplenishIfDone(res);
  } else {
    audio.playCaliperNudge();
    showToast(res.cue);
  }

  saveStore(store);
}

function finishGateAndReplenishIfDone(res) {
  closeEncounterDock();
  if (res.calibrationFinished) {
    const prog = getActiveProgress(store);
    showToast(`Frontier calibrated → ${prog.activeWorld}!`, 3200);
    setTimeout(() => spawnValleyWave(), 950);
    return;
  }
  if (res.surgeTriggered) {
    showToast("✨ Golden Thaw Overdrive Wave! ✨", 2800);
    setTimeout(() => spawnValleyWave(), 900);
    return;
  }
  if (world3d && world3d.gateSlots.every((s) => s.cleared)) {
    setTimeout(() => {
      spawnValleyWave();
      showToast("3 fresh beacons lit across the valley!");
    }, 1050);
  }
}

/* ==================== MODALS ==================== */
function openModal(id) {
  $(id).classList.add("open");
}

function closeModal(id) {
  $(id).classList.remove("open");
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
      saveStore(store, false);
      if (window.YompleStay) window.YompleStay.stamp(p.username, store.familyCode || "");
      await pullPlayerCloud(store, p.username);
      renderPortal();
      closeModal("modal-who");
    };
    box.appendChild(btn);
  }
  openModal("modal-who");
}

function openGarageModal() {
  const prog = getActiveProgress(store);
  $("garage-shards").textContent = String(prog.fluxShards || 0);

  const chRow = $("garage-chassis-row");
  chRow.innerHTML = "";
  for (const ch of RIG_CHASSIS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `rig-chip${prog.equippedChassis === ch.id ? " selected" : ""}`;
    b.textContent = `${ch.icon} ${ch.name} (${ch.tag})`;
    b.onclick = () => {
      prog.equippedChassis = ch.id;
      audio.playDetentClick(15);
      saveStore(store);
      if (world3d) world3d.rebuildRig(prog.equippedChassis, prog.ownedUpgrades);
      openGarageModal();
      renderPortal();
    };
    chRow.appendChild(b);
  }

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
      if (owned || prog.fluxShards < upg.cost) return;
      prog.fluxShards -= upg.cost;
      prog.ownedUpgrades.push(upg.id);
      audio.playClear(true);
      saveStore(store);
      if (world3d) world3d.rebuildRig(prog.equippedChassis, prog.ownedUpgrades);
      openGarageModal();
      renderPortal();
    };
    card.appendChild(buyBtn);
    grid.appendChild(card);
  }

  openModal("modal-garage");
}

function openSisterRealmModal(sg) {
  $("realm-modal-title").textContent = sg.title;
  const isAstrolabe = sg.id === "stardrift";
  $("realm-modal-body").innerHTML = `
    <img src="${sg.banner}" alt="${sg.title}" style="width:100%;border-radius:18px;margin-bottom:12px" />
    <p style="margin:0 0 10px;color:var(--ink-soft);font-weight:700;line-height:1.45">
      ${sg.blurb} Every node mastered in <strong>Frostwake</strong> shares one unified <code>Bloomⁿ</code> constellation,
      so your Flux Shards, Hero Titles, and unlocked worlds carry straight across realms.
    </p>
    ${
      isAstrolabe
        ? `<button type="button" id="btn-try-astrolabe-now" class="play-btn-giant" style="width:100%;margin-top:6px">
             ✨ Play 3D Sky-Astrolabe Shrines in W5 Now
           </button>`
        : `<div style="padding:10px 14px;border-radius:14px;background:rgba(255,255,255,0.06);font-weight:800;font-size:0.88rem;color:var(--amber)">
             Scheduled in Bloomⁿ Wave ${sg.order} — build your mastery constellation in Frostwake now!
           </div>`
    }
  `;
  openModal("modal-realm");
  const tryBtn = $("btn-try-astrolabe-now");
  if (tryBtn) {
    tryBtn.onclick = () => {
      closeModal("modal-realm");
      launchFrostwake("W5");
    };
  }
}

function openGrownUpsModal() {
  const prof = getActiveProfile(store);
  const prog = getActiveProgress(store);
  const stageNames = ["Exploring", "Structuring", "Consolidating", "Mastered"];

  const rowsHtml = WORLDS.map((w) => {
    const states = w.nodes.map((n) => prog.nodes?.[n.id] || { stage: 0, attempts: 0, wins: 0, overdrives: 0, avgPlanMs: 0 });
    const mastered = states.filter((s) => s.stage >= 3).length;
    const solid = states.filter((s) => s.stage >= 2).length;
    const avgStage = Math.round(states.reduce((a, b) => a + (b.stage || 0), 0) / states.length);
    return `
      <tr>
        <td><strong>${w.id}</strong> · ${w.name}<br><small style="color:var(--ink-muted)">${w.gradeSpan}</small></td>
        <td>${stageNames[avgStage]}</td>
        <td>${solid}/${w.nodes.length} solid (${mastered}★)</td>
      </tr>
    `;
  }).join("");

  const allNodes = Object.values(prog.nodes || {});
  const seenNodes = allNodes.filter((n) => n.attempts > 0);
  const avgPlan = seenNodes.length
    ? (seenNodes.reduce((a, b) => a + (b.avgPlanMs || 0), 0) / seenNodes.length / 1000).toFixed(1)
    : "—";
  const totalWins = allNodes.reduce((a, b) => a + (b.wins || 0), 0);
  const totalOverdrives = allNodes.reduce((a, b) => a + (b.overdrives || 0), 0);
  const overdrivePct = totalWins ? Math.round((totalOverdrives / totalWins) * 100) : 0;

  const tags = Object.entries(prog.misconceptionTags || {});
  const tagsText = tags.length ? tags.map(([k, v]) => `${k.replace(/_/g, " ")} (${v})`).join(", ") : "None flagged";
  const shelvedText = session.shelvedLog.length
    ? session.shelvedLog.map((s) => `${s.nodeId}: ${s.eq}`).join(" · ")
    : "None this session";

  $("grownups-content").innerHTML = `
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px;border-radius:16px;background:rgba(255,255,255,0.06);margin-bottom:12px">
      <div><strong>Player:</strong> ${prof ? `${prof.avatar} ${prof.name}` : "—"}</div>
      <div><strong>Household:</strong> ${store.familyCode || "Local (link via Yomple Hub)"}</div>
      <div><strong>Sync:</strong> ${store.lastSyncStatus}</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
      <div class="rec-box"><span>Avg Plan Time</span><strong>${avgPlan}s</strong></div>
      <div class="rec-box"><span>1-Shot Overdrive</span><strong>${overdrivePct}%</strong></div>
      <div class="rec-box"><span>Snow Cleared</span><strong>${prog.snowClearedM2 || 0}m²</strong></div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;border-radius:16px;background:hsla(172,78%,52%,0.12);margin-bottom:12px">
      <div>
        <strong>Open All Worlds Sandbox (W0–W7)</strong>
        <div style="font-size:0.8rem;color:var(--ink-soft)">Jump straight into Algebra 1 Ramps, W5 Astrolabes, or W6–W7 Algebra 2</div>
      </div>
      <button type="button" id="btn-toggle-sandbox" class="pill-btn">
        ${prog.sandboxAllUnlocked ? "✓ All Open" : "Unlock All"}
      </button>
    </div>

    <table class="parent-table">
      <thead><tr><th>World</th><th>Stage</th><th>Nodes</th></tr></thead>
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

/* ==================== INPUT WIRING (JOYSTICK + KEYBOARD) ==================== */
function syncDriveVector() {
  if (!world3d) return;
  let kSteer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let kThrot = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  const steer = Math.abs(joySteer) > 0.04 ? joySteer : kSteer;
  const throttle = Math.abs(joyThrottle) > 0.04 ? joyThrottle : kThrot;
  world3d.setDriveInputs(steer, throttle, keys.boost || holdBoostBtn);
}

function setupJoystickAndKeys() {
  const zone = $("joy-zone");
  const knob = $("joy-knob");
  let activePointer = null;

  const updateKnob = (clientX, clientY) => {
    const rect = zone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
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
    audio.unlock();
    activePointer = e.pointerId;
    zone.setPointerCapture(e.pointerId);
    updateKnob(e.clientX, e.clientY);
  });
  zone.addEventListener("pointermove", (e) => {
    if (e.pointerId !== activePointer) return;
    updateKnob(e.clientX, e.clientY);
  });
  zone.addEventListener("pointerup", resetKnob);
  zone.addEventListener("pointercancel", resetKnob);

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
  $("hud-exit-btn").onclick = () => exitFrostwakeToHub();
  $("portal-who-btn").onclick = () => openWhoModal();
  $("portal-garage-btn").onclick = () => openGarageModal();
  $("hud-garage-btn").onclick = () => openGarageModal();
  $("btn-open-grownups").onclick = () => openGrownUpsModal();

  $("hud-world-btn").onclick = () => {
    renderWorldsGrid($("modal-worlds-grid"), true);
    openModal("modal-worlds");
  };

  $("hud-snow-btn").onclick = () => {
    if (world3d) world3d.resetFreshSnow();
    audio.playClear(false);
    showToast("❄️ Fresh powder blanketed the valley!");
  };

  const toggleMute = () => {
    store.muted = !store.muted;
    audio.setMuted(store.muted);
    saveStore(store, false);
    renderPortal();
  };
  $("portal-mute-btn").onclick = toggleMute;
  $("hud-mute-btn").onclick = toggleMute;

  $("btn-autopilot").onclick = () => {
    audio.unlock();
    if (!world3d) return;
    const target = world3d.engageAutopilotToNextGate();
    if (target) showToast(`Cruising to ${target.encounter.title}!`);
    else spawnValleyWave();
  };

  const boostBtn = $("btn-boost");
  boostBtn.addEventListener("pointerdown", () => {
    audio.unlock();
    holdBoostBtn = true;
    syncDriveVector();
  });
  window.addEventListener("pointerup", () => {
    if (holdBoostBtn) {
      holdBoostBtn = false;
      syncDriveVector();
    }
  });

  $("enc-dial-input").addEventListener("input", (e) => {
    markFirstInput();
    const v = Number(e.target.value) || 0;
    if (currentEncounter) currentEncounter.currentDial = v;
    if (world3d) world3d.updateDialPreview(v);
  });

  $("enc-flip-sign").onclick = () => {
    markFirstInput();
    const inp = $("enc-dial-input");
    const flipped = -(Number(inp.value) || 0);
    inp.value = String(flipped);
    if (currentEncounter) currentEncounter.currentDial = flipped;
    audio.playDetentClick(flipped);
    if (world3d) world3d.updateDialPreview(flipped);
  };

  $("enc-commit-btn").onclick = () => handleCommit();

  $("who-add-btn").onclick = async () => {
    const raw = ($("who-add-input").value || "").trim();
    if (!raw) return;
    const p = ensureProfile(store, { username: raw, name: raw });
    store.activeUsername = p.username;
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
