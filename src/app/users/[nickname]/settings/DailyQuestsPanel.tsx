import { XP_BONUSES } from "@/lib/xp/xpAwards";
import { loadQuestBoard } from "@/lib/xp/xpQuestsServer";
import { XP_QUEST_BLURBS, XP_QUEST_COPY as copy, XP_QUEST_TITLES } from "@/lib/xp/xpQuestsCopy";
import type { XpQuestProgress } from "@/lib/xp/xpQuests";

/**
 * Today's quests, on the page where the rank they feed already lives.
 *
 * The sibling of `XpRankPanel` and built the same way: it owns its whole card,
 * says what the thing is before showing it, and puts each quest in an inset
 * box. Nothing here is interactive, so it is a server component — the board is
 * three rows of arithmetic over data the server already has, and a spinner for
 * it would be a worse first frame than the answer.
 *
 * It reads and never settles. Awarding happens on the paths that earn XP, so a
 * member who finishes a quest is paid on the answer that finished it rather
 * than the next time they happen to open this page — and rendering a page is
 * not allowed to be a write.
 */
function QuestRow({ quest, paid }: { quest: XpQuestProgress; paid: boolean }) {
  const title = XP_QUEST_TITLES[quest.kind];
  const done = paid || quest.done;
  const percent = quest.target <= 0 ? 0 : Math.min(100, Math.round((quest.at / quest.target) * 100));

  return (
    <li className="rounded-2xl border border-line bg-surface-muted/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-black text-foreground">{title}</p>
        <p className="shrink-0 text-[11px] font-black tabular-nums text-foreground/60">
          {copy.reward(quest.xp)}
        </p>
      </div>
      <p className="mt-0.5 text-[11px] font-semibold text-foreground/60">{XP_QUEST_BLURBS[quest.kind]}</p>

      <div
        role="progressbar"
        aria-label={copy.progressLabel(title)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={done ? 100 : percent}
        className="mt-2 h-2 overflow-hidden rounded-full bg-line"
      >
        <div
          className={`h-full rounded-full ${quest.spoiled && !done ? "bg-foreground/30" : "bg-accent"}`}
          style={{ width: `${done ? 100 : percent}%` }}
        />
      </div>

      <p className="mt-1.5 text-[11px] font-semibold tabular-nums text-foreground/60">
        {done ? copy.done : quest.spoiled ? copy.spoiledHint : copy.progress(quest.at, quest.target)}
      </p>
    </li>
  );
}

export default async function DailyQuestsPanel({ accountId }: { accountId: string }) {
  const board = await loadQuestBoard(accountId);
  const paid = new Set(board.paid);
  const earned = board.paid.reduce((total, kind) => total + XP_BONUSES[kind], 0);
  const allDone = board.quests.length > 0 && board.quests.every((quest) => paid.has(quest.kind) || quest.done);

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-foreground">{copy.heading}</h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>
      </div>

      {/* A member with no board has not finished anything, they have not
          started — which is a different sentence from "all done". */}
      {board.quests.length === 0 ? (
        <p className="text-sm font-semibold text-foreground/60">{copy.empty}</p>
      ) : (
        <ul className="space-y-2">
          {board.quests.map((quest) => (
            <QuestRow key={quest.kind} quest={quest} paid={paid.has(quest.kind)} />
          ))}
        </ul>
      )}

      {earned > 0 || allDone ? (
        <p className="text-[11px] font-semibold tabular-nums text-foreground/60">
          {allDone ? copy.allDone : copy.earnedToday(earned)}
        </p>
      ) : null}
    </section>
  );
}
