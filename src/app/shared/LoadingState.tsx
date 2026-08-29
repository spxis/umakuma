type Props = {
  /** What is loading, e.g. "scoreboard". Rendered as "Loading scoreboard…". */
  label: string;
  className?: string;
};

/**
 * The plain text placeholder shown while a panel's data is in flight.
 *
 * Seventeen files each spelled this out with their own wording and wrapper.
 * Skeleton shimmers still live in their own components; this covers the text
 * case so the phrasing and spacing stop drifting.
 */
export default function LoadingState({ label, className = "" }: Props) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`px-4 py-10 text-center text-sm font-bold text-foreground/60 ${className}`.trim()}
    >
      Loading {label}…
    </p>
  );
}
