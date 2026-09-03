import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // Platform-wide admin access (Super Admin panel) — see apps/api/src/guards.ts's
  // requirePlatformRole. null | 'support_agent' | 'super_admin'. Entirely separate from the
  // per-workspace `role` on workspace_members below; a platform admin isn't a member of every
  // workspace, they bypass workspace membership checks entirely.
  platformRole: text("platform_role"),
  // Optional contact number for platform staff, collected on the admin profile step
  // (app/(admin)/admin/welcome). Nullable and never required of customers.
  phone: text("phone"),
  // Better Auth's twoFactor plugin owns this. False for everyone by default; the admin console
  // requires it of anyone holding a platformRole before it will open (see apps/web/app/(admin)).
  // Customers may turn it on but are never forced to.
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

/**
 * Better Auth's twoFactor plugin table — one row per user with 2FA enabled.
 *
 * Shape dictated by the plugin (packages/better-auth two-factor/schema.ts), not by us: `secret` is
 * the TOTP seed and `backupCodes` the recovery set, both encrypted by the plugin and never returned
 * to a client. Disabling 2FA deletes the whole row rather than flipping a flag, which is why there
 * is no `enabled` column here — that lives on `user.twoFactorEnabled`.
 *
 * Cascades from `user`: a deleted account must not leave its TOTP seed behind.
 */
export const twoFactor = pgTable(
  "twoFactor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // The plugin's own lockout bookkeeping. All three were missing on the first pass, and the
    // adapter checks the schema field-by-field: enabling 2FA failed with `The field "verified"
    // does not exist in the "twoFactor" Drizzle schema` only at the moment of the insert, after the
    // password had already been verified. Match the plugin's schema exactly — every field it
    // declares, or none of it works.
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until"),
  },
  (table) => [index("twoFactor_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
    plan: text("plan").default("starter"),
    websiteUrl: text("website_url"),
    businessCategory: text("business_category"),
    monthlyAdBudget: integer("monthly_ad_budget"),
    onboardingStep: text("onboarding_step").default("business_intake"),
    onboardingComplete: boolean("onboarding_complete").default(false),
    // Agency white-label branding (M3 P3.5 Slice C): { agencyName?, logoUrl?, primaryColor? }.
    whiteLabelConfig: jsonb("white_label_config"),
    // Autonomous intelligence loop config: { enabled: boolean, cadenceMs: number }.
    automationConfig: jsonb("automation_config"),
  },
  (table) => [uniqueIndex("workspaces_slug_uidx").on(table.slug)],
);

export const workspace_members = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("workspace_members_organizationId_idx").on(table.organizationId),
    index("workspace_members_userId_idx").on(table.userId),
  ],
);

export const workspace_invitations = pgTable(
  "workspace_invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("workspace_invitations_organizationId_idx").on(table.organizationId),
    index("workspace_invitations_email_idx").on(table.email),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  workspace_memberss: many(workspace_members),
  workspace_invitationss: many(workspace_invitations),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  workspace_memberss: many(workspace_members),
  workspace_invitationss: many(workspace_invitations),
}));

export const workspace_membersRelations = relations(
  workspace_members,
  ({ one }) => ({
    workspaces: one(workspaces, {
      fields: [workspace_members.organizationId],
      references: [workspaces.id],
    }),
    user: one(user, {
      fields: [workspace_members.userId],
      references: [user.id],
    }),
  }),
);

export const workspace_invitationsRelations = relations(
  workspace_invitations,
  ({ one }) => ({
    workspaces: one(workspaces, {
      fields: [workspace_invitations.organizationId],
      references: [workspaces.id],
    }),
    user: one(user, {
      fields: [workspace_invitations.inviterId],
      references: [user.id],
    }),
  }),
);
