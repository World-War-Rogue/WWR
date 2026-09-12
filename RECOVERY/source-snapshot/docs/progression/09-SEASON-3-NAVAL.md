# Season 3 Naval Expansion

SCOPE, DATA MODEL, DOCTRINES, CONFLICTS — NO CODE WRITTEN

Season 3 placement accepted, and it is the right call for a reason beyond pacing: the water layer is a larger job than "enable twelve assets," and Season 2 gives it the runway. What follows is what I found in the code.

## 1\. Conflicts with the current build

I checked rather than assumed. Three of these change the scope materially.

### Terrain is client\-side and decorative

`src/live/terrain.ts` generates the ground as a pure function of world, season and plot — no storage, no bytes over the wire, and **the Worker has no knowledge of it whatsoever.** A grep for `terrain` or `biome` across `worker/` and `shared/` returns nothing.

Water already exists as a biome with a defined palette, and it is paint. Nothing server\-side can ask whether a plot is wet.

**So the first piece of naval work is not naval at all:** move terrain generation into `shared/terrain.ts` so both sides read one definition, exactly as `shared/skins.ts` and `shared/assets.ts` already work. Until that happens the server cannot enforce a single water rule.

### Base placement ignores terrain entirely

`candidatePlots()` in `worker/game.ts` samples a random annulus by angle and radius. It has no concept of ground. Water plots would need excluding, which is straightforward once terrain is shared — but it is not free, and it interacts with the next item.

### There is no pathfinding, and marches fly straight lines

`plotsBetween()` is `Math.hypot` — Euclidean distance, ignoring everything in between. A land squad today marches across salt flats, dry riverbeds and the basalt rim identically, because terrain has never mattered.

**This is the scope decision that dominates the whole expansion.**

If water blocks land movement, you need pathfinding over a 401×401 grid — A\*, route caching, march times that vary by geography, and a rewrite of `marchSeconds`. That is a large, risky system with no precedent in the codebase.

**Recommendation: water is a domain filter on targets, not a barrier to movement.** Land squads still march in straight lines. What water decides is *what you may attack and hold* — naval assets reach sea and coastal objectives, land assets reach inland ones, and mixed rosters reach both.

You get ports, sea objectives, naval doctrine and a real second front, and you never write a pathfinder. If naval movement later needs real routes, that is a Season 4 problem with a season of live data behind it.

### The other three, smaller

**The resolver has no domain concept.** `resolve()` sorts by band — close, air, deep — with no notion of land or sea. Naval assets already sit in the `COUNTER` table, so the web exists; what does not exist is any rule preventing a battleship fighting in a desert. That is a battle\-input rule, not a resolver change, which keeps the resolver pure.

**Static translations scale linearly.** Fleet Command, four doctrines, ten ranks each, plus the §10 explanation standard is roughly 90–140 new keys. The parser is line\-anchored and silently mismatches a wrapped string, which cost a deploy last night — worth knowing before a batch that size.

**Server authority holds throughout.** Nothing in the naval design needs a client\-side decision, and the shared\-terrain move actually strengthens it.

## 2\. Season 3 scope

| Piece | Work | Depends on |
| --- | --- | --- |
| `shared/terrain.ts` — move and extend | Small; mostly relocation | Nothing |
| Season 3 terrain spec with real coastlines | Design \+ tuning | Shared terrain |
| Water\-aware `candidatePlots` | Small | Shared terrain |
| Port plots and deployment points | Medium; new objective type | Season objectives |
| Domain filter on march targets | Small — one predicate at launch | Shared terrain |
| Naval and mixed\-domain objectives | Medium | Season 1 objective system |
| Water convoys and neutral threats | Medium | Event framework |
| Map rendering: coastlines, silhouettes | Medium; art and canvas | Shared terrain |
| Naval Expedition onboarding | Medium | PvE framework |
| Fleet Command | Medium | Drone system proven in Season 2 |

**Art:** twelve naval assets need category silhouettes, which `shared/assetArt.ts` already handles as vector paths — a naval silhouette is one more entry. Per\-asset art remains unbought for every category, so naval is no worse off than land. The real art cost is coastline rendering, which is canvas work rather than commissioned assets.

**Migration:** terrain is a function of season, so Season 3's spec introduces water where Season 1 and 2 had none. Existing bases can land in it.

**That is a feature, not a problem.** A base that finds itself on a new coastline becomes a **port plot** — it gains naval deployment and a new front. No migration, no relocation, and the map tells a story about a basin refilling. `candidatePlots` avoids water only for *new* placement.

## 3\. Fleet Command — data model

| Table | Holds | Uniqueness |
| --- | --- | --- |
| `fleet_doctrines` | rank per family per player | PK `(player_id, family)` |
| `player_materials` *(exists)* | Fleet Data alongside other bound materials | PK `(player_id, material)` |
| `players.active_doctrine` | the one selected family | — |

Rank release follows the season bands: ranks 1–2 in Season 3, 3–4 in Season 4, 5–6 in Season 5, then 7–10 across Seasons 6–10 — giving the horizontal seasons something vertical to hold onto.

The battle snapshot widens again. `marches` already needs `readiness_band`, drone protocol, tuning and Squad System ranks; **`active_doctrine` joins that list.** One column, same rule: what launched is what fights.

## 4\. How Fleet Command differs from the Command Drone

Stated plainly, because as written in the brief the two systems are structurally identical — four families, ten ranks, one active, in the snapshot, no raw power. Built as described they would be **the same system twice**, and players would experience them as one upgrade screen split across two menus.

Three differences make them distinct:

|  | **Command Drone** | **Fleet Command** |
| --- | --- | --- |
| Scope | One battle | One operation or war window |
| Acts on | Your squad | The objective and everyone contesting it |
| Availability | Always | Only where you hold a port or the operation touches water |

**Fleet Command being conditional is what saves it from being a second permanent layer.** A doctrine that only applies when the fight touches water is a reason to fight for ports, which is the point of a naval season. A doctrine that applies everywhere is just a Drone with a different icon.

On raw power: both sit in the **zero raw power** lane of the approved budget. The maximum end state stays ×7.21 — Core Levels ×6.27 plus Squad Systems \+15%. Adding Fleet Command changes no number in that budget, which is the property to protect.

## 5\. Four Fleet Doctrines

Each is a sidegrade with a stated cost. None adds damage.

**Fire Support** — coordinated long\-range pressure.
*Benefit:* overwatch assets fire in the first round instead of waiting on detection. *Limitation:* your close band takes the exposure penalty as though one band were missing. *Counter:* fast screens close the distance before the second volley. *Map use:* breaking a fortified coastal objective.

**Screen Network** — defensive coverage and interception.
*Benefit:* the first casualty in each band is prevented once per battle. *Limitation:* your own overwatch loses its opening round. *Counter:* sustained pressure exhausts the shield, so an attacker who commits wins the long fight. *Map use:* holding a port through a war window.

**Recon Network** — route intelligence and detection.
*Benefit:* you see inbound marches on adjacent water one step earlier, and the detection contest resolves in your favour on ties. *Limitation:* no combat effect whatsoever — pure information. *Counter:* an opponent who attacks anyway loses nothing to it. *Map use:* early warning across a contested strait.

**Logistics Network** — recovery and convoy support.
*Benefit:* damaged assets recover faster after the battle and convoys carry more. *Limitation:* nothing during the fight; you are strictly weaker in the battle itself. *Counter:* an opponent who wins decisively leaves nothing to recover. *Map use:* sustaining a long siege across several windows.

The shape worth keeping: **each doctrine's limitation is a real cost, not flavour text.** Fire Support genuinely weakens your close band. Logistics genuinely gives up the battle for the campaign. That is what stops "which doctrine" from having a single right answer.

## 6\. Naval assets in a mature world

Season 3 opens at Readiness Band 20. Twelve naval assets entering at level 1 against a band of 20 are dead content — nobody would field them and the expansion would launch inert.

**Recommendation: naval assets are granted at the season's opening band level**, so they arrive at 20 and rise with everyone else to 30.

Why this does not break the fairness rules: the ceiling is unchanged and shared, the band clamps them like everything else, every player receives them identically, and no Token buys them. It creates parity, not power. It is also what every game does when a new unit class arrives mid\-life, because the alternative is content nobody touches.

**The alternative** is a naval\-specific sub\-band starting low and rising through Season 3, so naval power is earned in\-season. More faithful to "earned through play," considerably more complex, and it means half a season of naval assets being too weak to use. I would take the grant.

## 7\. Onboarding and low population

**Naval Expedition** — protected PvE against neutral machines on water. Solo\-completable, flat rewards per completion (per the rule that PvE rewards never scale with power brought), teaching one naval role at a time. It runs for the first two weeks of Season 3 before naval objectives become contestable, mirroring the Boot Sequence.

**Low\-population fallback:** water convoys and derelict salvage as neutral\-machine content, so a solo player or a two\-person alliance has a naval progression route with no rival fleet. Participation rewards only — no territory, per the existing rule.

The contribution floor applies unchanged: naval objectives need two contributors like any other, and the second\-contributor floor question from the previous round applies here too.

## 8\. Revised ten\-season roadmap

| Season | Levels | New system | Legacy Item |
| --- | --- | --- | --- |
| 1 | 1–10 | Core assets, squads, base, alliance war | — |
| 2 | 11–20 | **Command Drone** | 1st |
| 3 | 21–30 | **Water, naval assets, Fleet Command** | 2nd |
| 4 | 31–40 | Expanded counterplay, advanced operations | 3rd |
| 5 | 41–50 | Final vertical progression | 4th |
| 6–10 | — | Breadth: the remaining 48 assets to 50, Fleet and Drone ranks 7–10, map content | 5th–9th |

Readiness Bands, corrected as you specified:

| Season | Band across weeks 1–10 |
| --- | --- |
| 1 | 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · 10 |
| 2 | 10 · 12 · 13 · 14 · 15 · 16 · 17 · 18 · 19 · 20 |
| 3 | 20 · 22 · 23 · 24 · 25 · 26 · 27 · 28 · 29 · 30 |

Each season opens at the previous ceiling, so a returning veteran starts the season already useful and still has nine weeks of headroom.

## 9\. Questions

**On this brief:**

1. **Water as a target filter, not a movement barrier** (§1) — confirm. This is the difference between a season of work and a pathfinder.
2. **Naval assets granted at the opening band** (§6) — or earned from level 1 with a naval sub\-band.
3. **Fleet Command conditional on ports and water** (§4) — without this it is a second Drone.
4. **Existing bases becoming port plots** when Season 3 water arrives (§2) — confirm, or they need relocating.

**Still outstanding:**

5. **Monday 00:00 RST** — six rounds.
6. 10,000 or 100,000 Tokens per week — now partly answered by the server\-segmentation idea, which changes the calculus once it exists.
7. Squad Systems per squad or per account.
8. Second\-contributor floor for two\-member alliances.
9. Payment provider, selling entity, tax treatment.
