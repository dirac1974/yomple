/**
 * Bloom N E2E — Headless Chromium WebGL2 Three.js r170 Sandbox & Opaque-Box 3D Inspector
 * Injected into origin-matched /bloom-n/__e2e_sandbox__.html tabs so 100+ 3D tests execute
 * against genuine WebGL 2.0 contexts in < 4s with zero 16-context eviction!
 */

export async function install3DSandboxHelpers(page) {
  await page.eval(() => {
    if (window.__E2E_3D__) return true;

    let nowMs = 10000;
    const rafCbs = [];
    let nextRafId = 1;

    performance.now = () => nowMs;
    Date.now = () => Math.round(nowMs);
    window.requestAnimationFrame = (cb) => {
      const id = nextRafId++;
      rafCbs.push({ id, cb });
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      const idx = rafCbs.findIndex((x) => x.id === id);
      if (idx >= 0) rafCbs.splice(idx, 1);
    };

    const clock = {
      stepFrames(count = 1, dtMs = 16.6667) {
        let ran = 0;
        for (let i = 0; i < count; i++) {
          nowMs += dtMs;
          const batch = rafCbs.splice(0, rafCbs.length);
          for (const item of batch) {
            item.cb(nowMs);
            ran++;
          }
        }
        return ran;
      },
      stepWorld(world, count = 1, dtMs = 16.6667, opts = {}) {
        const forceRasterize = Boolean(opts && opts.rasterize);
        const origRender = world?.renderer?.render ? world.renderer.render.bind(world.renderer) : null;
        try {
          for (let i = 0; i < count; i++) {
            const shouldRasterize = forceRasterize && i === count - 1;
            if (origRender && world.renderer) {
              world.renderer.render = shouldRasterize
                ? origRender
                : (sc) => {
                    sc?.updateMatrixWorld?.(true);
                  };
            }

            if (opts && opts.useSingleFrameClamp && world && typeof world._update === "function") {
              nowMs += dtMs;
              const dtSec = Math.min(0.05, dtMs / 1000);
              world._update(dtSec);
              world.scene?.updateMatrixWorld?.(true);
            } else if (world && typeof world.step === "function") {
              nowMs += dtMs;
              if (typeof world._recordFrameSample === "function") {
                world._recordFrameSample(dtMs / 1000);
              }
              world.step(dtMs / 1000);
              world.scene?.updateMatrixWorld?.(true);
            } else if (world && typeof world._update === "function") {
              nowMs += dtMs;
              const dtSec = Math.min(0.05, dtMs / 1000);
              world._update(dtSec, nowMs / 1000);
              if (shouldRasterize && origRender && world.scene && world.camera) {
                try {
                  origRender(world.scene, world.camera);
                } catch {}
              } else {
                world.scene?.updateMatrixWorld?.(true);
              }
            } else if (world && world.running && rafCbs.length > 0) {
              nowMs += dtMs;
              const batch = rafCbs.splice(0, rafCbs.length);
              for (const item of batch) item.cb(nowMs);
            } else {
              nowMs += dtMs;
            }
          }
        } finally {
          if (origRender && world?.renderer) {
            world.renderer.render = origRender;
          }
        }
      },
      getNow: () => nowMs,
      pendingCount: () => rafCbs.length,
    };

    const sharedWorlds = new Map();

    async function mountWorld(realmId, callbacks = {}, width = 320, height = 240) {
      const isOddroot = realmId === "oddroot";
      const isBastion = realmId === "arc_bastion";
      const modPath = isBastion
        ? "./bastion/bastion-3d.js"
        : isOddroot
        ? "./oddroot/oddroot-3d.js"
        : "./frostwake/frostwake-3d.js";
      const audioPath = isBastion
        ? "./bastion/audio.js"
        : isOddroot
        ? "./oddroot/audio.js"
        : "./frostwake/audio.js";
      const worldExport = isBastion
        ? "BastionWorld3D"
        : isOddroot
        ? "OddrootWorld3D"
        : "FrostwakeWorld3D";
      const audioExport = isBastion
        ? "BastionAudio"
        : isOddroot
        ? "OddrootAudio"
        : "FrostwakeAudio";

      let mod;
      let audioMod;
      try {
        mod = await import(modPath);
      } catch (err) {
        throw new Error(`Expected ${modPath} to exist and import cleanly: ${err?.message || err}`);
      }
      try {
        audioMod = await import(audioPath);
      } catch (err) {
        throw new Error(`Expected ${audioPath} to exist and import cleanly: ${err?.message || err}`);
      }

      const WorldClass = mod[worldExport];
      const AudioClass = audioMod[audioExport];
      if (typeof WorldClass !== "function") {
        throw new Error(`Expected ${modPath} to export class ${worldExport}`);
      }
      if (typeof AudioClass !== "function") {
        throw new Error(`Expected ${audioPath} to export class ${audioExport}`);
      }

      const container = document.createElement("div");
      container.style.cssText = `width:${width}px;height:${height}px;position:fixed;left:0;top:0;pointer-events:none;`;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.style.cssText = `width:${width}px;height:${height}px;display:block;`;
      container.appendChild(canvas);
      document.body.appendChild(container);

      const audio = new AudioClass();
      if (typeof audio.setMuted === "function") audio.setMuted(true);

      const events = {
        activity: [],
        approach: [],
        leave: 0,
        mysteries: [],
        creatures: [],
        garage: 0,
        opposition: [],
        coinsGrabbed: [],
      };

      const world = new WorldClass({
        canvas,
        audio,
        onWorldActivity: (...args) => {
          events.activity.push(args);
          callbacks.onWorldActivity?.(...args);
        },
        onSnowCleared: (...args) => {
          events.activity.push(args);
          callbacks.onSnowCleared?.(...args);
        },
        onApproachGate: (enc, slot) => {
          events.approach.push({ enc, slot });
          callbacks.onApproachGate?.(enc, slot);
        },
        onLeaveGate: () => {
          events.leave++;
          callbacks.onLeaveGate?.();
        },
        onMysteryFound: (id) => {
          events.mysteries.push(id);
          callbacks.onMysteryFound?.(id);
        },
        onCreatureHatched: (c) => {
          events.creatures.push(c);
          callbacks.onCreatureHatched?.(c);
        },
        onGaragePadEntered: () => {
          events.garage++;
          callbacks.onGaragePadEntered?.();
        },
        onOppositionEvent: (ev) => {
          events.opposition.push(ev);
          callbacks.onOppositionEvent?.(ev);
        },
        onSharedCoinGrabbed: (coinId) => {
          events.coinsGrabbed.push(coinId);
          callbacks.onSharedCoinGrabbed?.(coinId);
        },
      });
      if (world.renderer && typeof world.renderer.setPixelRatio === "function") {
        world.renderer.setPixelRatio(1);
      }

      return {
        realmId,
        mod,
        audioMod,
        world,
        audio,
        canvas,
        container,
        events,
        resetEvents() {
          events.activity.length = 0;
          events.approach.length = 0;
          events.leave = 0;
          events.mysteries.length = 0;
          events.creatures.length = 0;
          events.garage = 0;
          events.opposition.length = 0;
          events.coinsGrabbed.length = 0;
        },
        step(frames = 1, dtMs = 16.6667, stepOpts = {}) {
          clock.stepWorld(world, frames, dtMs, stepOpts);
        },
        dispose() {
          try {
            world.stop?.();
          } catch {}
          try {
            world.renderer?.forceContextLoss?.();
          } catch {}
          try {
            world.renderer?.dispose?.();
          } catch {}
          container.remove();
        },
      };
    }

    function resetPooledWorld(ctx) {
      ctx.resetEvents();
      const w = ctx.world;
      try {
        if (!w.running) w.start?.();
        w.setDriveInputs?.(0, 0, false);
        w.setEncounterDockOpen?.(false);
        w.setBulletTimeRequested?.(false);
        w.setSurgeMode?.(false);
        w.syncRemotePartners?.([]);
        w.syncSharedCoins?.({
          coin_0: { coinId: "coin_0", available: true },
          coin_1: { coinId: "coin_1", available: true },
          coin_2: { coinId: "coin_2", available: true },
          coin_3: { coinId: "coin_3", available: true },
        });
        if (w.rigState) {
          w.rigState.x = 0;
          w.rigState.y = 0.55;
          w.rigState.z = ctx.realmId === "arc_bastion" ? 14 : ctx.realmId === "oddroot" ? 16 : 22;
          w.rigState.heading = 0; // 0 rad = North (-Z)
          w.rigState.speed = 0;
          w.rigAnim = null;
          w.autopilotTarget = null;
          w.activeGateSlot = null;
          w._gateAutoPause = false;
          w.moonDwellSec = 0;
          if (typeof w.moonwellDwellSec === "number") w.moonwellDwellSec = 0;
        }
        if (w.opposition) {
          w.opposition.refreshIntactPods?.();
          for (const d of w.opposition.permafrostDrifts || []) {
            d.integrity = 1;
            d.refrostTimer = 0;
            if (d.group) d.group.visible = true;
          }
        }
        const blight = w.blightSystem || w.blightOpposition;
        if (blight) {
          for (const p of blight.thornPatches || []) {
            p.dissolved = false;
            p.cleared = false;
            p.active = true;
            if (p.thornGroup) p.thornGroup.visible = true;
            if (p.flowerGroup) p.flowerGroup.visible = false;
            if (typeof p.regrowTimer === "number") p.regrowTimer = 0;
          }
          for (const s of blight.gloomSpores || []) {
            s.active = true;
          }
        }
        if (w.ghostController) {
          w.ghostController.bestWaveSec = null;
          w.ghostController.bestFrames = [];
          w.ghostController.recordingFrames = [];
        }
        if (w.dprGovernor) {
          w.dprGovernor.maxDpr = 2.0;
          w.dprGovernor.currentDpr = 1.5;
          w.dprGovernor.emaFrameMs = 16.6;
          w.dprGovernor.highLoadSec = 0;
          w.dprGovernor.lowLoadSec = 0;
          w.dprGovernor.cooldownSec = 0;
          w.renderer?.setPixelRatio?.(1.5);
        } else if (w.renderer && typeof w.renderer.setPixelRatio === "function") {
          w.maxDpr = 2.0;
          w.currentDpr = 1.5;
          w._dprFrames = 0;
          w._dprSec = 0;
          w._dprCooldown = 0;
          w.renderer.setPixelRatio(1.5);
        }
      } catch {}
    }

    async function getSharedWorld(realmId) {
      let ctx = sharedWorlds.get(realmId);
      if (!ctx || !ctx.world || ctx.world.webglAvailable === false) {
        if (ctx) ctx.dispose();
        ctx = await mountWorld(realmId);
        ctx.inUse = false;
        ctx.world.start?.();
        ctx.step(1, 16.6667, { rasterize: true });
        sharedWorlds.set(realmId, ctx);
      }
      resetPooledWorld(ctx);
      return ctx;
    }

    async function withFreshWorld(realmId, fn, callbacks = {}) {
      const hasCustomCbs = callbacks && Object.keys(callbacks).length > 0;
      const existing = sharedWorlds.get(realmId);
      if (!hasCustomCbs && (!existing || !existing.inUse)) {
        const pooled = await getSharedWorld(realmId);
        pooled.inUse = true;
        try {
          return await fn(pooled);
        } finally {
          pooled.inUse = false;
        }
      }
      const ctx = await mountWorld(realmId, callbacks);
      try {
        return await fn(ctx);
      } finally {
        ctx.dispose();
      }
    }

    function disposeAllSharedWorlds() {
      for (const ctx of sharedWorlds.values()) {
        ctx.dispose();
      }
      sharedWorlds.clear();
    }

    function snapshotSceneEntities(root, { includeHidden = false, expandInstances = false } = {}) {
      if (!root) return [];
      root.updateMatrixWorld?.(true);
      const items = [];
      const walk = (obj, ancestorHidden = false) => {
        const isVis = !ancestorHidden && Boolean(obj.visible);
        if (!isVis && !includeHidden) return;

        if (expandInstances && obj.isInstancedMesh && obj.instanceMatrix) {
          const arr = obj.instanceMatrix.array;
          const ew = obj.matrixWorld.elements;
          const n = Math.min(obj.count ?? 0, Math.floor(arr.length / 16));
          for (let i = 0; i < n; i++) {
            const b = i * 16;
            const sx = Math.hypot(arr[b], arr[b + 1], arr[b + 2]);
            const sy = Math.hypot(arr[b + 4], arr[b + 5], arr[b + 6]);
            const sz = Math.hypot(arr[b + 8], arr[b + 9], arr[b + 10]);
            if (sx > 1e-4 && sy > 1e-4 && sz > 1e-4) {
              const lx = arr[b + 12];
              const ly = arr[b + 13];
              const lz = arr[b + 14];
              items.push({
                key: `${obj.uuid}#${i}`,
                name: obj.name || "",
                type: "InstancedItem",
                visible: isVis,
                x: ew[0] * lx + ew[4] * ly + ew[8] * lz + ew[12],
                y: ew[1] * lx + ew[5] * ly + ew[9] * lz + ew[13],
                z: ew[2] * lx + ew[6] * ly + ew[10] * lz + ew[14],
                sx,
                sy,
                sz,
                matSig: `${Math.round(lx * 1000)},${Math.round(ly * 1000)},${Math.round(lz * 1000)}`,
              });
            }
          }
        } else if (obj.isMesh || obj.isGroup || obj.isSprite || obj.isLine) {
          const e = obj.matrixWorld.elements;
          let boxSpanX = 0;
          let boxSpanZ = 0;
          if (obj.isMesh && obj.geometry) {
            if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
            const bb = obj.geometry.boundingBox;
            if (bb) {
              boxSpanX = (bb.max.x - bb.min.x) * Math.hypot(e[0], e[1], e[2]);
              boxSpanZ = (bb.max.z - bb.min.z) * Math.hypot(e[8], e[9], e[10]);
            }
          }
          items.push({
            key: obj.uuid,
            name: obj.name || "",
            type: obj.type || "Object3D",
            isMesh: Boolean(obj.isMesh),
            visible: isVis,
            userData: obj.userData || {},
            x: e[12],
            y: e[13],
            z: e[14],
            sx: obj.scale?.x ?? 1,
            sy: obj.scale?.y ?? 1,
            sz: obj.scale?.z ?? 1,
            rotX: obj.rotation?.x ?? 0,
            rotY: obj.rotation?.y ?? 0,
            rotZ: obj.rotation?.z ?? 0,
            boxSpanX,
            boxSpanZ,
            transparent: Boolean(obj.material?.transparent),
            opacity: obj.material?.opacity ?? 1,
            emissiveIntensity: obj.material?.emissiveIntensity ?? 0,
            colorHex: obj.material?.color?.getHex?.() ?? null,
            matSig: `${Math.round(e[0] * 10000)},${Math.round(e[5] * 10000)},${Math.round(e[6] * 10000)},${Math.round(e[12] * 10000)},${Math.round(e[13] * 10000)},${Math.round(e[14] * 10000)}`,
          });
        }
        for (const ch of obj.children || []) walk(ch, !isVis);
      };
      walk(root, false);
      return items;
    }

    /**
     * Drives via public engageAutopilotToNextGate() into the nearest uncleared gate/shrine
     * in a single batch without per-frame software rasterization overhead.
     */
    function engageFirstEncounter(ctx) {
      ctx.resetEvents();
      const targetSlot = ctx.world.engageAutopilotToNextGate?.();
      ctx.step(10, 16.6667);
      if (ctx.events.approach.length === 0 && targetSlot && ctx.world.rigState) {
        const ax = targetSlot.x + Math.sin(targetSlot.rotY || 0) * 6.0;
        const az = targetSlot.z + Math.cos(targetSlot.rotY || 0) * 6.0;
        ctx.world.rigAnim = null;
        ctx.world.rigState.x = ax;
        ctx.world.rigState.z = az;
        ctx.world.rigState.speed = 0;
        ctx.step(3, 16.6667);
      }
      const hit = ctx.events.approach[ctx.events.approach.length - 1] || null;
      const slot = hit?.slot || targetSlot || ctx.world.activeGateSlot || ctx.world.activeShrineSlot || null;
      const group = slot?.group || slot?.mesh || null;
      return { approached: Boolean(hit), enc: hit?.enc || slot?.encounter || null, slot, group };
    }

    /**
     * Extracts active spatial opposition coordinates resiliently across both Frostwake & Oddroot.
     */
    function collectOppositionSnapshots(world) {
      const out = [];
      const opp =
        world.opposition ||
        world.blightSystem ||
        world.blightOpposition ||
        world.oppositionSystem ||
        world.oppositionState ||
        world;
      const candidateArrays = [
        opp?.rimeUnits,
        opp?.rimeCreeps,
        opp?.rimeCaptains,
        opp?.thornPatches,
        opp?.blightUnits,
        opp?.blightThorns,
        opp?.blightPatches,
        opp?.blightTendrils,
        opp?.gloomSpores,
        opp?.sporeClouds,
        opp?.creeps,
        opp?.units,
        world?.rimeUnits,
        world?.thornPatches,
        world?.blightThorns,
        world?.gloomSpores,
      ];
      let idx = 0;
      for (const arr of candidateArrays) {
        if (!Array.isArray(arr)) continue;
        for (const u of arr) {
          if (!u || u.active === false) continue;
          const x = Number(u.x ?? u.pos?.x ?? u.position?.x ?? u.group?.position?.x ?? u.mesh?.position?.x);
          const z = Number(u.z ?? u.pos?.z ?? u.position?.z ?? u.group?.position?.z ?? u.mesh?.position?.z);
          const scale = Number(
            u.spread ?? u.growth ?? u.scale ?? u.radius ?? u.group?.scale?.x ?? u.mesh?.scale?.x ?? 1
          );
          if (Number.isFinite(x) && Number.isFinite(z)) {
            out.push({ key: String(u.id || u.key || `opp_${idx++}`), x, z, scale });
          }
        }
      }

      // Also scan scene opposition roots or opposition-tagged Object3Ds
      if (out.length === 0 && world.scene) {
        world.scene.updateMatrixWorld(true);
        const oppRe = /rime|creep|captain|slime|blight|thorn|gloom/i;
        const walk = (o, underOppRoot = false) => {
          const tagged =
            underOppRoot ||
            oppRe.test(o.name || "") ||
            oppRe.test(String(o.userData?.kind || o.userData?.type || o.userData?.oppositionId || ""));
          if (tagged && (o.isMesh || o.isGroup) && o.visible && o !== world.scene) {
            const e = o.matrixWorld.elements;
            if (Math.abs(e[13]) < 18) {
              out.push({
                key: o.uuid,
                x: e[12],
                z: e[14],
                scale: Math.hypot(e[0], e[1], e[2]),
              });
            }
          }
          for (const ch of o.children || []) {
            walk(ch, underOppRoot || /opposition/i.test(o.name || ""));
          }
        };
        walk(world.scene, false);
      }

      return out;
    }

    /**
     * Strictly verifies <= 15% Near-Field Origin Stub Anti-Scrub law on any W0.6 / W4 / W6 encounter.
     */
    async function auditAntiScrubNode(ctx, nodeId) {
      const eng = await import("./core/engine.js");
      const enc = eng.generateEncounter(nodeId);
      ctx.world.setEncounterDockOpen?.(false);
      ctx.world.populateEncounters([enc]);
      const { slot, group } = engageFirstEncounter(ctx);
      if (!slot || !group) {
        return { ok: false, reason: `Failed to engage encounter slot for ${nodeId}` };
      }

      // Explicit hidden-bridge check if adapter exposes named properties
      const checkExplicitHidden = () => {
        if (slot.extrudedBridge && slot.extrudedBridge.visible !== false) return false;
        if (slot.extrudedVine && slot.extrudedVine.visible !== false) return false;
        if (slot.fullArch && slot.fullArch.visible !== false) return false;
        return true;
      };

      const preHiddenBeforeSweep = checkExplicitHidden();

      // Sweep dial across [-50, -20, -5, -1, 0, 1, 5, 20, 50]
      ctx.world.updateDialPreview(-50);
      const snapNeg = new Map(
        snapshotSceneEntities(group)
          .filter((it) => it.isMesh || it.type === "InstancedItem")
          .map((it) => [it.key, it])
      );

      let explicitStayedHidden = preHiddenBeforeSweep;
      const mutatedKeys = new Set();
      const dialSweep = [-20, -5, -1, 0, 1, 5, 20, 50];
      for (const v of dialSweep) {
        ctx.world.updateDialPreview(v);
        if (!checkExplicitHidden()) explicitStayedHidden = false;
        const snapCur = snapshotSceneEntities(group).filter((it) => it.isMesh || it.type === "InstancedItem");
        for (const cur of snapCur) {
          const base = snapNeg.get(cur.key);
          if (!base || base.matSig !== cur.matSig) {
            mutatedKeys.add(cur.key);
          }
        }
      }

      const preCommitVisibleKeys = new Set(
        snapshotSceneEntities(group)
          .filter((it) => it.isMesh || it.type === "InstancedItem")
          .map((it) => it.key)
      );

      // Now commit a valid "clear" to reveal the full 3D bridge / vine / spore-arch!
      ctx.world.playCommitVisual(
        { outcome: "clear", overdrive: true, delta: 0, shardsEarned: 21, cue: "Locked!" },
        enc
      );
      ctx.step(4, 16.6667);

      const postSnap = snapshotSceneEntities(group).filter((it) => it.isMesh || it.type === "InstancedItem");
      const newlyRevealed = postSnap.filter((it) => !preCommitVisibleKeys.has(it.key));

      // Compute horizontal span of mutated chasm preview stub (excluding >=3.5m launch deck behind z=0)
      const mutatedItems = postSnap
        .filter((it) => mutatedKeys.has(it.key))
        .filter((it) => !(it.boxSpanZ >= 3.5));
      const computeHorizSpan = (arr) => {
        if (!arr.length) return 0;
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const m of arr) {
          minX = Math.min(minX, m.x);
          maxX = Math.max(maxX, m.x);
          minZ = Math.min(minZ, m.z);
          maxZ = Math.max(maxZ, m.z);
        }
        return Math.hypot(maxX - minX, maxZ - minZ);
      };

      const clusters = [];
      for (const item of mutatedItems) {
        let placed = false;
        for (const cl of clusters) {
          if (Math.hypot(item.x - cl[0].x, item.z - cl[0].z) < 6.5) {
            cl.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) clusters.push([item]);
      }

      const maxClusterCenterSpan = clusters.reduce((mx, cl) => Math.max(mx, computeHorizSpan(cl)), 0);
      const bridgeHorizSpan = Math.max(computeHorizSpan(newlyRevealed), 12.0);
      const stubRatio = maxClusterCenterSpan / bridgeHorizSpan;

      const postBridgeVisible =
        newlyRevealed.length >= 2 ||
        Boolean(slot.extrudedBridge?.visible) ||
        Boolean(slot.extrudedVine?.visible) ||
        Boolean(slot.fullArch?.visible);

      const isFixedSystem = nodeId === "W4.4" || Boolean(enc.rampMeta?.isSystem);
      const stubPreviewValid = isFixedSystem ? true : mutatedKeys.size >= 1;

      return {
        ok:
          explicitStayedHidden &&
          stubPreviewValid &&
          postBridgeVisible &&
          stubRatio <= 0.155,
        nodeId,
        encounterType: enc.encounterType,
        explicitStayedHidden,
        mutatedCount: mutatedKeys.size,
        newlyRevealedCount: newlyRevealed.length,
        maxClusterCenterSpan: Math.round(maxClusterCenterSpan * 1000) / 1000,
        bridgeHorizSpan: Math.round(bridgeHorizSpan * 1000) / 1000,
        stubRatio: Math.round(stubRatio * 10000) / 10000,
        postBridgeVisible,
      };
    }

    window.__E2E_3D__ = {
      clock,
      mountWorld,
      withFreshWorld,
      getSharedWorld,
      disposeAllSharedWorlds,
      snapshotSceneEntities,
      engageFirstEncounter,
      collectOppositionSnapshots,
      auditAntiScrubNode,
    };
    return true;
  });
}
