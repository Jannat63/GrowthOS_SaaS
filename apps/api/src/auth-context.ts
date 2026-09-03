import { fromNodeHeaders } from 'better-auth/node'
import type { FastifyRequest } from 'fastify'
import type { AuthUser } from '@growthos/types'
import { auth } from './auth.js'
import { AppError } from './errors.js'

/** Resolve the Better Auth session user for a request, or null if unauthenticated. */
export async function getSessionUser(request: FastifyRequest): Promise<AuthUser | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  })
  if (!session) return null
  // `platformRole` and `phone` are Better Auth additionalFields, so they ride on the session user
  // but are not in its base type — hence the cast. Without carrying them here, /auth/me cannot tell
  // the client whether the person signing in is staff.
  const extra = session.user as typeof session.user & {
    platformRole?: string | null
    phone?: string | null
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image ?? null,
    platformRole: (extra.platformRole as AuthUser['platformRole']) ?? null,
    phone: extra.phone ?? null,
  }
}

/** Like getSessionUser but throws UNAUTHORIZED (401) when there is no session. */
export async function requireUser(request: FastifyRequest): Promise<AuthUser> {
  const user = await getSessionUser(request)
  if (!user) throw new AppError('UNAUTHORIZED', 'You must be signed in.')
  return user
}
