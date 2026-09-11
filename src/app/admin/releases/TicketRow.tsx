"use client";

import { useState } from "react";

import { FEATURE_AREA_LABELS, FEATURE_KINDS, FEATURE_KIND_LABELS } from "@/lib/featureTimeline";
import { formatDateShort } from "@/lib/timeFormat";
import {
  TICKET_EFFORT_LABELS,
  TICKET_EFFORT_VALUES,
  TICKET_MOVES,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_VALUES,
  TICKET_STATUSES,
  ticketMoveLabel,
  type Ticket,
  type TicketMoveTarget,
} from "@/lib/tickets";

import {
  RELEASE_AREA_CLASSES,
  RELEASE_TIMELINE_COPY,
  TICKET_LANE_CLASSES,
  TICKET_LANE_LABELS,
  TICKET_SMALL_SELECT_CLASS,
} from "./ReleaseTimeline.constants";
import { ticketLane } from "./ticketBoardView";

type Patch = { status?: TicketMoveTarget; priority?: string | null; effort?: string | null };

/**
 * One ticket, in the same collapsed shape as a timeline row.
 *
 * The lane pill reads the lease, not the column: a ticket somebody holds
 * says so, and one whose hold lapsed says Stale rather than pretending
 * nobody ever started it. The grade is two small selects; nothing is drawn
 * for an ungraded row beyond them, because a column of "ungraded" would be
 * a column of shrugs and the absence already reads correctly.
 */
export default function TicketRow({
  ticket,
  endpoint,
  onChanged,
}: {
  ticket: Ticket;
  endpoint: string;
  onChanged: (ticket: Ticket) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const lane = ticketLane(ticket);
  const waiting = lane === "waiting" || lane === "stale";

  const patch = async (body: Patch) => {
    setBusy(true);
    setRefusal(null);
    try {
      const response = await fetch(`${endpoint}/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as { wish?: Ticket; error?: string } | null;
      if (response.ok && payload?.wish) {
        onChanged(payload.wish);
        return;
      }
      /* The route says no, and why - a held ticket, a move the state does not
         allow. Nothing happening on a press was the old answer to both. */
      setRefusal(payload?.error ?? RELEASE_TIMELINE_COPY.ticketError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="border-b border-line/60 last:border-b-0">
      <details className="group py-3">
        <summary className="flex cursor-pointer list-none flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <span className="flex shrink-0 items-baseline gap-2 sm:w-40 sm:justify-end">
            {/* A ticket is an instant, not a calendar day, so it reads in the
                viewer's own zone. Slicing the ISO string showed tomorrow to
                anyone west of Greenwich after 5pm. */}
            <time dateTime={ticket.createdAt} className="font-mono text-xs text-foreground/60">
              {formatDateShort(ticket.createdAt)}
            </time>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{ticket.title}</span>

              {ticket.area ? (
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RELEASE_AREA_CLASSES[ticket.area]}`}>
                  {FEATURE_AREA_LABELS[ticket.area]}
                </span>
              ) : null}

              {ticket.kind === FEATURE_KINDS.feature ? null : (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    ticket.kind === FEATURE_KINDS.bug
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-600"
                      : "border-line bg-surface-muted text-foreground/70"
                  }`}
                >
                  {FEATURE_KIND_LABELS[ticket.kind]}
                </span>
              )}

              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TICKET_LANE_CLASSES[lane]}`}>
                {TICKET_LANE_LABELS[lane]}
              </span>

              {ticket.priority ? (
                <span className="inline-flex items-center rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-foreground/70" data-grade="priority">
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
                </span>
              ) : null}
              {ticket.effort ? (
                <span className="inline-flex items-center rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-foreground/70" data-grade="effort">
                  {TICKET_EFFORT_LABELS[ticket.effort]}
                </span>
              ) : null}
            </div>
          </div>

          <span aria-hidden="true" className="shrink-0 self-center text-foreground/35 transition group-open:rotate-90">
            ›
          </span>
        </summary>

        <div className="mt-2 space-y-2 sm:ml-44">
          {ticket.detail ? <p className="whitespace-pre-line text-sm text-foreground/70">{ticket.detail}</p> : null}

          <p className="text-xs text-foreground/60">
            {ticket.requestedBy ? `${RELEASE_TIMELINE_COPY.ticketRequestedBy} ${ticket.requestedBy}` : null}
            {ticket.filedAs ? ` · ${RELEASE_TIMELINE_COPY.ticketFiledAs} ${ticket.filedAs}` : null}
          </p>

          {waiting ? (
            <code className="block overflow-x-auto rounded-lg border border-line bg-surface-muted px-2 py-1 text-[11px] text-foreground/70">
              {RELEASE_TIMELINE_COPY.ticketHowClaimed(ticket.id)}
            </code>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Every move the ticket's state actually allows, rather than one
                hard-coded pair. Shipped is not among them: that is release:take. */}
            {(TICKET_MOVES[ticket.status] ?? []).map((next) => (
              <button
                key={next}
                type="button"
                disabled={busy}
                onClick={() => void patch({ status: next })}
                className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground transition hover:bg-surface-muted disabled:opacity-50"
              >
                {ticketMoveLabel(ticket.status, next)}
              </button>
            ))}
            {ticket.claimedBy ? (
              <span className="text-[11px] font-semibold text-foreground/60">
                {lane === "stale" ? RELEASE_TIMELINE_COPY.ticketStale : RELEASE_TIMELINE_COPY.ticketHeldBy} · {ticket.claimedBy}
              </span>
            ) : null}

            {ticket.status === TICKET_STATUSES.shipped ? null : (
              <span className="ml-auto flex items-center gap-1.5">
                <select
                  className={TICKET_SMALL_SELECT_CLASS}
                  aria-label={RELEASE_TIMELINE_COPY.priorityLabel}
                  value={ticket.priority ?? ""}
                  disabled={busy}
                  onChange={(event) => void patch({ priority: event.target.value || null })}
                >
                  <option value="">{RELEASE_TIMELINE_COPY.priorityLabel}: {RELEASE_TIMELINE_COPY.ungraded}</option>
                  {TICKET_PRIORITY_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {RELEASE_TIMELINE_COPY.priorityLabel}: {TICKET_PRIORITY_LABELS[value]}
                    </option>
                  ))}
                </select>
                <select
                  className={TICKET_SMALL_SELECT_CLASS}
                  aria-label={RELEASE_TIMELINE_COPY.effortLabel}
                  value={ticket.effort ?? ""}
                  disabled={busy}
                  onChange={(event) => void patch({ effort: event.target.value || null })}
                >
                  <option value="">{RELEASE_TIMELINE_COPY.effortLabel}: {RELEASE_TIMELINE_COPY.ungraded}</option>
                  {TICKET_EFFORT_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {RELEASE_TIMELINE_COPY.effortLabel}: {TICKET_EFFORT_LABELS[value]}
                    </option>
                  ))}
                </select>
              </span>
            )}
          </div>
          {refusal ? (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {refusal}
            </p>
          ) : null}
        </div>
      </details>
    </li>
  );
}
