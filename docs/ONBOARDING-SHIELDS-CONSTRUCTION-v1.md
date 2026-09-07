# ONBOARDING, SHIELDS & CONSTRUCTION v1

## 1. Weekly asset construction

### Decision

Weekly blueprints are **buildable**, not automatically granted. A blueprint becomes available at its scheduled weekly reset; the player then builds one owned copy before it can be placed in a Task Force.

**Rationale:** The weekly release still gives every player the same new choice immediately, while construction gives resources and active play a meaningful role without selling raw assets.

### Construction rules

| Category | Built at | Fuel | Steel | Munitions | Alloy | Build time |
|---|---|---:|---:|---:|---:|---:|
| Armour | Tank Building | 800 | 2,400 | 900 | 500 | 6 hours |
| Artillery | Missile Building | 700 | 600 | 2,400 | 900 | 5 hours 30 minutes |
| Fixed wing | Fixed-Wing Building | 2,200 | 700 | 900 | 1,200 | 7 hours |
| Rotary | Helicopter Building | 1,600 | 650 | 700 | 1,800 | 6 hours 30 minutes |
| Drone | Drone Building | 900 | 450 | 700 | 2,400 | 5 hours |

Each category uses the same cost and timer for every asset in that category during Season 1. The player has one global **Asset Assembly Queue**: only one asset may be under construction at a time, regardless of category. The queue is separate from the Engineer Support Yard's building queues; the Second Engineer Team does not add an Asset Assembly Queue. Timers are absolute server instants and cannot be skipped with Tokens or Command Credits.

**Rationale:** One visible, predictable queue keeps weekly releases valuable and lets a highly active player prepare resources faster without allowing instant full-catalogue ownership.

### Building gates

The six signup starters are already owned and need no construction. A released blueprint requires its category building at the same level as its unlock week: Week 2 requires Level 2, Week 3 requires Level 3, through Week 10 requiring Level 10. The category building must remain at or above that level only to start construction; once built, the asset remains owned permanently.

**Rationale:** The five runway buildings become a direct part of collection progression while the weekly schedule remains the universal ceiling.

### Asset-card copy

| State | Exact card copy |
|---|---|
| Not unlocked | `OPENS WEEK {week} · {date} 00:00 RST`<br>`Blueprint not yet available.` |
| Released, building too low | `AVAILABLE NOW · REQUIRES {building} LEVEL {level}`<br>`Upgrade this building to begin construction.` |
| Ready to build | `AVAILABLE NOW · BUILD AT {building}`<br>`Cost: {costs} · Time: {duration}`<br>Button: `BUILD ASSET` |
| Under construction | `UNDER CONSTRUCTION`<br>`Completes {absolute server time}` |
| Owned | `OWNED · SERVICE RANK {rank}` |

The locked asset detail page says: `This asset opens in Week {week}. Inspect it now; build it at {building} when it becomes available.`

**Rationale:** Every state explains the next action without hiding the upcoming asset from players planning their base.

### Season 1 calendar

Season 1 begins **Monday, September 7, 2026 at 00:00 RST**. Each week changes at Monday 00:00 RST: Week 2 September 14, Week 3 September 21, Week 4 September 28, Week 5 October 5, Week 6 October 12, Week 7 October 19, Week 8 October 26, Week 9 November 2, and Week 10 November 9. Week 10 ends Monday, November 16, 2026 at 00:00 RST.

The server, never a device clock, resolves all availability checks from this schedule.

**Rationale:** One server-clock boundary prevents time-zone exploits and gives every alliance a clear release rhythm.

## 2. Protection shields

### New-player shield

Every newly created account receives a **48-hour New Commander Shield** immediately. Starting an outbound Attack or Rally cancels it immediately and permanently. Sending or receiving Reinforcements, moving the base, setting a rendezvous, chatting, trading, upgrading, and collecting resources do not cancel it.

**Rationale:** New players can learn safely, but the moment they choose hostile play they enter the live war.

### Weekly free shields

At every Monday 00:00 RST reset, each player receives exactly two free shield coupons: **one 8-hour shield** and **one 4-hour shield**. Unused coupons expire at the next Monday reset and never carry over.

**Rationale:** Twelve planned free protection hours support real-life schedules without creating an always-shielded account.

### Purchased shields

| Duration | Token price | Command Credit price |
|---|---:|---:|
| 8 hours | 250 | 250 |
| 24 hours | 600 | 600 |
| 72 hours | 1,500 | 1,500 |

Only one shield can be active. Shield durations do not stack, extend, or queue. After any shield expires or is cancelled, the base has a **4-hour Shield Cooldown** before another free or purchased shield may activate. A cancelled shield has no refund.

**Rationale:** The prices give spending a dependable defensive option while the cooldown preserves attack windows and map movement.

### Combat and march rules

- A shield blocks all attacks and raids against that base. A shielded base cannot be selected as an Attack or Rally destination.
- A player may not activate a shield while any hostile march is inbound to their base, or while one of their Task Forces is on an outbound Attack or Rally march.
- A player may activate a shield while Task Forces are travelling to or from a Reinforcement assignment. Reinforcements never cancel a shield.
- Starting an Attack or Rally while shielded immediately cancels the active shield, applies the 4-hour Shield Cooldown, and starts the hostile march normally.
- If a shield becomes active after a hostile march begins but before it arrives, the arriving march does not land. It turns around at the defender's base and returns using its normal return travel time. The attacker receives a blocked-attack report; no combat, raid, repair, or points occur.
- A shield has no effect on the player's own asset construction, building upgrades, resource production, Task Force home defence, chat, trade, or map movement.

**Rationale:** Shields protect a base rather than freezing a player, while preventing last-second activation against an already visible inbound attack.

### Shield presentation

| Surface | Required presentation |
|---|---|
| World map | Show a thin pale-cyan hex ring around the base plot and a small cyan shield glyph beside its nameplate. The nameplate never shows a countdown. Tapping the base shows `Shielded · {remaining}`. |
| My Base | Show a thin cyan segmented ring around the Command Center pad and a cyan shield badge below the server clock: `SHIELDED · {remaining}`. |
| Shield popup | Title: `Shielded · {remaining}`. Body: `Attacks and raids cannot land while this shield is active.` |
| Attacker view | Disable Attack and Rally. Tooltip: `This base is protected. Your Task Force cannot attack until the shield expires.` |
| Command Center | Add `Protection` after `Overview`: current shield, cooldown, free coupons, and `Get Shield` button. |
| Depot | Put the three paid shield cards in `Services`, after any live repair service. |

The visible effect is static: no particle effect, animated dome, or GPU-heavy rendering.

**Rationale:** The base is unmistakably protected at a glance while the map stays readable on older phones.

### Shield confirmation

Before activation show:

`Apply {duration} Shield?`

`Your base cannot be attacked or raided until {absolute server time}. You cannot attack or rally while shielded.`

Buttons: `APPLY SHIELD` and `CANCEL`.

If the player is ineligible, show the exact blocking reason: `Shield unavailable: hostile march inbound.`, `Shield unavailable: an Attack or Rally is in progress.`, `Shield unavailable until {absolute server time}.`, or `Shield unavailable: another shield is active.`

**Rationale:** Shield use is consequential, so the player sees the exact tradeoff before spending a coupon or currency.

## 3. Admiral Rider guided onboarding

### Persona

Admiral Rider is a seasoned field commander assigned to bring a new command post online. He speaks calmly and directly, calls the player Commander, and explains only the immediate action without jokes, lore dumps, or sales language.

**Rationale:** A concise military guide makes the first session feel supported without slowing down experienced strategy players.

### Guide behavior

The guide begins on the World Map immediately after account creation or a redesign reset. Rider's 48 × 48 portrait sits directly above the left edge of the chat bar; its speech bubble has a two-line maximum and an `X` dismiss control. One current control is highlighted at a time. Tapping an unrelated building or control plays that item's building line, does not mark any guide step complete, then returns to the saved current step.

Guide state is stored server-side as `currentStep`, `completed`, and `guideEnabled`. A reset sets every account to `currentStep = 1`, `completed = false`, and `guideEnabled = true`. When reopened, the guide resumes at its next incomplete step and never restarts automatically after completion.

**Rationale:** The guide survives device changes and lets curious players explore without losing their place.

### First-session script

All Rider lines below are final copy and contain 30 words or fewer.

| Step | Rider says | Advance condition | Highlight |
|---:|---|---|---|
| 1 | `Welcome, Commander. I am Admiral Rider. I will bring your command post online, one decision at a time.` | Tap `NEXT` | Rider bubble |
| 2 | `This is your base on the world map. Tap it whenever you need to return home.` | Tap own base | Player base |
| 3 | `Nearby bases are other commanders. Their position, alliance, and protection status decide whether they are a target or a neighbor.` | Tap `NEXT` | Nearby bases |
| 4 | `Select a valid enemy base to inspect it. Attack sends a Task Force; a shielded base cannot be attacked.` | Tap `NEXT` | Attack button |
| 5 | `Reports record every battle, blocked attack, raid, and return. Check them before changing a formation.` | Open then close Reports | Reports button |
| 6 | `RV sets a rendezvous point. Home returns you to this base view from anywhere on the map.` | Tap `NEXT` | RV and Home buttons |
| 7 | `This is RST, the server clock. Events, releases, resets, and every timer use this time.` | Tap `NEXT` | Server clock |
| 8 | `Open My Base. Your Command Center controls what the installation can become.` | Open My Base | My Base button |
| 9 | `Command Center is the ceiling. Finish its next level before starting that level anywhere else.` | Open Command Center | Command Center |
| 10 | `Tank Building holds armour assets. Its level improves every tank's five baseline stats.` | Open Tank Building | Tank Building |
| 11 | `Missile Building holds artillery assets. Its level improves every artillery asset's five baseline stats.` | Open Missile Building | Missile Building |
| 12 | `Fixed-Wing Building holds aircraft assets. Its level improves every fixed-wing asset's five baseline stats.` | Open Fixed-Wing Building | Fixed-Wing Building |
| 13 | `Helicopter Building holds rotary assets. Its level improves every rotary asset's five baseline stats.` | Open Helicopter Building | Helicopter Building |
| 14 | `Drone Building holds drones. Drones are required in every Task Force and improve its marching network.` | Open Drone Building | Drone Building |
| 15 | `Tactical Operations Center makes every Task Force march faster. Its bonus combines with your Drone Network.` | Open Tactical Operations Center | Tactical Operations Center |
| 16 | `Signals Center spots inbound attacks earlier and reveals only carried categories before a battle lands.` | Open Signals Center | Signals Center |
| 17 | `Bulk Fuel Point produces Fuel. Fuel powers construction and pays for vehicle-heavy asset builds.` | Open Bulk Fuel Point | Bulk Fuel Point |
| 18 | `Base Fabrication Shop produces Steel. Steel is the backbone of buildings, armour, and base growth.` | Open Base Fabrication Shop | Base Fabrication Shop |
| 19 | `Garrison Barracks produces Munitions. Munitions pays for weapon systems and artillery construction.` | Open Garrison Barracks | Garrison Barracks |
| 20 | `Materials Recovery Yard produces Alloy. Alloy pays for advanced frames, electronics, and air assets.` | Open Materials Recovery Yard | Materials Recovery Yard |
| 21 | `Quartermaster Warehouse holds your stock, raises storage, and protects part of it from raids.` | Open Quartermaster Warehouse | Quartermaster Warehouse |
| 22 | `Engineer Support Yard shortens new building timers. At Level 10, hire the permanent Second Engineer Team.` | Open Engineer Support Yard | Engineer Support Yard |
| 23 | `Depot sells supplies today. Modules, cosmetics, and services appear here when they are available.` | Open Depot | Depot |
| 24 | `Alliance Trading Post is for private alliance barter. Trade unlocks 48 hours after joining an alliance.` | Open Alliance Trading Post | Alliance Trading Post |
| 25 | `This is Task Force Alpha. Every Task Force has six positions: two front, two centre, and two rear.` | Open Task Force Alpha | Task Force panel |
| 26 | `Build a formation around roles, not just power. Front positions take contact; centre brings fire; rear provides information and reach.` | Tap a Task Force slot | Six-slot formation |
| 27 | `Every Task Force needs at least one drone. More drone mobility raises its network speed, but the formation still follows its slowest asset.` | Tap drone slot or Drone Network detail | Drone requirement |
| 28 | `Open an owned asset. Service Rank raises all of its baseline stats and changes its battlefield appearance at milestone ranks.` | Open M1A2 asset card | Owned asset card |
| 29 | `Packages improve one stat on one asset: Armament, Protection, Propulsion, or Electronics. Choose the role you need.` | Open Packages | Package controls |
| 30 | `Asset appearance upgrades at Service Ranks 1, 10, 20, 30, 40, and 50. Rank remains the main source of power.` | Tap Rank preview | Rank-art preview |
| 31 | `Return to the Depot to cover a shortfall. Resources can be produced over time or purchased with Tokens or Command Credits.` | Open Depot Supplies | Depot Supplies tab |
| 32 | `Alliance and world chat coordinate moves quickly. Keep combat plans short, clear, and tied to the server clock.` | Open then close Chat | Chat bar |
| 33 | `Settings controls sound, notifications, and this guide. Turn Rider off whenever you are ready to command alone.` | Open Settings | Settings |
| 34 | `Your command post is ready, Commander. I will remain available for tips while you build, march, and defend.` | Choose `KEEP GUIDE ON` or `DISMISS GUIDE` | Completion buttons |

**Rationale:** The script teaches one tappable object at a time and reaches the first meaningful formation decision without requiring a battle or purchase.

### Settings and tips mode

Settings contains `Guide: Admiral Rider` with `ON` and `OFF`. `OFF` hides Rider and all tips immediately. `ON` resumes the saved incomplete guide; after completion it enables Tips Mode only. Tips Mode uses the same portrait and speech bubble, appears only once per tip per player, and never opens a blocking panel.

Final tips copy:

| Trigger | Rider says |
|---|---|
| First resource shortfall | `You are short {amount} {resource}. Produce it, expand storage if full, or buy it at the Depot.` |
| First march started | `Alpha is moving. Drone Network improves its pace, but every drone still carries the formation's strengths and weaknesses.` |
| First shield-expiry warning | `Your shield expires in {remaining}. Plan a shield, reinforce allies, or bring Task Forces home.` |
| First locked-asset view | `This asset opens in Week {week}. Inspect it now, then build it at its category building when released.` |

**Rationale:** Tips preserve the helpful part of onboarding for new players while giving veterans one clear off switch.

## Testable guardrails

1. A Week 4 armour blueprint cannot start unless Tank Building is Level 4, but the six signup starters are owned without construction at Level 1.
2. Starting an Attack or Rally cancels an active shield immediately; sending or receiving Reinforcements and moving the base never cancels it.
3. A player with a hostile inbound march cannot activate any shield; a previously active shield causes that inbound march to turn back without combat on arrival.
4. At Monday 00:00 RST, unspent 4-hour and 8-hour free shield coupons are deleted and exactly one new coupon of each duration is granted.
5. Guide progress saved on one device resumes at the same `currentStep` on another device; completing or dismissing the guide never restarts Step 1 without a redesign reset.

---

## Owner's rulings and implementation notes (2026-09-07)

- **"Rally" is not hostile here.** In this game the rally is the alliance rendezvous (a base move). Only an **Attack** breaks a shield, blocks applying one, or is refused against a shielded base. Reinforcing never touches a shield.
- **Reset**: migration 0025 puts every existing account under the 48-hour New Commander Shield and at guide step 1.
- Construction: `shared/construction.ts`, `worker/season1.ts` (`asset_builds`, one running per player by index). Shields: `shared/shields.ts`, `worker/season1.ts`, `worker/march.ts` (launch refusal, own-shield break, blocked arrival → `battles.outcome = 'blocked'` and the column returns). Guide: `src/live/guide/` (script = the document's copy, events from screens, highlights by `data-guide`), state in `players.guide_*`, Settings toggle.
- Admiral Rider's portrait is a placeholder badge until art lands.
- Tips wired: shortfall, first march, locked asset. Shield-expiry warning waits for a timer surface.
