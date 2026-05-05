import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function getFirstEnv(names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

const googleClientId = getFirstEnv(["AUTH_GOOGLE_ID", "GOOGLE_CLIENT_ID", "NEXTAUTH_GOOGLE_ID"]);
const googleClientSecret = getFirstEnv(["AUTH_GOOGLE_SECRET", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_GOOGLE_SECRET"]);
const authSecret = getFirstEnv(["AUTH_SECRET", "NEXTAUTH_SECRET"]);

function parseAdminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_GOOGLE_ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

const adminEmailAllowlist = parseAdminEmailAllowlist();

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return adminEmailAllowlist.has(email.toLowerCase());
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(googleClientId && googleClientSecret);
}

export const authOptions: NextAuthOptions = {
  providers:
    googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          }),
        ]
      : [],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    signIn({ account }) {
      if (account?.provider !== "google") {
        return false;
      }

      return true;
    },
  },
  secret: authSecret ?? undefined,
};
