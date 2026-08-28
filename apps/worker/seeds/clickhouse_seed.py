"""RETIRED. The API seeds ad_performance itself — do not run this.

This script was P2.1's way of getting rows into ClickHouse so P2.6 (Blended MER) had something to
read. `apps/api` has owned that job since `ensureAdPerformanceSeed` landed, and the two disagree in
every respect that matters:

* Window. This wrote 30 flat days from 2026-07-01; the API writes 180 ending 2026-07-17. The two
  windows OVERLAP, and `ad_performance` is a plain MergeTree with no de-duplication, so running this
  against a workspace the API has already seeded silently doubles seventeen days of spend and
  revenue. Nothing would report an error — the dashboard would just be wrong.
* Shape. This wrote one campaign per platform (`g-1`, `m-1`). The API writes the full campaign
  roster, and treats those two ids as a stale shape to be pruned on sight.
* Values. Every row here is a constant, so there is no weekend dip, no revenue swing and no drift —
  the same flatness that made the MER trend chart a horizontal line for as long as the browser's
  offline fallback copied it.

The generator now lives in ONE place, `packages/logic/src/fixtures/seed.ts`, which `apps/api` inserts
from and `apps/web` reads for its offline fallback. A Python copy could not import it, and a fourth
hand-maintained copy of the same arithmetic is what this comment exists to prevent.

To seed a workspace: start the API and open any dashboard page. `ensureAdPerformanceSeed` runs on
first read, backfills only the dates that are missing, and is idempotent.
"""

import sys

MESSAGE = __doc__


def seed() -> int:
    raise RuntimeError(MESSAGE)


if __name__ == "__main__":
    print(MESSAGE, file=sys.stderr)
    sys.exit(1)
