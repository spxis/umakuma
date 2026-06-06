type Props = {
  expanded: boolean;
  onToggle: () => void;
  controlsId: string;
  showLabel: string;
  hideLabel: string;
  className?: string;
};

export default function ExplorerFilterToggleButton({
  expanded,
  onToggle,
  controlsId,
  showLabel,
  hideLabel,
  className,
}: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? hideLabel : showLabel}
      aria-controls={controlsId}
      className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold leading-none text-foreground${className ? ` ${className}` : ""}`}
    >
      <span>{expanded ? hideLabel : showLabel}</span>
      <span aria-hidden="true" className="text-[10px] leading-none">
        {expanded ? "▴" : "▾"}
      </span>
    </button>
  );
}