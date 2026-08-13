import { buildApp } from './app.js'
import { validateEnv, logIntegrationStatus } from './env.js'
import { startScheduler } from './scheduler.js'

validateEnv()
logIntegrationStatus()

const app = buildApp()
const port = Number(process.env.API_PORT ?? 3001)

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})

startScheduler()
