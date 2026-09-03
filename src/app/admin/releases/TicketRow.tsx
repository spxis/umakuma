"use client";

import { useState } from "react";

import { FEATURE_AREA_LABELS, FEATURE_KINDS } from "@/lib/featureTimeline";
import { formatDateShort } from "@/lib/timeFormat";
import {
  TICKET_STATUSES,
  TICKET_MOVES,
  TICKET_STATUS_LABELS,
  ticketMoveLabel,
  type Ticket,
} from "@/lib/tickets";

import { RELEASE_AREA_CLASSES, RELEASE_TIMELINE_COPY } from "./ReleaseTimeline.constants";

const STATUS_CLASSES: Record<string, string> = {
  [TICKET_STATUSES.open]: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  [TICKET_STATUSES.inProgress]: "border-amber-500/40 bg-amber-400/10 text-amber-800",
  [TICKET_STATUSES.shipped]: "border-sky-500/40 bg-sky-500/10 text-sky-700",
  [TICKET_STATUSES.filed]: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  [TICKET_STATUSES.declined]: "border-line bg-surface-muted text-foreground/60",
};

/**
 * One wish, in the same collapsed shape as a timeline row.
 *
 * A waiting wish shows the command that turns it into planned work, because
 * that step happens in a terminal and cannot happen here: the timeline is a
 * committed file, so only an agent can file one.
 */
export default function TicketRow({
  wish,
  endpoint,
  onChanged,
}: {
  wish: Ticket;
  endpoint: string;
  onChanged: (wish: Ticket) => void;
}) {
  const [busy, setBusy] = useState(false);
  const open = wish.status === TICKET_STATUSES.open;

  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      const response = await fetch(`${endpoint}/${wish.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        const { wish: updated } = (await response.json()) as { wish: Ticket };
        onChanged(updated);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="border-b border-line/60 last:border-b-0">
      <details className="group py-3">
        <summary className="flex cursor-pointer list-none flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <span className="flex shrink-0 items-baseline gap-2 sm:w-40 sm:justify-end">
            {/*
              * A wish is an instant, not a calendar day like a release date,
              * so it reads in the viewer's own zone. Slicing the ISO string
              * showed tomorrow to anyone west of Greenwich after 5pm.
              */}
            <time dateTime={wish.createdAt} className="font-mono text-xs text-foreground/60">
              {formatDateShort(wish.createdAt)}
            </time>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{wish.title}</span>

              {wish.area ? (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RELEASE_AREA_CLASSES[wish.area]}`}
                >
                  {FEATURE_AREA_LABELS[wish.area]}
                </span>
              ) : null}

              {wish.kind === FEATURE_KINDS.bug ? (
                <span className="inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                  {RELEASE_TIMELINE_COPY.bug}
                </span>
              ) : null}

              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[wish.status]}`}
              >
                {TICKET_STATUS_LABELS[wish.status]}
              </span>
            </div>
          </div>

          <span
            aria-hidden="true"
            className="shrink-0 self-center text-foreground/35 transition group-open:rotate-90"
          >
            ›
          </span>
        </summary>

        <div className="mt-2 space-y-2 sm:ml-44">
          {wish.detail ? <p className="text-sm text-foreground/70">{wish.detail}</p> : null}

          <p className="text-xs text-foreground/60">
            {wish.requestedBy ? `${RELEASE_TIMELINE_COPY.wishRequestedBy} ${wish.requestedBy}` : null}
            {wish.filedAs ? ` · ${RELEASE_TIMELINE_COPY.wishFiledAs} ${wish.filedAs}` : null}
          </p>

          {open ? (
            <code className="block overflow-x-auto rounded-lg border border-line bg-surface-muted px-2 py-1 text-[11px] text-foreground/70">
              {RELEASE_TIMELINE_COPY.wishHowFiled(wish.id)}
            </code>
          ) : null}

          {/*
            * Every move the ticket's state actually allows, rather than one
            * hard-coded pair. A board you can only decline from is a list, and
            * moving work along is the thing this page is for.
            */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(TICKET_MOVES[wish.status] ?? []).map((next) => (
              <button
                key={next}
                type="button"
                disabled={busy}
                onClick={() => setStatus(next)}
                className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground transition hover:bg-surface-muted disabled:opacity-50"
              >
                {ticketMoveLabel(wish.status, next)}
              </button>
            ))}
            {wish.claimedBy ? (
              <span className="text-[11px] font-semibold text-foreground/60">
                {RELEASE_TIMELINE_COPY.ticketHeldBy} {wish.claimedBy}
              </span>
            ) : null}
          </div>
        </div>
      </details>
    </li>
  );
}
