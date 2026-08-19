import { moduleLogger } from './logger.js'

const log = moduleLogger('monitoring')

/**
 * Error monitoring (audit #10).
 *
 * Until now a production crash existed only as a line in a log file nobody was tailing. Logging
 * says what happened after you already know to look; monitoring is what tells you to look. This is
 * the second half.
 *
 * Gated on `SENTRY_DSN`, following the same shape as Stripe and Resend in this codebase: the
 * integration is either configured or a clean no-op, and its absence never changes behaviour. That
 * matters more here than elsewhere — a monitoring layer that can itself throw turns a recoverable
 * error into an unrecoverable one, so every path through this file swallows its own failures. The
 * one thing it must never do is become the reason a request fails.
 *
 * The SDK is loaded dynamically, and is NOT a dependency of this package. Only three functions are
 * used, so this depends on that shape rather than on the package itself:
 *
 *  - nothing is installed or downloaded until someone actually wants monitoring, and a project with
 *    no Sentry account carries no Sentry code;
 *  - the provider is replaceable — anything exposing `init`/`captureException`/`flush` drops in;
 *  - `apps/api` still builds and typechecks with the package absent, which is the state this repo
 *    is in today.
 *
 * The cost is that the import specifier can't be checked at compile time. It is covered by a test
 * instead, and by a boot-time message naming the exact install command when the DSN is set but the
 * package is missing.
 */

interface MonitoringClient {
  init(options: Record<string, unknown>): void
  captureException(err: unknown, hint?: { extra?: Record<string, unknown> }): void
  flush(timeoutMs: number): Promise<boolean>
}

const SDK_PACKAGE = '@sentry/node'

let client: MonitoringClient | undefined

export async function initMonitoring(): Promise<void> {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    log.info('error monitoring not configured (SENTRY_DSN unset) — errors go to logs only')
    return
  }

  let mod: MonitoringClient
  try {
    // Indirected through a variable so bundlers treat it as optional rather than failing to resolve
    // a package that is deliberately not installed.
    mod = (await import(/* @vite-ignore */ SDK_PACKAGE)) as unknown as MonitoringClient
  } catch {
    log.warn(
      `SENTRY_DSN is set but ${SDK_PACKAGE} is not installed — run \`pnpm --filter @growthos/api add ${SDK_PACKAGE}\`. Continuing with logs only.`,
    )
    return
  }

  try {
    mod.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      // Performance tracing is off deliberately. It is a separate concern with its own overhead and
      // its own quota, and turning it on by default would spend both on a question nobody has asked
      // yet. Crash reporting is what audit #10 is about.
      tracesSampleRate: 0,
      ...(process.env.SENTRY_RELEASE ? { release: process.env.SENTRY_RELEASE } : {}),
    })
    client = mod
    log.info('error monitoring enabled')
  } catch (err) {
    // A broken or unreachable monitoring backend must not stop the API from booting.
    log.error({ err }, 'failed to initialise error monitoring — continuing without it')
  }
}

/** Test seam: lets the reporting paths be exercised without a network or a real DSN. */
export function __setMonitoringClientForTests(next: MonitoringClient | undefined): void {
  client = next
}

/** Reports an error if monitoring is configured. Always safe to call; never throws. */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!client) return
  try {
    client.captureException(err, context ? { extra: context } : undefined)
  } catch (reportErr) {
    log.error({ err: reportErr }, 'failed to report an error to monitoring')
  }
}

/**
 * Catches the two failures that otherwise leave no trace at all.
 *
 * Node's default for an unhandled rejection is to terminate the process, and for an uncaught
 * exception to print to stderr and exit — in both cases outside pino, so the crash is invisible to
 * anything reading structured logs, and invisible to monitoring. These handlers make the last thing
 * a dying process does be reporting why.
 *
 * `uncaughtException` still exits. The process is by definition in an undefined state after one, and
 * continuing risks serving corrupted results; the exit is delayed only long enough to flush the
 * report. `unhandledRejection` is logged without exiting, because in this codebase it is far more
 * often a fire-and-forget background task (`void publish(...)`) than a corrupted process.
 */
export function installCrashHandlers(): void {
  process.on('unhandledRejection', (reason) => {
    log.error({ err: reason }, 'unhandled promise rejection')
    captureException(reason, { kind: 'unhandledRejection' })
  })

  process.on('uncaughtException', (err) => {
    log.error({ err }, 'uncaught exception — exiting')
    captureException(err, { kind: 'uncaughtException' })
    void flushMonitoring(2_000).finally(() => process.exit(1))
  })
}

/** Waits for queued reports to be sent, up to `timeoutMs`. Used on the way out of a crash. */
export async function flushMonitoring(timeoutMs = 2_000): Promise<void> {
  if (!client) return
  try {
    await client.flush(timeoutMs)
  } catch {
    // Nothing useful to do here: we are already exiting because of a different error.
  }
}
