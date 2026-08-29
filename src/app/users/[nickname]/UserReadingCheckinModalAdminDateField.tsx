import FieldLabel from "../../shared/FieldLabel";
type UserReadingCheckinModalAdminDateFieldProps = {
  value: string;
  maxDate: string;
  onChange: (nextDateKey: string) => void;
};

export default function UserReadingCheckinModalAdminDateField({
  value,
  maxDate,
  onChange,
}: UserReadingCheckinModalAdminDateFieldProps) {
  return (
    <label className="mt-3 flex flex-col gap-1 sm:max-w-52">
      <FieldLabel tone="muted" as="span">Check-in date (PST)</FieldLabel>
      <input
        type="date"
        className="h-10 rounded-lg border border-line bg-surface-muted px-3 text-sm"
        value={value}
        max={maxDate}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="text-[11px] text-foreground/65">Admin only. This sets the challenge day key.</span>
    </label>
  );
}
