import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  accountId: z.string().cuid(),
  bookId: z.string().cuid(),
  manualCoverUrl: z.union([z.string().url().max(2048), z.null()]),
});

function getDelegate(): typeof prisma.readingChallengeBook | null {
  return prisma.readingChallengeBook;
}

export async function POST(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/reading-books/cover-override",
    method: "POST",
    request,
    execute: async () => {
      try {
        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        if (!(await canAccessAccount(request, parsed.data.accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const delegate = getDelegate();
        if (!delegate) {
          return NextResponse.json({ error: "Reading books are not ready yet." }, { status: 503 });
        }

        const book = await delegate.findUnique({
          where: { id: parsed.data.bookId },
          select: { id: true, accountId: true },
        });

        if (!book || book.accountId !== parsed.data.accountId) {
          return NextResponse.json({ error: "Book not found." }, { status: 404 });
        }

        const nextUrl = parsed.data.manualCoverUrl?.trim() || null;
        if (nextUrl && !/^https:\/\//.test(nextUrl)) {
          return NextResponse.json({ error: "Cover URL must be https." }, { status: 400 });
        }

        const updated = await delegate.update({
          where: { id: book.id },
          data: { manualCoverUrl: nextUrl },
        });

        return NextResponse.json({ book: updated }, { status: 200 });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not update cover." }, { status: 500 });
      }
    },
  });
}
