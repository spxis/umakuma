import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";
import {
  isDuplicateListNameError,
  isMissingStudyListTableError,
  normalizeListCharacters,
  normalizeListName,
  STUDY_LIST_LIMITS,
} from "@/lib/studyListRules";
import { fetchStudyLists } from "@/lib/studyLists";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

/*
 * Names arrive raw and are normalized here rather than validated by shape.
 * Zod's `.trim().max()` would reject a name that is only over-length because
 * somebody pasted a line break into it, when the right answer is to tidy it.
 * The generous bound is a body-size guard, not the rule.
 */
const NAME_INPUT_MAX = STUDY_LIST_LIMITS.nameLength * 4;

const saveSchema = z.object({
  name: z.string().min(1).max(NAME_INPUT_MAX),
  /*
   * Taken as a string rather than an array: this is what the selection encodes
   * and what a link carries, and splitting it here keeps one definition of what
   * counts as a character.
   *
   * Optional, because a list can be started before it holds anything. Making
   * one on the lists page and filling it while browsing is the way somebody
   * builds "kanji I keep losing"; requiring a character up front forced every
   * list to begin on an explorer with a selection already made.
   */
  characters: z.string().default(""),
});

/*
 * Both halves optional, and at least one required.
 *
 * A rename and an edit of the contents are the same shape of change - this
 * list, these fields - and splitting them into two routes would mean two ways
 * to say "and it must still be your list". Sending neither is a caller bug
 * rather than a no-op, so it is refused.
 */
const changeSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(NAME_INPUT_MAX).optional(),
    characters: z.string().optional(),
  })
  .refine((value) => value.name !== undefined || value.characters !== undefined, {
    message: "Nothing to change.",
  });

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        return NextResponse.json({ lists: await fetchStudyLists(accountId) });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not load lists." }, { status: 500 });
      }
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const parsed = saveSchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const name = normalizeListName(parsed.data.name);
        if (!name) {
          return NextResponse.json({ error: "A list needs a name." }, { status: 400 });
        }

        const characters = normalizeListCharacters([parsed.data.characters]);

        /*
         * Saving a name that exists updates it. The alternative - refusing, or
         * quietly making "Week 1 (2)" - is worse for the actual habit here,
         * which is rebuilding this week's list after adding one more character.
         */
        const existing = await prisma.studyList.count({ where: { accountId } });
        const known = await prisma.studyList.findUnique({
          where: { accountId_name: { accountId, name } },
          select: { id: true },
        });
        if (!known && existing >= STUDY_LIST_LIMITS.perAccount) {
          return NextResponse.json(
            { error: "That is as many lists as one account holds." },
            { status: 409 },
          );
        }

        const list = await prisma.studyList.upsert({
          where: { accountId_name: { accountId, name } },
          create: { accountId, name, characters },
          update: { characters },
          select: { id: true, name: true, characters: true, updatedAt: true },
        });

        return NextResponse.json({
          list: { ...list, updatedAt: list.updatedAt.toISOString() },
        });
      } catch (error) {
        if (isMissingStudyListTableError(error)) {
          return NextResponse.json({ error: "Saved lists are not available yet." }, { status: 503 });
        }
        console.error(error);
        return NextResponse.json({ error: "Could not save the list." }, { status: 500 });
      }
    },
  });
}

/**
 * Changing a list you already have: its name, what is in it, or both.
 *
 * Separate from POST on purpose. Saving under an existing name updates that
 * list's characters, so a rename expressed as a save would replace the target
 * list's contents with this one's - the exact accident a member would make by
 * renaming "Week 2" to "Week 1". Editing the contents has the same problem in
 * reverse: POST needs a name to address a list, so it can only ever write to
 * whichever list holds that name, while this addresses the list by id.
 */
export async function PATCH(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists",
    method: "PATCH",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const parsed = changeSchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const data: { name?: string; characters?: string[] } = {};

        if (parsed.data.name !== undefined) {
          const name = normalizeListName(parsed.data.name);
          if (!name) {
            return NextResponse.json({ error: "A list needs a name." }, { status: 400 });
          }
          data.name = name;
        }

        if (parsed.data.characters !== undefined) {
          /*
           * An empty list is allowed, here as on creation. It used to be
           * refused on the reasoning that emptying a list is deleting it - but
           * a list can now be named before it holds anything, and a rule that
           * lets you create an empty list while refusing to empty one holds in
           * only one direction. Deleting is still its own button, and still
           * the way to be rid of a list rather than of its contents.
           */
          data.characters = normalizeListCharacters([parsed.data.characters]);
        }

        /*
         * Scoped to the account in the same statement that writes, so an id
         * from someone else's page matches nothing rather than being checked
         * and then trusted.
         */
        const changed = await prisma.studyList.updateMany({
          where: { id: parsed.data.id, accountId },
          data,
        });
        if (changed.count === 0) {
          return NextResponse.json({ error: "List not found." }, { status: 404 });
        }

        return NextResponse.json({ list: { id: parsed.data.id, ...data } });
      } catch (error) {
        if (isDuplicateListNameError(error)) {
          return NextResponse.json(
            { error: "You already have a list with that name." },
            { status: 409 },
          );
        }
        if (isMissingStudyListTableError(error)) {
          return NextResponse.json({ error: "Saved lists are not available yet." }, { status: 503 });
        }
        console.error(error);
        return NextResponse.json({ error: "Could not change the list." }, { status: 500 });
      }
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return withApiRouteTelemetry({
    route: "/api/study/[accountId]/lists",
    method: "DELETE",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const parsed = deleteSchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        // Scoped to the account, so an id from elsewhere deletes nothing.
        const removed = await prisma.studyList.deleteMany({
          where: { id: parsed.data.id, accountId },
        });
        if (removed.count === 0) {
          return NextResponse.json({ error: "List not found." }, { status: 404 });
        }

        return NextResponse.json({ removed: removed.count });
      } catch (error) {
        if (isMissingStudyListTableError(error)) {
          return NextResponse.json({ error: "Saved lists are not available yet." }, { status: 503 });
        }
        console.error(error);
        return NextResponse.json({ error: "Could not delete the list." }, { status: 500 });
      }
    },
  });
}
