# The XP experience SPX had: chart, per-rank leaderboards, weekly, promotions

Ticket `cmtpjnd0000009xr4aezdisua`, shipped. The full detail as it stood before the 4000-character cap, moved here by scripts/tickets-trim-overflow.ts.

---

John, 2026-09-06, from six Wayback captures of SportsInteractive.com (SPX) XPSystem.asp, May-Sep 2003. John built SPX and wants the same EXPERIENCE for UmaKuma members: the XP chart, the leaderboards, the weekly board, the promotions page, the how-to-earn page.

SCOPE, STATED FIRST BECAUSE IT IS THE EASY THING TO GET WRONG. The deliverable is the SURFACES, not the ladder. John confirmed on 2026-09-06: "We don't need those levels... just the experience that we had for the users to be able to view the xp charts, leaderboards, etc."
  - UmaKuma keeps its own 100 named ranks (src/data/xpRankNames.json) and its own simulator-calibrated curve (xpCurve.ts, balanceSimulator.ts).
  - SPX's 22 levels, its level names, its XP thresholds and its dollar figures are NOT to be imported, ported or blended in. They appear in section 4 below as historical reference only, for the shape of the pages.
  - Nothing in this ticket retunes the curve or the entitlements. Any change there needs a simulator run and is a different ticket.

=== 1. WHAT TO BUILD. SIX SURFACES, ONE COMMIT AND ONE RELEASE EACH ===
Ordered so each stands alone and the cheap ones come first.

  A. THE XP CHART. The full rank ladder as a table a member can read: rank number, name, XP needed, and what that rank unlocks, with the member's own rank marked. Entitlements read from xpEntitlements.ts rather than typed, so the chart cannot drift from what the code enforces. 100 rows will not fit on a screen the way SPX's 22 did, so it wants banding or a jump-to-my-rank control. Every rank name links to that rank's leaderboard (B).

  B. PER-RANK LEADERBOARDS. The feature John called out by name. Every rank has its own board, reached by clicking the rank in the chart. Heading names the rank and both thresholds - the XP this rank needs and the XP the next one needs - so a member always sees the two numbers that bound them. The rank's own entitlement row is repeated on the page.

  C. THE TWO COLUMNS, on every board. XP TO GAIN A PLACE (the distance to the member directly above) and XP TO NEXT RANK. These turn a leaderboard from a list into a target and are the cheapest item here: both are arithmetic over rows already loaded.

  D. WEEKLY XP LEADERS. "Week N of YYYY", sorted by XP EARNED THIS WEEK with the lifetime total beside it. Weeks run Vancouver time like everything else dated in this repo (getVancouverDateKey). Derived from XpEvent rows; no schema change.

  E. PROMOTIONS. The past 7 days, grouped by rank descending, each group headed with the rank and its XP threshold, with a PROMOTION DATE per member. John asked on 2026-09-06 whether promotion dates are covered; they are not shown anywhere today, and they ARE recoverable without a schema change. Verified against origin/main before writing this:
     - awardXp writes both halves in ONE TRANSACTION (xpServer.ts:108-122): xpEvent.upsert increments amount and account.update increments Account.xp together. So Account.xp equals the sum of its XpEvent rows by construction and a replay cannot drift from the stored total.
     - NOTHING ELSE WRITES Account.xp. The only other account.update calls in the XP code are in xpRestServer.ts and they touch vacation dates.
     - So: sum XpEvent.amount by dayKey ascending, and the day the running total first crosses a rank threshold is that rank's promotion date. Index @@index([accountId, createdAt]) already exists; the group-by is over dayKey.
     THE RESOLUTION IS THE DAY, NOT THE MOMENT, and that is a hard limit rather than a choice: XpEvent is keyed @@unique([accountId, kind, dayKey]) and accumulates, so one row is a whole day of one kind of earning. Its own schema comment says per-award timing would need a second table. This is exactly what SPX displayed - its Promotion Date column read "Mon, May 19, 2003", a date with no time - so day resolution is the target, not a compromise.
     WORTH KNOWING: awardXp already returns rankedUp (level > account.xpLevel) at the moment a promotion happens, so the system knows about it live and simply keeps no record. Derivation stays the right trade - a table for something recomputable is the wrong one - but that return value is the hook if promotions ever need a time rather than a date.
     The same walk gives the profile page its "promoted to <rank> on <date>" line, so build it as a shared helper rather than inside the promotions page.

  F. HOW TO EARN XP. A reference page listing every source with its actual number, GENERATED FROM THE XpType TABLE rather than written by hand, so it cannot drift from what the code pays. This is the page a member opens to ask "why did I get 3 XP", and UmaKuma has more sources than SPX ever did.

=== 2. THE DETAILS THAT MADE IT WORK ===
Small things, and the reason the SPX pages read better than a bare list:
  - EVERY CHART ROW IS A CAPABILITY, not decoration, and the whole chart is public so a member sees what is coming. SPX flipped one yes/no unlock (Upload Image) at level 6 - reachable in weeks, not years.
  - TIES SHARE A PLACE AND THE SECOND NUMBER IS BLANK. Observed: KingCleve at 11 and MrBug with no number, both on 783 XP. UK already ranks this way in xpBoard.ts (ties share, next skips); only the blank-cell rendering is new.
  - THE LEADER'S "XP TO GAIN" IS AN EM DASH, NOT A ZERO.
  - THE WEEKLY BOARD SORTS BY THE WEEK, NOT THE TOTAL. Observed: MoR sits 2nd on 137 earned that week with 3,227 lifetime, while TOGiants leads on 191 earned with 1,389 lifetime. That inversion is the whole point - it is the board a newcomer can win.
  - THE HEADING STATES THE POPULATION: "XP Leaders for All Levels: 1118 Active Members".
  - PUBLISHED ODDS. SPX wrote its probabilities down in plain words - "a 50% chance of gaining 1 XP" - rather than leaving them to be inferred. It also paid 5-50 XP for a bug report.
  - A SEVEN-DAY WINDOW on promotions, so the page is always short and always current.

=== 3. WHAT UMAKUMA ALREADY HAS. DO NOT REBUILD ===
Checked against origin/main before filing:
  - 100 named ranks with cross-language equivalents (xpRankNames.json, xpRanks.ts).
  - A calibrated curve (xpCurve.ts) with a simulator behind it (balanceSimulator.ts).
  - Entitlements by rank (xpEntitlements.ts): games per day, 2 at rank 1 to a hard ceiling of 6 at rank 75. This is UK's version of SPX's Daily Wagers column and it exists.
  - Public board at /xp with competition placing, ties sharing a place (xpBoard.ts).
  - Personal ledger at /users/[nickname]/xp - day by day, activity summary, XpRankPanel.
  - Quests, streaks, rest days, toasts, admin XP types and manual awards.

=== 4. HISTORICAL REFERENCE ONLY. THE SPX PAGES AND CHART ===
Recorded because the Wayback captures are the only surviving spec and this ticket may be the last copy. NONE OF THESE NUMBERS OR NAMES GOES INTO UMAKUMA.

Hub at XPSystem.asp with a persistent nav on every sub-page:
  XP Chart | How to Gain XP | Membership Benefits | Promotions | Milestones | Bonus Winners | XP Weekly Leaders | XP Leaders
(Milestones and Bonus Winners appear only in the Sep 2003 capture and their contents were never captured.)
  Function=Leaders&TopX=25&RoleLevel=0 - all levels. Columns: # | Member Name | Last Visit | XP | XP To Gain Rank | Level. 15 per page, 75 pages.
  Function=Leaders&RoleLevel=8 - one level. Columns: # | Member Name | Last Visit | XP | XP To Gain Rank | XP For Next Level.
  Function=Weekly - "Weekly XP Leaders: Week 23 of 2003". Columns: # | Person | Last Access | Total XP | Weekly XP Earned.
  Function=Promotions - "Promotion Chart for the Past 7 Days", grouped by level. Columns: Member Name | XP | Promotion Date.
  Function=Gain - sections for Visit the Site Often, Virtual Sports Gaming and Wagering, Surveys, Pools, Forums, Report Bugs.

SPX's own words on the chart page: "Experience Points (XP) are one way to establish your status on the SportsInteractive.com web site. The more experience points you earn, the better your chance of attaining a higher level on the web site. The higher you level, the more features you get to use, and you get to do more things!"

The 22-level chart, capture 2003-08-15. Columns: Level | Name | XP Needed | Daily Votes | Daily Wagers | Max Wager Amount | Max Wager Per Game | Pools Limit | Upload Image | Daily Income.
22 Sports Legend 75000 10 65 $10,000 $10,000 75 Yes $800
21 Great Master 50000 10 50 $5,000 $5,000 50 Yes $700
20 Sports Heirophant 25000 10 45 $2,500 $5,000 25 Yes $600
19 World-Record Holder 20000 10 40 $2,500 $5,000 20 Yes $500
18 9th Degree Black Belt 15000 10 35 $2,250 $5,000 15 Yes $450
17 Hall-of-Famer 10000 10 30 $2,250 $5,000 12 Yes $400
16 7th Degree Black Belt 7500 10 25 $2,000 $5,000 10 Yes $375
15 Olympic Medalist 5000 10 20 $2,000 $5,000 9 Yes $350
14 5th Degree Black Belt 3750 10 15 $1,750 $2,500 8 Yes $325
13 All-Star Athlete 2850 10 14 $1,750 $2,500 7 Yes $300
12 3rd Degree Black Belt 2100 10 13 $1,500 $2,500 6 Yes $275
11 Seasoned Veteran 1600 10 12 $1,500 $2,500 6 Yes $250
10 1st Degree Black Belt 1250 10 11 $1,250 $2,500 5 Yes $225
9 Unrestricted Free Agent 950 10 10 $1,250 $2,500 5 Yes $200
8 Restricted Free Agent 700 9 9 $1,000 $2,000 4 Yes $175
7 Major Leaguer 500 8 8 $1,000 $2,000 4 Yes $150
6 Brown Belt 350 7 7 $750 $1,500 3 Yes $125
5 First Round Draft Pick 225 6 6 $750 $1,500 3 No $100
4 Minor Leaguer 125 5 5 $500 $1,000 2 No $75
3 Junior Apprentice 50 4 4 $500 $1,000 2 No $50
2 Amateur 25 3 3 $250 $750 1 No $25
1 Rookie 0 2 2 $250 $500 1 No $5

SPX's How to Gain XP, in full: visiting - once every couple of hours, 50% chance of 1 XP. Wagering - one wager a day 2 XP gold / 1 XP free, +1 for an Over/Under, top 5 Net Earnings Per Wager 2-10 XP by rank. Surveys - 50% chance of 1 XP per question. Pools - running one 25 XP gold / up to 5 XP free capped weekly, 1-2 XP per fantasy team entry, Top 10 monthly placings 50/25/20/15/10/9/8/7/6/5. Forums - 33% chance of 2 XP gold, 1 XP free, per post. Bugs - 5 to 50 XP.

SPX also paid Daily Income in virtual dollars, $5/day at level 1 to $800/day at level 22, spent on virtual wagers and pools, with the disclaimer on every page: "Daily Income refers to 'virtual dollars' and is NOT real money." John's framing: "kinda like DuoLingo Gems."

=== 5. NOT IN SCOPE. FOR JOHN, NOT FOR AN AGENT ===
  - VIRTUAL CURRENCY. No UK analogue exists. If ever wanted, the obvious sink is the one UK already has - rest days and streak freezes (MemberRest / MemberRestGrant) - which is the Duolingo model John named. Extra games a day must NOT be purchasable: that feeds the compounding loop xpEntitlements.ts deliberately capped at six. Not designed here.
  - VOTES and WAGERS. SPX's Daily Votes has no UK analogue. Betting on sports does not map; the nearest honest version is staking XP on your own review accuracy, which is a game-design conversation, not this ticket.
  - MILESTONES and BONUS WINNERS. Named in the SPX nav, contents never captured. Ask John what they were rather than guessing.

=== 6. CONSTRAINTS ===
Six features, six commits, six releases, tests each, and a smoke spec per new route. No schema change is expected; if E needs a promotions table it ships alone with the backup / push / db:push / drift sequence. Copy goes in a feature copy module, Canadian spelling. Boards must respect accountListing.ts on who may be listed - SPX had no privacy model and UmaKuma does.

=== 7. RELATED TICKETS, ADDED 2026-09-06 WHEN THE XP BOARD WAS TIDIED ===
  cmto1h08u00009x40hey5gnul - four leaderboards on one idea (WK, UK, XP, reading), one shared component and one page shell. BUILD THAT FIRST: surfaces B and C here are per-rank boards and two extra columns, and both belong in the shared component rather than in a fourth hand-rolled table.
  cmtpk5onw00009xx17d0ly7z5 - the member profile page. Every board built here links to it and it links back.
  ALREADY DELIVERED, so do not rebuild: daily quests and streak chests (0.110.0 daily-quests), the XP ledger and board (0.111.0 xp-board), the ladder chart beside the board (1.3.0 xp-ladder-chart), visible accrual on every award (1.18.0, 1.24.0, 1.26.0). The Duolingo-gems ticket that asked for those closed as shipped on 2026-09-06.
