import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

// Load apps/api/.env so tests can reach Neon (DATABASE_URL); REDIS_URL falls back to localhost.
config({ path: '.env' })

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: { ...process.env },
  },
})
