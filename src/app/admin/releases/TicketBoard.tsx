"use client";

import { useMemo, useState } from "react";

import { FEATURE_AREA_LABELS, FEATURE_AREA_VALUES, FEATURE_KINDS, FEATURE_KIND_LABELS, FEATURE_KIND_VALUES } from "@/lib/featureTimeline";
import { TICKET_LIMITS, ticketDraftProblems, type Ticket } from "@/lib/tickets";

import {
  RELEASE_TIMELINE_COPY,
  TICKET_FIELD_CLASS,
  TICKET_LANE_BLURBS,
  TICKET_LANE_LABELS,
} from "./ReleaseTimeline.constants";
import TicketFilters from "./TicketFilters";
import TicketRow from "./TicketRow";
import {
  TICKET_BOARD_START,
  filterTickets,
  groupTicketsByLane,
  isUnfinished,
  sortTickets,
  tallyTickets,
  type TicketBoardView,
} from "./ticketBoardView";

const ENDPOINT = "/api/admin/tickets";

/**
 * The board: everything asked for, filtered and ordered, with a form to add
 * to it and a row of moves on every ticket.
 *
 * Filtering and ordering happen here in the browser because the whole board
 * is a few hundred rows the page already loaded: narrowing it locally keeps
 * every filter instant and the counts honest, since they are counted from
 * the same list the rows come from. Adding and moving go to the server and
 * the row is replaced with what came back, so what is on screen is what is
 * stored.
 */
export default function TicketBoard({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [view, setView] = useState<TicketBoardView>(TICKET_BOARD_START);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [area, setArea] = useState("");
  const [kind, setKind] = useState<string>(FEATURE_KINDS.feature);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => tallyTickets(tickets), [tickets]);
  const unfinished = useMemo(() => tickets.filter((ticket) => isUnfinished(ticket)).length, [tickets]);
  const shown = useMemo(() => sortTickets(filterTickets(tickets, view), view.sort), [tickets, view]);
  const grouped = useMemo(() => groupTicketsByLane(shown, view), [shown, view]);
  const change = (part: Partial<TicketBoardView>) => setView((current) => ({ ...current, ...part }));

  const replace = (ticket: Ticket) =>
    setTickets((current) => current.map((item) => (item.id === ticket.id ? ticket : item)));

  /* The same gate the route refuses on greys the button out, so the form
     cannot ask for something the server will not take. Shown once there is
     a title to judge; a blank form is not yet wrong. */
  const problems = ticketDraftProblems({ title, detail: detail || null, requestedBy: null });
  const ready = problems.length === 0 && !saving;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          detail: detail.trim() || undefined,
          area: area || undefined,
          kind,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { wish?: Ticket; error?: string } | null;
      if (!response.ok || !payload?.wish) throw new Error(payload?.error ?? String(response.status));
      setTickets((current) => [payload.wish!, ...current]);
      setView((current) => ({ ...current, lane: "all", sort: "newest", text: "" }));
      setTitle("");
      setDetail("");
      setArea("");
      setKind(FEATURE_KINDS.feature);
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : RELEASE_TIMELINE_COPY.ticketError);
    } finally {
      setSaving(false);
    }
  };

  const rows = (list: Ticket[]) => (
    <ul>
      {list.map((ticket) => (
        <TicketRow key={ticket.id} ticket={ticket} endpoint={ENDPOINT} onChanged={replace} />
      ))}
    </ul>
  );

  return (
    <section>
      <form onSubmit={submit} className="mb-6 rounded-2xl border border-line bg-surface p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground/60">
          {RELEASE_TIMELINE_COPY.ticketAdd}
        </h3>

        <label className="block text-xs font-semibold text-foreground/70" htmlFor="ticket-title">
          {RELEASE_TIMELINE_COPY.ticketTitleLabel}
        </label>
        <input
          id="ticket-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TICKET_LIMITS.title}
          placeholder={RELEASE_TIMELINE_COPY.ticketTitlePlaceholder}
          className={`mb-3 mt-1 ${TICKET_FIELD_CLASS}`}
        />

        <label className="block text-xs font-semibold text-foreground/70" htmlFor="ticket-detail">
          {RELEASE_TIMELINE_COPY.ticketDetailLabel}
        </label>
        <textarea
          id="ticket-detail"
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          maxLength={TICKET_LIMITS.detail}
          rows={3}
          placeholder={RELEASE_TIMELINE_COPY.ticketDetailPlaceholder}
          className={`mb-3 mt-1 ${TICKET_FIELD_CLASS}`}
        />

        <div className="flex flex-wrap items-end gap-3">
          <span className="min-w-0 flex-1">
            <label className="block text-xs font-semibold text-foreground/70" htmlFor="ticket-area">
              {RELEASE_TIMELINE_COPY.ticketAreaLabel}
            </label>
            <select id="ticket-area" value={area} onChange={(event) => setArea(event.target.value)} className={`mt-1 ${TICKET_FIELD_CLASS}`}>
              <option value="">{RELEASE_TIMELINE_COPY.ticketAreaAny}</option>
              {FEATURE_AREA_VALUES.map((value) => (
                <option key={value} value={value}>
                  {FEATURE_AREA_LABELS[value]}
                </option>
              ))}
            </select>
          </span>

          <span className="min-w-0 flex-1">
            <label className="block text-xs font-semibold text-foreground/70" htmlFor="ticket-kind">
              {RELEASE_TIMELINE_COPY.ticketKindLabel}
            </label>
            <select id="ticket-kind" value={kind} onChange={(event) => setKind(event.target.value)} className={`mt-1 ${TICKET_FIELD_CLASS}`}>
              {FEATURE_KIND_VALUES.map((value) => (
                <option key={value} value={value}>
                  {FEATURE_KIND_LABELS[value]}
                </option>
              ))}
            </select>
          </span>

          <button
            type="submit"
            disabled={!ready}
            className="h-10 shrink-0 rounded-full border border-accent bg-accent px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition disabled:opacity-50"
          >
            {saving ? RELEASE_TIMELINE_COPY.ticketSubmitting : RELEASE_TIMELINE_COPY.ticketSubmit}
          </button>
        </div>

        {title.trim() !== "" && problems.length > 0 ? (
          <ul className="mt-2 text-xs font-semibold text-foreground/60">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
      </form>

      <TicketFilters view={view} counts={counts} unfinished={unfinished} total={tickets.length} shown={shown.length} onChange={change} />

      {tickets.length === 0 ? (
        <p className="py-6 text-sm text-foreground/60">{RELEASE_TIMELINE_COPY.ticketsEmpty}</p>
      ) : shown.length === 0 ? (
        <p className="py-6 text-sm text-foreground/60">{RELEASE_TIMELINE_COPY.ticketsNoneShown}</p>
      ) : grouped === null ? (
        rows(shown)
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map((group) => (
            <section key={group.lane}>
              <h3 className="mb-1 flex flex-wrap items-baseline gap-2 text-xs font-bold uppercase tracking-wide text-foreground/60">
                {TICKET_LANE_LABELS[group.lane]}
                <span className="font-semibold text-foreground/60">{group.tickets.length}</span>
                <span className="font-normal normal-case tracking-normal text-foreground/60">{TICKET_LANE_BLURBS[group.lane]}</span>
              </h3>
              {rows(group.tickets)}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
