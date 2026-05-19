import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL;
const NEON_AUTH_COOKIE_SECRET = process.env.NEON_AUTH_COOKIE_SECRET;

if (!NEON_AUTH_BASE_URL) {
  throw new Error(
    "Missing NEON_AUTH_BASE_URL. Set it in .env.local (Neon Console → Auth → Configuration → Auth URL)."
  );
}

if (!NEON_AUTH_COOKIE_SECRET || NEON_AUTH_COOKIE_SECRET.length < 32) {
  throw new Error(
    "Missing or invalid NEON_AUTH_COOKIE_SECRET (must be at least 32 characters). Generate: openssl rand -base64 32"
  );
}

export const auth = createNeonAuth({
  baseUrl: NEON_AUTH_BASE_URL,
  cookies: {
    secret: NEON_AUTH_COOKIE_SECRET,
  },
});

export type ServerUser = {
  id: string;
  primaryEmail: string;
  email: string;
  displayName: string;
  name: string;
};

export async function getServerUser(): Promise<ServerUser | null> {
  const { data } = await auth.getSession();
  if (!data?.user) return null;
  return {
    id: data.user.id,
    primaryEmail: data.user.email,
    email: data.user.email,
    displayName: data.user.name,
    name: data.user.name,
  };
}

export async function requireServerUser(): Promise<ServerUser> {
  const user = await getServerUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
