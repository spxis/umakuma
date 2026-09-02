/**
 * The trouble and favourite marks, drawn once.
 *
 * The card overlay floats these over a glyph and the row list sits them in a
 * trailing lane, so the positioning differs but the marks must not: a player
 * learns the frown and the star in one view and has to recognise them in the
 * other.
 */
export function TroubleFaceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M9.2 15.4c.8-.9 1.8-1.4 2.8-1.4s2 .5 2.8 1.4" />
      <circle cx="9.1" cy="10.1" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.9" cy="10.1" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FavouriteStarIcon() {
  return <span aria-hidden="true">★</span>;
}

/** Burned: known so well it need never be read again. A small flame. */
export function BurnedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
      <path d="M12 2c1 4 4 5.5 4 10a4 4 0 0 1-8 0c0-1.6.6-2.8 1.5-3.8.2 1.4.8 2.3 1.7 2.8C11.5 8.5 10 6 12 2z" />
    </svg>
  );
}
