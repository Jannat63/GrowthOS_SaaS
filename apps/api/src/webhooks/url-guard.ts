import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { AppError } from '../errors.js'

/**
 * SSRF guard for customer-supplied webhook URLs (M4 · P4.4a-2).
 *
 * A webhook endpoint is a URL the customer chooses and OUR server then makes a request to, from
 * inside our own network. That is the textbook SSRF shape. Without this guard a Scale-tier admin
 * could point an endpoint at `https://169.254.169.254/...` (cloud metadata), at an RFC1918 address,
 * or at loopback, and use delivery success/failure as an oracle to map the internal network — plus
 * reach any internal service that acts on an unauthenticated POST.
 *
 * "It needs an authenticated paying admin" is not a defence. That is one compromised customer
 * account, or one malicious signup, away.
 *
 * The check runs TWICE on purpose: once when the endpoint is created, and again immediately before
 * every delivery attempt. Creation-time-only validation is defeated by DNS rebinding — a hostname
 * that resolves publicly when checked and privately when fetched — and by any row that reaches the
 * table without going through the create path.
 */

/**
 * Escape hatch for local development and the test suite, which necessarily deliver to a plain-http
 * listener on 127.0.0.1.
 *
 * It relaxes BOTH the private-address rule and the https requirement, because those two together
 * are what "a local dev machine" means — a switch that allowed loopback but still demanded TLS
 * would not let anyone actually run a webhook listener locally, and a half-useful escape hatch just
 * gets replaced by someone disabling the guard properly.
 *
 * Compared against the exact string `'true'`, and defaulting to OFF, so a deployment that never
 * sets it is safe by default rather than safe by remembering. Never set this in a deployed
 * environment. Schemes other than http/https are refused either way.
 */
function localDevTargetsAllowed(): boolean {
  return process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS === 'true'
}

/** Parses an IPv4 dotted quad into its four octets, or null if it is not one. */
function ipv4Octets(address: string): [number, number, number, number] | null {
  const parts = address.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map((p) => Number(p))
  if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null
  return octets as [number, number, number, number]
}

/**
 * True for any address that must never be a delivery target.
 *
 * Exported for its own tests — an allow/deny predicate that is not directly tested is a predicate
 * nobody can be sure about.
 */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return true // not an IP at all: fail closed

  if (family === 4) {
    const octets = ipv4Octets(address)
    if (!octets) return true
    const [a, b] = octets
    if (a === 0) return true // 0.0.0.0/8 "this network"
    if (a === 10) return true // RFC1918
    if (a === 127) return true // loopback
    if (a === 100 && b! >= 64 && b! <= 127) return true // 100.64/10 CGNAT
    if (a === 169 && b === 254) return true // link-local, incl. cloud metadata
    if (a === 172 && b! >= 16 && b! <= 31) return true // RFC1918
    if (a === 192 && b === 168) return true // RFC1918
    if (a === 192 && b === 0) return true // 192.0.0/24 IETF protocol assignments
    if (a === 198 && (b === 18 || b === 19)) return true // 198.18/15 benchmarking
    if (a! >= 224) return true // multicast, reserved, broadcast
    return false
  }

  const normalized = address.toLowerCase().split('%')[0]! // strip any zone index
  if (normalized === '::1' || normalized === '::') return true
  // IPv4-mapped (::ffff:10.0.0.1) and IPv4-compatible forms tunnel a v4 address through a v6
  // literal — decide them on the embedded v4 address, or they walk straight past the v6 checks.
  const mapped = normalized.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isBlockedAddress(mapped[1]!)
  if (/^f[cd]/.test(normalized)) return true // fc00::/7 unique-local
  if (/^fe[89ab]/.test(normalized)) return true // fe80::/10 link-local
  if (/^ff/.test(normalized)) return true // ff00::/8 multicast
  return false
}

/**
 * Validates that `url` is an https URL whose host resolves only to public addresses.
 *
 * `all: true` matters: a hostname with several A records is only safe if EVERY one of them is
 * public. Checking just the first lets an attacker publish one public record alongside an internal
 * one and win whichever the resolver hands back at delivery time.
 */
export async function assertDeliverableUrl(url: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Webhook URL must be a valid absolute URL.')
  }

  // Refused unconditionally, hatch or no hatch: file:, gopher: and friends are never delivery
  // targets, and letting the local-dev switch below reach them would turn a convenience into a
  // local-file-read primitive.
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AppError('VALIDATION_ERROR', 'Webhook URL must use https.')
  }

  // Consulted BEFORE the https rule, because the hatch relaxes both — a webhook listener on a dev
  // machine is a plain-http loopback server, so a hatch that opened the address rule while still
  // demanding TLS could not actually be used. See localDevTargetsAllowed().
  if (localDevTargetsAllowed()) return

  // http is refused rather than upgraded: the payload carries the workspace's business data, and
  // silently "fixing" the scheme would either break delivery or appear to work while their listener
  // received nothing.
  if (parsed.protocol !== 'https:') {
    throw new AppError('VALIDATION_ERROR', 'Webhook URL must use https.')
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '') // unwrap a bracketed IPv6 literal

  // A literal address needs no resolution — and must not get a DNS lookup that could fail open.
  if (isIP(hostname) !== 0) {
    if (isBlockedAddress(hostname)) {
      throw new AppError('VALIDATION_ERROR', 'Webhook URL must point at a public address.')
    }
    return
  }

  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new AppError('VALIDATION_ERROR', `Webhook URL host could not be resolved: ${hostname}`)
  }

  if (addresses.length === 0 || addresses.some((a) => isBlockedAddress(a.address))) {
    throw new AppError('VALIDATION_ERROR', 'Webhook URL must point at a public address.')
  }
}

/** Non-throwing form for the delivery path, which records a reason rather than raising. */
export async function isDeliverableUrl(url: string): Promise<boolean> {
  try {
    await assertDeliverableUrl(url)
    return true
  } catch {
    return false
  }
}
