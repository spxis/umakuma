import "server-only";

import { settleDailyQuests } from "./xpQuestsServer";
import { settleDailyStreak } from "./xpStreakServer";

/**
 * Everything that has to be settled once a member has earned XP today.
 *
 * One call, so a study path or a game route does not have to know which
 * bookkeeping exists — the review path should not grow a line every time
 * something new is measured about a day.
 *
 * Both halves swallow their own failures and neither can throw, because both
 * hang off an action that has already succeeded: an answer that scored
 * correctly is a completed answer whether or not its streak bonus landed.
 * Sequential rather than parallel on purpose — the streak settlement is what
 * writes the day's `dailySignIn` row, and the quests read the day's rows.
 */
export async function settleDailyXp({
  accountId,
  now = new Date(),
}: {
  accountId: string;
  now?: Date;
}): Promise<number> {
  const streak = await settleDailyStreak({ accountId, now });
  const quests = await settleDailyQuests({ accountId, now });
  return streak + quests;
}
