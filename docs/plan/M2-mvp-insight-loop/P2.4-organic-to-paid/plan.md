# P2.4 — Organic-to-Paid Bridge

Milestone: M2 · Depends on: P2.1, P2.3 · Prerequisites: Neon URL · worker (P2.1)

## Goal

Run the loop in reverse: surface top organic pages daily, turn them into Meta creative briefs in a
queue, and feed high-CTR winners back into SEO.

## Subphases

- [ ] Build the daily GSC top-pages worker.
- [ ] Add the Meta creative-brief generator (templated, `legacy/services/meta-ads-service/features.ts`).
- [ ] Build the Creative Queue UI.
- [ ] Add the CTR > 3% reverse-loop → SEO brief.

## Reuse

- Cross-channel engine → reuse.
- `legacy/services/meta-ads-service/features.ts` → templating (creative briefs).

## Surface

- Worker: daily GSC top-pages.
- Meta creative-brief generator (templated, `legacy/services/meta-ads-service/features.ts`).
- UI: Creative Queue.
- Reverse loop: CTR > 3% → SEO brief.

## Verification

- Top pages → creative briefs appear in the queue.
