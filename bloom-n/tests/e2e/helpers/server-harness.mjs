/**
 * Bloom N E2E — Local Static Server Readiness & Zero-Dependency Phoenix Realtime WS Mock Relay
 * Zero external dependencies: uses Node v24 built-in node:http, node:crypto, node:fs/promises.
 */

import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const YOMPLE_ROOT = path.resolve(__dirname, "../../../..");
export const BLOOM_N_ROOT = path.resolve(__dirname, "../../..");
export const DEFAULT_PORT_URL = "http://127.0.0.1:8090";

export const SANDBOX_HTML =
  "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><link rel=\"icon\" href=\"data:,\"><title>Bloom N 3D Sandbox</title></head><body style=\"margin:0;background:#091525;overflow:hidden\"></body></html>";

const MIME_BY_EXT = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function probeExistingServer(baseUrl, timeoutMs = 1200) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${baseUrl}/bloom-n/`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const html = await res.text();
    return html.includes("screen-portal");
  } catch {
    return false;
  }
}

export async function ensureLocalServer() {
  if (process.env.BLOOM_N_BASE_URL) {
    return { baseUrl: process.env.BLOOM_N_BASE_URL, ephemeral: false, close: async () => {} };
  }
  if (await probeExistingServer(DEFAULT_PORT_URL)) {
    return { baseUrl: DEFAULT_PORT_URL, ephemeral: false, close: async () => {} };
  }

  const sockets = new Set();
  const server = http.createServer(async (req, res) => {
    try {
      const urlObj = new URL(req.url || "/", "http://127.0.0.1");
      let relPath = decodeURIComponent(urlObj.pathname);
      if (relPath.endsWith("__e2e_sandbox__.html")) {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end(SANDBOX_HTML);
        return;
      }
      if (relPath.endsWith("/")) relPath += "index.html";
      const absPath = path.resolve(YOMPLE_ROOT, "." + relPath);
      if (!absPath.startsWith(YOMPLE_ROOT)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      let stat = await fs.stat(absPath).catch(() => null);
      let finalPath = absPath;
      if (stat && stat.isDirectory()) {
        finalPath = path.join(absPath, "index.html");
        stat = await fs.stat(finalPath).catch(() => null);
      }
      if (!stat || !stat.isFile()) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }
      const ext = path.extname(finalPath).toLowerCase();
      const body = await fs.readFile(finalPath);
      res.writeHead(200, {
        "Content-Type": MIME_BY_EXT[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });

  server.on("connection", (s) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    ephemeral: true,
    close: async () => {
      for (const s of sockets) s.destroy();
      await new Promise((r) => server.close(() => r()));
    },
  };
}

/**
 * Zero-dependency RFC-6455 WebSocket + Supabase Realtime Phoenix Channels v1.0.0 mock relay.
 * Supports BOTH Phoenix array v2 [joinRef, ref, topic, event, payload]
 * AND Phoenix object v1 { topic, event, payload, ref, join_ref }!
 */
export async function startPhoenixRealtimeMockServer() {
  const clients = new Set();
  const receivedMessages = [];

  function encodeWsText(str) {
    const payload = Buffer.from(str, "utf8");
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x81, len]);
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
  }

  function formatReply(isArrayFormat, { joinRef = null, ref = null, topic, event, payload }) {
    return isArrayFormat
      ? JSON.stringify([joinRef, ref, topic, event, payload])
      : JSON.stringify({ topic, event, payload, ref, join_ref: joinRef });
  }

  const server = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end("phoenix-mock-ok");
  });

  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"] || "";
    const accept = crypto
      .createHash("sha1")
      .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
      .digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );

    const client = { socket, buf: Buffer.alloc(0), topics: new Map(), isArrayFormat: false };
    clients.add(client);

    const safeWrite = (sock, buf) => {
      try {
        if (!sock.destroyed && sock.writable) sock.write(buf);
      } catch {}
    };

    socket.on("data", (chunk) => {
      client.buf = Buffer.concat([client.buf, chunk]);
      while (client.buf.length >= 2) {
        const b0 = client.buf[0];
        const b1 = client.buf[1];
        const opcode = b0 & 0x0f;
        const masked = (b1 & 0x80) !== 0;
        let len = b1 & 0x7f;
        let offset = 2;
        if (len === 126) {
          if (client.buf.length < 4) return;
          len = client.buf.readUInt16BE(2);
          offset = 4;
        } else if (len === 127) {
          if (client.buf.length < 10) return;
          len = Number(client.buf.readBigUInt64BE(2));
          offset = 10;
        }
        const maskBytes = masked ? 4 : 0;
        if (client.buf.length < offset + maskBytes + len) return;
        const mask = masked ? client.buf.subarray(offset, offset + 4) : null;
        const data = Buffer.from(client.buf.subarray(offset + maskBytes, offset + maskBytes + len));
        client.buf = client.buf.subarray(offset + maskBytes + len);

        if (opcode === 0x8) {
          clients.delete(client);
          try {
            socket.end();
          } catch {}
          return;
        }
        if (opcode === 0x9) {
          safeWrite(socket, Buffer.from([0x8a, 0x00]));
          continue;
        }
        if (opcode !== 0x1) continue;
        if (mask) {
          for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
        }

        let raw;
        try {
          raw = JSON.parse(data.toString("utf8"));
        } catch {
          continue;
        }
        const isArr = Array.isArray(raw);
        client.isArrayFormat = isArr;
        const msg = isArr
          ? { joinRef: raw[0], ref: raw[1], topic: raw[2], event: raw[3], payload: raw[4] || {}, isArrayFormat: true }
          : {
              joinRef: raw.join_ref || null,
              ref: raw.ref || null,
              topic: raw.topic,
              event: raw.event,
              payload: raw.payload || {},
              isArrayFormat: false,
            };

        receivedMessages.push(msg);

        if (msg.event === "phx_join") {
          const presenceKey = msg.payload?.config?.presence?.key || `peer_${clients.size}`;
          const selfBroadcast = Boolean(msg.payload?.config?.broadcast?.self);
          client.topics.set(msg.topic, { joinRef: msg.joinRef, presenceKey, selfBroadcast, meta: null });
          safeWrite(
            socket,
            encodeWsText(
              formatReply(isArr, {
                joinRef: msg.joinRef,
                ref: msg.ref,
                topic: msg.topic,
                event: "phx_reply",
                payload: { status: "ok", response: {} },
              })
            )
          );
          const state = {};
          for (const c of clients) {
            const info = c.topics.get(msg.topic);
            if (info && info.meta) {
              state[info.presenceKey] = { metas: [info.meta] };
            }
          }
          safeWrite(
            socket,
            encodeWsText(formatReply(isArr, { joinRef: msg.joinRef, topic: msg.topic, event: "presence_state", payload: state }))
          );
        } else if (msg.event === "presence") {
          const info = client.topics.get(msg.topic);
          if (info && msg.payload?.event === "track") {
            info.meta = { ...(msg.payload.payload || {}), phx_ref: String(Date.now()) };
            const diff = { joins: { [info.presenceKey]: { metas: [info.meta] } }, leaves: {} };
            for (const c of clients) {
              const peerInfo = c.topics.get(msg.topic);
              if (peerInfo) {
                safeWrite(
                  c.socket,
                  encodeWsText(
                    formatReply(c.isArrayFormat, {
                      joinRef: peerInfo.joinRef,
                      topic: msg.topic,
                      event: "presence_diff",
                      payload: diff,
                    })
                  )
                );
              }
            }
          }
          safeWrite(
            socket,
            encodeWsText(
              formatReply(isArr, {
                joinRef: msg.joinRef,
                ref: msg.ref,
                topic: msg.topic,
                event: "phx_reply",
                payload: { status: "ok", response: {} },
              })
            )
          );
        } else if (msg.event === "heartbeat" && msg.topic === "phoenix") {
          safeWrite(
            socket,
            encodeWsText(
              formatReply(isArr, { ref: msg.ref, topic: "phoenix", event: "phx_reply", payload: { status: "ok", response: {} } })
            )
          );
        } else if (msg.event === "broadcast") {
          const senderInfo = client.topics.get(msg.topic);
          for (const other of clients) {
            const peerInfo = other.topics.get(msg.topic);
            if (!peerInfo) continue;
            if (other === client && !senderInfo?.selfBroadcast) continue;
            safeWrite(
              other.socket,
              encodeWsText(
                formatReply(other.isArrayFormat, {
                  joinRef: peerInfo.joinRef,
                  topic: msg.topic,
                  event: "broadcast",
                  payload: msg.payload,
                })
              )
            );
          }
        } else if (msg.event === "phx_leave") {
          const prevInfo = client.topics.get(msg.topic);
          client.topics.delete(msg.topic);
          if (prevInfo && prevInfo.meta) {
            const diff = { joins: {}, leaves: { [prevInfo.presenceKey]: { metas: [prevInfo.meta] } } };
            for (const c of clients) {
              const peerInfo = c.topics.get(msg.topic);
              if (peerInfo) {
                safeWrite(
                  c.socket,
                  encodeWsText(
                    formatReply(c.isArrayFormat, {
                      joinRef: peerInfo.joinRef,
                      topic: msg.topic,
                      event: "presence_diff",
                      payload: diff,
                    })
                  )
                );
              }
            }
          }
          safeWrite(
            socket,
            encodeWsText(
              formatReply(isArr, {
                joinRef: msg.joinRef,
                ref: msg.ref,
                topic: msg.topic,
                event: "phx_reply",
                payload: { status: "ok", response: {} },
              })
            )
          );
        }
      }
    });

    const cleanup = () => clients.delete(client);
    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return {
    wsUrl: `ws://127.0.0.1:${port}/realtime/v1/websocket`,
    receivedMessages,
    close: async () => {
      for (const c of clients) {
        try {
          c.socket.destroy();
        } catch {}
      }
      await new Promise((r) => server.close(() => r()));
    },
  };
}
