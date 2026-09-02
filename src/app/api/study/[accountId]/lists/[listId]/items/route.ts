import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";
import { LIST_ITEM_KIND_VALUES } from "@/lib/domainConstants";
import { STUDY_LIST_LIMITS, isMissingStudyListTableError } from "@/lib/studyListRules";
import { z } from "zod";

import { replaceListItems } from "@/lib/studyLists";
import { fetchStudyListItems } from "@/lib/studySubjectItems";

type RouteContext = {
  params: Promise<{ accountId: string; listId: string }>;
};

/**
 * What a saved list actually holds.
 *
 * A list card showed a wall of glyphs and offered rename, edit, delete and
 * practise - so the one thing a member could not do with a list they had built
 * was read it. The Trouble and Favourites lists had a viewer from the start;
 * this is the same viewer's data for a list with a name instead of a flag.
 *
 * Addressed by list id and scoped to the account in the same `where`, so a list
 * id from another member reads as a missing list rather than as somebody else's
 * contents.
 */
export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/[listId]/items",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId, listId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const list = await prisma.studyList
          .findFirst({
            where: { id: listId, accountId },
            select: {
              name: true,
              items: { select: { kind: true, key: true, subjectId: true, note: true }, orderBy: { position: "asc" } },
            },
          })
          .catch((error: unknown) => {
            if (isMissingStudyListTableError(error)) return null;
            throw error;
          });

        if (!list) {
          return NextResponse.json({ error: "That list is gone." }, { status: 404 });
        }

        return NextResponse.json(
          { name: list.name, items: await fetchStudyListItems(accountId, list.items) },
          { status: 200 },
        );
      } catch (error) {
        console.error("Failed to load a saved list", error);
        return NextResponse.json({ error: "Could not load that list." }, { status: 500 });
      }
    },
  });
}

const removeSchema = z.object({ kind: z.enum(LIST_ITEM_KIND_VALUES), key: z.string().min(1).max(200) });

/**
 * Take one item out, from the viewer.
 *
 * Named the way the list holds it - a kind and a key - so an item WaniKani
 * never named can be taken out as easily as one it did. Scoped to the account
 * in the read, so somebody else's list id removes nothing.
 */
export async function DELETE(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/[listId]/items",
    method: "DELETE",
    request,
    execute: async () => {
      try {
        const { accountId, listId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = removeSchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }
        const list = await prisma.studyList.findFirst({
          where: { id: listId, accountId },
          select: {
            archivedAt: true,
            /* Rewritten wholesale below, so every column it keeps is read here. */
            items: {
              select: { kind: true, key: true, subjectId: true, note: true, addedByAccountId: true },
              orderBy: { position: "asc" },
            },
          },
        });
        if (!list) {
          return NextResponse.json({ error: "That list is gone." }, { status: 404 });
        }
        if (list.archivedAt) {
          return NextResponse.json({ error: "This list is archived. Restore it to change it." }, { status: 409 });
        }
        const kept = list.items.filter((item) => !(item.kind === parsed.data.kind && item.key === parsed.data.key));
        if (kept.length !== list.items.length) await replaceListItems(listId, kept, accountId);
        return NextResponse.json({ removed: list.items.length - kept.length });
      } catch (error) {
        console.error("Failed to take an item out of a list", error);
        return NextResponse.json({ error: "Could not change that list." }, { status: 500 });
      }
    },
  });
}

const noteSchema = z.object({
  kind: z.enum(LIST_ITEM_KIND_VALUES),
  key: z.string().min(1).max(64),
  /** Empty clears it; the column holds null rather than an empty string. */
  note: z.string().max(STUDY_LIST_LIMITS.noteLength),
});

/**
 * Why an item is on the list, in the words of whoever put it there.
 *
 * A list of glyphs says what to study and never says why: the mnemonic that
 * finally made it stick, the sentence it was met in, the mistake it keeps
 * causing. Those are the reason a member's own list beats a generated one, and
 * they had nowhere to live.
 *
 * One item at a time rather than a list-wide save, because a note is written
 * while reading the list and a whole-list write would race with any other
 * change open in another tab.
 */
export async function PATCH(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists/[listId]/items",
    method: "PATCH",
    request,
    execute: async () => {
      try {
        const { accountId, listId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }
        const parsed = noteSchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const list = await prisma.studyList.findFirst({
          where: { id: listId, accountId },
          select: { archivedAt: true },
        });
        if (!list) {
          return NextResponse.json({ error: "That list is gone." }, { status: 404 });
        }
        if (list.archivedAt) {
          return NextResponse.json({ error: "This list is archived. Restore it to change it." }, { status: 409 });
        }

        const note = parsed.data.note.trim();
        const updated = await prisma.studyListItem.updateMany({
          where: { listId, kind: parsed.data.kind, key: parsed.data.key },
          data: { note: note.length > 0 ? note : null },
        });
        if (updated.count === 0) {
          return NextResponse.json({ error: "That item is not on this list." }, { status: 404 });
        }

        /* The list changed, so it says so - a note is a change to the list. */
        await prisma.studyList.update({ where: { id: listId }, data: { updatedAt: new Date() } });
        return NextResponse.json({ note: note.length > 0 ? note : null });
      } catch (error) {
        console.error("Failed to write a note on a list item", error);
        return NextResponse.json({ error: "Could not save that note." }, { status: 500 });
      }
    },
  });
}
