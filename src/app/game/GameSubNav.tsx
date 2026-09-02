"use client";

import { useEffect, useState } from "react";

import { GAME_KIND_VALUES, type GameKind } from "@/lib/gameMode";

import { GAME_KIND_LABELS } from "./GameMode.constants";

/** Asks the game client to open a kind's lobby. */
export const GAME_KIND_REQUEST_EVENT = "wr:game-kind-request";
/** The client saying which kind it has open, so the row can light it. */
export const GAME_KIND_OPENED_EVENT = "wr:game-kind-opened";

/**
 * The games, in the header's second row.
 *
 * Every other section lists its pages there - Explore its explorers, Admin its
 * workspace tabs - and Game listed one child called "Game", so the row sat
 * empty on the one page with six things to choose between. They were reachable
 * only by scrolling to the hub cards.
 *
 * They are not routes: a kind is chosen inside the client, which then holds the
 * lobby and the run. So this asks rather than navigates, the same way the
 * header's dashboard links ask `UserDashboardTabs` to change tab. Buttons
 * rather than links, because a button is what this is - there is no address to
 * middle-click through to.
 */
export default function GameSubNav({ activeKind = null }: { activeKind?: GameKind | null }) {
  /*
   * Which kind is open lives in the client, and this row is drawn by the
   * page, so the client says when it changes. Without it the row lit nothing
   * and a member could not tell from the header what they were looking at.
   */
  const [openKind, setOpenKind] = useState<GameKind | null>(activeKind);
  useEffect(() => {
    const onOpened = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: GameKind | null }>).detail;
      setOpenKind(detail?.kind ?? null);
    };
    window.addEventListener(GAME_KIND_OPENED_EVENT, onOpened);
    return () => window.removeEventListener(GAME_KIND_OPENED_EVENT, onOpened);
  }, []);

  return (
    <nav
      aria-label="Games"
      className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/60 sm:text-[11px]"
    >
      {GAME_KIND_VALUES.map((kind) => (
        <button
          key={kind}
          type="button"
          aria-current={kind === openKind ? "page" : undefined}
          onClick={() => {
            window.dispatchEvent(new CustomEvent(GAME_KIND_REQUEST_EVENT, { detail: { kind } }));
          }}
          /*
             `uppercase` on the row is not enough: a browser's own stylesheet
             sets `text-transform: none` on form controls, so these buttons
             read in title case beside every other sub-nav's links. It goes on
             the control itself.
           */
          className={`shrink-0 rounded-full px-2 py-0.5 uppercase transition ${
            kind === openKind ? "bg-surface-muted font-black text-foreground" : "hover:text-foreground/75"
          }`}
        >
          {GAME_KIND_LABELS[kind]}
        </button>
      ))}
    </nav>
  );
}
