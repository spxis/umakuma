import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { applyOverrides, runBalanceSimulation, simulatePersona, sittingsComparison } from "@/lib/xp/balanceSimulator";
import { SIM_PERSONAS, simPersonaById } from "@/lib/xp/simPersonas";
import { importVerdicts } from "@/lib/xp/simImport";
import { toSimTableRow } from "@/lib/xp/simTable";

/**
 * Running the balance model from the site, and reading the table it makes.
 *
 * It writes nothing. There is no row behind it and no migration under it — it
 * is a model, and the only thing it touches is the request that asked for it.
 * That is what makes it safe to run against production while tuning a curve:
 * the worst a bad run can do is print a bad table.
 *
 * The horizon is capped rather than free. Twenty-four people over five years
 * is about a second of arithmetic; over fifty it would be a minute, and an
 * admin screen that can hang the server is worse than one that says no.
 */

const MAX_DAYS = 365 * 5;

const overridesSchema = z
  .object({
    attendance: z.coerce.number().min(0).max(1),
    reviewsPerDay: z.coerce.number().int().min(0).max(1_000),
    lessonsPerDay: z.coerce.number().int().min(0).max(200),
    gamesPerDay: z.coerce.number().int().min(0).max(20),
    accuracy: z.coerce.number().min(0.05).max(1),
    sessionHours: z.array(z.coerce.number().int().min(0).max(23)).min(1).max(8),
    sitsExams: z.boolean(),
    holidayDays: z.coerce.number().int().min(0).max(365),
    startLevel: z.coerce.number().int().min(1).max(100),
    startXp: z.coerce.number().int().min(0).max(1_000_000),
  })
  .partial();

const runSchema = z.object({
  /** Null or absent runs everybody, which is the default view. */
  personaId: z.string().trim().min(1).max(80).nullable().optional(),
  days: z.coerce.number().int().min(7).max(MAX_DAYS).default(365),
  seed: z.coerce.number().int().min(1).max(1_000_000).default(12_345),
  /** Hold lessons when the apprentice queue is this deep. Null is no gate. */
  lessonGate: z.coerce.number().int().min(10).max(2_000).nullable().optional(),
  overrides: overridesSchema.optional(),
  /** Take no lessons on a day that opens behind on reviews. Anki's default. */
  throttleLessonsOnBacklog: z.boolean().optional(),
  /** Also run the same person at one, two, three and four sittings a day. */
  compareSittings: z.boolean().optional(),
});

/** The persona set and its settings, for the screen that tweaks them. */
export async function GET(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/balance-simulation",
    method: "GET",
    request,
    execute: async () => {
      if (!(await isAuthorizedAdmin(request))) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
      return NextResponse.json({ personas: SIM_PERSONAS, maxDays: MAX_DAYS });
    },
  });
}

export async function POST(request: Request) {
  return withApiRouteTelemetry({
    route: "/api/admin/balance-simulation",
    method: "POST",
    request,
    execute: async () => {
      try {
        if (!(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const parsed = runSchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request." }, { status: 400 });
        }
        const { personaId, days, seed, overrides, compareSittings } = parsed.data;
        const options = {
          days,
          seed,
          lessonGate: parsed.data.lessonGate ?? null,
          throttleLessonsOnBacklog: parsed.data.throttleLessonsOnBacklog ?? false,
        };

        if (!personaId) {
          const results = runBalanceSimulation(SIM_PERSONAS, options);
          return NextResponse.json({
            rows: results.map(toSimTableRow),
            sittings: null,
            imports: importVerdicts(),
            days,
          });
        }

        const found = simPersonaById(personaId);
        if (!found) return NextResponse.json({ error: "No such person." }, { status: 404 });

        const persona = applyOverrides(found, overrides);
        return NextResponse.json({
          rows: [toSimTableRow(simulatePersona(persona, options))],
          sittings: compareSittings
            ? sittingsComparison(persona, options).map(toSimTableRow)
            : null,
          imports: importVerdicts(),
          days,
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Could not run the simulation." }, { status: 500 });
      }
    },
  });
}
