# Visual-First Season 1 Foundation — plan v2

UPDATED PLAN AND BLOCKERS — NO CODE WRITTEN

Supersedes the stage order in `09-FOUNDATION-PLAN.md`. The map-art direction is
now a **required redesign target**, so it moves from a milestone that could slip
to a gate that everything visual sits on top of. `10-TERRAIN-ART-PLAN.md` holds
the engine detail and is not repeated here.

Read against the live repository at `7c9a179`.

---

## 0. What changed, and what is already done

**Stage 0 is complete and committed** (`4ea34e3`). The combat harness exists,
five standing assertions fail the build, and four balance faults are closed.
Every category now sits within ±6.3 points of even, from a starting state where
fixed wing beat everything 100% of the time and artillery lost to everything.
Nothing below is blocked on it any more.

**The map art is now a target, not an aspiration.** That has one structural
consequence worth stating before the stage list: **no other visual work should
ship on top of the current ground layer.** The shell, the Upgrade Hub, General
Rider and the march presentation all get judged against the map they sit on, and
building them over a square grid means judging them twice — once now and once
after the terrain lands. Terrain goes first.

**One blocker from v1 is answered.** Props are a pre-rendered sprite atlas. The
art brief is `docs/CHATGPT-TERRAIN-ART-BRIEF.md`; finished PNGs land in
`tools/skinforge/art/terrain/` and are packed to `public/terrain/props.webp`,
matching how skin atlases already ship.

---

## 1. Stage order

| Stage | Content | Gate |
| :--- | :--- | :--- |
| **0** | Combat truth | **done — `4ea34e3`** |
| **1** | **Terrain, bases in the world, marches in the terrain** | none |
| **2** | Season spine, wallet, first Service Rank upgrade | none |
| **3** | Shell, navigation, Upgrade Hub | Stage 2 |
| **4** | Seasonal landmarks — rings and the Core | Stage 2 |
| **5** | General Rider onboarding | Stage 3 |
| **6** | Two-player PvP, recovery, alerts, bug categories | Stage 2 |
| **7** | Boot Sequence | Stage 2 |
| **8** | Technical Dossiers, Combat Systems, Departments | Stage 2 |

Stage 1 has no dependencies at all, which is what makes putting it first cheap.
Stage 4 is split out from Stage 1 deliberately: the four rings change with the
week, and nothing knows what week it is until the season record exists.

**The cost of this order**, stated plainly so it is a decision rather than a
surprise: the shell moves to third, and the shell is where the persistent header
lives and where the bug-report form stops being reachable only from the base
screen. For two more stages, a tester who finds a map bug has to navigate to
their base to report it. If that is the wrong trade, Stages 1 and 3 swap without
affecting anything else.

---

## 2. Stage 1 in detail — the six areas named in the brief

### 2.1 Terrain

The diagnosis is in `10-TERRAIN-ART-PLAN.md` §1 and the short version is that
the ground layer is one filled square per plot, with shade reduced to a single
bit. Four changes, in dependency order:

1. **Sample in world space.** `groundAt(world, season, extent, wx, wy)` takes
   floats and returns blend weights, not one enum. Biome edges feather instead of
   snapping to plot corners. `terrainAt` keeps its signature for the few callers
   that legitimately want a per-plot answer.
2. **A height field, lit.** Relief shading from a fixed sun is the single change
   that makes ground read as land rather than as colour, and salt cracks, wash
   channels and sandstone terraces all fall out of the height field rather than
   being drawn on top. This is proven in the look-dev page.
3. **Cache into offscreen tiles** keyed by zoom bucket. See §2.5.
4. **Demote the grid** to appearing only when it is doing work — selection,
   targeting, territory inspection — and never as a permanent stroke.

Props come from the atlas and are placed by hashing on `(world, season, cell)`
with sub-plot jitter, density and species driven by the blended biome weights.
Deterministic, so every player sees the same tree in the same place, and nothing
is stored or sent.

### 2.2 Base integration

A base gets a cleared command footprint, an approach track running off toward
the nearest wash, and a soft contact shadow — **all baked into the ground tile**,
which is what makes it free per frame and consistent between players.

The constraint that matters in practice is the one the brief states: do not bury
the base and do not shrink its tap target. The footprint reads as ground the base
stands on, not as decoration around it. Base skin silhouettes are untouched, and
starter skins stay visual-only.

### 2.3 Moving squads

Ground assets travel with a small dust plume and a fading track behind them. Air
assets draw at an altitude offset **with a shadow on the ground beneath** — the
shadow is what communicates altitude, and the offset alone just reads as a sprite
in the wrong place. Mixed squads draw both layers, ground below and air above. At
distance the column collapses to one formation marker that keeps direction, squad
and allegiance.

All of it is presentation layered over the existing interpolation between the
server's launch and arrival instants. No new polling, no client position writes,
no change to who decides arrival.

### 2.4 Seasonal landmarks

Ring geometry is already decided — Core at radius 0, Dominion Front 12, Factory
Ring 26, Outer Scraplands 44 (`06-GEOMETRY-AND-SCHEDULE.md`) — so ring *identity*
can be built against fixed radii in Stage 1: salvage and broken transmission
lines in the Scraplands, smokestacks and cranes and guard towers in the Factory
Ring, barriers and siege debris and signal towers in the Dominion Front.

What cannot be built until Stage 2 is **progression** — the same ground growing
more dangerous across ten weeks — because that needs the phase, and the phase
needs the season record. That is Stage 4.

**One rule to keep.** Scarring is deterministic from the season phase and is
never derived from real battles. The existing effects layer draws fire and smoke
from server state with an expiry instant, and that is fine because a burning base
is already public. Terrain must not become a second, quieter channel for the same
information — otherwise a player can read recent combat across the whole map at a
glance, including fights they had no part in.

### 2.5 Performance

The current renderer redraws every plot every frame, so today the honest answer
to "make it richer" is "you cannot". The tile cache is what changes that:

- Ground renders into 256 × 256 offscreen canvases keyed by
  `(world, season, phase, zoomBucket, tileX, tileY)`, held in an LRU capped
  around 32 tiles — roughly 8 MB.
- **Zoom buckets, not raw zoom**, in steps of about 1.5×, so a wheel tick scales
  a cached tile rather than rebuilding one.
- **A build budget of one or two tiles per frame**, with a cheap flat wash drawn
  where a tile is not ready. Panning never stutters; it sharpens.
- Fine relief detail **fades in with zoom** rather than being drawn always. This
  is not only cost — at the world view, high-frequency relief aliases into noise.
  Found while building the look-dev page, and it is the same LOD decision the
  cache makes per bucket.
- Props are drawn into the tile, not per frame, and stop entirely below the
  identity zoom.
- `prefers-reduced-motion` drops dust, drift and ambient smoke and keeps every
  marker.

### 2.6 Mobile readability

The map answers two different questions at two different ranges and the LOD
table is what keeps it from answering both badly:

| Zoom | Ground | Props | Bases |
| :--- | :--- | :--- | :--- |
| < 26 | regional wash, coarse noise, no grid | none | allegiance markers |
| 26–42 | full texture, major landmarks | landmarks, wrecks | allegiance markers |
| 42–94 | full texture, tracks and washes | brush, rocks, debris | skin art |
| > 94 | full texture, fine detail | + small props | skin art + cosmetics |

Above the terrain, everything a player acts on stays legible: routes, objective
markers, ownership, inbound warnings and squad markers all draw over the ground
and none of them are allowed to be a terrain colour. The lesson already paid for
here is that **a sheet is not a panel** — the asset picker "did nothing" because
it rendered below four squad cards, off-screen on a phone. Terrain detail must
never push a control out of thumb reach.

---

## 3. What is not changing

Terrain is visual only, and this is worth restating because it is the thing most
likely to erode as landmarks get more elaborate. It must not change march paths,
movement time, combat values, detection rules, objective eligibility, base
placement, or server authority. Terrain is a pure function of world, season and
position; the server never reads it; no rows, no bytes over the wire.

---

## 4. Genuine blockers

Only the ones where a wrong guess means rework rather than a tweak. Two from v1
are dropped: the sprite-atlas question is answered, and the economy hole is a
designer decision that blocks Stage 8, not Stage 1.

**1. Is the Core visible before week 10?** The brief wants it unmistakable. A
fortress on the horizon from week 1 is stronger storytelling, needs no phase data
and belongs in Stage 1. A Core that appears in week 10 is a bigger moment and is
entirely Stage 4. This decides which stage builds the single most important
landmark on the map, so it is the one to answer first.

**2. Are ring boundaries drawn, or only implied by terrain?** Implied reads far
better and matches "no plain visible square grid". Drawn is unambiguous for
territory. My preference is implied in the terrain, with an explicit boundary
only while a player is inspecting territory.

**3. Does the ground show ownership?** Today allegiance lives entirely in base
markers. Once alliances hold factories, tinting held ground is the obvious next
step and also the fastest way to make the map noisy. I would keep ownership in
markers and overlays for Season 1 and leave the ground neutral — but it is a
design call, and it is easier to decide now than to unpick later.

**4. What is the performance floor?** The oldest phone a tester will actually use
sets the tile cache cap, the LOD thresholds and whether ambient motion ships at
all. GrandpaWhale's device would be the useful one to know.

**5. Reduced motion — simplify or stop?** I read the brief as simplify: dust and
drift stop, markers remain, nothing that carries information is lost. Confirm,
because the other reading is that ambient motion continues gently.

---

## 5. Verification

Every check in the map-art direction is human-run, and none of them can be
verified by me — only by whoever opens the map. That division is not a formality
here: the last two serious faults on this project were found by reading live data
and by looking at rendered art, neither of which is available from a code review.

| Check | Stage | What would fail it |
| :--- | :--- | :--- |
| Reads as landscape, not grid, at normal zoom | 1 | blending or the tile cache not landing |
| Material depth close up without hiding bases | 1 | prop density too high near footprints |
| Each ring has a distinct identity | 1 identity, 4 progression | — |
| Ground, air and mixed squads recognisable | 1 | altitude shadows missing |
| The Core is unmistakable | 1 or 4 — see blocker 1 | — |
| Performance with many bases and marches | 1 | tile budget or cache cap wrong |
| Terrain never changes results or hidden info | 1 and 4 | scarring derived from real battles |

The look-dev page (`lookdev/terrain-lookdev.html`, published) already answers the
first check ahead of any engine work, which is the point of it: the terrain
direction gets approved by looking at it, not from a description.
