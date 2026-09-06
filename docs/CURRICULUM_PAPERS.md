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

| Paper | Figures | Redraw it when |
|---|---|---|
| What a level costs | Subjects-per-level charts for WaniKani, UN and UG; the level-shape table | `rampedSizes` / the level ceiling changes, or vocabulary capacity is re-rationed |
| What level are you, really | JLPT band completions and school-year completions on all three ladders | Any milestone moves, or `checkJlptPromise` / `checkGradePromise` change |
| Two orders, one curriculum | Grade x JLPT band matrix; the three milestone rails; the checker's eight rules; the versioning note | A rule is added to `src/lib/ladder/ladderRules.mjs`, or a curriculum version is bumped |

The numbers are extracted from the shipped ladder JSON, never typed by hand.
WaniKani's own per-level counts come from `src/data/wk-catalog-levels/`.
