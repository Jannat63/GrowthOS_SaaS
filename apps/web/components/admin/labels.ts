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

/** Only `active` and `trialing` are healthy; everything else needs someone to look at it. */
export function subscriptionTone(status: string): "success" | "warning" | "muted" {
  if (status === "active") return "success";
  if (status === "trialing") return "warning";
  return "muted";
}
