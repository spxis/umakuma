import { MAP_STUDY_HEIGHT } from "./MapStudy.constants";

/**
 * The shape of the page while a country's outlines are on their way.
 *
 * Same grid and the same map height as the real thing, so the panel beside it
 * and everything below stay where they are when the chunk lands. A spinner
 * would move the page twice; this moves it none.
 */
export default function MapStudySkeleton() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" aria-busy="true">
      <section className={`${MAP_STUDY_HEIGHT} rounded-3xl border border-line bg-surface shadow-sm`} />
      <section className="h-64 rounded-3xl border border-line bg-surface shadow-sm" />
    </div>
  );
}
