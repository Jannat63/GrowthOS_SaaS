/**
 * Refuses to start `pnpm dev` when the ports are already taken.
 *
 * Without this, a second `pnpm dev` (or one left running in another terminal) fails in a way that
 * looks like an application bug and costs an hour every time:
 *
 *  - Next finds 3000 busy and SILENTLY moves to 3001 — the API's port. Windows allows the second
 *    bind, so both processes listen and requests land on whichever answers first. The symptom is
 *    `POST /api/auth/sign-in/email 404`, because the browser is talking to Next, which has no such
 *    route. Nothing in that error mentions ports.
 *  - The API cannot bind 3001, exits, and `node --watch` restarts it — forever. Turbo drops the
 *    EADDRINUSE line before the process dies, so the log shows only `Restarting 'src/index.ts'`
 *    repeating with no reason given.
 *
 * Both failures are invisible at the point they happen and obvious here, one second earlier.
 */
import net from 'node:net';
import { execSync } from 'node:child_process';

const PORTS = [
  { port: 3000, who: 'the Next.js dev server (@growthos/web)' },
  { port: 3001, who: 'the Fastify API (@growthos/api)' },
];

function inUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => resolve(err.code === 'EADDRINUSE'));
    server.once('listening', () => server.close(() => resolve(false)));
    // 0.0.0.0 rather than localhost: that is what both dev servers bind, and on Windows a
    // localhost-only probe can report a port free that they will still fail to take.
    server.listen(port, '0.0.0.0');
  });
}

/** Best-effort: name the process holding the port, so the fix does not need a second command. */
function holder(port) {
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const line = execSync(`netstat -ano -p TCP | findstr LISTENING | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .split('\n')
        .find((l) => l.includes(`:${port} `));
      const pid = line?.trim().split(/\s+/).pop();
      if (!pid) return null;
      const name = execSync(`tasklist /FI "PID eq ${pid}" /NH /FO CSV`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).split(',')[0]?.replace(/"/g, '');
      return { pid, name: name || 'unknown' };
    }
    const pid = execSync(`lsof -ti tcp:${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .split('\n')[0];
    return pid ? { pid, name: 'unknown' } : null;
  } catch {
    return null;
  }
}

const taken = [];
for (const entry of PORTS) {
  if (await inUse(entry.port)) taken.push({ ...entry, holder: holder(entry.port) });
}

if (taken.length === 0) process.exit(0);

console.error('\n  Cannot start the dev servers — a port is already in use.\n');
for (const { port, who, holder: h } of taken) {
  const by = h ? `  held by PID ${h.pid} (${h.name})` : '  holder unknown';
  console.error(`    ${port}  needed by ${who}\n  ${by}`);
}
console.error(`
  A dev server is probably still running in another terminal. Stop it there, or:

    ${
      process.platform === 'win32'
        ? taken.map((t) => (t.holder ? `taskkill /PID ${t.holder.pid} /F` : '')).filter(Boolean).join('\n    ') ||
          'netstat -ano | findstr :3000'
        : taken.map((t) => (t.holder ? `kill -9 ${t.holder.pid}` : '')).filter(Boolean).join('\n    ')
    }

  Starting anyway is what causes the "Restarting 'src/index.ts'" loop and the
  404 on POST /api/auth/sign-in/email — see the comment at the top of this file.
`);
process.exit(1);
