// Shared helpers for scripts/local/setup.mjs and scripts/local/start.mjs.
// Deliberately zero npm dependencies — these scripts are the very first thing a non-developer
// runs, sometimes before `pnpm install` has ever completed, so they can only rely on Node's
// built-ins (this file itself is fine to load pre-install; anything that shells out to `pnpm`,
// `turbo`, etc. is the caller's responsibility to sequence after installing).

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COLOR = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

// Respect NO_COLOR / non-TTY output (piping into a log file, CI, etc.) rather than printing raw
// escape codes into somewhere they'll never be interpreted.
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColor ? `${code}${s}${COLOR.reset}` : s);

export const ok = (msg) => console.log(`${c(COLOR.green, "✓")} ${msg}`);
export const fail = (msg) => console.log(`${c(COLOR.red, "✗")} ${msg}`);
export const info = (msg) => console.log(`${c(COLOR.cyan, "→")} ${msg}`);
export const warn = (msg) => console.log(`${c(COLOR.yellow, "!")} ${msg}`);
export const heading = (msg) => console.log(`\n${c(COLOR.bold, msg)}`);

/** Run a command with inherited stdio (the user sees real output), rejecting on non-zero exit. */
export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} ${signal ? `killed by ${signal}` : `exited with code ${code}`}`));
    });
  });
}

/** Run a command capturing output instead of streaming it — for probes, not for user-facing steps. */
export function runCapture(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let out = "";
    child.stdout?.on("data", (d) => (out += d));
    child.stderr?.on("data", (d) => (out += d));
    child.on("error", () => resolve({ code: 1, out: "" }));
    child.on("exit", (code) => resolve({ code: code ?? 1, out }));
  });
}

export async function commandExists(cmd) {
  const probe = process.platform === "win32" ? "where" : "which";
  const { code } = await runCapture(probe, [cmd]);
  return code === 0;
}

export const genHex = (bytes = 32) => randomBytes(bytes).toString("hex");
export const genBase64 = (bytes = 32) => randomBytes(bytes).toString("base64");

/** Poll a TCP port until it accepts a connection, or reject after timeoutMs. */
export function waitForTcp(host, port, { timeoutMs = 60_000, intervalMs = 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const sock = createConnection({ host, port });
      const done = (okConn) => {
        sock.removeAllListeners();
        sock.destroy();
        if (okConn) return resolve();
        if (Date.now() > deadline) return reject(new Error(`timed out waiting for ${host}:${port}`));
        setTimeout(attempt, intervalMs);
      };
      sock.on("connect", () => done(true));
      sock.on("error", () => done(false));
    };
    attempt();
  });
}

/** Poll an HTTP URL until `validate(status, body)` passes (default: any non-5xx), or reject. */
export function waitForHttp(url, { timeoutMs = 60_000, intervalMs = 1000, validate } = {}) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, { timeout: 3000 }, (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          const good = validate ? validate(res.statusCode ?? 0, body) : (res.statusCode ?? 0) < 500;
          good ? resolve() : retry();
        });
      });
      req.on("timeout", () => req.destroy());
      req.on("error", retry);
      function retry() {
        if (Date.now() > deadline) reject(new Error(`timed out waiting for ${url}`));
        else setTimeout(attempt, intervalMs);
      }
    };
    attempt();
  });
}

/**
 * Write a file only if it doesn't already exist — never clobbers a developer's real config just
 * because Local Demo Mode ran. Returns whether it wrote anything.
 */
export function ensureEnvFile(filePath, lines) {
  if (existsSync(filePath)) return false;
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
  return true;
}

/** Repo root, resolved from this file's location (scripts/local/lib.mjs → two levels up). */
export function repoRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..");
}
