import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { endOfListOutcome } from "@/lib/listArchive";
import { unionListItems } from "@/lib/listMerge";
import { prisma } from "@/lib/prisma";
import { STUDY_LIST_LIMITS, normalizeListName } from "@/lib/studyListRules";
import { attachments, replaceListItems, setArchived, slugTaken } from "@/lib/studyLists";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const mergeSchema = z.object({
  listIds: z.array(z.string().min(1)).min(2).max(STUDY_LIST_LIMITS.perAccount),
  name: z.string().min(1).max(STUDY_LIST_LIMITS.nameLength * 4),
  /** Whether the lists that went in are cleared away afterwards. */
  removeSources: z.boolean().default(false),
});

/**
 * Two or more of your lists, merged into a new one.
 *
 * The union is taken in the order the lists were sent, which is the order
 * they were picked. Clearing the sources away afterwards goes through the
 * same rule the delete button uses, so a source somebody else follows is
 * archived rather than deleted out from under them.
 */
export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/merge",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = mergeSchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const name = normalizeListName(parsed.data.name);
        if (!name) {
          return NextResponse.json({ error: "A list needs a name." }, { status: 400 });
        }
        if (await slugTaken(accountId, name)) {
          return NextResponse.json({ error: "You already have a list at that address." }, { status: 409 });
        }

        /* Scoped to the account in the read: an id from elsewhere merges nothing. */
        const sources = await prisma.studyList.findMany({
          where: { id: { in: parsed.data.listIds }, accountId },
          select: { id: true, items: { select: { kind: true, key: true, subjectId: true }, orderBy: { position: "asc" } } },
        });
        if (sources.length < 2) {
          return NextResponse.json({ error: "Choose two of your own lists to merge." }, { status: 404 });
        }

        const byId = new Map(sources.map((source) => [source.id, source.items]));
        const items = unionListItems(parsed.data.listIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])));

        const merged = await prisma.studyList.create({ data: { accountId, name }, select: { id: true, name: true } });
        await replaceListItems(merged.id, items, accountId);

        let archived = 0;
        let removed = 0;
        if (parsed.data.removeSources) {
          for (const source of sources) {
            const held = await attachments(source.id);
            if (held && endOfListOutcome(held) === "archive") {
              await setArchived(accountId, source.id, true);
              archived += 1;
            } else {
              await prisma.studyList.deleteMany({ where: { id: source.id, accountId } });
              removed += 1;
            }
          }
        }

        return NextResponse.json({ list: { id: merged.id, name: merged.name, itemCount: items.length }, archived, removed });
      } catch (error) {
        console.error("Failed to merge lists", error);
        return NextResponse.json({ error: "Could not merge those lists." }, { status: 500 });
      }
    },
  });
}
