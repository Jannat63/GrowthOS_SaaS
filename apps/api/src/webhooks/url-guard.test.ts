import { afterEach, describe, expect, it } from 'vitest'
import { AppError } from '../errors.js'
import { assertDeliverableUrl, isBlockedAddress } from './url-guard.js'

// Pure except for DNS. No database.
describe('webhook URL SSRF guard', () => {
  const originalAllow = process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS

  afterEach(() => {
    if (originalAllow === undefined) delete process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS
    else process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS = originalAllow
  })

  describe('isBlockedAddress', () => {
    it.each([
      ['127.0.0.1', 'loopback'],
      ['127.1.2.3', 'loopback, non-obvious form'],
      ['10.0.0.5', 'RFC1918 10/8'],
      ['172.16.0.1', 'RFC1918 172.16/12 lower bound'],
      ['172.31.255.254', 'RFC1918 172.16/12 upper bound'],
      ['192.168.1.1', 'RFC1918 192.168/16'],
      ['169.254.169.254', 'cloud metadata'],
      ['0.0.0.0', 'this network'],
      ['100.64.0.1', 'CGNAT'],
      ['192.0.0.1', 'IETF protocol assignments'],
      ['198.18.0.1', 'benchmarking'],
      ['224.0.0.1', 'multicast'],
      ['255.255.255.255', 'broadcast'],
      ['::1', 'IPv6 loopback'],
      ['::', 'IPv6 unspecified'],
      ['fd00::1', 'IPv6 unique-local'],
      ['fc00::1', 'IPv6 unique-local'],
      ['fe80::1', 'IPv6 link-local'],
      ['ff02::1', 'IPv6 multicast'],
      ['::ffff:169.254.169.254', 'IPv4-mapped metadata address'],
      ['::ffff:10.0.0.1', 'IPv4-mapped RFC1918'],
      ['not-an-ip', 'not an address at all — fails closed'],
    ])('blocks %s (%s)', (address) => {
      expect(isBlockedAddress(address)).toBe(true)
    })

    it.each([
      ['8.8.8.8'],
      ['1.1.1.1'],
      ['93.184.216.34'],
      ['172.32.0.1'], // just outside 172.16/12
      ['172.15.255.255'], // just below 172.16/12
      ['100.63.255.255'], // just below CGNAT
      ['100.128.0.1'], // just above CGNAT
      ['2606:4700:4700::1111'],
    ])('allows the public address %s', (address) => {
      expect(isBlockedAddress(address)).toBe(false)
    })
  })

  describe('assertDeliverableUrl', () => {
    it('rejects a literal loopback URL', async () => {
      await expect(assertDeliverableUrl('https://127.0.0.1/hook')).rejects.toBeInstanceOf(AppError)
    })

    it('rejects the cloud metadata address', async () => {
      await expect(assertDeliverableUrl('https://169.254.169.254/latest/meta-data/')).rejects.toThrow(
        /public address/,
      )
    })

    it('rejects a bracketed IPv6 loopback literal', async () => {
      await expect(assertDeliverableUrl('https://[::1]/hook')).rejects.toThrow(/public address/)
    })

    it('rejects an RFC1918 literal on a non-standard port', async () => {
      // The port is not the control — the address is. This would be reachable on any port.
      await expect(assertDeliverableUrl('https://10.1.2.3:8443/hook')).rejects.toThrow(/public address/)
    })

    it('rejects http even when the host is public', async () => {
      await expect(assertDeliverableUrl('http://example.com/hook')).rejects.toThrow(/https/)
    })

    it('rejects a hostname that does not resolve rather than failing open', async () => {
      await expect(
        assertDeliverableUrl('https://this-host-should-never-resolve.invalid/hook'),
      ).rejects.toThrow(/could not be resolved/)
    })

    it('rejects a hostname that resolves to loopback', async () => {
      // `localhost` is the honest test of the DNS path: a NAME, not a literal, that lands on 127.0.0.1.
      await expect(assertDeliverableUrl('https://localhost/hook')).rejects.toThrow(/public address/)
    })

    it('allows a public host', async () => {
      await expect(assertDeliverableUrl('https://example.com/hook')).resolves.toBeUndefined()
    })

    it('honours the dev escape hatch, and only when it is exactly "true"', async () => {
      process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS = 'true'
      await expect(assertDeliverableUrl('https://127.0.0.1:9999/hook')).resolves.toBeUndefined()

      // Anything else leaves the guard on — "1", "yes" and a stray empty string must not disable it.
      process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS = '1'
      await expect(assertDeliverableUrl('https://127.0.0.1:9999/hook')).rejects.toThrow()
    })

    it('allows plain http when the escape hatch is on', async () => {
      // The hatch relaxes https as well as the address rule, on purpose: a webhook listener on a
      // dev machine is a plain-http loopback server, so a hatch that opened the address rule while
      // still demanding TLS could not actually be used by anybody. `dispatch.test.ts` depends on
      // this — it delivers to real `http://127.0.0.1:<port>` listeners.
      process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS = 'true'
      await expect(assertDeliverableUrl('http://127.0.0.1:9999/hook')).resolves.toBeUndefined()
    })

    it('still refuses a non-http(s) scheme even when the escape hatch is on', async () => {
      // The hatch opens loopback and http, and nothing else. Letting it reach file: would turn a
      // dev convenience into a local-file-read primitive.
      process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS = 'true'
      await expect(assertDeliverableUrl('file:///etc/passwd')).rejects.toThrow(/https/)
    })

    it('enforces https when the escape hatch is off', async () => {
      delete process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS
      await expect(assertDeliverableUrl('http://127.0.0.1/hook')).rejects.toThrow(/https/)
    })
  })
})
