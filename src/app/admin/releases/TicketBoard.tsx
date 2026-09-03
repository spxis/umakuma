"use client";

import { useState } from "react";

import { FEATURE_AREA_LABELS, FEATURE_AREA_VALUES, FEATURE_KINDS, FEATURE_KIND_VALUES } from "@/lib/featureTimeline";
import { TICKET_LIMITS, type Ticket } from "@/lib/tickets";

import { RELEASE_TIMELINE_COPY } from "./ReleaseTimeline.constants";
import TicketRow from "./TicketRow";

const ENDPOINT = "/api/admin/tickets";

const FIELD_CLASS =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70";

/**
 * The wish list, and the form that adds to it.
 *
 * The only part of the release board the site can write. Everything else on
 * this page comes from `featureTimeline.json`, which a deploy overwrites, so
 * the form here posts to the database instead and an agent moves a wish onto
 * the timeline with `pnpm backlog file`.
 */
export default function TicketBoard({ initialWishes }: { initialWishes: Ticket[] }) {
  const [wishes, setWishes] = useState(initialWishes);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [area, setArea] = useState("");
  const [kind, setKind] = useState<string>(FEATURE_KINDS.feature);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const replace = (wish: Ticket) =>
    setWishes((current) => current.map((item) => (item.id === wish.id ? wish : item)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || saving) return;

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
      if (!response.ok) throw new Error(String(response.status));
      const { wish } = (await response.json()) as { wish: Ticket };
      setWishes((current) => [wish, ...current]);
      setTitle("");
      setDetail("");
      setArea("");
      setKind(FEATURE_KINDS.feature);
    } catch {
      setError(RELEASE_TIMELINE_COPY.wishError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <form onSubmit={submit} className="mb-6 rounded-2xl border border-line bg-surface p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground/60">
          {RELEASE_TIMELINE_COPY.wishAdd}
        </h3>

        <label className="block text-xs font-semibold text-foreground/70" htmlFor="wish-title">
          {RELEASE_TIMELINE_COPY.wishTitleLabel}
        </label>
        <input
          id="wish-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TICKET_LIMITS.title}
          placeholder={RELEASE_TIMELINE_COPY.wishTitlePlaceholder}
          className={`mb-3 mt-1 ${FIELD_CLASS}`}
        />

        <label className="block text-xs font-semibold text-foreground/70" htmlFor="wish-detail">
          {RELEASE_TIMELINE_COPY.wishDetailLabel}
        </label>
        <textarea
          id="wish-detail"
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          maxLength={TICKET_LIMITS.detail}
          rows={3}
          placeholder={RELEASE_TIMELINE_COPY.wishDetailPlaceholder}
          className={`mb-3 mt-1 ${FIELD_CLASS}`}
        />

        <div className="flex flex-wrap items-end gap-3">
          <span className="min-w-0 flex-1">
            <label className="block text-xs font-semibold text-foreground/70" htmlFor="wish-area">
              {RELEASE_TIMELINE_COPY.wishAreaLabel}
            </label>
            <select
              id="wish-area"
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className={`mt-1 ${FIELD_CLASS}`}
            >
              <option value="">{RELEASE_TIMELINE_COPY.wishAreaAny}</option>
              {FEATURE_AREA_VALUES.map((value) => (
                <option key={value} value={value}>
                  {FEATURE_AREA_LABELS[value]}
                </option>
              ))}
            </select>
          </span>

          <span className="min-w-0 flex-1">
            <label className="block text-xs font-semibold text-foreground/70" htmlFor="wish-kind">
              {RELEASE_TIMELINE_COPY.wishKindLabel}
            </label>
            <select
              id="wish-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              className={`mt-1 ${FIELD_CLASS}`}
            >
              {FEATURE_KIND_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value === FEATURE_KINDS.bug ? RELEASE_TIMELINE_COPY.bug : "Feature"}
                </option>
              ))}
            </select>
          </span>

          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="h-10 shrink-0 rounded-full border border-accent bg-accent px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition disabled:opacity-50"
          >
            {saving ? RELEASE_TIMELINE_COPY.wishSubmitting : RELEASE_TIMELINE_COPY.wishSubmit}
          </button>
        </div>

        {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
      </form>

      {wishes.length === 0 ? (
        <p className="py-6 text-sm text-foreground/60">{RELEASE_TIMELINE_COPY.wishEmpty}</p>
      ) : (
        <ul>
          {wishes.map((wish) => (
            <TicketRow key={wish.id} wish={wish} endpoint={ENDPOINT} onChanged={replace} />
          ))}
        </ul>
      )}
    </section>
  );
}
