"use client";

import { useState } from "react";

import { FEATURE_AREA_LABELS, FEATURE_KINDS } from "@/lib/featureTimeline";
import { formatDateShort } from "@/lib/timeFormat";
import {
  FEATURE_WISH_STATUSES,
  FEATURE_WISH_STATUS_LABELS,
  type FeatureWish,
} from "@/lib/featureWishes";

import { RELEASE_AREA_CLASSES, RELEASE_TIMELINE_COPY } from "./ReleaseTimeline.constants";

const STATUS_CLASSES: Record<string, string> = {
  [FEATURE_WISH_STATUSES.open]: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  [FEATURE_WISH_STATUSES.filed]: "border-sky-500/40 bg-sky-500/10 text-sky-600",
  [FEATURE_WISH_STATUSES.declined]: "border-line bg-surface-muted text-foreground/60",
};

/**
 * One wish, in the same collapsed shape as a timeline row.
 *
 * A waiting wish shows the command that turns it into planned work, because
 * that step happens in a terminal and cannot happen here: the timeline is a
 * committed file, so only an agent can file one.
 */
export default function WishRow({
  wish,
  endpoint,
  onChanged,
}: {
  wish: FeatureWish;
  endpoint: string;
  onChanged: (wish: FeatureWish) => void;
}) {
  const [busy, setBusy] = useState(false);
  const open = wish.status === FEATURE_WISH_STATUSES.open;

  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      const response = await fetch(`${endpoint}/${wish.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        const { wish: updated } = (await response.json()) as { wish: FeatureWish };
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
                {FEATURE_WISH_STATUS_LABELS[wish.status]}
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

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setStatus(open ? FEATURE_WISH_STATUSES.declined : FEATURE_WISH_STATUSES.open)
            }
            className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground transition hover:bg-surface-muted disabled:opacity-50"
          >
            {open ? RELEASE_TIMELINE_COPY.wishDecline : RELEASE_TIMELINE_COPY.wishReopen}
          </button>
        </div>
      </details>
    </li>
  );
}
