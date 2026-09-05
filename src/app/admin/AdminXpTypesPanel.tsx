"use client";

import { useCallback, useEffect, useState } from "react";

import { useAdminFeedback } from "./AdminFeedbackProvider";
import { ADMIN_XP_TYPES_COPY as copy } from "./AdminXpTypes.constants";

type XpType = {
  id: string;
  label: string;
  note: string;
  amount: number;
  dailyCap: number | null;
  pricedAt: string | null;
  retiredAt: string | null;
};

const FIELD = "h-8 rounded-lg border border-line bg-surface px-2 text-sm";

/**
 * Pricing the XP economy from the site.
 *
 * This is why the kinds are rows rather than constants. The code decides
 * *which* kinds exist — a new one arrives through `pnpm xp:types:seed` — and
 * what each is worth is decided here, without a deploy, by whoever is watching
 * how the site actually feels to use.
 *
 * Once a kind has been priced here the seeder stops overwriting it. That is
 * the whole bargain: without it, the next seed would quietly undo every
 * decision made on this screen and the table would be decoration.
 */
export default function AdminXpTypesPanel() {
  const { showToast } = useAdminFeedback();
  const [types, setTypes] = useState<XpType[] | null>(null);
  const [draft, setDraft] = useState<Record<string, { amount: string; dailyCap: string; note: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/xp-types");
    if (!response.ok) return;
    const payload = (await response.json()) as { types: XpType[] };
    setTypes(payload.types);
    setDraft(
      Object.fromEntries(
        payload.types.map((type) => [
          type.id,
          { amount: String(type.amount), dailyCap: type.dailyCap === null ? "" : String(type.dailyCap), note: type.note },
        ]),
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(type: XpType) {
    const edit = draft[type.id];
    if (!edit) return;
    setBusy(type.id);
    try {
      const response = await fetch("/api/admin/xp-types", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: type.id,
          amount: Number(edit.amount),
          note: edit.note,
          dailyCap: edit.dailyCap.trim() === "" ? null : Number(edit.dailyCap),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? copy.saveFailed);
      showToast({ tone: "success", message: copy.saved(type.label) });
      await load();
    } catch (caught) {
      showToast({ tone: "error", message: caught instanceof Error ? caught.message : copy.saveFailed });
    } finally {
      setBusy(null);
    }
  }

  if (types === null) return <p className="text-sm font-semibold text-foreground/60">{copy.loading}</p>;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-sm font-black text-foreground">{copy.heading}</h3>
      <p className="mt-0.5 max-w-3xl text-[12px] font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>

      <ol className="mt-3 space-y-1.5">
        {types.map((type) => {
          const edit = draft[type.id];
          const changed =
            edit &&
            (Number(edit.amount) !== type.amount ||
              edit.note !== type.note ||
              (edit.dailyCap.trim() === "" ? null : Number(edit.dailyCap)) !== type.dailyCap);
          return (
            <li
              key={type.id}
              className={`flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 ${
                type.retiredAt ? "bg-surface-muted/50 opacity-60" : "bg-surface-muted"
              }`}
            >
              <span className="w-44 shrink-0 truncate text-[12px] font-black text-foreground">{type.label}</span>
              <label className="flex items-center gap-1">
                <span className="text-[10px] font-black uppercase text-foreground/60">{copy.worth}</span>
                <input
                  type="number"
                  step={5}
                  value={edit?.amount ?? ""}
                  onChange={(event) =>
                    setDraft((held) => ({ ...held, [type.id]: { ...held[type.id], amount: event.target.value } }))
                  }
                  className={`${FIELD} w-24 tabular-nums`}
                />
              </label>
              <label className="flex items-center gap-1">
                <span className="text-[10px] font-black uppercase text-foreground/60">{copy.cap}</span>
                <input
                  type="number"
                  step={5}
                  placeholder={copy.uncapped}
                  value={edit?.dailyCap ?? ""}
                  onChange={(event) =>
                    setDraft((held) => ({ ...held, [type.id]: { ...held[type.id], dailyCap: event.target.value } }))
                  }
                  className={`${FIELD} w-24 tabular-nums`}
                />
              </label>
              <input
                value={edit?.note ?? ""}
                onChange={(event) =>
                  setDraft((held) => ({ ...held, [type.id]: { ...held[type.id], note: event.target.value } }))
                }
                className={`${FIELD} min-w-56 flex-1`}
              />
              {type.pricedAt ? (
                <span className="text-[10px] font-black uppercase text-emerald-700" title={copy.pricedHint}>
                  {copy.priced}
                </span>
              ) : null}
              <button
                type="button"
                disabled={!changed || busy === type.id}
                onClick={() => save(type)}
                className="rounded-full bg-accent px-3 py-1 text-[11px] font-black text-white disabled:opacity-30"
              >
                {copy.save}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
