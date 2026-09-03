/**
 * Readable names for the enums the admin API returns.
 *
 * Same rule as `channelLabel` in @growthos/logic: the slug is the storage form and must not reach
 * the screen. These pages were printing `super_admin` and `past_due` verbatim into badges, so an
 * operator read the column name off the database rather than off the interface.
 */

const PLATFORM_ROLE: Record<string, string> = {
  super_admin: "Super admin",
  support_agent: "Support agent",
};

const SUBSCRIPTION_STATUS: Record<string, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  canceled: "Canceled",
};

const WORKSPACE_ROLE: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  viewer: "Viewer",
  client: "Client",
};

/** Title-cases an unmapped slug so a new enum value stays readable instead of leaking raw. */
function titleCase(slug: string): string {
  return slug
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const platformRoleLabel = (r: string) => PLATFORM_ROLE[r] ?? titleCase(r);
export const subscriptionStatusLabel = (s: string) => SUBSCRIPTION_STATUS[s] ?? titleCase(s);
export const workspaceRoleLabel = (r: string) => WORKSPACE_ROLE[r] ?? titleCase(r);
export const planLabel = (p: string) => titleCase(p);

/**
 * Money, from cents.
 *
 * Whole dollars above $10 — a trailing `.00` on every figure in a column of totals is two
 * characters of noise per row, and no list price has cents.
 *
 * Below $10 it keeps them, because that is cost-per-click territory: rounding a real $0.24 to "$0"
 * does not tidy the number, it deletes it. The admin console printed "Cost per click $0" against
 * 238,050 clicks and $57,473 of spend, which is not a small figure rendered plainly — it is a
 * wrong one.
 */
export function moneyLabel(cents: number): string {
  const dollars = cents / 100;
  const digits = dollars !== 0 && Math.abs(dollars) < 10 ? 2 : 0;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(dollars);
}

/** A count with its noun, pluralised: `1 workspace`, `14 workspaces`, `no workspaces`. */
export function countLabel(n: number, singular: string, plural = `${singular}s`): string {
  if (n === 0) return `no ${plural}`;
  return `${n} ${n === 1 ? singular : plural}`;
}
