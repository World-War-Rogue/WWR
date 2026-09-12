# Season 1 — decisions, 2026-09-05

Fifteen open blockers answered by Matt in one sitting. **These are settled.** Do
not re-open them; where one contradicts an earlier brief, this document wins and
the contradiction is called out so the design record can be reconciled.

---

## Map and terrain

**1. The Core is visible all season and wakes in week 10.** The fortress
silhouette is on the map from week 1 as a constant landmark, and activates
visibly when the Core opens. The art builds in Stage 1 with no season data; the
week-10 change is a small phase-driven state flip.

**2. Ring boundaries are implied by terrain, explicit only on inspect.** Terrain
character shifts across a boundary — salvage to industry to fortification — with
no drawn line. An explicit boundary appears only while a player is inspecting
territory.

**3. Ownership tint is a function of zoom.** Zoomed out, held territory is
tinted by alliance across the map. At normal zoom the ground is neutral terrain
and ownership lives in markers and overlays.

> This is better than either option offered, and it maps onto machinery that
> already exists: below `IDENTITY_ZOOM` (42 px/plot) bases already stop being art
> and become allegiance markers. Ownership tint belongs on the same switch, so
> the map keeps answering two different questions well rather than one badly.

**4. Hostile marches show full composition.** Per-asset silhouettes render on
enemy marches at close zoom, the same as friendly ones.

> **Contradicts an approved brief line.** The Season 1 brief states "enemy
> marches appear only through legitimate detection or scouting". It also reduces
> the value of the detection attribute, the Recon role, and the Electronics
> package whose stated purpose includes recon value. Matt's call, taken
> knowingly. **The brief text needs updating** so the design record does not
> carry both statements.

**5. Reduced motion stops motion and keeps everything readable.** Dust, drift,
ambient smoke, rotor blur and radar sweeps stop. Every marker, countdown and
piece of state stays. Nothing carrying information is lost.

**6. The performance floor is a five-year-old phone.** Players are expected from
areas with older hardware and less money. See §Consequences below — this is the
answer that changes the most.

## Assets and upgrades

**7. The squad Combat System lane is renamed Survivability.** Squad lanes become
Fire Control / Survivability / Sustainment. "Protection" now means exactly one
thing: the per-asset package. The squad lanes have no live strings yet, so this
is the cheap direction to rename.

**8. Armament owns `range`.** Armament covers firepower and range, making it the
unambiguous offensive package. Stage 0 gave range a real job — contesting a
screen so fire reaches the enemy rear — so Armament is the package that gets past
a wall of armour.

**9. March speed uses effective, band-clamped Propulsion.** Movement obeys the
same Readiness Band as combat. Nobody outruns the season by buying ahead.

**10. A Drone raises the squad's slowest pace; two Drones stack to a cap.** A
second Drone adds a smaller further gain up to a ceiling, then nothing.

**11. Visual evolution happens only at Service Rank milestones** — every ten
ranks, so once per season per asset. **Package upgrades change no visuals.** No
layered component overlays.

> The accepted trade: for nine of Season 1's ten ranks, four of the five things a
> player spends on change nothing visible. It also cuts the Season 1 art
> substantially — two states per asset, no component layers.

**12. Field Notes are written per package per category, plus a per-asset line.**
Twenty notes carrying the real advice, plus one short specific line per asset:
about ninety pieces of text rather than 288, translatable at a quality worth
reading.

**13. One asset may be reset per season.** Resetting an asset converts its
packages back into Command Credits at the full value of the **Credits** spent.
**Tokens are not refunded.** See the clarification below.

**14. Technical Dossier Chapter I opens at Service Rank 5**, not Rank 10, so the
specialisation is played through the middle of the season rather than unlocked at
the finale.

**15. Field-Issue renders ship first; Combat-Hardened lands before week 8.** No
player can reach Rank 10 before week 9 under the band schedule, so the second
state has weeks of runway. Sixty renders to launch rather than a hundred and
twenty.

## Also settled

**Recall stays available on every march, everywhere.**

> **Contradicts an approved brief line.** The brief states a launched competitive
> attack cannot be cancelled once it reveals information. As built, an attacker
> can launch, watch the defender react, and withdraw. Matt's call. **The brief
> text needs updating.**

**The home-ground bonus stays, as a disclosed exception.** A defender keeps up to
+25% from their Command Post. It is defence-only and capped, it is the one thing
making Command Post upgrades matter to combat, and it is now written into the
design as deliberate rather than left as an oversight. Its real effect gets
measured in the harness rather than assumed.

**Chat sits across the bottom of the screen, with the five primary navigation
buttons in a row directly above it.** Two stacked bars at the bottom: navigation
on top, chat beneath. Chat is never modal and never requires leaving a screen.

**`munitions` is renamed Ordnance Stock** in the string table only — the column
keeps its name. This keeps it distinct from Munitions Kits, the bound material
feeding the Armament Package.

---

## Consequences that change existing plans

### The five-year-old phone changes the terrain approach

This is the answer with the widest reach, and `10-TERRAIN-ART-PLAN.md` §2.2 was
written against a more forgiving assumption.

A five-year-old budget Android has a fraction of the fill rate and memory of the
machine the look-dev page was built on. Three things follow:

- **The tile cache gets smaller and the tiles get cheaper.** Cap nearer 16 tiles
  than 32, and consider 192 px tiles rather than 256.
- **Device pixel ratio must be capped.** Rendering a per-pixel ground layer at 3×
  on a phone that cannot afford 1× is the fastest way to make the map unusable.
- **Detail needs a quality setting**, auto-selected from a first-frame timing and
  overridable by the player. Ambient motion should default off below the
  threshold rather than being something a struggling player has to discover.

None of this changes the design. It changes the defaults, and it means **the map
has to be tested on a genuinely old device before it ships**, not on a desktop
browser window resized to look like a phone.

This also strengthens an existing decision rather than undermining it: caching
ground into tiles instead of redrawing every plot every frame is what makes a
low-end floor achievable at all.

### The art scope drops

With decisions 11 and 15 together, Season 1 needs **sixty Field-Issue renders to
launch** and sixty Combat-Hardened renders before week 8. No component overlay
layers at all. That is roughly a quarter of what the asset brief implied and it
takes the hero renders off the critical path — though they remain the longest
single lead time in the project.

### Two brief lines now need updating

Decisions 4 and Recall both contradict text in the approved Season 1 brief. The
code will follow this document. **The brief should be corrected** so a future
reader does not find two rules and pick the wrong one — that is exactly how the
duplicated counter table survived long enough to ship a lie to players.

---

## One clarification still needed

Decision 13 says the reset returns "full value of the credits used, but not
tokens". Two readings:

- **A:** only the Command Credits portion is refunded; anything paid in Tokens is
  lost. A player who paid 100 Tokens and 100 Credits gets 100 Credits back.
- **B:** the full value is refunded, paid entirely in Command Credits. The same
  player gets 200 Credits back, but never Tokens.

Reading A is what the words say and it is the safer design — it means Tokens
cannot be laundered into a refundable balance. It has one consequence that must
be handled in the interface rather than discovered: **paying with Tokens becomes
strictly worse than paying with Credits for anything a player might later reset**,
so the Service Bay has to say so at the moment of spending, not at the moment of
resetting.
