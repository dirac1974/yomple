/**
 * Bloom N E2E — Headless Chromium v156 + SwiftShader WebGL2 CDP Harness
 * - 100% Zero Production Traffic: intercepts https://digcgqltrlmhgmzgmvwc.supabase.co/* via CDP Fetch
 *   and isolates wss://digcgqltrlmhgmzgmvwc.supabase.co/realtime/* via WebSocket preload wrapper.
 * - Serves origin-matched /bloom-n/__e2e_sandbox__.html for fast shared-context 3D adapter tests.
 * - Guarantees zero leaked Chromium/renderer processes via detached process-group SIGKILL & /tmp cleanup.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { ensureLocalServer, startPhoenixRealtimeMockServer, SANDBOX_HTML } from "./server-harness.mjs";
import { install3DSandboxHelpers } from "./webgl-3d-inspector.mjs";

const CHROMIUM_BIN = "/usr/bin/chromium";
const activeCleanupCallbacks = new Set();
let hooksRegistered = false;

function registerProcessExitHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  const runAllSync = () => {
    for (const fn of [...activeCleanupCallbacks]) {
      try {
        fn();
      } catch {}
    }
  };
  process.once("exit", runAllSync);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.once(sig, () => {
      runAllSync();
      process.exit(130);
    });
  }
}

export async function createBrowserPool() {
  registerProcessExitHooks();
  const server = await ensureLocalServer();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bloom-n-cdp-"));

  const args = [
    "--headless",
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader-webgl",
    "--enable-unsafe-swiftshader",
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--mute-audio",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-extensions",
    "--mute-audio",
    "--autoplay-policy=no-user-gesture-required",
    "--window-size=960,640",
    "--remote-debugging-port=0",
    `--user-data-dir=${tmpDir}`,
    "about:blank",
  ];

  const proc = spawn(CHROMIUM_BIN, args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });

  const killAndCleanSync = () => {
    activeCleanupCallbacks.delete(killAndCleanSync);
    if (proc.pid) {
      try {
        process.kill(-proc.pid, "SIGKILL");
      } catch {}
      try {
        proc.kill("SIGKILL");
      } catch {}
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  };
  activeCleanupCallbacks.add(killAndCleanSync);

  let wsUrl;
  try {
    wsUrl = await new Promise((resolve, reject) => {
      let stderr = "";
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for Chromium DevTools WS URL:\n${stderr}`)),
        10000
      );
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
        const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (m) {
          clearTimeout(timer);
          resolve(m[1]);
        }
      });
      proc.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Chromium exited prematurely (${code}):\n${stderr}`));
      });
    });
  } catch (err) {
    killAndCleanSync();
    await server.close();
    throw err;
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextCmdId = 1;
  const pending = new Map();
  const sessionListeners = new Map();

  ws.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && pending.has(msg.id)) {
      const entry = pending.get(msg.id);
      pending.delete(msg.id);
      clearTimeout(entry.timer);
      if (msg.error) entry.reject(new Error(`CDP ${entry.method} failed: ${JSON.stringify(msg.error)}`));
      else entry.resolve(msg.result);
      return;
    }
    if (msg.sessionId && sessionListeners.has(msg.sessionId)) {
      for (const listener of sessionListeners.get(msg.sessionId)) {
        listener(msg);
      }
    }
  };

  function send(method, params = {}, sessionId = undefined, timeoutMs = 15000) {
    const id = nextCmdId++;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout (${timeoutMs}ms) on ${method}`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, method, timer });
      ws.send(JSON.stringify(payload));
    });
  }

  async function createAttachedPage(browserContextId, options = {}) {
    const {
      supabaseMode = "cloud_ok", // "cloud_ok" | "pre_migration_fallback" | "offline"
      mockCloudRows = {},
      wsMode = "offline_broadcast", // "offline_broadcast" | "local_phoenix_relay"
      phoenixWsUrl = null,
      seedStorage = null,
    } = options;

    const { targetId } = await send("Target.createTarget", { url: "about:blank", browserContextId });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

    const consoleErrors = [];
    const pageErrors = [];
    const supabaseCalls = [];
    const loadWaiters = [];
    const cloudMemoryRows = { ...mockCloudRows };

    const onSessionEvent = async (msg) => {
      if (msg.method === "Page.loadEventFired") {
        while (loadWaiters.length) loadWaiters.shift()();
      } else if (msg.method === "Runtime.exceptionThrown") {
        const d = msg.params.exceptionDetails;
        pageErrors.push(d?.exception?.description || d?.text || "Uncaught exception");
      } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        const txt = (msg.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ");
        if (supabaseMode !== "offline" || !txt.includes("ERR_INTERNET_DISCONNECTED")) {
          if (!txt.includes("favicon.ico")) {
            consoleErrors.push(txt);
          }
        }
      } else if (msg.method === "Fetch.requestPaused") {
        const { requestId, request } = msg.params;
        const url = request.url || "";

        if (url.includes("__e2e_sandbox__.html")) {
          await send(
            "Fetch.fulfillRequest",
            {
              requestId,
              responseCode: 200,
              responseHeaders: [
                { name: "Content-Type", value: "text/html; charset=utf-8" },
                { name: "Cache-Control", value: "no-store" },
              ],
              body: Buffer.from(SANDBOX_HTML, "utf8").toString("base64"),
            },
            sessionId
          ).catch(() => {});
          return;
        }

        if (url.includes("googleusercontent.com")) {
          await send(
            "Fetch.fulfillRequest",
            { requestId, responseCode: 204, responseHeaders: [], body: "" },
            sessionId
          ).catch(() => {});
          return;
        }

        if (supabaseMode === "offline") {
          supabaseCalls.push({
            method: request.method,
            url,
            rpcName: (url.split("/rpc/")[1] || "").split("?")[0],
            rawBytes: 0,
            body: null,
            offline: true,
          });
          await send("Fetch.failRequest", { requestId, errorReason: "InternetDisconnected" }, sessionId).catch(
            () => {}
          );
          return;
        }

        const corsHeaders = [
          { name: "Access-Control-Allow-Origin", value: "*" },
          { name: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            name: "Access-Control-Allow-Headers",
            value: "apikey, authorization, content-type, prefer, x-client-info",
          },
          { name: "Content-Type", value: "application/json" },
        ];

        if (request.method === "OPTIONS") {
          await send(
            "Fetch.fulfillRequest",
            { requestId, responseCode: 204, responseHeaders: corsHeaders, body: "" },
            sessionId
          ).catch(() => {});
          return;
        }

        let rawPost = request.postData ?? "";
        if (!rawPost && request.hasPostData) {
          const got = await send("Fetch.getRequestPostData", { requestId }, sessionId).catch(() => ({
            postData: "",
          }));
          rawPost = got.postData || "";
        }
        let parsedBody = null;
        try {
          parsedBody = rawPost ? JSON.parse(rawPost) : null;
        } catch {}

        const rpcName = (url.split("/rpc/")[1] || "").split("?")[0];
        const rawBytes = Buffer.byteLength(rawPost, "utf8");
        supabaseCalls.push({
          timestamp: Date.now(),
          method: request.method,
          url,
          rpcName,
          rawBytes,
          body: parsedBody,
        });

        if (
          supabaseMode === "pre_migration_fallback" &&
          (rpcName.startsWith("bloomn_") || parsedBody?.p_table === "bloomn_players")
        ) {
          await send(
            "Fetch.fulfillRequest",
            {
              requestId,
              responseCode: 404,
              responseHeaders: corsHeaders,
              body: Buffer.from(JSON.stringify({ message: "function not migrated yet" })).toString("base64"),
            },
            sessionId
          ).catch(() => {});
          return;
        }

        let replyJson = { ok: true };
        if (rpcName === "yomple_player_find" || rpcName === "yomple_player_find_any") {
          const u = parsedBody?.p_username;
          replyJson = u && cloudMemoryRows[u] ? cloudMemoryRows[u] : null;
        } else if (rpcName === "yomple_player_search") {
          replyJson = [];
        } else if (rpcName === "yomple_player_upsert") {
          const u = parsedBody?.p_username || "player";
          cloudMemoryRows[u] = {
            table: parsedBody?.p_table || "field_players",
            username: u,
            ...(parsedBody?.p_row || {}),
          };
          replyJson = { ok: true, created: true };
        } else if (rpcName === "bloomn_player_merge") {
          const u = parsedBody?.p_username || "player";
          cloudMemoryRows[u] = {
            table: "bloomn_players",
            username: u,
            display_name: parsedBody?.p_display_name || u,
            avatar: parsedBody?.p_avatar || "❄️",
            family_code: parsedBody?.p_family || null,
            progress: parsedBody?.p_progress || {},
            fun: parsedBody?.p_fun || {},
          };
          replyJson = { ok: true, progress: parsedBody?.p_progress || {}, fun: parsedBody?.p_fun || {} };
        } else if (rpcName === "bloomn_household_sync") {
          const flux = Math.max(220, (parsedBody?.p_flux_delta || 0) + 180);
          replyJson = {
            ok: true,
            total_flux: flux,
            observatory_tier: flux >= 5000 ? 6 : flux >= 2500 ? 5 : flux >= 1200 ? 4 : flux >= 500 ? 3 : 2,
            heroes: {
              [parsedBody?.p_username || "hero"]: {
                display_name: parsedBody?.p_display_name || "Explorer",
                avatar: parsedBody?.p_avatar || "❄️",
                hero_title: parsedBody?.p_hero_title || "Frostwake Pioneer",
                world_max: parsedBody?.p_world_max || 2,
              },
            },
          };
        }

        await send(
          "Fetch.fulfillRequest",
          {
            requestId,
            responseCode: 200,
            responseHeaders: corsHeaders,
            body: Buffer.from(JSON.stringify(replyJson)).toString("base64"),
          },
          sessionId
        ).catch(() => {});
      }
    };

    sessionListeners.set(sessionId, new Set([onSessionEvent]));

    await Promise.all([
      send("Page.enable", {}, sessionId),
      send("Runtime.enable", {}, sessionId),
      send("DOM.enable", {}, sessionId),
      send(
        "Fetch.enable",
        {
          patterns: [
            { urlPattern: "https://digcgqltrlmhgmzgmvwc.supabase.co/*", requestStage: "Request" },
            { urlPattern: "https://*.googleusercontent.com/*", requestStage: "Request" },
            { urlPattern: "*__e2e_sandbox__.html*", requestStage: "Request" },
          ],
        },
        sessionId
      ),
    ]);

    const preloadScript = `(() => {
      window.__e2eMetrics = { drawsByCanvas: {}, wsUrlsAttempted: [], activeMockSockets: 0 };
      const bumpDraw = function() {
        const id = (this && this.canvas && (this.canvas.id || this.canvas.tagName)) || "unknown";
        window.__e2eMetrics.drawsByCanvas[id] = (window.__e2eMetrics.drawsByCanvas[id] || 0) + 1;
      };
      for (const Ctx of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
        if (!Ctx || !Ctx.prototype) continue;
        for (const fnName of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
          if (typeof Ctx.prototype[fnName] === "function") {
            const orig = Ctx.prototype[fnName];
            Ctx.prototype[fnName] = function(...a) { bumpDraw.call(this); return orig.apply(this, a); };
          }
        }
      }

      const OrigWS = window.WebSocket;
      const wsMode = ${JSON.stringify(wsMode)};
      const relayUrl = ${JSON.stringify(phoenixWsUrl)};
      window.WebSocket = function(url, protocols) {
        const str = String(url || "");
        window.__e2eMetrics.wsUrlsAttempted.push(str);
        if (str.includes("digcgqltrlmhgmzgmvwc.supabase.co/realtime")) {
          if (wsMode === "local_phoenix_relay" && relayUrl) {
            const q = str.includes("?") ? str.slice(str.indexOf("?")) : "";
            return protocols ? new OrigWS(relayUrl + q, protocols) : new OrigWS(relayUrl + q);
          }
          const fake = new EventTarget();
          fake.url = str;
          fake.readyState = 3;
          fake.send = () => {};
          fake.close = () => {};
          queueMicrotask(() => {
            const errEv = new Event("error");
            if (typeof fake.onerror === "function") try { fake.onerror(errEv); } catch {}
            fake.dispatchEvent(errEv);
            const closeEv = new CloseEvent("close", { code: 1006, reason: "offline-e2e" });
            if (typeof fake.onclose === "function") try { fake.onclose(closeEv); } catch {}
            fake.dispatchEvent(closeEv);
          });
          return fake;
        }
        return protocols ? new OrigWS(url, protocols) : new OrigWS(url);
      };
      window.WebSocket.prototype = OrigWS.prototype;
      Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });

      const seed = ${JSON.stringify(seedStorage)};
      if (seed && !sessionStorage.getItem("__e2e_seeded_v1")) {
        sessionStorage.setItem("__e2e_seeded_v1", "1");
        for (const [k, v] of Object.entries(seed)) {
          localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
        }
      }
    })();`;

    await send("Page.addScriptToEvaluateOnNewDocument", { source: preloadScript }, sessionId);

    async function evaluate(fnOrExpr, ...args) {
      const expression =
        typeof fnOrExpr === "function"
          ? `(${fnOrExpr.toString()})(${args.map((a) => JSON.stringify(a)).join(", ")})`
          : String(fnOrExpr);
      const res = await send(
        "Runtime.evaluate",
        { expression, awaitPromise: true, returnByValue: true },
        sessionId
      );
      if (res.exceptionDetails) {
        const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
        throw new Error(`Browser Runtime.evaluate threw: ${desc}`);
      }
      return res.result?.value;
    }

    async function waitFor(predicateFn, { timeoutMs = 5000, pollMs = 45, label = "condition" } = {}) {
      const deadline = Date.now() + timeoutMs;
      let lastVal = null;
      while (Date.now() < deadline) {
        lastVal = await evaluate(predicateFn);
        if (lastVal) return lastVal;
        await new Promise((r) => setTimeout(r, pollMs));
      }
      const snap = await evaluate(() => ({
        url: location.href,
        activeScreens: [...document.querySelectorAll(".screen.active, section[id^='screen-']")].map((s) => ({
          id: s.id,
          active: s.classList.contains("active"),
          display: getComputedStyle(s).display,
        })),
        openModals: [...document.querySelectorAll(".modal-backdrop.open")].map((m) => m.id),
      })).catch(() => ({}));
      throw new Error(
        `Timed out (${timeoutMs}ms) waiting for ${label}. Last=${JSON.stringify(lastVal)} DOM=${JSON.stringify(snap)}`
      );
    }

    async function goto(relOrFullUrl) {
      const fullUrl = relOrFullUrl.startsWith("http") ? relOrFullUrl : `${server.baseUrl}${relOrFullUrl}`;
      const loaded = new Promise((r) => loadWaiters.push(r));
      await send("Page.navigate", { url: fullUrl }, sessionId);
      await loaded;
      await new Promise((r) => setTimeout(r, 110));
    }

    return {
      baseUrl: server.baseUrl,
      targetId,
      sessionId,
      consoleErrors,
      pageErrors,
      supabaseCalls,
      cloudMemoryRows,
      send: (m, p) => send(m, p, sessionId),
      eval: evaluate,
      waitFor,
      goto,
      assertZeroRuntimeErrors(context = "") {
        assert.deepEqual(pageErrors, [], `Uncaught pageErrors ${context}: ${pageErrors.join(" | ")}`);
        assert.deepEqual(consoleErrors, [], `Console errors ${context}: ${consoleErrors.join(" | ")}`);
      },
      async close() {
        sessionListeners.delete(sessionId);
        await send("Target.closeTarget", { targetId }).catch(() => {});
      },
    };
  }

  return {
    baseUrl: server.baseUrl,

    async createSandboxPage() {
      const { browserContextId } = await send("Target.createBrowserContext");
      const page = await createAttachedPage(browserContextId, { supabaseMode: "offline" });
      await page.goto("/bloom-n/__e2e_sandbox__.html");
      await install3DSandboxHelpers(page);
      return {
        page,
        async close() {
          await page.eval(() => window.__E2E_3D__?.disposeAllSharedWorlds?.()).catch(() => {});
          await page.close();
          await send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
        },
      };
    },

    async withPage(optionsOrFn, maybeFn) {
      const fn = typeof optionsOrFn === "function" ? optionsOrFn : maybeFn;
      const opts = typeof optionsOrFn === "function" ? {} : optionsOrFn || {};
      const { browserContextId } = await send("Target.createBrowserContext");
      const page = await createAttachedPage(browserContextId, opts);
      try {
        if (opts.initialUrl) await page.goto(opts.initialUrl);
        return await fn(page);
      } finally {
        await page.close();
        await send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
      }
    },

    /**
     * Opens 2+ tabs in ONE shared BrowserContext (sharing BroadcastChannel!).
     * If initialUrl is passed on each tab option, navigates and awaits Tab 1 BEFORE Tab 2
     * so localStorage["bloom-n-v1"] bootstrap resolves each tab's ?u= URL identity without race!
     */
    async withSharedContextCoopPages(tabOptionsArray, fn) {
      const { browserContextId } = await send("Target.createBrowserContext");
      const pages = [];
      try {
        for (const opts of tabOptionsArray) {
          const p = await createAttachedPage(browserContextId, opts || {});
          if (opts?.initialUrl) {
            await p.goto(opts.initialUrl);
          }
          pages.push(p);
        }
        return await fn(pages);
      } finally {
        for (const p of pages) await p.close();
        await send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
      }
    },

    /**
     * Opens 2+ tabs in SEPARATE BrowserContexts wired to startPhoenixRealtimeMockServer()!
     */
    async withCrossDeviceCoopPages(tabOptionsArray, fn) {
      const phoenixRelay = await startPhoenixRealtimeMockServer();
      const entries = [];
      try {
        for (const opts of tabOptionsArray) {
          const { browserContextId } = await send("Target.createBrowserContext");
          const page = await createAttachedPage(browserContextId, {
            ...(opts || {}),
            wsMode: "local_phoenix_relay",
            phoenixWsUrl: phoenixRelay.wsUrl,
          });
          if (opts?.initialUrl) {
            await page.goto(opts.initialUrl);
          }
          entries.push({ page, browserContextId });
        }
        return await fn(
          entries.map((e) => e.page),
          phoenixRelay
        );
      } finally {
        for (const e of entries) {
          await e.page.close();
          await send("Target.disposeBrowserContext", { browserContextId: e.browserContextId }).catch(() => {});
        }
        await phoenixRelay.close();
      }
    },

    async close() {
      try {
        ws.close();
      } catch {}
      killAndCleanSync();
      await server.close();
    },
  };
}

/**
 * Installs non-mutating Realm3DAdapter spies on FrostwakeWorld3D & OddrootWorld3D prototypes
 * inside the live browser tab (leveraging URL-keyed ES module singletons).
 */
export async function installRealmAdapterSpies(page) {
  return page.eval(async () => {
    const makeBucket = () => {
      const b = {
        dockOpenCalls: [],
        partnerSyncs: 0,
        lastPeers: [],
        coopEvents: [],
        localFlares: 0,
        coinSyncs: [],
        guardianCalls: [],
        loadouts: [],
        stops: 0,
      };
      Object.defineProperty(b, "instances", {
        value: [],
        writable: true,
        enumerable: false,
        configurable: true,
      });
      return b;
    };
    window.__adapterSpy = {
      frostwake: makeBucket(),
      oddroot: makeBucket(),
    };
    const hookClass = (Cls, bucket) => {
      if (!Cls || !Cls.prototype) return false;
      if (Cls.prototype.__e2eSpiedBucket) {
        window.__adapterSpy[Cls.prototype.__e2eSpiedName] = Cls.prototype.__e2eSpiedBucket;
        return true;
      }
      const trackInst = (inst) => {
        if (!bucket.instances.includes(inst)) bucket.instances.push(inst);
      };
      for (const [mName, cb] of [
        ["start", (inst) => trackInst(inst)],
        ["stop", (inst) => { trackInst(inst); bucket.stops++; }],
        ["populateEncounters", (inst) => trackInst(inst)],
        ["setEncounterDockOpen", (inst, isOpen) => { trackInst(inst); bucket.dockOpenCalls.push(Boolean(isOpen)); }],
        [
          "syncRemotePartners",
          (inst, peers) => {
            trackInst(inst);
            if (Array.isArray(peers)) {
              bucket.lastPeers = peers;
              if (peers.length > 0) bucket.partnerSyncs++;
            }
          },
        ],
        ["playPartnerCoopEvent", (inst, ev) => { trackInst(inst); bucket.coopEvents.push(ev); }],
        ["playLocalFlare", (inst) => { trackInst(inst); bucket.localFlares++; }],
        ["syncSharedCoins", (inst, coins) => { trackInst(inst); bucket.coinSyncs.push(coins); }],
        ["triggerGuardianAwakening", (inst, wid) => { trackInst(inst); bucket.guardianCalls.push(wid); }],
        [
          "applyLoadout",
          (inst, prog, unlocks, borrowed) => {
            trackInst(inst);
            bucket.loadouts.push({ unlocks, hasBorrowed: Boolean(borrowed), borrowed });
          },
        ],
      ]) {
        if (typeof Cls.prototype[mName] === "function") {
          const orig = Cls.prototype[mName];
          Cls.prototype[mName] = function (...args) {
            cb(this, ...args);
            return orig.apply(this, args);
          };
        }
      }
      return true;
    };

    const fwMod = await import("./frostwake/frostwake-3d.js").catch(() => null);
    const orMod = await import("./oddroot/oddroot-3d.js").catch(() => null);
    if (fwMod?.FrostwakeWorld3D) {
      fwMod.FrostwakeWorld3D.prototype.__e2eSpiedName = "frostwake";
      hookClass(fwMod.FrostwakeWorld3D, window.__adapterSpy.frostwake);
      fwMod.FrostwakeWorld3D.prototype.__e2eSpiedBucket = window.__adapterSpy.frostwake;
    }
    if (orMod?.OddrootWorld3D) {
      orMod.OddrootWorld3D.prototype.__e2eSpiedName = "oddroot";
      hookClass(orMod.OddrootWorld3D, window.__adapterSpy.oddroot);
      orMod.OddrootWorld3D.prototype.__e2eSpiedBucket = window.__adapterSpy.oddroot;
    }
    return {
      frostwakeHooked: Boolean(fwMod?.FrostwakeWorld3D),
      oddrootHooked: Boolean(orMod?.OddrootWorld3D),
      fwHasDockPause: typeof fwMod?.FrostwakeWorld3D?.prototype?.setEncounterDockOpen === "function",
      orHasDockPause: typeof orMod?.OddrootWorld3D?.prototype?.setEncounterDockOpen === "function",
    };
  });
}

/**
 * Launches "frostwake" or "oddroot" from #screen-portal via contract/semantic controls
 * and verifies an active screen with a healthy WebGL context.
 */
export async function launchRealmFromPortal(page, realmId) {
  const screenId = realmId === "oddroot" ? "screen-oddroot" : "screen-frostwake";
  const existsInDom = await page.eval((sid) => Boolean(document.getElementById(sid)), screenId);
  assert.equal(existsInDom, true, `Expected #${screenId} section to exist in bloom-n/index.html`);

  const clicked = await page.eval((rId) => {
    const isVisible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
    };
    const directSelectors =
      rId === "frostwake"
        ? ["#btn-launch-frostwake", "[data-launch-realm='frostwake']", "[data-realm='frostwake'] button.play-btn-giant"]
        : [
            "#btn-launch-oddroot",
            "[data-launch-realm='oddroot']",
            "[data-realm='oddroot'] button.play-btn-giant",
            "#hero-oddroot button.play-btn-giant",
            "#hero-oddroot button",
          ];
    for (const sel of directSelectors) {
      const btn = document.querySelector(sel);
      if (isVisible(btn)) {
        btn.click();
        return { step: "direct", text: btn.textContent.trim() };
      }
    }
    const kw = rId === "oddroot" ? /oddroot|alchemy sanctuary/i : /frostwake|terra-rigs/i;
    const candidates = [
      ...document.querySelectorAll("#screen-portal button, #screen-portal article, #screen-portal .realm-card"),
    ];
    for (const el of candidates) {
      if (!isVisible(el)) continue;
      if (kw.test(el.textContent || "")) {
        const innerCta = el.tagName === "BUTTON" ? el : el.querySelector("button");
        if (innerCta && isVisible(innerCta)) {
          innerCta.click();
          return { step: "card", text: innerCta.textContent.trim() };
        }
      }
    }
    return null;
  }, realmId);

  assert.ok(clicked, `Expected visible launch button/card on #screen-portal for realm "${realmId}"`);

  await new Promise((r) => setTimeout(r, 90));
  await page.eval((targetScreenId) => {
    const scr = document.getElementById(targetScreenId);
    if (scr && scr.classList.contains("active")) return;
    const modal = document.getElementById("modal-realm");
    if (modal && modal.classList.contains("open")) {
      const btn = [...modal.querySelectorAll("button")].find(
        (b) =>
          !b.hasAttribute("data-close") &&
          /play|launch|enter|drive|explore|oddroot|sanctuary|frostwake/i.test(b.textContent || "")
      );
      if (btn) btn.click();
    }
  }, screenId);

  const state = await page.waitFor(
    new Function(`return (() => {
      const scr = document.getElementById(${JSON.stringify(screenId)});
      if (!scr) return null;
      const cs = getComputedStyle(scr);
      if (!scr.classList.contains("active") || cs.display === "none") return null;
      const canvas = scr.querySelector("canvas");
      if (!canvas || canvas.width < 100 || canvas.height < 100) return null;
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      return {
        screenId: scr.id,
        canvasId: canvas.id,
        width: canvas.width,
        height: canvas.height,
        webglHealthy: Boolean(gl && !gl.isContextLost())
      };
    })();`),
    { timeoutMs: 4500, label: `#${screenId} active with healthy WebGL canvas` }
  );
  assert.equal(state.webglHealthy, true, `Expected healthy non-lost WebGL context inside #${screenId}`);
  return state;
}

export async function exitRealmToPortal(page) {
  const clicked = await page.eval(() => {
    const isVisible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
    };
    const activeScreen = document.querySelector(".screen.active");
    if (!activeScreen || activeScreen.id === "screen-portal") return true;
    const btn = [
      ...activeScreen.querySelectorAll(
        "#hud-exit-btn, #oddroot-exit-btn, [id*='exit'], [data-action*='exit'], .hud-top button"
      ),
    ].find((b) => isVisible(b) && /hub|portal|exit|←/i.test(b.textContent || ""));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  assert.equal(clicked, true, "Expected visible ← Hub / Exit button in active 3D HUD");
  await page.waitFor(
    () => {
      const p = document.getElementById("screen-portal");
      return Boolean(p && p.classList.contains("active") && getComputedStyle(p).display !== "none");
    },
    { timeoutMs: 3500, label: "#screen-portal active after exit" }
  );
}

/**
 * Cruises to the nearest uncleared gate/shrine on the active 3D screen and waits for the Encounter Dock to open.
 */
export async function cruiseToNextEncounterDock(page, { timeoutMs = 6500 } = {}) {
  await page.eval(() => {
    const isVisible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
    };
    const activeScreen = document.querySelector(".screen.active") || document;
    const autoBtn = [
      ...activeScreen.querySelectorAll(
        "#btn-autopilot, #oddroot-autopilot-btn, [id*='autopilot'], [data-action*='autopilot'], button.drive-pill, button"
      ),
    ].find((b) => isVisible(b) && /cruise|autopilot|gate|shrine|cauldron|🧭/i.test(b.textContent || ""));
    if (autoBtn) autoBtn.click();
  });

  return page.waitFor(
    () => {
      const isVisible = (el) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
      };
      const dock = [
        ...document.querySelectorAll(".encounter-dock.open, #encounter-dock.open, [id*='dock'].open, .encounter-dock"),
      ].find(isVisible);
      if (!dock) return null;
      const nodeTag = (dock.querySelector("#enc-node-tag, .enc-world-tag, [data-node-id]")?.textContent || "").trim();
      return { open: true, nodeId: nodeTag };
    },
    { timeoutMs, label: "Encounter Dock open after cruising to gate/shrine" }
  );
}

/**
 * Reads the currently open Encounter Dock and resolves the exact mathematical answer
 * using public core/engine.js generateEncounter matching + analytical algebraic fallback.
 */
export async function readAndSolveActiveDock(page) {
  return page.eval(async () => {
    const isVisible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
    };
    const dock = [
      ...document.querySelectorAll(".encounter-dock.open, #encounter-dock.open, [id*='dock'].open, .encounter-dock"),
    ].find(isVisible);
    if (!dock) return null;

    const rawNodeTag = (dock.querySelector("#enc-node-tag, .enc-world-tag, [data-node-id]")?.textContent || "").trim();
    const nodeMatch = rawNodeTag.match(/W\d\.\d/);
    const nodeId = nodeMatch ? nodeMatch[0] : rawNodeTag;
    const promptShort = (dock.querySelector("#enc-prompt, .enc-prompt")?.textContent || "").trim();
    const equationText = (dock.querySelector("#enc-equation, .enc-equation")?.textContent || "").trim();
    const dialInput = dock.querySelector("#enc-dial-input, input.drum-input, input[type='number']");
    const commitBtn = dock.querySelector("#enc-commit-btn, .commit-btn, button[id*='commit']");

    const eng = await import("./core/engine.js");
    let solvedAnswer = null;
    if (nodeId && typeof eng.generateEncounter === "function") {
      for (let i = 0; i < 3500; i++) {
        const sample = eng.generateEncounter(nodeId);
        if (sample.equationText === equationText && (!promptShort || sample.promptShort === promptShort)) {
          solvedAnswer = sample.answer;
          break;
        }
      }
      if (solvedAnswer === null) {
        for (let i = 0; i < 2000; i++) {
          const sample = eng.generateEncounter(nodeId, { camouflage: true });
          if (sample.equationText === equationText) {
            solvedAnswer = sample.answer;
            break;
          }
        }
      }
    }

    if (solvedAnswer === null) {
      let m;
      if ((m = equationText.match(/^n\s*\+\s*(-?\d+)\s*=\s*(-?\d+)\s*-\s*(\d+)$/))) {
        solvedAnswer = Number(m[2]) - Number(m[3]) - Number(m[1]);
      } else if ((m = equationText.match(/^n\s*\+\s*(-?\d+)\s*=\s*(-?\d+)$/))) {
        solvedAnswer = Number(m[2]) - Number(m[1]);
      } else if ((m = equationText.match(/^n\s*-\s*(\d+)\s*=\s*(-?\d+)$/))) {
        solvedAnswer = Number(m[2]) + Number(m[1]);
      } else if ((m = equationText.match(/^(-?\d+)\s*-\s*\(-(\d+)\)\s*=\s*n$/))) {
        solvedAnswer = Number(m[1]) + Number(m[2]);
      } else if ((m = equationText.match(/^\((-?\d+)\)\s*[×*]\s*\((-?\d+)\)\s*=\s*n$/))) {
        solvedAnswer = Number(m[1]) * Number(m[2]);
      } else if ((m = equationText.match(/α\s*=\s*(\d+)°/))) {
        solvedAnswer = 90 - Number(m[1]);
      } else if ((m = equationText.match(/x²\s*[+-]\s*(\d+)x\s*\+/))) {
        const half = Number(m[1]) / 2;
        solvedAnswer = half * half;
      }
    }

    return {
      nodeId,
      promptShort,
      equationText,
      solvedAnswer,
      currentDial: dialInput ? Number(dialInput.value) : null,
      hasRangeInput: Boolean(dock.querySelector("input[type='range']")),
      commitText: commitBtn ? commitBtn.textContent.trim() : "",
      dockText: dock.textContent || "",
    };
  });
}

export async function commitValueInActiveDock(page, numericOrRawValue) {
  return page.eval((val) => {
    const isVisible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
    };
    const dock = [
      ...document.querySelectorAll(".encounter-dock.open, #encounter-dock.open, [id*='dock'].open, .encounter-dock"),
    ].find(isVisible);
    if (!dock) return false;
    const dialInput = dock.querySelector("#enc-dial-input, input.drum-input, input[type='number']");
    const commitBtn = dock.querySelector("#enc-commit-btn, .commit-btn, button[id*='commit']");
    if (!dialInput || !commitBtn) return false;
    dialInput.value = String(val);
    dialInput.dispatchEvent(new Event("input", { bubbles: true }));
    dialInput.dispatchEvent(new Event("change", { bubbles: true }));
    commitBtn.click();
    return true;
  }, numericOrRawValue);
}

/**
 * Collects all visible child-facing text in the live DOM (strictly excluding #modal-grownups when closed or skipped).
 */
export async function getVisibleChildDomText(page) {
  return page.eval(() => {
    const chunks = [];
    const isHidden = (el) => {
      let cur = el;
      while (cur && cur !== document.body) {
        if (cur.id === "modal-grownups") return true;
        if (cur.tagName === "SCRIPT" || cur.tagName === "STYLE" || cur.tagName === "NOSCRIPT") return true;
        const cs = getComputedStyle(cur);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return true;
        cur = cur.parentElement;
      }
      return false;
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || isHidden(parent)) continue;
      const t = (node.nodeValue || "").trim();
      if (t) chunks.push(t);
    }
    return chunks.join(" \n ");
  });
}
