import { test as setup } from "@playwright/test";
import { encode } from "next-auth/jwt";
import fs from "node:fs";
import path from "node:path";

import { STORAGE_STATE } from "./sessionState";

/**
 * Signs the smoke run in, so the user-page checks actually run.
 *
 * Every study, explorer and history check is gated behind a user page, and an
 * anonymous probe meets the access wall - so 23 of the 28 smoke tests were
 * skipping, silently, and the suite reported green while exercising almost
 * nothing. Minting the session cookie directly avoids driving a Google OAuth
 * flow that cannot run headless anyway.
 *
 * Skips rather than fails when the environment has no secret or no admin
 * address: a contributor without production credentials should still get the
 * public checks rather than a wall of errors.
 */

function readEnvFile(file: string): Record<string, string> {
  try {
    return Object.fromEntries(
      fs
        .readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => [
          line.slice(0, line.indexOf("=")).trim(),
          line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
        ]),
    );
  } catch {
    return {};
  }
}

setup("authenticate", async ({ context, baseURL }) => {
  const env = { ...readEnvFile(".env"), ...readEnvFile(".env.local"), ...process.env };
  const secret = env.AUTH_SECRET ?? env.NEXTAUTH_SECRET;
  const email = (env.SMOKE_USER_EMAIL ?? env.ADMIN_GOOGLE_ALLOWED_EMAILS ?? "").split(",")[0]?.trim();

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });

  if (!secret || !email) {
    // No credentials here; leave an empty state so the public checks still run.
    await context.storageState({ path: STORAGE_STATE });
    return;
  }

  const token = await encode({ token: { name: "Smoke", email, sub: "smoke" }, secret });
  const url = new URL(baseURL ?? "http://localhost:6400");

  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: url.protocol === "https:",
    },
  ]);

  await context.storageState({ path: STORAGE_STATE });
});
