import { createAuthClient } from "better-auth/react";
import { organizationClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  plugins: [
    organizationClient(),
    /**
     * The user fields this app adds on the server (apps/api/src/auth.ts). They are declared by
     * hand rather than with `inferAdditionalFields<typeof auth>()` because that form needs to
     * import the server's auth instance as a type, and apps/web cannot import from apps/api.
     *
     * Keep this in step with the server's `additionalFields`. `platformRole` is listed so the
     * session user is typed with it — the server sets `input: false`, so it is readable here but
     * can never be written from a form, which is the entire reason platform access is granted by
     * a database script instead.
     */
    inferAdditionalFields({
      user: {
        platformRole: { type: "string", required: false },
        phone: { type: "string", required: false },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession, updateUser } = authClient;
