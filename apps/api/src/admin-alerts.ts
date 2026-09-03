import { isNotNull } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { sendAdminActionAlertEmail } from './emails.js'
import { moduleLogger } from './logger.js'

const log = moduleLogger('admin-alerts')

/**
 * Tell every super admin when something changed.
 *
 * The audit log is a complete record and a poor alarm: it only works if somebody opens it. This is
 * the other half — the moment platform access changes, a plan is overridden, a trial is extended or
 * an account is signed out everywhere, everyone with super-admin rights gets an email naming the
 * actor, the target and the reason.
 *
 * It is detective, not preventive. It cannot stop a bad action; it makes the gap between the action
 * and anyone noticing it seconds instead of a week, which is the difference that matters when the
 * bad action is someone using your account rather than their own.
 *
 * **The actor is emailed too, deliberately.** They already know what they did — but if they did
 * not, an email about a change made under their name is exactly how they find out their session was
 * taken.
 *
 * Best-effort throughout: a mail failure must never be why an admin's change did not go through.
 * It is fired without awaiting, and every error is swallowed into the log.
 */
export function alertSuperAdmins(input: {
  actorId: string
  actorName: string | null
  actorEmail: string
  action: string
  /** What was acted on, as a person would say it: a workspace name, a customer's email. */
  target: string
  reason: string
  /** Optional before/after, e.g. "Growth to Scale". */
  change?: string | undefined
}): void {
  void (async () => {
    try {
      const recipients = await db
        .select({ email: schema.user.email })
        .from(schema.user)
        .where(isNotNull(schema.user.platformRole))

      await Promise.all(
        recipients.map((r) =>
          sendAdminActionAlertEmail(r.email, {
            actorName: input.actorName ?? input.actorEmail,
            actorEmail: input.actorEmail,
            action: input.action,
            target: input.target,
            reason: input.reason,
            change: input.change,
          }),
        ),
      )
    } catch (err) {
      log.error({ err, action: input.action }, 'failed to alert super admins')
    }
  })()
}
