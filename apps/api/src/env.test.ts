import { describe, expect, it, vi } from 'vitest'
import { validateEnv, logIntegrationStatus } from './env.js'

describe('env', () => {
  describe('validateEnv', () => {
    it('passes when all required vars are set', () => {
      expect(() =>
        validateEnv({ DATABASE_URL: 'x', BETTER_AUTH_SECRET: 'y', BETTER_AUTH_URL: 'z' } as NodeJS.ProcessEnv),
      ).not.toThrow()
    })

    it('lists every missing var in one error, not just the first', () => {
      try {
        validateEnv({} as NodeJS.ProcessEnv)
        expect.fail('should have thrown')
      } catch (err) {
        const message = (err as Error).message
        expect(message).toContain('DATABASE_URL')
        expect(message).toContain('BETTER_AUTH_SECRET')
        expect(message).toContain('BETTER_AUTH_URL')
      }
    })

    // TOKEN_ENCRYPTION_KEY and OAUTH_STATE_SECRET protect OAuth tokens at rest and the callback
    // against CSRF. Missing, they used to throw deep inside the callback, which the user saw as a
    // generic "couldn't connect" — the hardest possible place to notice tokens are unprotected.
    const base = { DATABASE_URL: 'x', BETTER_AUTH_SECRET: 'y', BETTER_AUTH_URL: 'z' }

    it('demands the OAuth secrets once OAuth credentials are present', () => {
      try {
        validateEnv({ ...base, GOOGLE_CLIENT_ID: 'id' } as NodeJS.ProcessEnv)
        expect.fail('should have thrown')
      } catch (err) {
        const message = (err as Error).message
        expect(message).toContain('TOKEN_ENCRYPTION_KEY')
        expect(message).toContain('OAUTH_STATE_SECRET')
      }
    })

    it('allows them to be absent when no OAuth provider is configured', () => {
      expect(() => validateEnv(base as NodeJS.ProcessEnv)).not.toThrow()
    })

    it('passes once both are supplied alongside the OAuth credentials', () => {
      expect(() =>
        validateEnv({
          ...base,
          GOOGLE_CLIENT_ID: 'id',
          TOKEN_ENCRYPTION_KEY: 'k',
          OAUTH_STATE_SECRET: 's',
        } as NodeJS.ProcessEnv),
      ).not.toThrow()
    })

    // The webhook SSRF escape hatch is the one env var whose PRESENCE is the danger, so it is
    // asserted from the deployed side rather than trusted to a comment in url-guard.ts.
    it('refuses to boot in production with the webhook SSRF escape hatch on', () => {
      expect(() =>
        validateEnv({
          ...base,
          NODE_ENV: 'production',
          WEBHOOK_ALLOW_PRIVATE_TARGETS: 'true',
        } as NodeJS.ProcessEnv),
      ).toThrow(/WEBHOOK_ALLOW_PRIVATE_TARGETS/)
    })

    it('allows the escape hatch outside production, which is the only place it is meant to be used', () => {
      expect(() =>
        validateEnv({
          ...base,
          NODE_ENV: 'development',
          WEBHOOK_ALLOW_PRIVATE_TARGETS: 'true',
        } as NodeJS.ProcessEnv),
      ).not.toThrow()
    })

    it('boots in production when the hatch is merely absent', () => {
      expect(() =>
        validateEnv({ ...base, NODE_ENV: 'production' } as NodeJS.ProcessEnv),
      ).not.toThrow()
    })
  })

  describe('logIntegrationStatus', () => {
    it('warns about unconfigured integrations without throwing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(() => logIntegrationStatus({} as NodeJS.ProcessEnv)).not.toThrow()
      expect(warn).toHaveBeenCalledOnce()
      expect(warn.mock.calls[0]?.[0]).toContain('Stripe billing')
      warn.mockRestore()
    })

    it('stays silent when everything is configured', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fullEnv = {
        STRIPE_SECRET_KEY: 'x',
        STRIPE_WEBHOOK_SECRET: 'x',
        RESEND_API_KEY: 'x',
        GOOGLE_CLIENT_ID: 'x',
        GOOGLE_CLIENT_SECRET: 'x',
        SENTRY_DSN: 'x',
      } as unknown as NodeJS.ProcessEnv
      logIntegrationStatus(fullEnv)
      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})
