#!/usr/bin/env bash
# Runs every test suite in the monorepo. Exits non-zero if anything fails.
set -e

echo "=== Frontend tests (vitest) ==="
(cd apps/web && npm test)

echo ""
echo "=== seo-service tests (pytest) ==="
(cd services/seo-service && python3 -m pytest tests/ -v)

echo ""
echo "=== google-ads-service tests (pytest) ==="
(cd services/google-ads-service && python3 -m pytest tests/ -v)

echo ""
echo "=== intelligence-service tests (pytest) ==="
(cd services/intelligence-service && python3 -m pytest tests/ -v)

echo ""
echo "=== auth-service tests (pytest) ==="
(cd services/auth-service && python3 -m pytest tests/ -v)

echo ""
echo "=== Frontend type check ==="
(cd apps/web && npx tsc --noEmit)

echo ""
echo "=== Frontend production build ==="
# Note: this step requires internet access to fetch Google Fonts (next/font).
# If it fails with "Failed to fetch font Inter" in a network-restricted
# environment (e.g. an isolated CI runner or sandbox), that's a network
# issue, not a code bug — verified separately by building with the font
# import temporarily removed, which succeeds cleanly. Any normal dev
# machine or CI runner (GitHub Actions, Vercel, etc.) has internet access
# and will not hit this.
(cd apps/web && npm run build)

echo ""
echo "All checks passed."
