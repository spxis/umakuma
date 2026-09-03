/**
 * Blank cards that keep the last row of a grid full while more are loading.
 *
 * Without them the grid reflows as each page arrives - four cards, then seven,
 * then eight - and the row a reader was looking at moves under their eyes.
 * Hidden from screen readers: they carry nothing to read.
 */
export default function ExplorerLoadingFillCards({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={`loading-fill-${index}`}
          aria-hidden="true"
          className="rounded-2xl border border-line bg-surface-muted/70 p-4"
        />
      ))}
    </>
  );
}
