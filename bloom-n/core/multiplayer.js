/**
 * Bloom N — Live 2-Player Household Co-Op Engine (F21)
 * Dual-transport: Supabase Realtime (Phoenix Channels v1.0.0 WebSocket) + local BroadcastChannel mirror.
 * Zero external CDN dependencies, zero lobby screen, 100% non-stealable progression gates,
 * and playful shared loose Star-Coins (+3💎, 6s respawn).
 */

import { SB_URL, SB_KEY, slugName } from "./sync.js";

export const SHARED_COIN_IDS = ["coin_0", "coin_1", "coin_2", "coin_3"];
export const SHARED_COIN_REWARD_SHARDS = 3;
export const SHARED_COIN_RESPAWN_MS = 6000;
export const STATE_BROADCAST_INTERVAL_MS = 80; // ~12.5Hz
export const HEARTBEAT_INTERVAL_MS = 25000; // 25s Phoenix heartbeat
export const PEER_STALE_MS = 12000; // Prune silent peers after 12s

const ALLOWED_STATUSES = new Set(["roaming", "thinking", "overdrive", "surge"]);
const MAX_SEEN_MSG_IDS = 512;

export function buildRealtimeWsUrl(sbUrl = SB_URL, sbKey = SB_KEY) {
  const base = String(sbUrl || SB_URL).trim().replace(/\/+$/, "");
  const wsBase = base.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  const key = encodeURIComponent(String(sbKey || SB_KEY).trim());
  return `${wsBase}/realtime/v1/websocket?apikey=${key}&vsn=1.0.0`;
}

function unrefTimer(t) {
  if (t && typeof t.unref === "function") {
    try {
      t.unref();
    } catch (_) {}
  }
  return t;
}

export function createMultiplayerClient(opts = {}) {
  const {
    realmId = "frostwake",
    familyCode = "OPEN-HOUSE",
    userId = "explorer",
    displayName = "Explorer",
    avatar = "❄️",
    sbUrl = SB_URL,
    sbKey = SB_KEY,
    onPeersChanged = null,
    onRemoteEvent = null,
    onCoinStateChanged = null,
  } = opts;

  const WsCtor =
    opts.WebSocketImpl !== undefined
      ? opts.WebSocketImpl
      : typeof globalThis.WebSocket === "function"
      ? globalThis.WebSocket
      : null;
  const BcCtor =
    opts.BroadcastChannelImpl !== undefined
      ? opts.BroadcastChannelImpl
      : typeof globalThis.BroadcastChannel === "function"
      ? globalThis.BroadcastChannel
      : null;

  const effectiveThrottleMs = Math.max(
    10,
    Number(opts.throttleMs ?? opts.stateThrottleMs ?? STATE_BROADCAST_INTERVAL_MS) || STATE_BROADCAST_INTERVAL_MS
  );
  const effectiveHeartbeatMs = Math.max(
    20,
    Number(opts.heartbeatMs ?? opts.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS) || HEARTBEAT_INTERVAL_MS
  );
  const effectiveStalePeerMs = Math.max(
    50,
    Number(opts.stalePeerMs ?? opts.peerStaleMs ?? PEER_STALE_MS) || PEER_STALE_MS
  );
  const effectiveRespawnMs = Math.max(
    20,
    Number(opts.respawnMs ?? opts.coinRespawnMs ?? SHARED_COIN_RESPAWN_MS) || SHARED_COIN_RESPAWN_MS
  );

  const normFamily =
    String(familyCode || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "") || "OPEN-HOUSE";
  const rawRealm = String(realmId || "frostwake").trim().toLowerCase() || "frostwake";
  const normRealm = rawRealm === "oddroot" ? "oddroot" : rawRealm;
  const safeUserId = slugName(userId || displayName || "explorer");
  const safeDisplayName = String(displayName || safeUserId).trim().slice(0, 32) || safeUserId;
  const safeAvatar = String(avatar || "❄️").trim().slice(0, 8) || "❄️";

  const wsTopic = `realtime:bloomn:${normFamily}:${normRealm}`;
  const bcChannelName = `bloomn-coop:${normFamily}:${normRealm}`;
  const clientId = `${safeUserId}:${Math.random().toString(36).slice(2, 9)}`;

  let active = false;
  let ws = null;
  let bc = null;
  let refCounter = 0;
  let msgSeq = 0;
  let joinRef = null;
  let wsJoined = false;
  let reconnectAttempts = 0;

  let heartbeatTimer = null;
  let pruneTimer = null;
  let reconnectTimer = null;
  let trailingStateTimer = null;
  const coinTimers = new Map();
  const pendingWsBroadcasts = [];

  // 512-entry FIFO ring buffer deduplicating msgId across WS + BroadcastChannel
  const seenMsgIds = new Set();
  const seenQueue = [];

  function markMessageSeen(msgId) {
    if (!msgId) return true;
    if (seenMsgIds.has(msgId)) return false;
    seenMsgIds.add(msgId);
    seenQueue.push(msgId);
    if (seenQueue.length > MAX_SEEN_MSG_IDS) {
      const oldest = seenQueue.shift();
      seenMsgIds.delete(oldest);
    }
    return true;
  }

  function nextMsgId() {
    msgSeq += 1;
    return `${clientId}:${msgSeq}:${Date.now().toString(36)}`;
  }

  // Shared loose Star-Coins state map (coin_0 .. coin_3)
  const coinStates = {};
  for (const cid of SHARED_COIN_IDS) {
    coinStates[cid] = {
      coinId: cid,
      available: true,
      grabbedBy: null,
      grabbedByName: null,
      grabbedByAvatar: null,
      rewardShards: SHARED_COIN_REWARD_SHARDS,
      respawnMs: effectiveRespawnMs,
      respawnAt: 0,
    };
  }

  // Active remote partners keyed by remote clientId
  const peers = new Map();

  let lastLocalState = {
    userId: safeUserId,
    displayName: safeDisplayName,
    avatar: safeAvatar,
    realmId: normRealm,
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    speed: 0,
    chassisOrMount: "",
    chassisOrAvatar: "",
    upgrades: [],
    status: "roaming",
    zoneProgressRatio: 0,
    streakActive: false,
    ts: 0,
  };
  let hasPublishedLocalState = false;
  let lastStateSentAt = 0;
  let lastSentStatus = "";

  function cloneCoinStates() {
    const out = {};
    for (const cid of SHARED_COIN_IDS) {
      out[cid] = { ...coinStates[cid] };
    }
    return out;
  }

  function emitCoinChanged(changedCoin) {
    if (typeof onCoinStateChanged === "function") {
      try {
        onCoinStateChanged(cloneCoinStates(), { ...changedCoin });
      } catch (_) {}
    }
  }

  function scheduleCoinRespawn(coinId, delayMs = effectiveRespawnMs) {
    const prev = coinTimers.get(coinId);
    if (prev) clearTimeout(prev);
    const wait = Math.max(15, Number(delayMs) || effectiveRespawnMs);
    const t = unrefTimer(
      setTimeout(() => {
        coinTimers.delete(coinId);
        coinStates[coinId] = {
          coinId,
          available: true,
          grabbedBy: null,
          grabbedByName: null,
          grabbedByAvatar: null,
          rewardShards: SHARED_COIN_REWARD_SHARDS,
          respawnMs: effectiveRespawnMs,
          respawnAt: 0,
        };
        emitCoinChanged(coinStates[coinId]);
      }, wait)
    );
    coinTimers.set(coinId, t);
  }

  function pruneStalePeers(now = Date.now()) {
    let changed = false;
    for (const [key, peer] of peers.entries()) {
      if (now - (peer.lastSeenAt || 0) > effectiveStalePeerMs) {
        peers.delete(key);
        changed = true;
      }
    }
    if (changed) notifyPeersChanged();
    return changed;
  }

  function clonePeersArray() {
    const list = [];
    for (const p of peers.values()) {
      list.push({
        ...p,
        upgrades: Array.isArray(p.upgrades) ? [...p.upgrades] : [],
      });
    }
    return list;
  }

  function notifyPeersChanged() {
    if (typeof onPeersChanged === "function") {
      try {
        onPeersChanged(clonePeersArray());
      } catch (_) {}
    }
  }

  function wsSendRaw(frame) {
    if (!ws || ws.readyState !== 1) return false;
    try {
      ws.send(JSON.stringify(frame));
      return true;
    } catch (_) {
      return false;
    }
  }

  function wsSendBroadcastEnvelope(eventName, payloadObj) {
    return wsSendRaw({
      topic: wsTopic,
      event: "broadcast",
      payload: {
        type: "broadcast",
        event: eventName,
        payload: payloadObj,
      },
      ref: String(++refCounter),
      join_ref: joinRef,
    });
  }

  function transmitBroadcast(eventName, payloadObj) {
    markMessageSeen(payloadObj.msgId);

    // 1. Local same-device BroadcastChannel mirror (<1ms latency, works 100% offline)
    if (bc) {
      try {
        bc.postMessage({
          topic: wsTopic,
          event: eventName,
          payload: payloadObj,
        });
      } catch (_) {}
    }

    // 2. Supabase Realtime Phoenix Channels v1.0.0 broadcast envelope
    if (!wsSendBroadcastEnvelope(eventName, payloadObj)) {
      if (ws && ws.readyState === 0 && eventName !== "player_state" && eventName !== "peer_leave") {
        if (pendingWsBroadcasts.length >= 16) pendingWsBroadcasts.shift();
        pendingWsBroadcasts.push({ eventName, payloadObj });
      }
    }
  }

  function handleIncomingEnvelope(eventName, payload) {
    if (!payload || typeof payload !== "object") return;
    if (payload.clientId && payload.clientId === clientId) return;
    if (!payload.clientId && payload.userId === safeUserId) return;
    if (!markMessageSeen(payload.msgId)) return;

    const now = Date.now();

    if (eventName === "peer_leave") {
      const peerKey = payload.clientId || payload.userId;
      if (peerKey && peers.delete(peerKey)) {
        notifyPeersChanged();
      }
      return;
    }

    if (eventName === "player_state") {
      const peerKey = payload.clientId || payload.userId;
      if (!peerKey) return;

      // Clean older session entry if a sibling reloaded their tab
      if (payload.userId && payload.userId !== safeUserId) {
        for (const [k, existing] of peers.entries()) {
          if (k !== peerKey && existing.userId === payload.userId && now - existing.lastSeenAt > 2000) {
            peers.delete(k);
          }
        }
      }

      const isNewPeer = !peers.has(peerKey);
      const status = ALLOWED_STATUSES.has(payload.status) ? payload.status : "roaming";
      const modelId = String(payload.chassisOrMount ?? payload.chassisOrAvatar ?? "");
      peers.set(peerKey, {
        peerId: peerKey,
        clientId: payload.clientId || peerKey,
        userId: String(payload.userId || "partner"),
        displayName: String(payload.displayName || payload.userId || "Partner").slice(0, 32),
        avatar: String(payload.avatar || "❄️").slice(0, 8),
        realmId: String(payload.realmId || normRealm),
        x: Number(payload.x) || 0,
        y: Number(payload.y) || 0,
        z: Number(payload.z) || 0,
        heading: Number(payload.heading) || 0,
        speed: Number(payload.speed) || 0,
        chassisOrMount: modelId,
        chassisOrAvatar: modelId,
        upgrades: Array.isArray(payload.upgrades) ? payload.upgrades.slice(0, 12) : [],
        status,
        zoneProgressRatio: Math.max(0, Math.min(1, Number(payload.zoneProgressRatio) || 0)),
        streakActive: Boolean(payload.streakActive || status === "overdrive" || status === "surge"),
        ts: Number(payload.ts) || now,
        lastSeenAt: now,
      });
      notifyPeersChanged();

      // Reciprocal handshake so newly joined sibling sees parked local player right away!
      if (isNewPeer && active && hasPublishedLocalState) {
        flushLocalStateNow(true);
      }
      return;
    }

    if (eventName === "coin_grab") {
      const cid = payload.coinId;
      if (!SHARED_COIN_IDS.includes(cid)) return;
      const rMs = Math.max(20, Number(payload.respawnMs) || effectiveRespawnMs);
      coinStates[cid] = {
        coinId: cid,
        available: false,
        grabbedBy: String(payload.byUser || payload.userId || "partner"),
        grabbedByName: String(payload.byName || payload.displayName || "Partner").slice(0, 32),
        grabbedByAvatar: String(payload.byAvatar || payload.avatar || "⭐").slice(0, 8),
        rewardShards: SHARED_COIN_REWARD_SHARDS,
        respawnMs: rMs,
        respawnAt: now + rMs,
      };
      scheduleCoinRespawn(cid, rMs);
      emitCoinChanged(coinStates[cid]);
      if (typeof onRemoteEvent === "function") {
        try {
          onRemoteEvent({ ...payload, type: "coin_grab" });
        } catch (_) {}
      }
      return;
    }

    if (eventName === "gate_burst" || eventName === "friendly_flare") {
      if (typeof onRemoteEvent === "function") {
        try {
          onRemoteEvent({ ...payload, type: eventName });
        } catch (_) {}
      }
    }
  }

  function openBroadcastChannel() {
    if (bc || typeof BcCtor !== "function") return;
    try {
      bc = new BcCtor(bcChannelName);
      if (bc && typeof bc.unref === "function") {
        try {
          bc.unref();
        } catch (_) {}
      }
      bc.onmessage = (ev) => {
        if (!active) return;
        const msg = ev && ev.data ? ev.data : ev;
        if (!msg || typeof msg !== "object") return;
        if (msg.topic && msg.topic !== wsTopic) return;
        if (msg.event && msg.payload) {
          handleIncomingEnvelope(msg.event, msg.payload);
        }
      };
    } catch (_) {
      bc = null;
    }
  }

  function scheduleWsReconnect() {
    if (!active || reconnectTimer || typeof WsCtor !== "function") return;
    const delay = Math.min(15000, 1500 * Math.pow(2, Math.min(reconnectAttempts, 3)));
    reconnectAttempts += 1;
    reconnectTimer = unrefTimer(
      setTimeout(() => {
        reconnectTimer = null;
        if (active) openWebSocket();
      }, delay)
    );
  }

  function openWebSocket() {
    if (!active || ws || typeof WsCtor !== "function") return;
    let socket = null;
    try {
      socket = new WsCtor(buildRealtimeWsUrl(sbUrl, sbKey));
    } catch (_) {
      scheduleWsReconnect();
      return;
    }
    ws = socket;
    wsJoined = false;

    const onOpen = () => {
      if (!active || ws !== socket) return;
      reconnectAttempts = 0;
      joinRef = String(++refCounter);
      wsSendRaw({
        topic: wsTopic,
        event: "phx_join",
        payload: {
          config: {
            broadcast: { self: false, ack: false },
            presence: { key: safeUserId },
            private: false,
          },
          access_token: String(sbKey || SB_KEY),
        },
        ref: joinRef,
        join_ref: joinRef,
      });

      clearInterval(heartbeatTimer);
      heartbeatTimer = unrefTimer(
        setInterval(() => {
          if (!active || !ws || ws.readyState !== 1) return;
          wsSendRaw({
            topic: "phoenix",
            event: "heartbeat",
            payload: {},
            ref: String(++refCounter),
          });
        }, effectiveHeartbeatMs)
      );

      while (pendingWsBroadcasts.length > 0) {
        const item = pendingWsBroadcasts.shift();
        wsSendBroadcastEnvelope(item.eventName, item.payloadObj);
      }

      if (hasPublishedLocalState) {
        flushLocalStateNow(true);
      }
    };

    const onMessage = (ev) => {
      if (!active || ws !== socket) return;
      const raw = typeof ev === "string" ? ev : ev && typeof ev.data === "string" ? ev.data : null;
      if (!raw) return;
      let frame = null;
      try {
        frame = JSON.parse(raw);
      } catch (_) {
        return;
      }
      if (!frame || typeof frame !== "object") return;

      if (frame.topic === wsTopic && frame.event === "phx_reply") {
        if (frame.payload && frame.payload.status === "ok" && !wsJoined) {
          wsJoined = true;
          if (hasPublishedLocalState) flushLocalStateNow(true);
        }
        return;
      }

      if (frame.topic === wsTopic && frame.event === "broadcast" && frame.payload) {
        const innerEvent = frame.payload.event;
        const innerPayload = frame.payload.payload || frame.payload;
        if (innerEvent && innerPayload) {
          handleIncomingEnvelope(innerEvent, innerPayload);
        }
      }
    };

    const onCloseOrError = () => {
      if (ws === socket) {
        ws = null;
        wsJoined = false;
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        if (active) scheduleWsReconnect();
      }
    };

    if (typeof socket.addEventListener === "function") {
      socket.addEventListener("open", onOpen);
      socket.addEventListener("message", onMessage);
      socket.addEventListener("close", onCloseOrError);
      socket.addEventListener("error", () => {});
    } else {
      socket.onopen = onOpen;
      socket.onmessage = onMessage;
      socket.onclose = onCloseOrError;
      socket.onerror = () => {};
    }

    // Handle synchronous mock sockets that start in OPEN (readyState === 1) inside constructor
    if (socket.readyState === 1 && !joinRef) {
      onOpen();
    }
  }

  function flushLocalStateNow(forceSend = false) {
    if (!active && !forceSend) return;
    if (trailingStateTimer) {
      clearTimeout(trailingStateTimer);
      trailingStateTimer = null;
    }
    const now = Date.now();
    lastStateSentAt = now;
    lastSentStatus = lastLocalState.status;
    const packet = {
      ...lastLocalState,
      type: "player_state",
      msgId: nextMsgId(),
      clientId,
      ts: now,
    };
    transmitBroadcast("player_state", packet);
  }

  function connect() {
    if (active) return clientApi;
    active = true;
    openBroadcastChannel();
    openWebSocket();
    clearInterval(pruneTimer);
    pruneTimer = unrefTimer(
      setInterval(() => {
        if (active) pruneStalePeers();
      }, Math.max(25, Math.min(3000, Math.floor(effectiveStalePeerMs / 2))))
    );
    return clientApi;
  }

  function disconnect() {
    if (!active && !ws && !bc) return;
    if (active) {
      transmitBroadcast("peer_leave", {
        type: "peer_leave",
        msgId: nextMsgId(),
        clientId,
        userId: safeUserId,
        ts: Date.now(),
      });
    }
    active = false;
    wsJoined = false;
    pendingWsBroadcasts.length = 0;

    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    clearInterval(pruneTimer);
    pruneTimer = null;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    clearTimeout(trailingStateTimer);
    trailingStateTimer = null;

    for (const t of coinTimers.values()) clearTimeout(t);
    coinTimers.clear();

    if (ws) {
      const closingWs = ws;
      ws = null;
      if (closingWs.readyState === 1) {
        try {
          closingWs.send(
            JSON.stringify({
              topic: wsTopic,
              event: "phx_leave",
              payload: {},
              ref: String(++refCounter),
              join_ref: joinRef,
            })
          );
        } catch (_) {}
      }
      try {
        closingWs.close();
      } catch (_) {}
    }

    if (bc) {
      const closingBc = bc;
      bc = null;
      try {
        closingBc.onmessage = null;
        closingBc.close();
      } catch (_) {}
    }
  }

  function publishLocalState(statePatch = {}) {
    const now = Date.now();
    pruneStalePeers(now);

    const status = ALLOWED_STATUSES.has(statePatch.status)
      ? statePatch.status
      : lastLocalState.status || "roaming";
    const modelId = String(
      statePatch.chassisOrMount ?? statePatch.chassisOrAvatar ?? lastLocalState.chassisOrMount ?? ""
    );

    lastLocalState = {
      userId: safeUserId,
      displayName: String(statePatch.displayName || safeDisplayName).slice(0, 32),
      avatar: String(statePatch.avatar || safeAvatar).slice(0, 8),
      realmId: normRealm,
      x: Number.isFinite(Number(statePatch.x))
        ? Math.round(Number(statePatch.x) * 100) / 100
        : lastLocalState.x,
      y: Number.isFinite(Number(statePatch.y))
        ? Math.round(Number(statePatch.y) * 100) / 100
        : lastLocalState.y,
      z: Number.isFinite(Number(statePatch.z))
        ? Math.round(Number(statePatch.z) * 100) / 100
        : lastLocalState.z,
      heading: Number.isFinite(Number(statePatch.heading))
        ? Math.round(Number(statePatch.heading) * 1000) / 1000
        : lastLocalState.heading,
      speed: Number.isFinite(Number(statePatch.speed))
        ? Math.round(Number(statePatch.speed) * 100) / 100
        : 0,
      chassisOrMount: modelId,
      chassisOrAvatar: modelId,
      upgrades: Array.isArray(statePatch.upgrades)
        ? statePatch.upgrades.slice(0, 12)
        : lastLocalState.upgrades,
      status,
      zoneProgressRatio: Number.isFinite(Number(statePatch.zoneProgressRatio))
        ? Math.max(0, Math.min(1, Math.round(Number(statePatch.zoneProgressRatio) * 1000) / 1000))
        : lastLocalState.zoneProgressRatio,
      streakActive:
        statePatch.streakActive !== undefined
          ? Boolean(statePatch.streakActive)
          : Boolean(status === "overdrive" || status === "surge"),
      ts: now,
    };
    hasPublishedLocalState = true;

    if (!active) return false;

    const elapsed = now - lastStateSentAt;
    const statusChanged = status !== lastSentStatus;
    if (lastStateSentAt === 0 || elapsed >= effectiveThrottleMs || statusChanged) {
      flushLocalStateNow();
      return true;
    }

    if (!trailingStateTimer) {
      const remaining = Math.max(8, effectiveThrottleMs - elapsed);
      trailingStateTimer = unrefTimer(
        setTimeout(() => {
          trailingStateTimer = null;
          if (active) flushLocalStateNow();
        }, remaining)
      );
    }
    return false;
  }

  function sendGateBurst({ overdrive = false, worldId = "", nodeId = "", x, y, z } = {}) {
    if (!active) return false;
    const payload = {
      type: "gate_burst",
      msgId: nextMsgId(),
      clientId,
      userId: safeUserId,
      byUser: safeUserId,
      byName: safeDisplayName,
      byAvatar: safeAvatar,
      realmId: normRealm,
      overdrive: Boolean(overdrive),
      worldId: String(worldId || ""),
      nodeId: String(nodeId || ""),
      x: Number.isFinite(Number(x)) ? Number(x) : lastLocalState.x,
      y: Number.isFinite(Number(y)) ? Number(y) : lastLocalState.y,
      z: Number.isFinite(Number(z)) ? Number(z) : lastLocalState.z,
      ts: Date.now(),
    };
    transmitBroadcast("gate_burst", payload);
    return true;
  }

  function sendFriendlyFlare({ x, y, z, kind = "star_heart" } = {}) {
    if (!active) return false;
    const payload = {
      type: "friendly_flare",
      msgId: nextMsgId(),
      clientId,
      userId: safeUserId,
      byUser: safeUserId,
      byName: safeDisplayName,
      byAvatar: safeAvatar,
      realmId: normRealm,
      kind: String(kind || "star_heart"),
      x: Number.isFinite(Number(x)) ? Number(x) : lastLocalState.x,
      y: Number.isFinite(Number(y)) ? Number(y) : lastLocalState.y,
      z: Number.isFinite(Number(z)) ? Number(z) : lastLocalState.z,
      ts: Date.now(),
    };
    transmitBroadcast("friendly_flare", payload);
    return true;
  }

  function tryGrabSharedCoin(coinId, { x, y, z } = {}) {
    if (!SHARED_COIN_IDS.includes(coinId)) return false;
    const now = Date.now();
    const cur = coinStates[coinId];
    if (!cur.available && now < cur.respawnAt) {
      return false;
    }

    coinStates[coinId] = {
      coinId,
      available: false,
      grabbedBy: safeUserId,
      grabbedByName: safeDisplayName,
      grabbedByAvatar: safeAvatar,
      rewardShards: SHARED_COIN_REWARD_SHARDS,
      respawnMs: effectiveRespawnMs,
      respawnAt: now + effectiveRespawnMs,
    };
    scheduleCoinRespawn(coinId, effectiveRespawnMs);
    emitCoinChanged(coinStates[coinId]);

    if (active) {
      const payload = {
        type: "coin_grab",
        msgId: nextMsgId(),
        clientId,
        userId: safeUserId,
        coinId,
        byUser: safeUserId,
        byName: safeDisplayName,
        byAvatar: safeAvatar,
        rewardShards: SHARED_COIN_REWARD_SHARDS,
        respawnMs: effectiveRespawnMs,
        bannerText: `${safeAvatar} ${safeDisplayName} snagged a Star-Coin!`,
        x: Number.isFinite(Number(x)) ? Number(x) : lastLocalState.x,
        y: Number.isFinite(Number(y)) ? Number(y) : lastLocalState.y,
        z: Number.isFinite(Number(z)) ? Number(z) : lastLocalState.z,
        ts: now,
      };
      transmitBroadcast("coin_grab", payload);
    }
    return true;
  }

  function getPeers() {
    pruneStalePeers();
    return clonePeersArray();
  }

  function getCoinStates() {
    return cloneCoinStates();
  }

  const clientApi = {
    topic: wsTopic,
    broadcastChannelName: bcChannelName,
    clientId,
    userId: safeUserId,
    realmId: normRealm,
    familyCode: normFamily,
    connect,
    disconnect,
    publishLocalState,
    sendGateBurst,
    sendFriendlyFlare,
    tryGrabSharedCoin,
    getPeers,
    getCoinStates,
    isConnected: () => active,
    isWsOpen: () => Boolean(ws && ws.readyState === 1),
  };

  return clientApi;
}
