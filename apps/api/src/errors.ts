import { ERROR_STATUS, type ErrorCode, type ApiErrorBody } from '@growthos/types'

/**
 * Domain error carrying a fixed code from the API contract (see CLAUDE.md). The Fastify error
 * handler turns this into the `{ error: { code, message, statusCode } }` envelope.
 */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = ERROR_STATUS[code]
  }
}

export function toEnvelope(code: ErrorCode, message: string): ApiErrorBody {
  return { error: { code, message, statusCode: ERROR_STATUS[code] } }
}
