# The curriculum papers

The published explanations of how the two ladders work. They state the promises
the build is held to, so **when a curriculum rule changes they change in the
same pass** - see "The Curriculum Papers" in `AGENTS.md`.

Every figure in them carries the curriculum version it was drawn from
(`curriculum.version` in `src/data/kanjiLadder.json` and
`src/data/gradeLadder.json`). A chart without one is a number nobody can
reproduce.

## The UmaKuma Ladders

<https://claude.ai/code/artifact/e6441c98-f786-4f63-84b7-52cf1508ac94>

Three papers in one document. Drawn at UN 2.0.0 / UG 2.0.0.

Charts use the brand's own subject colours - `--radical`, `--kanji`,
`--vocabulary` from `src/app/globals.css` - with `--accent` for the N path and
`--hot` for the G path. That palette is not a design choice a paper gets to
make. Neither is naming: **N is for the JLPT's N-bands, G is for the Japanese
school grades**, and every label says so rather than assuming a reader knows.
Every table carries running totals.

| Paper | Figures | Redraw it when |
|---|---|---|
| What a level costs | Subjects-per-level charts for WaniKani, UN and UG; the level-shape table; kanji-per-level against words-per-level | `rampedSizes` / the level ceiling changes, or vocabulary capacity is re-rationed |
| What level are you, really | JLPT band and school-year completions on all three ladders; the 1,000 most common words as you meet them | Any milestone moves, or `checkJlptPromise` / `checkGradePromise` change |
| Two orders, one curriculum | Grade x JLPT band matrix; the three milestone rails; band composition per level; the disagreement spread | The ordering rules change, or a milestone moves |
| Level by level | The first ten levels in full, per path; all 100 levels of both paths with running totals and milestone chips | Any rebuild at all - this is the ladder itself |
| The 134 WaniKani leaves out | Every jōyō kanji with no `waniKaniLevel`, ranked by frequency | The catalogue gains or loses characters |
| The name kanji | All 78 jinmeiyō with nanori readings and where each path teaches them | Name kanji move, or the late-placement rule changes |
| How a ladder is built | Radical lead, word lag, look-alike separation against WaniKani, the checker's eight rules, the version changelog | A rule is added to `src/lib/ladder/ladderRules.mjs`, or a curriculum version is bumped |

The numbers are extracted from the shipped ladder JSON, never typed by hand.
WaniKani's own per-level counts come from `src/data/wk-catalog-levels/`.
