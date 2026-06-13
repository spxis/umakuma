import ExplorerFilterToggleButton from "@/app/users/[nickname]/shared/ExplorerFilterToggleButton";

type Props = {
  heading: string;
  collapsible: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
};

export default function StudyHistoryHeader({
  heading,
  collapsible,
  expanded,
  onToggleExpanded,
  filtersOpen,
  onToggleFilters,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-2">
      {collapsible ? (
        <button
          type="button"
          onClick={onToggleExpanded}
          className="text-base font-bold uppercase tracking-[0.1em] text-foreground sm:text-lg"
        >
          {heading} {expanded ? "▲" : "▼"}
        </button>
      ) : (
        <h2 className="text-base font-bold uppercase tracking-[0.1em] text-foreground sm:text-lg">{heading}</h2>
      )}

      {expanded ? (
        <ExplorerFilterToggleButton
          expanded={filtersOpen}
          onToggle={onToggleFilters}
          controlsId="study-history-filters-panel"
          showLabel="Show filters"
          hideLabel="Hide filters"
        />
      ) : null}
    </div>
  );
}
