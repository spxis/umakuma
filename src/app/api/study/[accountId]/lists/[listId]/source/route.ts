import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { LIST_ITEM_KIND_VALUES, LIST_VISIBILITIES } from "@/lib/domainConstants";
import { addedToSource, withItemsTaken } from "@/lib/listSourceSync";
import { prisma } from "@/lib/prisma";
import { isMissingStudyListTableError, listItemId, type StudyListItemRef } from "@/lib/studyListRules";
import { replaceListItems } from "@/lib/studyLists";
import { fetchListSubjectRows } from "@/lib/studySubjectItems";

type RouteContext = {
  params: Promise<{ accountId: string; listId: string }>;
};

/* Every column the rewrite will write back, so a save cannot drop one. */
const COPY_ITEM_SELECT = {
  kind: true,
  key: true,
  subjectId: true,
  note: true,
  addedByAccountId: true,
} as const;

const takeSchema = z.object({
  /* Absent means all of them; a list means exactly those. */
  items: z
    .array(z.object({ kind: z.enum(LIST_ITEM_KIND_VALUES), key: z.string().min(1).max(64) }))
    .max(500)
    .optional(),
});

/**
 * What the list this one was copied from has gained since.
 *
 * A copy is a snapshot and the friend it came from keeps adding, which left
 * two bad ways forward: subscribe and stop owning what you are looking at, or
 * copy again and lose everything you changed. A copy remembers its source, so
 * it can simply ask.
 *
 * A source that has since gone private answers as unreachable rather than as
 * empty: "nothing new" and "you can no longer see this" are different things,
 * and a member deciding whether to keep a copy needs to know which.
 */
async function loadPair(accountId: string, listId: string) {
  const copy = await prisma.studyList.findFirst({
    where: { id: listId, accountId },
    select: { id: true, sourceListId: true, archivedAt: true, items: { select: COPY_ITEM_SELECT, orderBy: { position: "asc" as const } } },
  });
  if (!copy) return { error: "That list is gone." as const, status: 404 };
  if (!copy.sourceListId) return { error: "This list was not copied from another." as const, status: 400 };

  const source = await prisma.studyList.findUnique({
    where: { id: copy.sourceListId },
    select: {
      name: true,
      visibility: true,
      archivedAt: true,
      account: { select: { nickname: true, slug: true, wkUsername: true } },
      items: { select: COPY_ITEM_SELECT, orderBy: { position: "asc" as const } },
    },
  });

  /*
   * Reachable means public or link-only, not "prove you hold the link".
   *
   * The copy kept no share key - there was nowhere to put one - and the member
   * demonstrably had access when they took the copy. A source turned private
   * since is a decision by its owner and is honoured.
   */
  const reachable = Boolean(
    source &&
      !source.archivedAt &&
      (source.visibility === LIST_VISIBILITIES.public || source.visibility === LIST_VISIBILITIES.unlisted),
  );

  return { copy, source, reachable };
}

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/[listId]/source",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId, listId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const pair = await loadPair(accountId, listId);
        if ("error" in pair) return NextResponse.json({ error: pair.error }, { status: pair.status });

        const { copy, source, reachable } = pair;
        if (!source || !reachable) {
          return NextResponse.json({ reachable: false, name: source?.name ?? null, added: [] });
        }

        const added = addedToSource(source.items, copy.items);
        /* Named, so the panel can show what is on offer rather than a count. */
        const rows = added.length > 0 ? await fetchListSubjectRows(added) : [];

        return NextResponse.json({
          reachable: true,
          name: source.name,
          owner: source.account?.nickname ?? source.account?.wkUsername ?? null,
          added: rows.map((row) => ({
            kind: row.kind,
            key: row.key.includes(":") ? row.key.slice(row.key.indexOf(":") + 1) : row.key,
            glyph: row.glyph,
            meaning: row.meaning,
          })),
        });
      } catch (error) {
        if (isMissingStudyListTableError(error)) return NextResponse.json({ reachable: false, added: [] });
        console.error("Failed to read what a list's source has gained", error);
        return NextResponse.json({ error: "Could not check that list's source." }, { status: 500 });
      }
    },
  });
}

/** Takes the named items across, or all of them when none are named. */
export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/[listId]/source",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId, listId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = takeSchema.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const pair = await loadPair(accountId, listId);
        if ("error" in pair) return NextResponse.json({ error: pair.error }, { status: pair.status });

        const { copy, source, reachable } = pair;
        if (copy.archivedAt) {
          return NextResponse.json({ error: "This list is archived. Restore it to change it." }, { status: 409 });
        }
        if (!source || !reachable) {
          return NextResponse.json({ error: "That list is no longer shared." }, { status: 404 });
        }

        const offered = addedToSource(source.items, copy.items);
        const wanted = parsed.data.items
          ? new Set(parsed.data.items.map((item) => listItemId(item)))
          : null;
        /* Only ever what the source actually holds, whatever the body asked for. */
        const taken: StudyListItemRef[] = wanted ? offered.filter((item) => wanted.has(listItemId(item))) : offered;

        if (taken.length === 0) return NextResponse.json({ added: 0 });

        await replaceListItems(listId, withItemsTaken(copy.items, taken), accountId);
        return NextResponse.json({ added: taken.length });
      } catch (error) {
        console.error("Failed to take items from a list's source", error);
        return NextResponse.json({ error: "Could not update that list." }, { status: 500 });
      }
    },
  });
}
