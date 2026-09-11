# The member profile page: SPX standing and usage, Duolingo overview

Ticket `cmtpk5onw00009xx17d0ly7z5`, open. The full detail as it stood before the 4000-character cap, moved here by scripts/tickets-trim-overflow.ts.

---

John, 2026-09-06, from the SPX User Profile capture (Users.asp?PersonID=3818, 2003-06-03). Companion to cmtpjnd0000009xr4aezdisua, which covers the XP chart and the boards. This one is the member's own page.

THE GAP THIS FILLS. UmaKuma has no public member profile at all. /users/[nickname]/profile is a SETTINGS page - display name, visibility, rank, quests, theme, study preferences, certificates, games - and it is owner-only behind canViewUserPage. There is nowhere to send somebody who taps a name on a leaderboard. SPX had exactly that page and it is the missing half: /profile is where you change yourself, this is where others read you.

VISIBILITY ALREADY EXISTS AND ALREADY MEANS THE RIGHT THING. Account.visibility is private / family / public (accountVisibility.ts - the middle level is called `family`, not `members`), enforced by listableTo + isVisibleTo, and today it only decides whether you appear in a listing. A public profile is the surface that setting was always describing, so it gates this page unchanged: private shows nobody, family shows members, public shows anyone. No new privacy concept and no new setting to explain. Two existing rules the page inherits for free, both verified in accountVisibility.ts before filing:
  - AN ADMIN SEES EVERY PROFILE. isVisibleTo returns true for viewer === "admin" before it looks at the stored value, so this needs no new code and no admin branch on the page. John confirmed 2026-09-06 that this is what he wants.
  - A ROW WITH NO STORED VALUE READS AS PUBLIC (LEGACY_VISIBILITY), because that is what those accounts already were. Only new accounts start private. A profile page must not quietly change that either way.

=== 1. WHAT THE SPX PAGE HELD ===
Left column, MEMBER INFORMATION: Display Name (with badge chips inline), First and Last Name in two cells, Web Site Address, City/Town ("Halifax (Lower Sackville if you know the area)"), State/Province, Country, Date Joined ("Wed, Jan 1, 2003, 3:53:00 PM"), Last Visit ("Tue, Jun 3, 2003, 9:30:58 PM") with a second line under it reading "3 hours ago from <IP Logged>".

Right column, ICON: the member's chosen icon image with their name under it; a tinted box holding, in order, the XP TITLE (All-Star Athlete), the VIRTUAL MONEY ($28,802.03), the XP TOTAL (3179 XP) and the LEVEL ((Level 13)); then a membership badge (Bronze Membership).

SITE USAGE, a table of what this person has actually done: Files Downloaded (0 today, 214 total), Forum Posts (187), Message Inbox (41, 142 unread), Messages Sent (490), Pool Participation (124 fantasy teams in 116 pools), Pools Administered (8), Surveys (54 created, 424 submitted), Wagers Made (8 placed today, 317 paid out). Note the shape: nearly every row is TODAY AND ALL-TIME in one line.

LATEST JOURNAL ENTRY - a titled, dated, free-text post ("The End Is Near", Mon May 26 2003), shown in full on the profile.

NOTES - free text the member writes about themselves.

SIGNATURE - one line. The captured one: "Your attitude determines your altitude ... how high are you flying?"

Sub-nav across the top: Demographics | Moderators | Newest Members | Hot Icons | Icon Gallery, plus a View Profile dropdown.

=== 2. WHAT TO BUILD FOR UMAKUMA ===
John's mapping, given 2026-09-06: signature becomes a favourite Japanese phrase; the icon box carries XP title, money, XP and level; date joined and last visit are worth having; the admin sees the IP because the admin is privileged.

  A. THE PROFILE PAGE ITSELF, AND ITS ADDRESS. John, 2026-09-06: "I like the REST /users/nickname/profile etc that you did." So the page keeps that shape - the profile is the thing every leaderboard, scoreboard and list links to, and it should own the memorable address.

     THE ADDRESSES, SETTLED BY JOHN 2026-09-06. Two pages, two jobs, and the split is the obvious one:
       /users/<who>/profile   - your profile page. Who may open it is Account.visibility: public to anyone, family to members, private to nobody, and an admin sees every type.
       /users/<who>/settings  - yours alone. Display name, visibility, quests, theme, study preferences, certificates, light/dark, games.
     The only work in this is that the settings CURRENTLY LIVE AT /profile and move to /settings. That is a rename plus updating every caller - the Settings nav group in navSections.ts, memberRoutes.test.ts, and any link to the profile page. The repo keeps no redirects, so the old address moves rather than being aliased.

     Gated by Account.visibility through the existing helpers. Identity block, the standing box, and the usage table. Everything on it is already in the database except the three writable fields in B. Reached from every place a member's name appears - leaderboards, XP boards, scoreboards, the lists surfaces.
     - Identity: display name, the member's own address, Date Joined (Account.createdAt) and Last Visit (Account.lastActivityAt), both through timeFormat.ts.
     - DATES, all three of them, because this is the page that answers "who is this and how long have they been here": DATE JOINED (Account.createdAt), LAST VISIT (Account.lastActivityAt), and PROMOTION DATE - the day they reached the rank they hold. The third is not stored but is recoverable by replaying XpEvent by dayKey; the derivation is specified on cmtpjnd0000009xr4aezdisua surface E and must be ONE SHARED HELPER used by both pages, not written twice. Day resolution, which is what SPX showed.
     - Standing box, the SPX icon panel done in UK terms: XP RANK NAME (xpRanks.ts), XP TOTAL, CURRICULUM LEVEL (UN/UG/WK through levelBadge.ts), and the member's SRS THEME, which is the UmaKuma thing SPX had no equivalent for and now has a page of its own. Virtual currency goes here too when it lands - John is designing that with another agent, so leave the slot and do not invent it.
     - Usage table, UK's answer to Site Usage, and it should keep SPX's today-and-all-time shape: reviews answered, lessons started, games finished, current streak and longest, lists made, items tagged trouble and favourite, JLPT certificates held. All derivable from XpEvent, GameRun, the SRS tables and jlptCertificates - no counters to maintain.

  B. WHAT A MEMBER WRITES. Three free-text fields, and they are the reason the page is worth visiting twice:
     - SIGNATURE, one line, John's framing: your favourite Japanese phrase, or whatever you like. Rendered with japaneseTextProps and lang="ja" where it is Japanese so Chrome does not offer to translate it.
     - NOTES, a short about-me block.
     - LOCATION, free text rather than a country dropdown. SPX's "Halifax (Lower Sackville if you know the area)" is the argument: the joke is the content, and a dropdown would have eaten it.
     These are three nullable columns on Account, so this part is a SCHEMA CHANGE and ships alone with the backup / push / db:push / drift sequence. Length caps and the same profanity-free expectation as display names; escaped on output like any user text.

  C. NO IP ADDRESS. DECIDED, 2026-09-06: "NO IP address for now."
     Recorded so nobody re-proposes it from the SPX capture. SPX printed "3 hours ago from <IP Logged>" under Last Visit, and the obvious reading is that UmaKuma should store a last-seen IP for admins. It should not. Nothing in UmaKuma stores an IP today - apiRateLimit.ts and inviteRateLimit.ts read x-forwarded-for transiently and it never reaches the database - so adding it would be starting to collect personal data about a membership that includes children, rather than surfacing something already held. Last Visit still shows the time and the relative "3 hours ago"; it shows nothing about where from. If a moderation need for this ever arises, ask John again and consider a coarser signal (a changed-network flag) before the raw address.

  D. THE DIRECTORY PAGES, if wanted. SPX's sub-nav offered Newest Members and Demographics. Newest Members is trivial over Account.createdAt and gives a small site a front door; Demographics was an aggregate of where members were. Both are listing surfaces and must go through listableTo. Lowest priority here.

=== 3. NOT IN THIS TICKET ===
  - VIRTUAL CURRENCY. John is working on it with another agent. This ticket only reserves its place in the standing box.
  - JOURNAL. SPX put a titled, dated free-text post on the profile. That is a blog, and UmaKuma already has a news reader; whether a member writes posts is a separate question and a bigger one than a signature.
  - MEMBER ICONS, the Icon Gallery and Hot Icons. UmaKuma has no avatar system and no image upload. A real feature in its own right - storage, moderation, defaults - and not to be smuggled in under a profile page.
  - MESSAGING, POOLS, SURVEYS, WAGERS. Four of SPX's eight Site Usage rows are features UmaKuma does not have.
  - FIRST AND LAST NAME. SPX asked for real names. UmaKuma asks for a nickname and a display name on purpose; do not add real-name fields.

=== 4. CONSTRAINTS ===
Split it: A is the page over data that already exists, plus moving the settings to /settings; B is the schema change and ships alone; C is a decision, not work; D is optional. Tests each, a smoke spec for the new route, copy in a feature copy module, Canadian spelling. Every listing this page is linked from already respects listableTo and this page must too.

=== 5. MERGED IN: THE DUOLINGO PROFILE (was cmtoqlq9p00009xsqimjdm0uh, 2026-09-05) ===
Two sources, one page. John sent Duolingo profile screenshots the day before the SPX capture and both describe the same surface, so they are one ticket now and the other is declined with a pointer here. Where they disagree, SPX is the structure and Duolingo is the presentation.

  THE OVERVIEW BLOCK, and it replaces SPX's icon panel rather than sitting beside it. Four numbers in a 2x2 at the top, each with an icon, and no chart: STREAK DAYS, UK LEVEL, XP RANK, TOTAL XP. That is the whole of "how am I doing" in four lines. UmaKuma already holds all four and currently scatters them down the settings page. The SPX standing box said the same thing in a column - take the 2x2, keep SPX's ordering instinct (title, then the numbers), and leave the currency slot in it for when that lands.

  ACHIEVEMENTS WITH NUMERIC TIERS. A grid of badges each carrying the number it was earned at (40, 750, 100, 200), NEW flags on recent ones, and UNEARNED ONES DRAWN GREYED RATHER THAN HIDDEN - which is the part worth copying, because a greyed badge is a target and a hidden one is nothing. UmaKuma has the XP quests and the level tests to draw from.

  MONTHLY BADGES, a row of one per month, greyed if missed. A calendar of turning up rather than a total, and it complements the streak instead of repeating it.

  COURSES LIST becomes XP BY SOURCE. Duolingo lists every course with its XP, biggest first. We teach one language, so ours is XP by where it came from - WaniKani, UmaKuma, custom libraries, games, reading. We hold this in XpEvent and have never shown it. It is also the honest version of SPX's Site Usage table, which was eight rows of raw counts.

  SHARED A SENTENCE. A member posts a Japanese sentence with its English under it in a speech bubble, with a like and a share. Read and News already give members sentences, so a "share this sentence" action turns reading into something the family sees. Adjacent to the activity feed ticket rather than part of this page - noted here so the connection is not lost.

  FRIEND STREAKS AS A ROW OF FACES, with a flame count under each partner and the ones not yet counting today greyed with a clock. That is the pair streak from the activity-feed ticket (cmtoql5ib00009xg5ygqulcz3) seen from the profile end, and it needs that ticket's pair table first. NOT IN SCOPE HERE; it is listed so whoever builds the pair streak knows the profile is its second surface.

  NOT FOR US, from the Duolingo capture: leagues, the Super upsell, the family-plan slot.

=== 6. RELATED TICKETS ===
  cmtpjnd0000009xr4aezdisua - the XP experience SPX had (chart, per-rank leaderboards, weekly, promotions). This profile page links into it and its boards link back here; build either first.
  cmto1h08u00009x40hey5gnul - four leaderboards on one idea. Every board that will link to this profile goes through that shared component, so that ticket comes before the linking-in work.
  cmtoql5ib00009xg5ygqulcz3 - the activity feed, which owns pair streaks and the shared sentence.
  Virtual currency - John is designing it with another agent. This page reserves a slot in the overview block and does not invent it.

=== VERIFIED 2026-09-09 (umakuma-b6): a quarter of the overview block already exists ===
The profile page is src/app/users/[nickname]/settings/page.tsx.
ALREADY THERE: XP rank and total XP, done well - ProfileXpHeadline in the page header, XpRankPanel with standing, next rank, a progress bar and rank equivalents.
EXISTS BUT ON ANOTHER PAGE, so this is moving rather than building: streak days (resolveStreak in xp/xpStreakServer.ts, surfaced only on /xp/history via XpActivitySummary) and XP by source (the same component's split-by-kind list). Two of the four overview numbers and one of the courses-list items are a re-render away.
GENUINELY MISSING: UK ladder level on the profile (the header has the badge, the profile does not), achievements with numeric tiers, monthly badges.
ALSO FOUND: src/app/users/[nickname]/UserProgressPanels.tsx (Item Spread / Level Progress) is dead code - nothing in src references it. Either it is the start of this page or it should go; do not leave it as a third answer to the same question.
