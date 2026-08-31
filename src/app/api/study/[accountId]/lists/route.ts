import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";
import {
  fetchStudyLists,
  isMissingStudyListTableError,
  normalizeListCharacters,
  STUDY_LIST_LIMITS,
} from "@/lib/studyLists";

type RouteContext = {
  params: Promise<{ accountId: string }>;
};

const saveSchema = z.object({
  name: z.string().trim().min(1).max(STUDY_LIST_LIMITS.nameLength),
  /*
   * Taken as a string rather than an array: this is what the selection encodes
   * and what a link carries, and splitting it here keeps one definition of what
   * counts as a character.
   */
  characters: z.string().min(1),
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

        const characters = normalizeListCharacters([parsed.data.characters]);
        if (characters.length === 0) {
          return NextResponse.json({ error: "A list needs at least one character." }, { status: 400 });
        }

        /*
         * Saving a name that exists updates it. The alternative - refusing, or
         * quietly making "Week 1 (2)" - is worse for the actual habit here,
         * which is rebuilding this week's list after adding one more character.
         */
        const existing = await prisma.studyList.count({ where: { accountId } });
        const known = await prisma.studyList.findUnique({
          where: { accountId_name: { accountId, name: parsed.data.name } },
          select: { id: true },
        });
        if (!known && existing >= STUDY_LIST_LIMITS.perAccount) {
          return NextResponse.json(
            { error: "That is as many lists as one account holds." },
            { status: 409 },
          );
        }

        const list = await prisma.studyList.upsert({
          where: { accountId_name: { accountId, name: parsed.data.name } },
          create: { accountId, name: parsed.data.name, characters },
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
