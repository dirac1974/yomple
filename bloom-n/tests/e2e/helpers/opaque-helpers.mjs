/**
 * Bloom N E2E — Opaque-Box Dynamic Module Loaders, Sync/Storage Isolation,
 * In-Memory Phoenix/BroadcastChannel Co-Op Hub & Cumulative SQL Migration Parser
 */

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BLOOM_N_DIR = path.resolve(__dirname, "../../..");
export const YOMPLE_DIR = path.resolve(BLOOM_N_DIR, "..");
export const BLOOM_V1_DIR = path.resolve(YOMPLE_DIR, "../bloom");

export const FALLBACK_BANNED_CURRICULUM_WORDS = [
  "pre-algebra",
  "pre-alg",
  "algebra 1",
  "algebra 2",
  "algebra i",
  "algebra ii",
  "geometry",
  "trigonometry",
  "trig",
  "curriculum",
  "grade 6",
  "worksheet",
  "standardized",
];

export const FALLBACK_BANNED_SHAME_WORDS = [
  "wrong",
  "fail",
  "failed",
  "failure",
  "error",
  "mistake",
  "incorrect",
  "bad",
  "slow",
  "stupid",
  "dumb",
  "loser",
  "penalty",
  "behind",
  "remedial",
  "easy mode",
  "forfeit",
  "game over",
  "you lost",
];

async function safeLoadRelModule(relFromBloomN) {
  const absPath = path.join(BLOOM_N_DIR, relFromBloomN);
  try {
    return await import(pathToFileURL(absPath).href);
  } catch (err) {
    assert.fail(`Expected module "bloom-n/${relFromBloomN}" to exist and load without errors, got: ${err?.message || err}`);
  }
}

export async function loadEngine() {
  return safeLoadRelModule("core/engine.js");
}

export async function loadSync() {
  return safeLoadRelModule("core/sync.js");
}

export async function loadMultiplayer() {
  return safeLoadRelModule("core/multiplayer.js");
}

export async function loadFrostwake() {
  return safeLoadRelModule("frostwake/frostwake-3d.js");
}

export async function loadFrostwakeAudio() {
  return safeLoadRelModule("frostwake/audio.js");
}

export async function loadOddroot() {
  return safeLoadRelModule("oddroot/oddroot-3d.js");
}

export async function loadOddrootAudio() {
  return safeLoadRelModule("oddroot/audio.js");
}

export function requireExport(mod, exportName, expectedType = null, moduleLabel = "module") {
  assert.ok(
    mod && Object.prototype.hasOwnProperty.call(mod, exportName) && mod[exportName] !== undefined,
    `Expected ${moduleLabel} to export "${exportName}"`
  );
  if (expectedType === "array") {
    assert.ok(Array.isArray(mod[exportName]), `Expected ${moduleLabel}.${exportName} to be an Array`);
  } else if (expectedType) {
    assert.equal(
      typeof mod[exportName],
      expectedType,
      `Expected ${moduleLabel}.${exportName} to have typeof "${expectedType}"`
    );
  }
  return mod[exportName];
}

export function makeSeededRng(seed = 20261112) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function commitEnc(eng, progress, session, encounter, committedValue, planMs = 2200, rng = Math.random) {
  return eng.evaluateCommit({
    progress,
    session,
    encounter,
    committedValue,
    planMs,
    rng,
  });
}

export function stepBeam(eng, encounter, actionId) {
  const res = eng.applyBeamAction(encounter, actionId);
  return { res, encounter: res?.encounter || encounter };
}

export function countWords(text) {
  const s = String(text ?? "").trim();
  return s ? s.split(/\s+/).filter(Boolean).length : 0;
}

export function findBannedWord(text, bannedList) {
  const lower = String(text ?? "").toLowerCase();
  for (const w of bannedList || []) {
    const needle = String(w).toLowerCase();
    if (!needle) continue;
    if (needle.includes(" ") || needle.includes("-")) {
      if (lower.includes(needle)) return w;
    } else {
      const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(lower)) return w;
    }
  }
  return null;
}

export function stripJsAndCssComments(source) {
  return String(source || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ");
}

export async function walkFilesRecursive(rootDir, { ignoreDirs = [".git", "node_modules", "vendor", "tests"] } = {}) {
  const out = [];
  async function walk(cur) {
    let entries;
    try {
      entries = await fs.readdir(cur, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ignoreDirs.includes(ent.name)) continue;
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (ent.isFile()) {
        out.push(full);
      }
    }
  }
  await walk(rootDir);
  return out;
}

/**
 * Runs a callback in an isolated Node browser-storage + fetch mock environment so
 * core/sync.js NEVER sends HTTP traffic to https://digcgqltrlmhgmzgmvwc.supabase.co.
 */
export async function withIsolatedSyncEnv(optionsOrFn, maybeFn) {
  const fn = typeof optionsOrFn === "function" ? optionsOrFn : maybeFn;
  const opts = typeof optionsOrFn === "function" ? {} : optionsOrFn || {};
  const {
    urlSearch = "",
    initialStorage = {},
    throwOnSetItem = false,
    sisterHousehold = null,
    rpcHandler = null,
    networkOffline = false,
  } = opts;

  const prevWindow = globalThis.window;
  const prevLocalStorage = globalThis.localStorage;
  const prevFetch = globalThis.fetch;

  const storageMap = new Map(
    Object.entries(initialStorage).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])
  );
  const stayCalls = [];
  const rpcCalls = [];

  const mockLocalStorage = {
    getItem(k) {
      return storageMap.has(k) ? storageMap.get(k) : null;
    },
    setItem(k, v) {
      if (throwOnSetItem) {
        const err = new Error("QuotaExceededError: The quota has been exceeded.");
        err.name = "QuotaExceededError";
        throw err;
      }
      storageMap.set(String(k), String(v));
    },
    removeItem(k) {
      storageMap.delete(String(k));
    },
    clear() {
      storageMap.clear();
    },
  };

  let currentHref = `http://127.0.0.1:8090/bloom-n/${urlSearch ? (urlSearch.startsWith("?") ? urlSearch : `?${urlSearch}`) : ""}`;

  const mockWindow = {
    get location() {
      const u = new URL(currentHref);
      return {
        href: u.href,
        search: u.search,
        pathname: u.pathname,
        origin: u.origin,
      };
    },
    history: {
      replaceState(_state, _title, nextUrl) {
        if (nextUrl) {
          currentHref = new URL(nextUrl, currentHref).href;
        }
      },
    },
    localStorage: mockLocalStorage,
    YompleStay: {
      arrived(username, familyCode) {
        stayCalls.push({ username, familyCode });
        const u = new URL(currentHref);
        if (username) u.searchParams.set("u", username);
        u.searchParams.set("from", "yomple");
        if (familyCode) u.searchParams.set("f", familyCode);
        currentHref = u.href;
      },
    },
    readSisterHousehold: sisterHousehold ? () => sisterHousehold : undefined,
  };

  globalThis.window = mockWindow;
  globalThis.localStorage = mockLocalStorage;
  globalThis.fetch = async (url, init = {}) => {
    const strUrl = String(url);
    const bodyStr = init?.body ? String(init.body) : "";
    const rawBytes = Buffer.byteLength(bodyStr, "utf8");
    let parsedArgs = {};
    try {
      parsedArgs = bodyStr ? JSON.parse(bodyStr) : {};
    } catch {}
    const rpcName = (strUrl.split("/rpc/")[1] || "").split("?")[0];
    rpcCalls.push({ fn: rpcName, args: parsedArgs, rawBytes, url: strUrl });

    if (networkOffline) {
      throw new TypeError("fetch failed: network offline in E2E test");
    }
    if (typeof rpcHandler === "function") {
      const custom = await rpcHandler(rpcName, parsedArgs, rawBytes);
      if (custom && typeof custom === "object" && "__httpStatus" in custom) {
        return {
          ok: custom.__httpStatus >= 200 && custom.__httpStatus < 300,
          status: custom.__httpStatus,
          json: async () => custom.body ?? null,
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => (custom === undefined ? { ok: true } : custom),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => (rpcName.startsWith("yomple_player_find") ? null : { ok: true }),
    };
  };

  try {
    return await fn({
      storageMap,
      localStorage: mockLocalStorage,
      window: mockWindow,
      stayCalls,
      rpcCalls,
      setSearch(nextSearch) {
        currentHref = `http://127.0.0.1:8090/bloom-n/${nextSearch ? (nextSearch.startsWith("?") ? nextSearch : `?${nextSearch}`) : ""}`;
      },
    });
  } finally {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;

    if (prevLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prevLocalStorage;

    globalThis.fetch = prevFetch;
  }
}

/**
 * In-memory Phoenix Channels v1.0.0 WebSocket + BroadcastChannel test hub for F21.
 * Supports both Phoenix v1 object frames and Phoenix v2 5-element array frames!
 * Guarantees 0 real network connections to wss://digcgqltrlmhgmzgmvwc.supabase.co!
 */
export function createInMemoryCoopTransportHub({ wsOffline = false, wsThrowOnConstruct = false } = {}) {
  const wsRooms = new Map(); // topic -> Set<MockWebSocket>
  const bcRooms = new Map(); // name -> Set<MockBroadcastChannel>
  const allSockets = [];

  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url) {
      if (wsThrowOnConstruct) throw new Error("SecurityError: WebSocket blocked");
      this.url = String(url);
      this.readyState = MockWebSocket.CONNECTING;
      this.sentFrames = [];
      this.joinedTopics = new Map();
      this.isArrayFormat = false;
      allSockets.push(this);

      queueMicrotask(() => {
        if (this.readyState !== MockWebSocket.CONNECTING) return;
        if (wsOffline) {
          this.readyState = MockWebSocket.CLOSED;
          this._emit("error", { type: "error" });
          this._emit("close", { code: 1006 });
          return;
        }
        this.readyState = MockWebSocket.OPEN;
        this._emit("open", { type: "open" });
      });
    }

    addEventListener(type, fn) {
      this._listeners = this._listeners || {};
      (this._listeners[type] = this._listeners[type] || []).push(fn);
    }

    removeEventListener(type, fn) {
      if (!this._listeners?.[type]) return;
      this._listeners[type] = this._listeners[type].filter((f) => f !== fn);
    }

    _emit(type, ev) {
      const handler = this[`on${type}`];
      if (typeof handler === "function") handler.call(this, ev);
      for (const fn of this._listeners?.[type] || []) fn.call(this, ev);
    }

    send(raw) {
      if (this.readyState !== MockWebSocket.OPEN) return;
      const msg = JSON.parse(String(raw));
      const isArr = Array.isArray(msg);
      this.isArrayFormat = isArr;
      const frame = isArr
        ? { join_ref: msg[0], ref: msg[1], topic: msg[2], event: msg[3], payload: msg[4] || {} }
        : { join_ref: msg.join_ref || null, ref: msg.ref || null, topic: msg.topic, event: msg.event, payload: msg.payload || {} };
      this.sentFrames.push(frame);

      if (frame.event === "phx_join") {
        const selfBroadcast = Boolean(frame.payload?.config?.broadcast?.self);
        const presenceKey = frame.payload?.config?.presence?.key || `peer_${allSockets.length}`;
        this.joinedTopics.set(frame.topic, { selfBroadcast, joinRef: frame.join_ref, presenceKey, meta: null });
        if (!wsRooms.has(frame.topic)) wsRooms.set(frame.topic, new Set());
        wsRooms.get(frame.topic).add(this);
        queueMicrotask(() => {
          this._deliver({
            join_ref: frame.join_ref,
            ref: frame.ref,
            topic: frame.topic,
            event: "phx_reply",
            payload: { status: "ok", response: {} },
          });
          const state = {};
          for (const peer of wsRooms.get(frame.topic) || []) {
            const pInfo = peer.joinedTopics.get(frame.topic);
            if (pInfo?.meta) state[pInfo.presenceKey] = { metas: [pInfo.meta] };
          }
          this._deliver({
            join_ref: frame.join_ref,
            ref: null,
            topic: frame.topic,
            event: "presence_state",
            payload: state,
          });
        });
      } else if (frame.event === "presence") {
        const info = this.joinedTopics.get(frame.topic);
        if (info && frame.payload?.event === "track") {
          info.meta = { ...(frame.payload.payload || {}), phx_ref: "1" };
          const diff = { joins: { [info.presenceKey]: { metas: [info.meta] } }, leaves: {} };
          for (const peer of wsRooms.get(frame.topic) || []) {
            queueMicrotask(() => {
              peer._deliver({
                join_ref: peer.joinedTopics.get(frame.topic)?.joinRef || null,
                ref: null,
                topic: frame.topic,
                event: "presence_diff",
                payload: diff,
              });
            });
          }
        }
        queueMicrotask(() => {
          this._deliver({
            join_ref: frame.join_ref,
            ref: frame.ref,
            topic: frame.topic,
            event: "phx_reply",
            payload: { status: "ok", response: {} },
          });
        });
      } else if (frame.event === "heartbeat" && frame.topic === "phoenix") {
        queueMicrotask(() => {
          this._deliver({
            join_ref: null,
            ref: frame.ref,
            topic: "phoenix",
            event: "phx_reply",
            payload: { status: "ok", response: {} },
          });
        });
      } else if (frame.event === "broadcast") {
        const peers = wsRooms.get(frame.topic) || new Set();
        const cfg = this.joinedTopics.get(frame.topic);
        for (const peer of peers) {
          if (peer === this && !cfg?.selfBroadcast) continue;
          if (peer.readyState === MockWebSocket.OPEN) {
            queueMicrotask(() => {
              peer._deliver({
                join_ref: peer.joinedTopics.get(frame.topic)?.joinRef || null,
                ref: null,
                topic: frame.topic,
                event: "broadcast",
                payload: frame.payload,
              });
            });
          }
        }
      } else if (frame.event === "phx_leave") {
        wsRooms.get(frame.topic)?.delete(this);
        this.joinedTopics.delete(frame.topic);
      }
    }

    _deliver(obj) {
      if (this.readyState !== MockWebSocket.OPEN) return;
      const wire = this.isArrayFormat
        ? JSON.stringify([obj.join_ref ?? null, obj.ref ?? null, obj.topic, obj.event, obj.payload])
        : JSON.stringify(obj);
      this._emit("message", { data: wire });
    }

    close() {
      this.readyState = MockWebSocket.CLOSED;
      for (const topic of this.joinedTopics.keys()) wsRooms.get(topic)?.delete(this);
      this._emit("close", { code: 1000 });
    }
  }

  class MockBroadcastChannel {
    constructor(name) {
      this.name = String(name);
      this.closed = false;
      if (!bcRooms.has(this.name)) bcRooms.set(this.name, new Set());
      bcRooms.get(this.name).add(this);
    }
    addEventListener(type, fn) {
      this._listeners = this._listeners || {};
      (this._listeners[type] = this._listeners[type] || []).push(fn);
    }
    removeEventListener(type, fn) {
      if (!this._listeners?.[type]) return;
      this._listeners[type] = this._listeners[type].filter((f) => f !== fn);
    }
    postMessage(data) {
      if (this.closed) return;
      const cloned = structuredClone(data);
      for (const peer of bcRooms.get(this.name) || []) {
        if (peer === this || peer.closed) continue;
        queueMicrotask(() => {
          if (peer.closed) return;
          const ev = { data: cloned };
          if (typeof peer.onmessage === "function") peer.onmessage(ev);
          for (const fn of peer._listeners?.message || []) fn(ev);
        });
      }
    }
    close() {
      this.closed = true;
      bcRooms.get(this.name)?.delete(this);
    }
  }

  return { WebSocketImpl: MockWebSocket, BroadcastChannelImpl: MockBroadcastChannel, allSockets, wsRooms, bcRooms };
}

/**
 * Loads all chronological supabase/migrations/*.sql files and computes the effective
 * CREATE [OR REPLACE] FUNCTION definitions after applying migrations in timestamp order.
 */
export async function loadEffectiveSqlFunctions() {
  const migDir = path.join(YOMPLE_DIR, "supabase/migrations");
  const files = (await fs.readdir(migDir)).filter((f) => f.endsWith(".sql")).sort();
  const functions = new Map();
  const rawFiles = new Map();

  const fnRegex =
    /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)\s*\(([\s\S]*?)\)\s*returns([\s\S]*?)as\s+(\$[a-zA-Z0-9_]*\$)([\s\S]*?)\4\s*;/gi;

  for (const file of files) {
    const content = await fs.readFile(path.join(migDir, file), "utf8");
    rawFiles.set(file, content);
    let m;
    while ((m = fnRegex.exec(content)) !== null) {
      const name = m[1].toLowerCase();
      functions.set(name, {
        name,
        file,
        args: m[2].trim(),
        headerAttrs: m[3].trim(),
        body: m[5],
        fullSql: m[0],
      });
    }
  }

  return { files, rawFiles, functions };
}
