import type { SimPersona } from "@/lib/xp/simTypes";

import { ADMIN_BALANCE_COPY as copy } from "./AdminBalance.constants";
import type { PersonaDraft } from "./AdminBalanceSimulator.types";

const FIELD = "h-8 rounded-lg border border-line bg-surface px-2 text-sm";
const LABEL = "text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60";

type Props = {
  personas: SimPersona[];
  personaId: string | null;
  onPersona: (id: string | null) => void;
  days: string;
  onDays: (value: string) => void;
  seed: string;
  onSeed: (value: string) => void;
  lessonGate: string;
  onLessonGate: (value: string) => void;
  throttle: boolean;
  onThrottle: (value: boolean) => void;
  compareSittings: boolean;
  onCompareSittings: (value: boolean) => void;
  draft: PersonaDraft | null;
  onDraft: (next: PersonaDraft) => void;
};

function Field({ label, value, onChange, width = "w-20", title }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  width?: string;
  title?: string;
}) {
  return (
    <label className="flex flex-col gap-1" title={title}>
      <span className={LABEL}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className={`${FIELD} ${width} tabular-nums`} />
    </label>
  );
}

function Check({ label, checked, onChange, title }: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  title?: string;
}) {
  return (
    <label className="flex items-center gap-1.5 pt-4" title={title}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4" />
      <span className="text-[11px] font-black text-foreground/70">{label}</span>
    </label>
  );
}

/**
 * Who, for how long, and on what settings.
 *
 * The persona's own numbers are editable because the point of the thing is to
 * ask "what if she only sat down once" and get an answer in a second. Nothing
 * typed here is saved: the persona set stays as written, and a run is a run.
 */
export default function AdminBalanceSimulatorControls(props: Props) {
  const { draft, onDraft } = props;
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className={LABEL}>{copy.who}</span>
          <select
            value={props.personaId ?? ""}
            onChange={(event) => props.onPersona(event.target.value || null)}
            className={`${FIELD} min-w-64`}
          >
            <option value="">{copy.everyone}</option>
            {props.personas.map((persona) => (
              <option key={persona.id} value={persona.id}>{persona.label}</option>
            ))}
          </select>
        </label>
        <Field label={copy.horizon} value={props.days} onChange={props.onDays} />
        <Field label={copy.seed} value={props.seed} onChange={props.onSeed} title={copy.seedHint} />
        <Field
          label={copy.lessonGate}
          value={props.lessonGate}
          onChange={props.onLessonGate}
          title={copy.lessonGateHint}
        />
        <Check label={copy.throttle} checked={props.throttle} onChange={props.onThrottle} title={copy.throttleHint} />
        {props.personaId ? (
          <Check
            label={copy.compareSittings}
            checked={props.compareSittings}
            onChange={props.onCompareSittings}
            title={copy.compareSittingsHint}
          />
        ) : null}
      </div>

      {draft ? (
        <div className="rounded-xl border border-line bg-surface-muted/50 p-3">
          <p className={LABEL}>{copy.settings}</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <Field label={copy.attendance} value={draft.attendance} onChange={(value) => onDraft({ ...draft, attendance: value })} />
            <Field label={copy.reviewsPerDay} value={draft.reviewsPerDay} onChange={(value) => onDraft({ ...draft, reviewsPerDay: value })} />
            <Field label={copy.lessonsPerDay} value={draft.lessonsPerDay} onChange={(value) => onDraft({ ...draft, lessonsPerDay: value })} />
            <Field label={copy.gamesPerDay} value={draft.gamesPerDay} onChange={(value) => onDraft({ ...draft, gamesPerDay: value })} />
            <Field label={copy.accuracy} value={draft.accuracy} onChange={(value) => onDraft({ ...draft, accuracy: value })} />
            <Field label={copy.sessionHours} value={draft.sessionHours} onChange={(value) => onDraft({ ...draft, sessionHours: value })} width="w-36" />
            <Field label={copy.holidayDays} value={draft.holidayDays} onChange={(value) => onDraft({ ...draft, holidayDays: value })} />
            <Field label={copy.startLevel} value={draft.startLevel} onChange={(value) => onDraft({ ...draft, startLevel: value })} />
            <Check label={copy.sitsExams} checked={draft.sitsExams} onChange={(value) => onDraft({ ...draft, sitsExams: value })} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
