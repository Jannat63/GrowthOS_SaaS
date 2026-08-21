#!/usr/bin/env node
// `pnpm local` — the one command from the README. Runs everything scripts/local/setup.mjs does
// (every step there is safe to re-run), then starts the web + API dev servers and waits for them
// to actually answer requests before printing the "ready" banner — so the banner is a promise
// you can rely on, not a guess.

import { spawn } from "node:child_process";
import http from "node:http";
import { ok, fail, info, heading, waitForTcp, waitForHttp } from "./lib.mjs";
import {
  ROOT,
  PORTS,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  checkPrereqs,
  writeEnvFiles,
  installDependencies,
  startInfra,
  pushSchema,
  seedDemoData,
} from "./setup.mjs";

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, { timeout: 5000 }, (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode ?? 0, json: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode ?? 0, json: null });
          }
        });
      })
      .on("timeout", function () {
        this.destroy();
        reject(new Error("timed out"));
      })
      .on("error", reject);
  });
}

/**
 * Prints the PostgreSQL/Redis/ClickHouse/API/Web checklist the README promises, driven by the
 * API's own `/health/ready` (apps/api/src/app.ts) rather than re-implementing per-service probes
 * — it already checks each dependency the same way request handlers actually use it, which a bare
 * "is the TCP port open" check can't tell you (a port can be open with the wrong credentials
 * behind it).
 */
async function healthCheck() {
  heading("Health check");

  let ready;
  try {
    ready = await getJson(`http://localhost:${PORTS.api}/health/ready`);
  } catch (err) {
    fail(`API — could not reach http://localhost:${PORTS.api} (${err.message})`);
    console.log("\n  The API isn't answering at all. Scroll up in this terminal for its actual");
    console.log("  startup error — the most common cause is a typo in apps/api/.env.\n");
    return false;
  }

  const checks = ready.json?.checks ?? {};
  const label = { database: "PostgreSQL", redis: "Redis", clickhouse: "ClickHouse" };
  let allOk = true;

  for (const key of ["database", "redis", "clickhouse"]) {
    const check = checks[key];
    if (check?.status === "ok") {
      ok(label[key]);
    } else {
      allOk = false;
      fail(`${label[key]} — ${check?.error ?? "not reachable"}`);
    }
  }

  if (ready.status === 200) ok("API");
  else {
    allOk = false;
    fail(`API — responding, but reports itself degraded (HTTP ${ready.status})`);
  }

  try {
    await waitForTcp("localhost", PORTS.web, { timeoutMs: 5000 });
    ok("Web");
  } catch {
    allOk = false;
    fail(`Web — nothing listening on :${PORTS.web} yet`);
  }

  return allOk;
}

function startDevServers() {
  heading("Starting the app");
  info(`pnpm dev (web on :${PORTS.web}, API on :${PORTS.api})`);
  const child = spawn("pnpm", ["dev"], { cwd: ROOT, stdio: "inherit" });

  // Forward Ctrl+C (and a normal `kill`) instead of leaving the dev servers running as orphans
  // after this script exits.
  const relay = (signal) => () => {
    child.kill(signal);
    process.exit(0);
  };
  process.on("SIGINT", relay("SIGINT"));
  process.on("SIGTERM", relay("SIGTERM"));

  child.on("exit", (code) => process.exit(code ?? 0));
  return child;
}

function printBanner() {
  const line = "─".repeat(46);
  console.log(`\n${line}`);
  console.log("GrowthOS is ready!");
  console.log(line);
  console.log(`\nWeb:\n  http://localhost:${PORTS.web}`);
  console.log(`\nAPI:\n  http://localhost:${PORTS.api}`);
  console.log(`\nDemo login (local development only):\n  Email:    ${DEMO_EMAIL}\n  Password: ${DEMO_PASSWORD}`);
  console.log(`\n${line}`);
  console.log("Press Ctrl+C to stop.\n");
}

async function main() {
  await checkPrereqs();
  writeEnvFiles();
  await installDependencies();
  await startInfra();
  await pushSchema();
  await seedDemoData();

  startDevServers();

  heading("Waiting for the app to come up");
  try {
    await waitForHttp(`http://localhost:${PORTS.api}/health`, { timeoutMs: 60_000 });
    await waitForTcp("localhost", PORTS.web, { timeoutMs: 60_000 });
  } catch (err) {
    fail(err.message);
    console.log("\n  The dev servers are still starting in this terminal — give them a few more");
    console.log("  seconds and check the URLs below, or scroll up for the actual error.\n");
  }

  await healthCheck();
  printBanner();
}

main().catch((err) => {
  fail(err.message ?? String(err));
  process.exit(1);
});
