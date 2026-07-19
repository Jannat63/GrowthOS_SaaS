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
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image ?? null,
  }
}

/** Like getSessionUser but throws UNAUTHORIZED (401) when there is no session. */
export async function requireUser(request: FastifyRequest): Promise<AuthUser> {
  const user = await getSessionUser(request)
  if (!user) throw new AppError('UNAUTHORIZED', 'You must be signed in.')
  return user
}
