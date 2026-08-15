"use client";

import { useMemo } from "react";
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
  const sessionUser = data?.user;
  const userId = sessionUser?.id;
  const userEmail = sessionUser?.email;
  const userName = sessionUser?.name;
  const userImage = sessionUser?.image;

  return useMemo(() => {
    if (isPending) return undefined;
    if (!userId || !userEmail || !userName) return null;

    return {
      id: userId,
      primaryEmail: userEmail,
      email: userEmail,
      displayName: userName,
      name: userName,
      imageUrl: userImage ?? null,
      signOut: async () => {
        await authClient.signOut();
      },
    };
  }, [
    isPending,
    userEmail,
    userId,
    userImage,
    userName,
  ]);
}
