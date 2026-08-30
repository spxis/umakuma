# UmaKuma — UX and visual design request

A brief for a designer working on UmaKuma. You have the codebase and can run
the app; this document tells you what it is, what hurts, and what must not
move.

**Ask questions.** Anything below that is thin, or that the code contradicts,
is worth raising rather than guessing around.

---

## 1. Getting in

**Repository:** https://github.com/spxis/umakuma (public)

**Live site:** https://umakuma.com — the leaderboard at `/` is public and needs
no account. Everything else is behind sign-in.

**Running it locally:**

```bash
nvm use 24            # Node 24; pnpm 10.33.0, never npm or yarn
pnpm install
pnpm dev              # serves on port 6400
```

Open **http://localhost:6400** — use `localhost`, not `127.0.0.1`.
`NEXTAUTH_URL` is bound to the `localhost` origin, and pages sit on a loading
state if you arrive by IP.

The app needs a Postgres database and a WaniKani token to show real data.
There is a fully local path (`pnpm local:db:up`, `pnpm local:db:restore`,
`pnpm local:seed`, then `pnpm dev:local`, signing in with invite code
`TEST01`), but the restore step needs a database dump that I have to hand you.
**Tell me which you want** and I will send either the dump plus a `.env`, or a
set of full-page screenshots of every surface at 1440px and 393px. Do not skip
this step and design from the code alone — the density is the problem, and
density does not read from JSX.

There is also a Playwright setup under `e2e/` if you want to script your own
screenshots once you are running.

---

## 2. What UmaKuma is

A Japanese-study companion for a small private group — my family, about six
people, ages twelve to fifty — who all study Japanese with **WaniKani**, a
spaced-repetition kanji app. UmaKuma reads each member's WaniKani progress
through their API token and turns it into a shared, competitive, playful
surface: a leaderboard, a study queue you grade yourself, six small games, and
a couple of reading tools.

It is invite-only today. **Opening it to public Google sign-up is the next
major milestone**, which is why first-run and onboarding matter more than the
current state of the app suggests — there is currently no signed-out landing
experience at all.

Eighty releases, built solo, one feature at a time, each shipped on its own.
Features landed; the information architecture never got a deliberate pass.
That gap is what I am asking you to close.

### Who uses it

- Canadians and Americans learning Japanese. Copy is Canadian English.
- Wildly mixed ability: one member is WaniKani level 40+, others are near
  level 1. The same screens serve both.
- Desktop at **1440px** and iPhone at **393px** are the two widths that must
  both work. Phone use is heavy — a lot of study happens standing up.
- Everyone is a daily repeat user. Nobody arrives cold today, which is exactly
  why I suspect it is impenetrable to someone who does.

---

## 3. The priority: the menu system

**This is the thing I most want fixed. I think it looks bad and I do not think
it was designed so much as accumulated.** Start here.

What is actually there — `src/app/shared/AppTopMenuRow.tsx`,
`src/app/shared/appTopMenuLinks.ts`, and
`src/app/users/[nickname]/UserHeaderMenu.tsx`:

**The top row (desktop).** One flat line of up to eleven text links —
Leaderboard, Study, Game, Library Explorer, JLPT Explorer, History, Stats,
News, Read, Libraries, Admin. Uppercase, 11px, letter-spaced, rendered at 50%
foreground opacity, separated by literal `|` pipe characters, wrapping to a
second line when they do not fit. Active state is the same link at full
opacity in a heavier weight. There is no logo or product mark in the row —
the mascot art is a separate decorative banner block below it.

**The top row (mobile).** The same component drops to **four** links:
Leaderboard, Study, Game, Admin — at 9px, still pipe-separated. Six
destinations vanish from the main navigation entirely on a phone.

**The hamburger.** At the right of the row, a 36px circle whose icon is the
literal `≡` character set as text. It opens a portalled panel: on mobile a
near-fullscreen sheet inset 22px from every edge, on desktop a 320px panel
pinned to the top-right. Inside, six stacked sections — Account, Navigation,
Pages, Admin, Preferences, Actions — each headed by a 10px uppercase label.

**The duplication.** That Navigation section lists *the same eleven
destinations as the row above it*. On desktop both are on screen at once. The
Pages section then adds three more entries (News stats, News history, My page)
that exist nowhere else.

**The third layer.** Several of those destinations are also tabs inside the
user dashboard (`UserDashboardTabs.tsx`). A top-row link like "Stats" behaves
as a route when you are elsewhere, but intercepts its own click and fires a
`wr:dashboard-tab-request` custom event when you are already on the dashboard.
The same control is sometimes navigation and sometimes a tab switch, and the
URL differs depending on which.

**One more thing.** The app has a shared stacking-order module
(`src/app/shared/modalLayers.ts`) that every other overlay imports. The header
menu hardcodes `z-[9990]` and `z-[9991]` inline instead — it is the one
component that opted out of the system. Worth fixing while it is being
redesigned.

**What I want from you here:** a navigation model, not a restyle. Eleven flat
peers is the actual problem. Decide what is a primary destination, what is
secondary, what belongs *inside* a surface rather than beside it, and what the
mobile pattern should be so that half the app does not disappear. Then show me
the header — signed out, signed in, and admin — at both widths.

---

## 4. The surfaces

| Surface | Route | Code |
|---|---|---|
| Leaderboard | `/` | `src/app/page.tsx`, `src/app/leaderboard/` |
| Study | `/users/[name]/study` | `src/app/users/[nickname]/study-explorer/` |
| Game hub | `/users/[name]/game` | `src/app/game/`, `src/lib/gameMode.ts` |
| Library Explorer | `/users/[name]/library-explorer` | `src/app/users/[nickname]/level-explorer/` |
| JLPT Explorer | `/users/[name]/jlpt-explorer` | `src/app/users/[nickname]/jlpt-explorer/` |
| History | `/users/[name]/history` | `src/app/users/[nickname]/history/` |
| Read / News | `/users/[name]/news`, `/read` | `src/app/news/`, `UserRead*.tsx` |
| Libraries | `/users/[name]/libraries` | `src/app/users/[nickname]/libraries/` |
| Admin | `/admin/*` | `src/app/admin/` |

**Leaderboard** is the public landing page and the app's origin. A ranked table
of members carrying score, WaniKani level, review count, burned count, pending
reviews, radical/kanji/vocabulary counts, Apprentice/Guru/Master/Enlightened
counts, current-level kanji learned vs total vs locked, last activity, and a
24-hour delta on most of those. It becomes cards on mobile. It is a wall of
numbers, and it is the first thing anyone sees.

**Study** is the core loop. A queue of WaniKani items filtered by level, type,
SRS stage and status, shown one at a time in a full-screen modal. Review mode
is self-graded: reveal, then mark yourself correct or wrong. Blind mode hides
the metadata until reveal. Filters persist across reloads. On mobile, tapping a
Status chip drills into that status and reveals its numbered SRS stages.

**Game hub** holds six games as cards: Match, Daily Challenge (one attempt per
day, same questions for everyone), Practice (drills your Trouble list, your
Favourites, or your statistically toughest items), Time Attack, Shiritori
(word-chain on readings), and Map (Japanese prefectures). All but Map are
played on one fixed **Corners** board — four quadrants around a centre prompt,
answered with numpad `7`/`9`/`1`/`3`, unused corners shown greyed. Each game
has its own setup controls and scoreboard. `GAME_KIND_RULES` in
`src/lib/gameMode.ts` is the single source for which controls each game shows.

**Explorers** browse WaniKani subjects or JLPT kanji tables, as a card grid or
condensed rows (density toggle, persisted per surface). Tapping an item opens a
full-screen glyph viewer with readings, meanings, related kanji and radical
components.

**Read / News** takes a Japanese news article URL and renders it with per-kanji
lookup aids and a difficulty analysis. Separately, a family reading challenge
logs books, pages and minutes daily against a shared goal.

**Trouble and Favourites** are two self-curated lists, opened as a modal from
anywhere; picking an item stacks the glyph viewer on top of that modal.

---

## 5. The design system

Tokens live in `src/app/globals.css` as CSS variables, exposed to Tailwind v4
through `@theme inline`. Propose changes as **token** changes, not one-off
hexes in components.

```
Light   background #f4f8ff   foreground #081024   surface #ffffff
        surface-muted #edf4ff   line #c9dcff
        accent #0f6fff   accent-2 #00a4ff   hot #ff5f3d   highlight #c4ff3d

Dark    background #091223   foreground #e7f0ff   surface #0f1c33
        surface-muted #142743   line #2a4268
        accent #6ca5ff   accent-2 #56d0ff   hot #ff8360   highlight #d7ff6c
```

Body type is a system sans (Segoe UI Variable stack). Headings use a heavy
display sans (Arial Black stack) — worth questioning. Japanese glyphs have
their own stack with a user-facing sans/serif toggle, because kanji shapes
differ meaningfully between them. Both themes must work: **every colour you
propose needs a light and a dark value.** The page background is four stacked
radial gradients over a linear one.

### Locked: the WaniKani / Tsurukame palette

These colours are **semantics, not decoration.** Our members read WaniKani and
Tsurukame every day; a radical is blue and kanji is pink in their heads before
they open our site. Recolouring these breaks recognition across three apps.
**Do not reassign them.** You may adjust value or saturation for contrast in
dark mode — you may not change the hue family or swap which concept owns which
colour.

Subject types, currently in `globals.css`:

| Concept | In UmaKuma today | WaniKani reference |
|---|---|---|
| Radical | `#10b4e8` blue | `#00AAFF` |
| Kanji | `#ff3b82` pink | `#FF00AA` |
| Vocabulary | `#8b5cf6` purple | `#AA00FF` |

SRS stages, referenced throughout the leaderboard, study filters and explorers:

| Stage | WaniKani reference |
|---|---|
| Apprentice | `#DD0093` pink |
| Guru | `#882D9E` purple |
| Master | `#294DDB` blue |
| Enlightened | `#0093DD` light blue |
| Burned | `#434343` grey |

> The right-hand column is the upstream WaniKani palette, which our tokens
> approximate rather than match. **John: confirm these hexes before the
> designer locks to them.** The SRS stage colours in particular are not
> currently centralized in our code — they appear as ad-hoc Tailwind classes
> (`bg-pink-100`, `border-hot/40`) scattered across
> `userDashboardSrsUi.ts`, `jlptExplorerContentHelpers.ts` and
> `LevelExplorerFilterPanel.tsx`. Pulling them into named tokens is part of
> the job.

### Brand

Warm, playful, smart, encouraging, family-friendly. Two mascots: **Uma** the
horse (bent ear) and **Kuma** the bear (one accent-coloured eye) — sticker
aesthetic, thick outlines, flat colour. Full spec in `BRAND_CORE.md`, assets in
`public/brand/`. Keep the mascots; the family likes them. They currently
appear as a decorative banner 96–176px tall at the top of most pages, which on
a phone is a lot of the viewport before any content starts.

---

## 6. House rules

The repo enforces conventions that shape how your work gets implemented.
Full detail in `AGENTS.md`; the ones that touch design:

- **Every modal uses `ModalShell`** (`src/app/shared/ModalShell.tsx`). No
  hand-rolled overlays.
- **Stacking order lives only in `MODAL_LAYERS`** — new layers get named, not
  numbered inline.
- **Subject lists render through the shared pair** `SubjectRows` (condensed)
  and `SubjectCards` (grid). Both densities are offered wherever subjects are
  listed, and the choice persists per surface.
- **All user-facing copy lives in per-feature constants modules**, never inline
  in a component. This is the precondition for translation, so new copy must
  keep going there.
- **Canadian spelling in copy** — favourite, colour, centre, practise. Code
  identifiers keep American spelling and never get renamed for it.
- **Files under `src/` stay at or below 500 lines** (`pnpm loc:check`). Several
  surfaces are within a few lines of the cap, so anything that grows a
  component means splitting it.
- **Loading and empty are different states** and must look different.
- Stack: Next.js 16 App Router, React 19, TypeScript 5, Tailwind v4, Prisma +
  Postgres.

---

## 7. What I want back

In priority order:

1. **The navigation and header.** Signed out, signed in, and admin, at 1440px
   and 393px. Plus a written rationale for the IA — what moved, what merged,
   what got demoted, and why. This is the top ask.
2. **The leaderboard.** It is the landing page and it is a wall of numbers.
   What is the progressive-disclosure shape that keeps the competitive pull
   without the overwhelm, at both widths?
3. **A signed-out landing page.** Assume public sign-up is live and a stranger
   arrives with no account and no WaniKani. What do they see?
4. **A consistency pass** expressed as reusable component specs — cards, pills,
   chips, filter rows, empty and loading states. These grew independently per
   surface and no longer agree.
5. **393px specifically.** Vertical space is the scarce resource and the banner
   plus nav currently eat a lot of it before content begins.

Mockups or wireframes are both fine. If you want to work directly in the
codebase, branch from `main` and keep to one surface per branch — the repo
ships one feature per commit per release.

---

## 8. Questions I expect you will have

Ask early rather than assuming:

- Is the leaderboard meant to be *competitive* or *encouraging*? It is a
  family with a level-40 member and a level-1 member, and I have never
  resolved that tension.
- Should the mascot banner survive on mobile, shrink, or move?
- How much of the eleven-item nav is genuinely used? I do not have analytics.
  I can tell you what my family actually opens if you ask.
- Is the display-font choice (Arial Black stack) load-bearing brand, or
  inherited? Treat it as open.
- Anything the code does that contradicts this document — the code is the
  truth and I want to know.
