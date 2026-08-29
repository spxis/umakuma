type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Tailwind `accent-*` class for the checkmark. */
  accentClass: string;
  size?: "md" | "sm";
};

/**
 * Shared checkbox for the game difficulty toggles. Hard Mode and Ultra Mode are
 * both independent on/off options, so they read as checkboxes everywhere they
 * appear rather than one checkbox and one pressed button.
 */
export default function GameModeToggle({ label, checked, onChange, accentClass, size = "md" }: Props) {
  // Sentence case at both sizes: these sit beside the sentence-case range and
  // metric buttons in the filter row, and beside the lobby action buttons.
  const shell = size === "md"
    ? "h-11 gap-2 px-5 text-sm"
    : "h-9 gap-1.5 px-3 text-xs";
  const box = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <label
      className={`inline-flex cursor-pointer items-center rounded-full border font-black transition hover:bg-surface-muted ${shell} ${
        checked ? "border-foreground/30 bg-surface-muted text-foreground" : "border-line bg-surface text-foreground"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={`${box} ${accentClass}`}
      />
      {label}
    </label>
  );
}
