import { fromNodeHeaders } from 'better-auth/node'
import type { FastifyRequest } from 'fastify'
import { auth } from './auth.js'
import { AppError } from './errors.js'

/**
 * Prove it is still you, at the moment of the write.
 *
 * A signed-in session is evidence about who opened the browser, not about who is sitting at it
 * now. Two-factor at sign-in defends a stolen password; it does nothing about the realistic threat
 * for a small team, which is an unlocked laptop and five unattended minutes. So every write in the
 * admin console — a plan override, an extended trial, a change to who can read every account,
 * a forced sign-out — asks for the operator's own password again before it fires.
 *
 * `auth.api.verifyPassword` is Better Auth's own re-authentication endpoint: it checks the
 * password against the *session's* user and returns a boolean. It creates no session and issues no
 * cookie, so this cannot be turned into a back door for signing in.
 *
 * The failure is deliberately not distinguished from a missing password: both come back as the
 * same message. Anyone who can reach this route already holds a valid admin session, so there is
 * nothing to enumerate — but there is also no reason to narrate which half of the check failed.
 */
export async function requireStepUp(request: FastifyRequest, password: string): Promise<void> {
  if (!password) {
    throw new AppError('UNAUTHORIZED', 'Confirm your password to make this change.')
  }

  let ok = false
  try {
    const result = await auth.api.verifyPassword({
      body: { password },
      headers: fromNodeHeaders(request.headers),
    })
    ok = result?.status === true
  } catch {
    // Better Auth throws on a wrong password rather than returning false. An unreachable auth
    // service lands here too, and refusing the write is the right answer for both.
    ok = false
  }

  if (!ok) {
    throw new AppError('UNAUTHORIZED', "That password didn't match. The change was not made.")
  }
}
