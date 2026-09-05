# Terrain art — making Season 1 look like a place

IMPLEMENTATION PLAN AND BLOCKING QUESTIONS — NO CODE WRITTEN

Read against the live repository at `4ea34e3`. Folds the map-art direction into
the Season 1 foundation plan as an early visual milestone, per the brief.

---

## 1. Why it reads as a grid

This is not a polish problem. The ground layer is, literally, one filled square
per plot.

`src/live/WorldMap.tsx:762-806` loops over visible plots and for each one calls
`terrainAt(world, season, extent, px, py)` and paints a single `fillRect` of
`zoom + 1` pixels. Four things follow from that, and together they are the whole
of what the brief is objecting to:

**The ground is quantised to the plot.** `terrain.ts` already generates smooth
two-octave value noise — the good stuff is in there — but it is point-sampled
once at each plot's integer coordinate and then painted as a hard square. All
the sub-plot detail the noise contains is thrown away before it reaches a pixel.

**Shade is a coin flip.** `ctx.fillStyle = cell.shade > 0.5 ? colours.fill :
colours.alt` — every plot is one of exactly two colours per biome. A continuous
0..1 noise value is being reduced to one bit, which is what produces the
checkerboard.

**Biome edges snap to plot boundaries.** Salt meets sand along a staircase of
right angles, because the biome is decided per plot and never blended.

**A visible grid is drawn on top.** `showGrid = zoom > 26` strokes every plot
outline, unconditionally, at almost every useful zoom.

And one consequence that shapes the whole plan: **the ground is redrawn from
scratch every frame**, inside the same loop as everything else. Any detail added
in that loop is paid for sixty times a second, on a phone, which is why the
current answer to "make it richer" has to be an architecture change rather than
more drawing code.

The far-zoom case is worse rather than better. Below `IDENTITY_ZOOM` (42) bases
become allegiance markers, but the ground carries on painting 14-to-42-pixel
solid squares — so the most grid-like view is the one a player uses to see the
war.

---

## 2. What changes

Four changes, in dependency order. The first is the one everything else needs.

### 2.1 Sample the ground in world space, not per plot

`terrainAt(worldId, season, extent, x, y)` keeps its signature and its callers,
because a few things legitimately want a per-plot answer. Alongside it,
`groundAt(worldId, season, extent, wx, wy)` takes **floats** and returns blend
weights rather than a single enum — how salt, how sand, how wadi, how rock this
point is — plus moisture and a scar value.

Colour becomes a weighted mix of the biome palette rather than a pick from two.
Boundaries feather because they are sampled continuously. Nothing about the
noise functions has to change; they were always continuous and were being
sampled as if they were not.

Palette gains the entries the brief asks for that do not exist yet: hardpan,
cracked mineral, sandstone shelf, dry scrub, burnt ground.

### 2.2 Cache the ground into offscreen tiles

This is what makes rich terrain affordable, and it is the single most important
item in this document.

Ground renders into offscreen canvases of a fixed pixel size (256×256), keyed by
`(worldId, season, phase, zoomBucket, tileX, tileY)` and held in a small LRU.
The frame loop then draws a handful of images instead of thousands of rectangles.

- **Zoom buckets**, not raw zoom — roughly 1.5× steps — so a wheel tick scales a
  cached tile rather than rebuilding it. Rebuild only when crossing a bucket.
- **A budget per frame.** Build at most one or two tiles per frame and draw a
  cheap flat wash where a tile is not ready yet, so panning never stutters. The
  map already has the pattern for this in `layer.busy` and the existing
  `artPending()` retry.
- **Cap the cache** at around 32 tiles on a phone. 256×256 RGBA is 262KB, so
  that is roughly 8MB.

Once ground is cached, detail is nearly free per frame, and the LOD table below
becomes a question of what to bake into a tile rather than what to afford.

### 2.3 Level of detail

| Zoom | Ground | Props | Bases |
| :--- | :--- | :--- | :--- |
| < 26 | regional wash, coarse noise only, no grid | none | allegiance markers |
| 26–42 | full texture, major landmarks | landmarks and wrecks | allegiance markers |
| 42–94 | full texture, tracks and washes | brush, rocks, debris | skin art |
| > 94 | full texture, fine detail | + small props, litter | skin art + cosmetics |

### 2.4 Demote the grid

The grid stops being a permanent stroke over everything. It appears when it is
doing work — a selected plot, a target being chosen, territory boundaries being
inspected — and is otherwise absent. Plot edges that need to stay legible get a
soft ground-contact darkening rather than a drawn line.

---

## 3. The art itself, and the trap to avoid

**Props should be pre-rendered sprites, not code-drawn shapes.** This is the one
recommendation here I would push hardest on, and the reason is in the project's
own history rather than in my judgement: procedurally-drawn canvas base skins
were rejected twice, as "too 2D" and "terrible", and the answer was the Blender
pipeline in `tools/skinforge/`. Trees, brush, wrecks, pylons, containers and
rock shelves are the same kind of object as a base skin, only smaller, and they
will fail the same way for the same reason.

The split that works:

- **Ground stays procedural.** Noise genuinely does read as ground — cracked
  mineral, dust, hardpan and washes are texture, and texture is what noise is
  good at. This costs no art.
- **Props come from a sprite atlas**, generated through the existing pipeline
  and placed deterministically. One atlas of perhaps 20–30 objects covers the
  whole brief: three or four hardy trees, three brush clumps, dry grass, two
  rock shelves, three wrecks, pipes, a pylon, containers, a crane, a smokestack,
  a guard tower, barriers.

**The cutout tool will eat them if they are generated wrong.** `cutout.py`
flood-fills inward from the image edges, so every prop must be generated
isolated on a plain light background — the same rule that already cost one base
skin its figure. Rusted metal and dark foliage are exactly the subjects that get
erased.

Placement is deterministic: hash on `(world, season, cell)` at a sub-plot jitter
grid, with density and species driven by the blended biome weights. Salt flats
get almost nothing and the occasional wreck; scrub gets brush and the rare hardy
tree; wadi edges get dry grass; rock gets shelves. Same function everywhere, so
every player sees the same tree in the same place, and nothing is stored.

---

## 4. Bases and squads in the terrain

**Bases.** A cleared command footprint under the 4×4, an approach track running
off toward the nearest wash or route, and a soft contact shadow — all baked into
the ground tile, so it is deterministic and costs nothing per frame. The rule
from the brief that matters most in practice: do not bury the base or shrink its
tap target. The footprint should read as ground the base is standing on, not as
decoration around it.

**Marches.** Ground squads get a small dust plume and a fading track behind
them; air assets draw at an altitude offset **with a shadow on the ground
beneath**, which is what actually communicates altitude — the offset alone reads
as a sprite sitting in the wrong place. Mixed squads draw both layers, ground
below, air above.

All of this is presentation over the existing interpolation between the server's
launch and arrival instants. No new polling, no client position writes, no
change to who decides arrival. `prefers-reduced-motion` drops dust, drift and
smoke and keeps the marker.

---

## 5. Two boundaries worth stating

**Terrain stays visual.** It must not touch march paths, movement time, combat
values, detection, objective eligibility or base placement. That is easy to hold
here because terrain is a pure function of world, season and position, and the
server never reads it.

**Scarring must be deterministic, never derived from real battles.** The brief
asks for blast scars and EMP-scarred ground in the Dominion Front. If those are
generated from the season phase, they are scenery and cost nothing. If they are
generated from where fights actually happened, the ground quietly becomes a
second information channel — a player could read recent combat activity across
the map at a glance, including battles they had no part in and no other way to
see.

This is worth being precise about because a legitimate event-driven effects
layer already exists: `src/live/effects.ts` draws fire, smoke and blast waves
from server state with an `until` instant. That is fine — a burning base is
already public, the same way marches are public in both directions. The rule is
that **terrain art must not duplicate that channel more subtly**, so scarring is
scenery and burning is state, and the two never swap jobs.

---

## 6. Where this sits in the plan

The brief asks for this as an early milestone. Most of it can be, and one part
cannot, so it splits in two.

### Milestone A — The basin. No dependencies.

Everything in §2, §3 and §4. It depends on nothing else in the Season 1 plan —
not the season record, not the wallet, not the shell — so it can start
immediately after Stage 0, which is done.

1. **Look-dev prototype** (see below).
2. World-space sampling and blended biomes.
3. Offscreen tile cache, zoom buckets, per-frame build budget.
4. LOD table, grid demoted to interaction-only.
5. Prop atlas and deterministic placement.
6. Base footprints and grounding.
7. March presentation: dust, tracks, altitude shadows, formation markers.

### Milestone B — The rings and the Core. Needs the season spine.

The four map rings and their progression across ten weeks are **phase-driven**,
and the phase comes from the season record and `phaseFromInstant`, which is
Stage 1. Ring *geometry* already exists as a decision — radius 0 for the Core,
12 for the Dominion Front, 26 for the Factory Ring, 44 for the Outer Scraplands
(`06-GEOMETRY-AND-SCHEDULE.md`) — so the art can be built against those radii,
but it cannot change with the weeks until something knows what week it is.

8. Ring identity: Scraplands salvage, Factory Ring industry, Dominion Front
   fortification, the Core.
9. Phase progression across the ten weeks.
10. The Core as the strongest silhouette on the map.

**Revised stage order**, with Milestone A pulled forward as requested:

| Was | Now |
| :--- | :--- |
| Stage 0 combat truth | **done, `4ea34e3`** |
| Stage 1 season spine and wallet | **Stage 1 — Milestone A, the basin** |
| Stage 2 shell and Upgrade Hub | Stage 2 — season spine and wallet |
| Stage 3 basin and marches | Stage 3 — shell and Upgrade Hub |
| Stage 4 General Rider | Stage 4 — Milestone B, rings and Core |
| … | Stage 5 General Rider, then unchanged |

**The trade, stated plainly:** the shell and navigation move back one place, and
that is where the persistent header lives and where the bug-report form stops
being reachable only from the base screen. So for one more stage, a tester who
finds a map bug still has to leave the map to report it. If that matters more
than the map looking right, say so and I will run the shell first — they do not
depend on each other either way.

### Step 1 is a prototype, not engine code

Canvas art has been rejected twice on this project, and both times the decision
was made by looking at it. Approving a terrain direction from a written
description would be the third attempt at the same mistake.

So the first thing I would build is a **standalone look-dev page**: the proposed
terrain at every zoom from 14 to 190, side by side with what ships today, with
the props, a base footprint and a march on it. It opens on a phone, it touches
nothing in the game, and it costs a fraction of the engine work. If the look is
wrong, it is wrong before any of `WorldMap.tsx` has been rewritten.

---

## 7. Blocking questions

**1. Sprite atlas or code-drawn props?** I recommend the atlas, for the reason
in §3 — it is the lesson the base skins already paid for. It needs 20–30
generated objects on plain light backgrounds, which is a Gemini session and a
cutout run. If the answer is code-drawn, the ceiling on how good this can look
is much lower and I would want that acknowledged rather than discovered.

**2. Is the Core visible before week 10?** The brief wants it unmistakable. A
fortress visible on the horizon from week 1 is a stronger piece of storytelling
and needs no phase data at all; a Core that appears in week 10 is a bigger
moment but is entirely Milestone B. This changes which milestone it belongs to.

**3. Are ring boundaries drawn, or only implied by terrain?** Implied reads far
better and matches "no plain visible grid". Drawn is unambiguous for territory
control. My preference is implied for terrain, with an explicit boundary shown
only while a player is inspecting territory.

**4. Does the ground show ownership at all?** Today allegiance lives entirely in
base markers. Once alliances hold factories, tinting the ground around a held
objective is the obvious next step and also the easiest way to make the map
noisy. I would keep ownership in markers and overlays for Season 1 and leave the
ground neutral, but it is a design call.

**5. What is the performance floor?** The oldest phone a tester will use decides
the tile cache size, the LOD thresholds and whether ambient motion ships at all.
GrandpaWhale's device would be a useful thing to know.

**6. Reduced motion — off or reduced?** I read the brief as "simplify", so dust
and drift stop and markers remain. Confirm, because the alternative reading is
that everything static still animates gently.

---

## 8. The human checks, mapped

The seven checks in the brief are all human-run, and none of them can be
verified by me — only by whoever opens the map. Mapping them to where they land:

| Check | Milestone | What would fail it |
| :--- | :--- | :--- |
| Reads as landscape, not grid, at normal zoom | A | blending or the tile cache not landing |
| Material depth close up without hiding bases | A | prop density too high near footprints |
| Each ring has a distinct identity | B | needs the season spine first |
| Ground, air and mixed squads recognisable | A | altitude shadows missing |
| The Core is unmistakable | B | depends on question 2 |
| Performance with many bases and marches | A | tile budget or cache cap wrong |
| Terrain never changes results or hidden info | A and B | scarring derived from real battles — §5 |

Checks 3 and 5 cannot be run until Milestone B, which is the honest consequence
of the ring progression needing to know what week it is.
