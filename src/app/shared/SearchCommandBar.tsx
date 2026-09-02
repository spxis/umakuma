"use client";

import { RADICAL_SEARCH_COPY } from "./radicalSearchCopy";
import { formatRadicalCommand } from "@/lib/searchCommands";

/**
 * The way in to the commands, for anybody who does not know they exist.
 *
 * A command is the right shape for the radical lookup - the query says what is
 * being asked, and it can be typed, pasted and walked back to - and it is
 * invisible. Nobody guesses `:rad`. So the commands are also a row under the
 * box: one control each, which writes the command rather than opening a panel
 * of its own, so pressing the button and typing the words land in exactly the
 * same place.
 *
 * It sits under the input and above whatever the panel is showing, which is
 * where the reader is already looking, and it steps aside once a command is
 * running - the picker's own row takes that space and saying "Radicals" twice
 * would only be noise.
 */
export default function SearchCommandBar({ onCommand }: { onCommand: (query: string) => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 px-3 py-1">
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-foreground/60">
        {RADICAL_SEARCH_COPY.commandBarLabel}
      </span>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onCommand(formatRadicalCommand([]))}
        title={RADICAL_SEARCH_COPY.openLabel}
        className="inline-flex h-6 items-center rounded-full border border-line bg-surface px-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/75 transition hover:border-accent hover:text-accent"
      >
        {RADICAL_SEARCH_COPY.open}
      </button>
      <span className="text-[10px] font-semibold text-foreground/60">{RADICAL_SEARCH_COPY.commandBarHint}</span>
    </div>
  );
}
