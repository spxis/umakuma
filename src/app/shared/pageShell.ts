/**
 * The outer padding every user-scoped page uses.
 *
 * These pages are siblings behind the same sub-nav - Study, the two explorers,
 * Grades, Practice - and each had grown its own wrapper. The sub-nav sat at
 * 66px on the explorers, 74px on Grades and 95px on Practice, so moving
 * between them nudged the whole header down and back up again.
 *
 * Width is deliberately not included: Grades reads better constrained and the
 * dashboard needs the full width for its filter rows. Only the vertical rhythm
 * has to agree, because that is what the eye tracks across a tab change.
 */
export const PAGE_SHELL_PADDING = "px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8";
