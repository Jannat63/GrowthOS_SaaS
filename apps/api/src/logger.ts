import pino from 'pino'

/**
 * The application's root logger.
 *
 * Fastify has always had one — every request handler can call `request.log` — but background work
 * has none: the scheduler, the WebSocket relay, the automation executor and the worker bridge all
 * run outside any request, and so all of them reached for `console.*`. That meant the parts of the
 * system with no user watching, whose failures are therefore only ever discovered in logs, were the
 * parts writing unstructured lines that bypassed pino entirely — no level, no timestamp, no
 * service field, and invisible to any log aggregator configured for the rest of the app.
 *
 * This instance is handed to Fastify in `app.ts`, so request logs and background logs are the same
 * stream at the same level. Anything running outside a request imports it directly.
 *
 * `child({ module })` is the convention for background modules: it stamps every line with its
 * origin, which is what makes a scheduled-job failure findable at all when nobody was watching.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'api' },
})

/** A logger stamped with the module it belongs to — `logger.child({ module: 'scheduler' })`. */
export function moduleLogger(module: string) {
  return logger.child({ module })
}
