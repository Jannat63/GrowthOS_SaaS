import type { AutomationAdapter, AdapterResult, StoredAction } from '../types.js'

/**
 * The default adapter for any platform without a live, credentialled integration — which today is
 * every advertising platform, since no Google Ads developer token or Meta App Review exists.
 *
 * It changes nothing and records exactly what it would have sent. That is the point: the automation
 * loop runs continuously against real signals, the approval queue fills with real proposals, and an
 * operator can read back precisely which API calls would have gone out — all before a single byte
 * reaches a live ad account. When credentials arrive, a real adapter replaces this one at the
 * dispatch site and everything upstream is already proven.
 *
 * It always succeeds. A dry run has no failure mode of its own, and inventing one would mean the
 * `failed` state stopped meaning "a real side effect did not happen".
 */
export const dryRunAdapter: AutomationAdapter = {
  name: 'dry-run',

  async execute(action: StoredAction): Promise<AdapterResult> {
    return {
      ok: true,
      detail: {
        dryRun: true,
        reason: 'No credentialled connection for this platform — recorded, not sent.',
        wouldHaveSent: {
          actionType: action.actionType,
          target: action.target,
          payload: action.payload,
        },
      },
    }
  },
}
