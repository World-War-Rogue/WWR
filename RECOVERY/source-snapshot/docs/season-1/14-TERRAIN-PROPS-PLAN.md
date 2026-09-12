# Terrain props — integration plan

PLAN AND BLOCKERS — NO CODE WRITTEN

Batch 1 of the Dry Basin art, twenty props: vegetation, rock and industrial
leavings. Wrecks, Factory Ring and Dominion Front structures, and the scorch
decals are still to come, and the blocking class below is designed so they drop
in without redesign.

Read against the live repository at `13923e6`.

---

## 0. What I found in the art, before anything else

I inspected the batch rather than assuming it matched the brief. It is good —
clean isolation, no baked shadows, no ground plane, generous margins, light from
the upper left. Three things change the plan.

**`cutout.py` will not work on these at all.** It is not a colour key; it flood-
fills inward from the frame edge and calls a pixel background only if it is
**brighter than 238 on every channel**. That was right for base skins generated
on white. These are on `#9AA0A6` — (154, 160, 166). Nothing in these images
passes the test, so the tool would cut nothing and report success.

**The background is not exactly `#9AA0A6`.** Measured at the frame edges it
drifts: (151, 152, 155), (150, 152, 158), (145, 149, 155), and it varies within a
single image. A strict key would leave a halo. The fix is to **sample the actual
border colour per image** and flood-fill with a tolerance, rather than hardcoding
one value the renders never quite hit.

**The pylon is the hard case and it sets the technique.** `power_pylon_a` is an
open lattice — background shows through between several hundred thin struts, and
every one of those struts has anti-aliased edges blended toward grey. A binary
mask would leave a grey outline on every member, which against pale sand reads as
scaffolding drawn in pencil. So the cutout has to produce **soft alpha** from
distance to the key colour, and then **de-fringe** — remove the grey cast from
partly transparent pixels. Without that step the pylon is unusable and the wire
runs disappear.

Sizes also vary — 1254×1254, 1024×1536, 1536×1024 — so the catalogue carries each
prop's aspect rather than assuming a square frame.

One thing that looked wrong and is not: the shelf appears to be shot from a
higher angle than the pylon. That is correct. A flat wide object shows its top
and a tall thin one shows its side under the same camera.

---

## 1. Staged plan

Five commits, each independently reviewable and each leaving the game working.

**Stage A — the pipeline.** `tools/skinforge/props.py`: per-image border
sampling, tolerant edge-connected flood fill, soft alpha, de-fringe, trim to
content, and pack to `public/terrain/props-v1.webp` with a generated rect map.
Produces a contact sheet so every cut-out can be eyeballed at once. No game
change.

**Stage B — the catalogue.** `shared/terrainProps.ts`: the prop table, the
placement classes, and `BLOCKING_CLASSES`. Data only, imported by both sides. No
game change.

**Stage C — deterministic placement.** `shared/terrain.ts` gains `propsInPlot()`
and `blockedAt()`, built on the noise already there plus a new corridor field.
Migration **0020** adds `worlds.terrain_seed` and `worlds.terrain_version`. Still
no rendering — but the server can now answer "is this plot obstructed".

**Stage D — relocation validation.** `POST /api/world/move` revalidates against
`blockedAt()` at confirmation and returns a message **key**, not a sentence. The
client previews obstruction as a courtesy.

**Stage E — rendering.** Props drawn into the terrain tile cache with zoom
culling, masked by live occupancy, never over the selection ring or map controls.

Stage E depends on the tile cache from the terrain engine work, so it lands with
it. A to D do not, and can go first.

---

## 2. The catalogue

```ts
export type PropClass =
  | 'vegetation'    // trees, brush, grass
  | 'scatter'       // low debris fields
  | 'rock'          // shelves, boulders
  | 'industrial'    // pipes, pylons, containers, drums, scrap
  | 'wreck'         // batch 2
  | 'structure'     // batch 2: towers, cranes, smokestacks
  | 'fortification' // batch 2: barriers, siege debris

/** One line to change when a new class arrives. */
export const BLOCKING_CLASSES: ReadonlySet<PropClass> =
  new Set(['rock', 'industrial', 'wreck', 'structure', 'fortification']);

export interface TerrainProp {
  id: string;              // matches the filename, never renamed
  cls: PropClass;
  frame: {x, y, w, h};     // rect in the packed atlas
  aspect: number;          // h / w, so varying source sizes do not squash
  anchor: {x, y};          // where the object meets the ground, 0..1 of the frame
  span: number;            // drawn width, in plots
  footprint: {w, h};       // LOGICAL blocking size in plots — never pixel bounds
  minZoom: number;         // culled below this, px per plot
  habitat: {
    biomes: Partial<Record<Biome, number>>;  // weight per biome
    corridor?: number;                        // min corridor strength
    saltFlat: boolean;                        // may it appear on the centre flats
    rarity: number;                           // acceptance, 0..1
  };
}
```

Blocking is derived from `cls`, not set per prop, which is what makes batch 2
free: a mech wreck declares `cls: 'wreck'` and blocks without touching the rule.

Batch 1, with the blocking set exactly as specified:

| Prop | Class | Blocks | Footprint | minZoom |
| :--- | :--- | :--- | :--- | ---: |
| hardy_tree_a/b/c | vegetation | no | — | 34 |
| thorn_brush_a/b/c | vegetation | no | — | 42 |
| dry_grass_a/b | vegetation | no | — | 60 |
| scrap_pile_b | scatter | no | — | 42 |
| boulder_cluster_a | rock | **yes** | 1 × 1 | 26 |
| sandstone_shelf_a | rock | **yes** | 1 × 1 | 20 |
| sandstone_shelf_b | rock | **yes** | 2 × 1 | 20 |
| rusted_pipe_run_a | industrial | **yes** | 2 × 1 | 26 |
| cable_spool_a | industrial | **yes** | 1 × 1 | 34 |
| power_pylon_a/b | industrial | **yes** | 1 × 1 | 20 |
| cargo_container_a/b | industrial | **yes** | 1 × 1 | 30 |
| fuel_drums_a | industrial | **yes** | 1 × 1 | 34 |
| scrap_pile_a | industrial | **yes** | 1 × 1 | 34 |

**Footprints are in plots, and a plot is a whole base.** That is the important
scale fact: a base occupies exactly one plot, so a pylon that is physically much
smaller than a base still costs a full base site when it blocks. Blocking is
whole-plot by construction because placement is whole-plot. This is what makes
density the thing to control, in §4.

---

## 3. Deterministic placement, and who decides

### Placement moves into `shared/`

Terrain today is client-only, generated by a pure function with "no rows in the
database and no bytes over the wire". The server now needs the same answer to
validate a move, so the deterministic half moves to `shared/terrain.ts` and both
sides import it — which is exactly what `shared/` exists for, and why the skin
catalogue lives there after the Worker and the client each had their own copy and
Ravenkeep went invisible.

Rendering stays in `src/live/`. `shared/` stays data and maths only.

### The seed is stored, not derived

Migration **0020**: `worlds.terrain_seed` and `worlds.terrain_version`, both
`NOT NULL`. The seed stops being `worldId * 31 + season * 7919`, so terrain can
be re-rolled without changing a world's identity.

`terrain_version` is the part that matters later. **If the placement algorithm
ever changes, props move — potentially out from under a base.** Version stamps
the algorithm per world, so an existing world keeps its layout forever and only a
new world gets a new one. Changing v1 for a live world is then a deliberate act
with a migration, not a side effect of a refactor.

### Placement

Three deterministic fields, all from the stored seed:

- **Biome weights** — already exist.
- **A corridor field**, new: ridged noise on its own seed, giving long sinuous
  routes across the basin. Industrial props require `corridor > threshold`, so
  pipes, pylons and containers follow abandoned infrastructure instead of
  scattering evenly. Pylons additionally snap toward the corridor centreline and
  space along it, which is what makes a transmission line read as a line.
- **A candidate lattice** — one candidate per 6×6 plot cell for blocking props,
  hashed from `(seed, version, cellX, cellY)`. Vegetation samples per plot at
  higher rates.

Then two masks applied on top:

- **Occupancy.** A plot holding a base draws no prop. This is what stops the art
  landing on an existing player, and it is also the answer to grandfathering —
  see blocker 1.
- **Reserved plots.** Objective plots are already reserved from base claiming;
  props respect the same list.

### Validation

`POST /api/world/move` already exists and already leans on
`idx_placements_plot`, the unique index that separates two players moving onto
the same square in the same instant. That stays — it is the race protection and a
prop check cannot replace it.

Added: the server recomputes `blockedAt(worldId, x, y)` **at confirmation**, from
the stored seed, never from anything the client sent. Blocked destinations are
rejected with a message key the client localises.

That last part is deliberate. About fourteen sign-in validation messages
currently arrive from the Worker as finished English sentences, and that is the
only English a non-English speaker meets at the door. This is a new message, so
it starts as a key.

The client may grey obstructed plots as a preview. That is a courtesy, not the
check — the same relationship the squad screen already has with the lift budget,
where the greying is advisory and the refusal comes from the Worker.

**Blocking affects base placement only.** It does not touch march paths,
movement time, combat, detection, or objective eligibility. Squads travel over
terrain visually and terrain never becomes a combat mechanic.

---

## 4. Not eating the map

The brief asks how large props are kept from consuming usable space in a small
beta. Four mechanisms, and one measurement.

**Density is bounded by construction, not by hope.** Blocking props are drawn
from a 6×6 plot candidate lattice, so coverage is `acceptance ÷ 36` before any
habitat gating. At an acceptance of 0.5 that is 1.4% of plots — roughly one
blocked plot in seventy.

**Habitat gating cuts it further.** Industrial props need a corridor, rock props
need rough ground or a wash edge. Neither condition holds across most of the map,
so realised coverage lands well under the lattice ceiling.

**The centre stays clear.** No blocking props on the salt flat — see blocker 2
for how far that exclusion should go.

**Bases mask props.** Occupied plots never draw one, so the beta cluster thins
itself as it fills.

**And it gets measured.** `scripts/terrain-audit.mjs`, in the same spirit as the
combat harness: sample the world, report prop counts by class and region, and
**assert that blocking props never exceed 2% of plots in any 20×20 window**. A
density budget nobody can reproduce is a promise; a script that fails the build
is a constraint. The combat harness exists because three balance faults survived
for months against a baseline nobody could re-measure.

For scale: 2% of a 20×20 window is eight blocked plots out of four hundred.

---

## 5. Blocking questions

**1. What happens to a base already standing where a blocking prop would go?**
My proposal is that props are masked on occupied plots, so nothing visually
lands on a live player and no existing base is invalidated. The consequence: if
that player later moves away, the prop appears and they cannot move back. The
alternative is a permanent exception list, which is more state and more surprise.
I would take the masking. Confirm, because it touches live accounts.

**2. Is the salt flat clear of everything, or only of blocking props?** The
direction says keep the centre clear and readable. But `terrainAt` already
generates a stranded freighter wreck on the salt flats — "left there when the sea
dried" — and that is a deliberate existing piece of world-building. Options: keep
the flats entirely bare; allow non-blocking scatter only; or keep the stranded
wreck as the one exception because it is the story of the place. I lean the
third.

**3. Does `terrain_version` freeze layout for existing worlds?** My proposal is
yes: an existing world keeps its version and therefore its layout forever, and
changing it is a deliberate migration rather than a refactor side effect. The
cost is that a future placement improvement does not reach the live world without
an explicit decision. The alternative risks moving a pylon under somebody's base
on a Tuesday.

**4. Batch 1 has no wrecks, structures or fortifications**, so nothing in it can
appear in the Factory Ring or Dominion Front rings as those areas' identity. Is
batch 2 coming before Stage E ships, or should the rings launch carrying only
rock and industrial leavings and gain their structures later?

---

## 6. What I am not doing

Not renaming a single file. Not using pixel bounds as collision. Not adding
background jobs, timers or periodic regeneration — placement is a pure function
of seed, version and coordinates, settled on read like everything else here. Not
letting terrain touch movement, combat or pathfinding. And not deciding the
density numbers by eye when a script can assert them.
