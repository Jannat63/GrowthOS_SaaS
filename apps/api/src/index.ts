import { buildApp } from './app.js'
import { startIntelligenceScheduler } from './scheduler/intelligence-scheduler.js'

const app = buildApp()
const port = Number(process.env.API_PORT ?? 3001)

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})

// Autonomous intelligence + alerting loop. Started only here (never in buildApp), so inject()
// tests and health tooling stay timer-free. Disable with SCHEDULER_ENABLED=false.
if (process.env.SCHEDULER_ENABLED !== 'false') {
  const stop = startIntelligenceScheduler()
  const shutdown = () => {
    stop()
    app.close().finally(() => process.exit(0))
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  app.log.info('intelligence scheduler started')
}
