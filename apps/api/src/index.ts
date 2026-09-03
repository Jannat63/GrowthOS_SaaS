import { writeSync } from 'node:fs'
import { buildApp } from './app.js'
import { validateEnv, logIntegrationStatus } from './env.js'
import { initMonitoring, installCrashHandlers } from './monitoring.js'
import { startScheduler } from './scheduler.js'

validateEnv()
logIntegrationStatus()

// Before anything else that can fail, so a crash during boot is still reported. Awaited because an
// error thrown between here and the first handler would otherwise race the SDK's initialisation and
// be lost — which is exactly the window a bad deploy fails in.
await initMonitoring()
installCrashHandlers()

const app = buildApp()
const port = Number(process.env.API_PORT ?? 3001)

// NOTE: do not add `exclusive: true` here. It looks like the right guard against Next.js
// auto-incrementing onto this port (see docs/plan — it has shadowed the API more than once), but
// SO_EXCLUSIVEADDRUSE also makes watch-mode restarts race: the new process tries to bind before
// Windows has released the old listener, hits EADDRINUSE, and exits — so every save kills the API.
app.listen({ port, host: '0.0.0.0' }).catch((err: NodeJS.ErrnoException) => {
  app.log.error(err)

  /**
   * Say it again, synchronously, on the way out.
   *
   * `app.log.error` is pino, which writes asynchronously — and `process.exit()` on the next line
   * truncates that write. Run directly the message usually makes it out; run under `turbo dev` it
   * does not, so the only thing on screen is `Restarting 'src/index.ts'` repeating forever with no
   * reason attached. (node --watch restarts any process that exits, so a permanent failure like a
   * taken port loops rather than stopping.) A blocking write to fd 2 cannot be truncated.
   */
  if (err.code === 'EADDRINUSE') {
    const lines = [
      '',
      `  Port ${port} is already in use, so the API cannot start.`,
      '  Another dev server is probably still running — check with:',
      `    curl localhost:${port}/health   (JSON = the API owns it, HTML = Next.js took it)`,
      '',
    ]
    writeSync(2, lines.join('\n') + '\n')
  }
  process.exit(1)
})

startScheduler()
