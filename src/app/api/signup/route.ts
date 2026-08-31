import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generateFriendlyName, normalizeDisplayName, slugify, uniqueSlug } from "@/lib/accountIdentity";
import { ACCOUNT_APPROVAL, isLockedOut } from "@/lib/accountApproval";
import { WELCOME_COPY } from "@/app/welcome/welcomeCopy";
import { isAccountVisibility } from "@/lib/accountVisibility";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowsSelfSignup, requiresApproval } from "@/lib/signupSettings";
import { loadSignupSettings } from "@/lib/signupSettingsServer";

const bodySchema = z.object({
  displayName: z.string().max(200).nullable().optional(),
  visibility: z.string().max(16).optional(),
});

export async function POST(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/signup",
    method: "POST",
    request,
    execute: async () => {
      const session = await getServerSession(authOptions);
      const email = session?.user?.email?.trim().toLowerCase() ?? null;
      if (!email) {
        return NextResponse.json({ error: "Sign in first." }, { status: 401 });
      }

      const settings = await loadSignupSettings();
      if (!allowsSelfSignup(settings)) {
        // The admin has signup closed; an invite code is the only way in.
        return NextResponse.json({ error: "UmaKuma is invite only right now." }, { status: 403 });
      }

      /*
       * Someone who already has an account is not signing up. Returning their
       * account rather than an error makes a double-submitted form harmless.
       */
      const existing = await prisma.account.findFirst({
        where: { joinedByEmail: { equals: email, mode: "insensitive" } },
        select: { id: true, slug: true, approvalStatus: true },
      });
      if (existing) {
        /*
         * Except a rejected one, which must not be handed back as though the
         * signup worked. They cannot make a second account either - this email
         * already has one - so the honest answer is that this is the end of it.
         */
        if (isLockedOut(existing.approvalStatus)) {
          return NextResponse.json({ error: WELCOME_COPY.rejectedBody }, { status: 403 });
        }
        return NextResponse.json({ account: existing, created: false });
      }

      const parsed = bodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
      }

      const { visibility } = parsed.data;
      if (visibility !== undefined && !isAccountVisibility(visibility)) {
        return NextResponse.json({ error: "Unknown visibility." }, { status: 400 });
      }

      const chosenName = normalizeDisplayName(parsed.data.displayName) ?? normalizeDisplayName(session?.user?.name);

      /*
       * The slug is permanent, so it is worth getting right once. A name that
       * reduces to nothing - Japanese, emoji, or two characters - falls back to
       * a generated one rather than producing an address nobody can type.
       */
      const preferred = slugify(chosenName) ?? slugify(email.split("@")[0]) ?? generateFriendlyName();
      const taken = new Set(
        (await prisma.account.findMany({ select: { slug: true } }))
          .map((row) => row.slug)
          .filter((slug): slug is string => Boolean(slug)),
      );

      const account = await prisma.account.create({
        data: {
          nickname: chosenName ?? preferred,
          displayName: chosenName,
          slug: uniqueSlug(preferred, taken),
          joinedByEmail: email,
          joinedByName: session?.user?.name?.trim() ?? null,
          visibility: visibility ?? settings.defaultVisibility,
          approvalStatus: requiresApproval(settings) ? ACCOUNT_APPROVAL.pending : ACCOUNT_APPROVAL.approved,
          approvedAt: requiresApproval(settings) ? null : new Date(),
        },
        select: { id: true, slug: true, approvalStatus: true },
      });

      return NextResponse.json({ account, created: true }, { status: 201 });
    },
  });
}
