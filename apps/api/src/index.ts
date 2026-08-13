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

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})

startScheduler()
