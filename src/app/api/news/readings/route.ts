import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { readingKanaForRun } from "@/lib/news/newsReadingKana";

const requestSchema = z.object({
  runs: z.array(z.string().trim().min(1).max(40)).min(1).max(300),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const uniqueRuns = Array.from(new Set(parsed.data.runs.map((run) => run.trim()).filter(Boolean)));

    const entries = await Promise.all(
      uniqueRuns.map(async (run) => {
        const reading = await readingKanaForRun(run).catch(() => null);
        return [run, reading] as const;
      }),
    );

    return NextResponse.json({ readings: Object.fromEntries(entries) }, { status: 200 });
  } catch (error) {
    console.error("[news/readings] failed", error);
    return NextResponse.json({ error: "Couldn't build readings." }, { status: 500 });
  }
}
