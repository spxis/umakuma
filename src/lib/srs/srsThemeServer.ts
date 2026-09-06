import "server-only";

import { prisma } from "@/lib/prisma";

import { ratingFor } from "./ageBand";
import { DEFAULT_SRS_THEME_ID, srsTheme, srsThemeForRating, srsThemesFor, type SrsTheme } from "./srsThemes";

/**
 * The theme a member sees, and the ones they may choose from.
 *
 * A saved theme is checked against the member's age band on the way out as
 * well as on the way in: an account whose band later says under 13 stops being
 * shown the adult themes even if one was chosen before, rather than keeping
 * whatever it was holding.
 */
export async function memberTheme(accountId: string): Promise<{ theme: SrsTheme; choices: SrsTheme[] }> {
  const account = await prisma.account
    .findUnique({ where: { id: accountId }, select: { srsTheme: true, ageBand: true } })
    .catch(() => null);

  const rating = ratingFor(account?.ageBand);
  return { theme: srsThemeForRating(account?.srsTheme, rating), choices: srsThemesFor(rating) };
}

/**
 * Records a member's pick. Refuses a theme their age band may not see, and
 * treats the default as no choice at all so the row stays null.
 */
export async function saveMemberTheme(accountId: string, themeId: string | null): Promise<SrsTheme> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { ageBand: true },
  });
  const allowed = srsThemesFor(ratingFor(account?.ageBand));
  const chosen = themeId === null ? null : allowed.find((theme) => theme.id === themeId);
  if (themeId !== null && !chosen) throw new Error("That theme is not available on this account.");

  await prisma.account.update({
    where: { id: accountId },
    data: { srsTheme: chosen && chosen.id !== DEFAULT_SRS_THEME_ID ? chosen.id : null },
  });
  return chosen ?? srsTheme(DEFAULT_SRS_THEME_ID);
}
