"use client";

import { createAuthClient } from "@neondatabase/auth/next";

export const authClient = createAuthClient();

export type AuthUser = {
  id: string;
  primaryEmail: string;
  email: string;
  displayName: string;
  name: string;
  imageUrl: string | null;
  signOut: () => Promise<void>;
};

/**
 * Drop-in replacement for Stack Auth's `useUser()`.
 *  - returns `undefined` while loading,
 *  - returns `null` when unauthenticated,
 *  - returns an `AuthUser` when authenticated.
 */
export function useUser(): AuthUser | null | undefined {
  const { data, isPending } = authClient.useSession();
  if (isPending) return undefined;
  if (!data?.user) return null;
  return {
    id: data.user.id,
    primaryEmail: data.user.email,
    email: data.user.email,
    displayName: data.user.name,
    name: data.user.name,
    imageUrl: data.user.image ?? null,
    signOut: async () => {
      await authClient.signOut();
    },
  };
}
