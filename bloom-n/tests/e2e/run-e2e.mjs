#!/usr/bin/env node
/**
 * Bloom N — Opaque-Box 4-Tier E2E Test Runner
 * Usage:
 *   node /home/antigravity/dirac1974/yomple/bloom-n/tests/e2e/run-e2e.mjs
 *   node /home/antigravity/dirac1974/yomple/bloom-n/tests/e2e/run-e2e.mjs --tier=1
 *   node /home/antigravity/dirac1974/yomple/bloom-n/tests/e2e/run-e2e.mjs --tier=1,2
 *
 * Exits 0 IFF 100% of executed tests pass (fail===0, skipped===0, todo===0, cancelled===0, tests >= minTests).
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureLocalServer } from "./helpers/server-harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PER_TIER_TIMEOUT_MS = 90000;

const TIERS = [
  { tier: 1, name: "Tier 1 — Feature Coverage (F01–F21)", file: "tier1-features.test.mjs", minTests: 115 },
  { tier: 2, name: "Tier 2 — Boundaries, Anti-Scrub & Determinism", file: "tier2-boundaries.test.mjs", minTests: 110 },
  { tier: 3, name: "Tier 3 — Cross-Feature, Portal & Co-Op Interactions", file: "tier3-cross-feature.test.mjs", minTests: 28 },
  {
    tier: 4,
    name: "Tier 4 — Live Chromium WebGL Sarah, David & 2-Player Co-Op Journeys",
    file: "tier4-scenarios.test.mjs",
    minTests: 12,
  },
];

function parseRequestedTiers(argv) {
  const selected = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    let raw = null;
    if (arg.startsWith("--tier=")) {
      raw = arg.slice("--tier=".length);
    } else if (arg === "--tier") {
      if (i + 1 >= argv.length) {
        console.error(`Missing value after --tier. Supported tiers: 1, 2, 3, 4.`);
        process.exit(1);
      }
      raw = argv[++i];
    } else {
      console.error(`Unknown CLI flag "${arg}". Supported usage: --tier=1|2|3|4`);
      process.exit(1);
    }

    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      console.error(`Empty --tier value. Supported tiers: 1, 2, 3, 4.`);
      process.exit(1);
    }
    for (const part of parts) {
      const n = Number(part);
      if (!Number.isInteger(n) || ![1, 2, 3, 4].includes(n)) {
        console.error(`Invalid --tier value "${part}". Supported tiers: 1, 2, 3, 4.`);
        process.exit(1);
      }
      if (!selected.includes(n)) selected.push(n);
    }
  }
  return selected.length > 0 ? TIERS.filter((t) => selected.includes(t.tier)) : TIERS;
}

function parseSpecCounts(output) {
  const clean = output.replace(/\x1b\[[0-9;]*m/g, "");
  const grab = (key) => {
    const re = new RegExp(`(?:ℹ|i)\\s+${key}\\s+(\\d+)`, "ig");
    let m;
    let last = 0;
    while ((m = re.exec(clean)) !== null) {
      last = Number(m[1]);
    }
    return last;
  };
  return {
    tests: grab("tests"),
    pass: grab("pass"),
    fail: grab("fail"),
    cancelled: grab("cancelled"),
    skipped: grab("skipped"),
    todo: grab("todo"),
  };
}

let activeChild = null;
function killActiveChild() {
  if (activeChild && activeChild.pid) {
    try {
      process.kill(-activeChild.pid, "SIGKILL");
    } catch {}
    try {
      activeChild.kill("SIGKILL");
    } catch {}
    activeChild = null;
  }
}

function sweepOrphanCdpDirs() {
  try {
    const tmp = os.tmpdir();
    for (const name of fs.readdirSync(tmp)) {
      if (name.startsWith("bloom-n-cdp-")) {
        try {
          fs.rmSync(path.join(tmp, name), { recursive: true, force: true });
        } catch {}
      }
    }
  } catch {}
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(sig, () => {
    killActiveChild();
    sweepOrphanCdpDirs();
    process.exit(130);
  });
}

async function runSingleTier(tierSpec, baseUrl) {
  const t0 = performance.now();
  const absFile = path.join(__dirname, tierSpec.file);

  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--test", "--test-force-exit", "--test-reporter=spec", absFile],
      {
        cwd: __dirname,
        env: { ...process.env, BLOOM_N_BASE_URL: baseUrl },
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    activeChild = child;

    let combined = "";
    let timedOut = false;

    child.stdout.on("data", (d) => {
      const s = d.toString();
      combined += s;
      process.stdout.write(s);
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      combined += s;
      process.stderr.write(s);
    });

    const safetyTimer = setTimeout(() => {
      timedOut = true;
      console.error(`\n[TIMEOUT] ${tierSpec.name} exceeded ${PER_TIER_TIMEOUT_MS}ms safety timeout!`);
      killActiveChild();
    }, PER_TIER_TIMEOUT_MS);

    child.once("close", (code, signal) => {
      clearTimeout(safetyTimer);
      killActiveChild();
      const elapsedMs = Math.round(performance.now() - t0);
      const counts = parseSpecCounts(combined);
      const meetsMinTests = counts.tests >= tierSpec.minTests;
      const zeroCheatingOk =
        !timedOut &&
        code === 0 &&
        !signal &&
        meetsMinTests &&
        counts.fail === 0 &&
        counts.cancelled === 0 &&
        counts.skipped === 0 &&
        counts.todo === 0 &&
        counts.pass === counts.tests;

      if (!meetsMinTests) {
        console.error(
          `[MIN-TESTS VIOLATION] ${tierSpec.name}: executed ${counts.tests} tests, expected >= ${tierSpec.minTests}.`
        );
      }

      resolve({
        ...tierSpec,
        code: code ?? 1,
        signal,
        timedOut,
        elapsedMs,
        counts,
        ok: zeroCheatingOk,
      });
    });
  });
}

async function main() {
  const overallStart = performance.now();
  const requested = parseRequestedTiers(process.argv.slice(2));
  const server = await ensureLocalServer();

  const results = [];
  try {
    for (const tierSpec of requested) {
      console.log(`\n======================================================================`);
      console.log(`▶ Running ${tierSpec.name} (${tierSpec.file})`);
      console.log(`======================================================================`);
      results.push(await runSingleTier(tierSpec, server.baseUrl));
    }
  } finally {
    killActiveChild();
    await server.close();
    sweepOrphanCdpDirs();
  }

  const totalMs = Math.round(performance.now() - overallStart);
  let totalTests = 0;
  let totalPass = 0;
  let totalFail = 0;

  console.log(`\n==================== BLOOM N E2E SUMMARY (${totalMs}ms) ====================`);
  for (const r of results) {
    totalTests += r.counts.tests;
    totalPass += r.counts.pass;
    totalFail += r.counts.fail + r.counts.cancelled + r.counts.skipped + r.counts.todo;
    const badge = r.ok ? "PASS" : "FAIL";
    console.log(
      `[${badge}] Tier ${r.tier} | pass=${r.counts.pass}/${r.counts.tests} (min=${r.minTests}) | fail=${r.counts.fail} | skip/todo=${r.counts.skipped + r.counts.todo} | ${r.elapsedMs}ms`
    );
  }
  console.log(`----------------------------------------------------------------------`);
  console.log(`TOTAL: ${totalPass}/${totalTests} passed (${totalFail} failed/skipped) in ${(totalMs / 1000).toFixed(2)}s`);

  const allOk = results.length > 0 && results.every((r) => r.ok);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  killActiveChild();
  sweepOrphanCdpDirs();
  console.error("Fatal error in run-e2e.mjs:", err);
  process.exit(1);
});
