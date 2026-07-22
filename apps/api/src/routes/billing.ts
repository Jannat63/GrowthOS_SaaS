import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError } from '../errors.js'
import { requireUser } from '../auth-context.js'
import { requireWorkspaceMember } from '../guards.js'
import { recordAudit } from '../audit.js'
import { createCheckoutSession, getCurrentSubscription, handleWebhookEvent } from '../billing.js'
import { getUsageSummary } from '../plan-limits.js'

const checkoutSchema = z.object({
  plan: z.enum(['starter', 'growth', 'scale']),
})

/** Billing (M5 P5.1). Registered alongside registerV1Routes — see app.ts. */
export async function registerBillingRoutes(app: FastifyInstance) {
  // Current subscription for a workspace.
  app.get('/api/v1/workspaces/:id/billing/subscription', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getCurrentSubscription(id)
  })

  // Usage vs. plan limits (M5 P5.2) — powers the usage bars + upgrade prompts on Settings → Billing.
  app.get('/api/v1/workspaces/:id/billing/usage', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id)
    return getUsageSummary(id)
  })

  // Start a Stripe Checkout session for a plan purchase/upgrade. Admin+ only — this is a billing action.
  app.post('/api/v1/workspaces/:id/billing/checkout', async (request) => {
    const user = await requireUser(request)
    const { id } = request.params as { id: string }
    await requireWorkspaceMember(user.id, id, 'admin')

    const body = checkoutSchema.safeParse(request.body)
    if (!body.success) {
      throw new AppError('VALIDATION_ERROR', body.error.issues[0]?.message ?? 'Invalid input.')
    }

    const result = await createCheckoutSession(id, body.data.plan, user.email)
    void recordAudit(
      { workspaceId: id, actorId: user.id, action: 'billing.checkout_started', entityType: 'subscription' },
      request,
    )
    return result
  })

  // Stripe webhook — its own encapsulated sub-plugin so the raw-body content-type parser below
  // applies ONLY to this route (Fastify plugins are encapsulated by default; sibling routes above,
  // and everywhere else in the app, keep using the normal parsed-JSON body).
  await app.register(async (webhook) => {
    webhook.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body)
    })

    webhook.post('/api/v1/billing/webhook', async (request, reply) => {
      const signature = request.headers['stripe-signature']
      await handleWebhookEvent(
        request.body as Buffer,
        typeof signature === 'string' ? signature : undefined,
      )
      reply.status(200)
      return { received: true }
    })
  })
}
