# Brief for ChatGPT — Season 1 events, the daily/weekly loop, and the alliance layer

Written by Claude for Matt on 2026-09-07. Paste the block below into ChatGPT. The answer
comes back as docs/SEASON-1-EVENTS-AND-ALLIANCE-v1.md and Claude implements from it.

---

You are the game designer for World War Rogue (WWR). Claude implements what you design; Matt owns and approves. Design Season 1 "things to do" and the alliance layer, and hand it back as implementation-ready specs.

READ FIRST — what already exists, so you extend rather than redesign:
1. docs/SEASON-1-LIVE-OPS-DESIGN-v1.md and docs/SEASON-1-LIVE-OPS-v1.md — your own earlier design: Daily Operations, daily map exercises, Dominion Warfront (weekly alliance competition), Iron Dominion Arena (phase A benchmark weeks 1–4, phase B head-to-head weeks 5–10), weekly reset sequence, anti-abuse rules, implementation data contract. NONE of it is built yet. Treat it as the draft to finalize, not to replace.
2. docs/progression/inventory/progression-inventory.md — the code-derived audit. Key facts: there is NO Command Credit income anywhere in the game today; every cap is 10 (Season 1); the progression registry (shared/progression.ts) holds every track's levels 1–50; Combat Systems are now built PER TASK FORCE (Fire-Control / Survivability / Sustainment, cost ceil(50 × 1.10^(L−2))); cosmetics grant no power yet; the Trade Post exists with one offer.
3. What the alliance code already does: create (tag + name + crest), browse, apply/approve/decline, ranks, settings, leave, alliance chat channel, "reinforce" marches that garrison at an ally's base for 8 hours, an alliance rendezvous point (RV) set by officers that members can rally to, alliance power leaderboard, and the Alliance Trading Post building (level exists, barter not built; private negotiated barter, 48-hour membership eligibility, server escrow, 24-hour post expiry were the agreed rules).

LOCKED RULES you must design within:
- Tokens = Command Credits 1:1 for every purchasable thing; no bundles, discounts, or exchange rates. Tokens are bought on the website only. Never show cash in game.
- Command Credits are earned through play. An active free player reaches the same progression target as a Token-funded player through roughly 4× more active in-game time. Every store card shows both routes.
- Package strips refund Credits paid only; Tokens never come back.
- Season 1 "Mech Uprising – Iron Dominion": 10 weeks, one server, salt-basin map, no naval. Assets cap at Service Rank 10 in Season 1; Combat Systems and buildings cap at 10 too. Weekly readiness band 2,3,4,5,6,7,8,9,10,10.
- Game time is Rogue Standard Time (UTC−7, no DST). Weekly resets Monday 00:00 RST; daily 00:00 RST.
- Fuel is the attack currency (100 + 20 × units per attack), stored uncapped. Only an Attack breaks a shield. A successful raid takes ~5% of unprotected stock.
- Every Task Force needs ≥1 drone to march. Task Forces: Alpha, Bravo (CC 5), Charlie (CC 10), Delta (bought 2,500 at CC 10 or free at CC 20).
- No human heroes. No hero rarity tiers, no gacha, no random drops, no hidden power. Every modifier is itemised in product cards, profiles, scout and battle reports.
- General Rider is the mascot: static, skippable onboarding only; never runtime-generated dialogue.
- Farm bots ("Lieutenant" + 6 digits, ~200 per server, up to level 8, never shielded, never attack) exist as daily raid targets; events must not be farmable by hitting bots more than intended.
- Performance floor: 5-year-old phones. Nothing that needs real-time connections; the server settles on read and polls.
- "The game is really just a math problem with a user interface as the lipstick": many variables, so two players rarely have the same build; many Task Force combinations for different events.

DESIGN THESE (be concrete, numbers and rules, not themes):

A. COMMAND CREDIT INCOME — the missing half of the economy.
   Every source, its amount, its cap, its reset, and who can reach it: Daily Operations, daily map exercises, first win of the day, raids, battle outcomes, Arena, Warfront, alliance operations, login/streaks if any, season milestones. Show the weekly total for (a) an active player (~15 min/day), (b) a committed player (~60 min/day), (c) a casual (3 days/week). Check it against the sinks: 325 per rank/package track to 10, 1,625 per fully fitted asset, 52,883 per Combat Systems lane to 50 (≈ 500 to 10), 2,500 Delta, 1,500 Second Engineer Team, shields 250/600/1,500, Depot resources 100/80/70/60 per Credit. State the 4× rule check explicitly.

B. SEASON 1 CALENDAR — week by week, 10 weeks.
   For each week: the story beat, which assets unlock (docs/SEASON-1-ASSET-SCHEDULE-v2.md), which event runs, what the readiness band is, what a player should be doing that week and why. Include the offseason at the end (servers go into OFFSEASON with catch-up events, then transfers with a scoring mechanism, then a 10–30 minute downtime and a new map; everything earned carries over).

C. THE DAILY LOOP AND THE WEEKLY LOOP — "things to do."
   Finalize Daily Operations and map exercises from your draft: exact mission list, counts, rewards in Credits and resources, the 15-minute session shape, what is Command Center–gated, and the UI copy for each card. Weekly: Warfront and Arena finalized with exact scoring, brackets, reward tables, tie-breakers, and what a player sees Monday morning.

D. ALLIANCES — what is special about being in one.
   1. Identity: what an alliance IS in WWR (size cap, ranks and their powers, joining/leaving cooldowns, the 48-hour eligibility rule, tag/name/crest rules already built).
   2. Benefits that only alliance members get: reinforcement rules (8-hour garrison exists — refine or keep), rally point, shared intel (Signals Center lead-time sharing?), alliance-only buffs if any (must be itemised and small), the Alliance Trading Post barter rules finalized (offers, escrow, expiry, what is tradeable), Alliance Supplies currency: how earned, what it buys.
   3. Alliance events: the weekly Warfront finalized; plus at least two more event types with different Task Force demands (e.g. a defensive hold, a convoy/escort, a territory push) — rules, scoring, rewards, schedule, minimum participation, anti-carry rules.
   4. Alliance progression, if any: alliance level or research — ONLY if it fits "no hidden power"; every effect itemised. If you recommend none, say so and why.
   5. Social: what makes players talk (chat is a bottom bar, never modal), coordination tools, officer duties.

E. HOSTILE-INBOUND AND DEFENCE as content: how a defender is warned (Signals Center lead time exists), what they can do, and whether defence should earn anything.

F. WHAT NOT TO BUILD YET — anything you would defer past Season 1, with the reason.

DELIVERABLE FORMAT — Claude implements directly from this, so:
- One document, Markdown, saved as docs/SEASON-1-EVENTS-AND-ALLIANCE-v1.md.
- Every number in a table. Every rule as a numbered statement. Every reward in Command Credits and/or resources (never Tokens).
- A "Data contract" section: tables and fields the server must store (settle-on-read, absolute timestamps, RST windows), the endpoints and their payloads, and the exact strings the UI shows.
- A "Balance check" section showing income vs sinks per player type per week, and the 4× rule.
- An "Implementation order" list of 6–10 steps Claude can take one commit at a time, each independently testable on the test realm with the qa-progression-max account.
- A "Decisions for Matt" list at the end: every trade-off you could not settle, with your recommendation and the alternative, phrased so he can answer each in one line.
- Do not restate what is already built; reference it. Do not invent liveries, blueprints, doctrines or Combat Systems changes — those are separate tracks.
