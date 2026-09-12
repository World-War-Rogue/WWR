# Progression, monetization and season design

Written 2026-09-05, across one long design round between Matt, ChatGPT (game
designer) and Claude (implementation partner). These are the working documents
behind asset progression, the Token economy, the Season Readiness Band, and the
Season 3 naval expansion.

**Read this file first.** The numbered documents are the reasoning; this is the
state. Where the two disagree, this file is newer.

| # | Document | What it settles |
| :--- | :--- | :--- |
| 01 | Implementation plan | First full read of the repo against the consolidated direction. Collisions, staged plan, asset roster. |
| 02 | Revised plan | After the designer's first response. Harness scope, counter-model comparison, first cost curves. |
| 03 | Wallet handoff | Secure web-wallet handoff design, distribution assumptions, storefront constraints. |
| 04 | Two-currency model | Tokens and Command Credits, stepped curves, purchase reservations. |
| 05 | Uncapped token analysis | What removing the daily cap actually does. Measured against the real resolver. |
| 06 | Season Combat Cap | The progression model that made paid and played progression equal. |
| 07 | Readiness Band and contribution | Implementation, the 60/40 contribution rule, low-population edges. |
| 08 | Ten-season progression | Levels to 50, Blueprints, Squad Systems, Drone, the combined combat budget. |
| 09 | Season 3 naval | Water layer scope, Fleet Command, what the current map cannot do. |

---

## Measured facts about the current build

These came from running the shipped resolver and reading the shipped code. They
are not opinions and they should not be re-litigated without re-measuring.

**The combat seed does not change who wins.** Five thousand distinct seeds
against one matchup produced one outcome every time. The seed shuffles which
defenders take damage; it never changes the result.

**Combat is a step function on power ratio.** Below about 1.11 every battle is a
draw. Above about 1.14 the attacker always wins. There is no probabilistic
middle. "Controlled luck" does not currently exist.

**Levelling is a uniform multiplier**, so it never changes the relative shape of
two squads. A balanced draft beats a lopsided one by 1.20x at level 5 and 1.20x
at level 30. This is why the Season Readiness Band preserves tactics rather than
flattening them.

**There is no asset progression system.** Every player is granted all 60
draftable assets at level 1 on first read (`ensureRoster`), and no endpoint
anywhere writes `player_assets.level`. `ASSET_MAX_LEVEL` and `attributeAtLevel`
exist and are correct; nothing calls them.

**Two contradictory counter tables ship in `shared/`.** `COUNTER` in `combat.ts`
is live. `COUNTERS` in `assets.ts` is dead, disagrees with it, and is what
`COMBAT.md` documents. Do not assume the live one is correct — measure first.

**Terrain is client-side and decorative.** `src/live/terrain.ts` is a pure
function of world, season and plot. The Worker has no knowledge of it. Water
exists as a biome with a palette and is paint.

**There is no pathfinding.** `plotsBetween` is `Math.hypot`. Marches fly straight
lines and ignore everything underneath.

---

## Settled

**Currencies.** Tokens are purchased only. Command Credits are earned only.
1 Token = 1 Command Credit toward upgrades. Players choose the split. Tokens
never convert to Command Credits. Neither expires.

**Purchase cap.** 10,000 Tokens per server calendar week, Monday to Monday,
Rogue Standard Time. No balance cap, no spending cap, no daily upgrade limit.
Saved Tokens may be spent whenever.

**Season Combat Cap / Readiness Band.** Assets may be owned at any real level.
Season combat uses `min(real level, current band)`. The band rises weekly and is
scaled to each season's own ten-level range — Season 1 runs 2 to 10, Season 2
runs 10 to 20, Season 3 runs 20 to 30.

**Levels.** 1 to 50 permanent ceiling, released ten per season across Seasons
1 to 5. Seasons 6 to 10 are horizontal.

**Combat budget.** Only Core Levels scale raw power (x6.27 at level 50). Squad
Systems add at most +15%, additive on squad power, hard capped. Blueprint
Chapters, Drone Protocols, Fleet Doctrines and Legacy Items contribute **zero**
raw power. Maximum end state x7.21. Nothing multiplies.

**Contribution floor.** Meaningful territory needs two contributors; no single
account may supply more than 60% of an objective.

**Roles.** The existing six stay — breach, screen, strike, overwatch, recon,
lift. No second taxonomy, no re-tagging of the 72 assets.

**Defender liveness.** The defender is read live at settlement so they can react
to the hostile-inbound warning. The resolved snapshot is stored for replay.

**Naval.** Season 3, with a real water layer. Not a catalogue toggle.

---

## Open — a new session should ask these before building

1. **The RST week boundary.** Monday 00:00 was recommended and never confirmed.
   The wallet display and the whole game-time utility depend on it. **Asked six
   times without an answer — ask once more, plainly.**
2. **10,000 or 100,000 Tokens per week.** The brief in document 08 raised it
   tenfold as a parenthetical. At 10,000 a payer acquires currency at the same
   rate a committed player earns it, which is why the fairness model works. At
   100,000 it is 10.2x. Partly resolved by the server-segmentation idea, but only
   once segmentation exists.
3. **Squad Systems per squad or per account.** Per squad means twelve systems to
   rank and four times the balancing work.
4. **Second-contributor floor** for two-member alliances. 40% is brittle for the
   smallest groups, which is most of a beta.
5. **Water as a target filter, not a movement barrier.** The difference between a
   season of work and writing a pathfinder.
6. **Naval assets granted at the season's opening band** rather than entering at
   level 1 into a mature world.
7. **Season 2 content for maxed veterans.** A committed Season 1 player owns
   everything by day 64 and has nothing to buy for ten weeks. Enabling the twelve
   naval assets is the cheapest answer and they are already written.
8. Payment provider, selling entity, tax treatment. Blocks the Token stage only.
9. Which two starter skins get regenerated — Circular Shield Bunker and Field
   Workshop have visible yaw and do not meet the locked camera standard.

---

## Staged plan

| Stage | Contents | Gate |
| :--- | :--- | :--- |
| **0** | Simulation harness; counter-model measurement and recommendation; bug-report category; drop console capture; cosmetic entitlement repair | Approval |
| **1** | Hostile-inbound strip and alerts | Stage 0 |
| **2** | `shared/gametime.ts` — Rogue Standard Time, applied game-wide | Stage 1 |
| **3** | Asset progression: upgrade endpoint, cost curve, explanation templates | Cost curve approved |
| **4** | Blueprints, tuning, Squad Systems, specialties, tactics, events | Stage 0's harness |
| **5** | Season 1 staged A–F, Readiness Band, Drone, Base Departments | Stage 4 for combat-dependent parts |
| **6** | Tokens and payments | Progression proven live, plus distribution answers |
| — | Password reset and account access | Separate proposal, blocks nothing |

**Stage 0 needs nothing but approval.** It touches no gameplay balance and it
produces the measurement everything downstream depends on. Every number in these
documents is provisional until it lands, because they were all computed against
a resolver whose ruler has one mark on it.

---

## Shipped 2026-09-05

Done and live, so a new session does not rebuild them:

- Chat translation delivery fix — 60s overlap window, client upserts by id,
  pending state for untranslated messages
- The 2026-09-05 findings folded into `docs/HOW-IT-WORKS.md`
- In-game bug reporting — `bug_reports` table, Settings panel in the player menu,
  automatic context capture, owner-only queue at `/api/support/reports`
- Five new starter base skins; the old six removed, migration 0019 remapped
  existing bases
- The game opens on the world map
- Shellwarden reduced 20%; all skin motion removed
- Customise repaints when a skin atlas loads

Latest migration: **0019**. Season 1's tables start at 0020 or later.
