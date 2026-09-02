import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";
import { attachSubjectIds } from "@/lib/studyLists";
import { TEXT_IMPORT_LIMITS, extractListItems, sanitizePastedText, wordCandidates } from "@/lib/textExtract";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

/*
 * Twice the cap the reader applies, so a paste a little over the line is cut
 * rather than refused, and anything wildly over it never reaches the reader
 * at all.
 */
const bodySchema = z.object({ text: z.string().max(TEXT_IMPORT_LIMITS.characters * 2) });

/**
 * A paste, read into a list.
 *
 * Nothing of the text is kept: it is cut to a cap, stripped of what cannot be
 * read, matched against the catalogue, and answered with items - kinds and
 * keys the catalogue already knew. The words come from one query for the
 * substrings the paste could hold, so a chapter costs a single lookup rather
 * than one per word.
 */
export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/extract",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "That is more text than one list can hold." }, { status: 400 });
        }

        const { text } = sanitizePastedText(parsed.data.text);
        const candidates = wordCandidates(text);
        const rows =
          candidates.length > 0
            ? await prisma.wkSubjectCatalog.findMany({
                where: { hiddenAt: null, subjectType: SUBJECT_TYPES.vocabulary, characters: { in: candidates } },
                select: { characters: true },
              })
            : [];
        const known = new Set(rows.flatMap((row) => (row.characters ? [row.characters] : [])));

        const extracted = extractListItems({ text, known });
        return NextResponse.json({ items: await attachSubjectIds(extracted.items), stats: extracted.stats });
      } catch (error) {
        console.error("Failed to read a paste into a list", error);
        return NextResponse.json({ error: "Could not read that text." }, { status: 500 });
      }
    },
  });
}
