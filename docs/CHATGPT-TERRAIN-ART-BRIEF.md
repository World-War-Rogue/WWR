# Terrain prop art brief — Season 1, the Dry Basin

Hand this to ChatGPT as a single prompt. It produces the sprite set the Season 1
terrain layer places on the map.

**Drop the finished PNGs in `tools/skinforge/art/terrain/`.** Claude cuts them
out, packs them into an atlas at `public/terrain/props.webp`, and writes the
placement catalogue. Do not rename them — the placement code keys off the exact
filenames below.

---

## The prompt

> I need a set of top-down game map props for a mobile strategy game. Generate
> them one per image, as separate images, using the exact filenames I list at the
> end.
>
> **The world.** A pale, dry, drained inland sea under machine occupation — salt
> flats, cracked hardpan, dry washes, low sandstone shelves, and the industrial
> leavings of a war being fought over factories. Hot, sun-bleached, hostile,
> lived-in. Think abandoned mining country in high summer, not a lush desert
> oasis and not a green landscape.
>
> **Camera — this must be identical on every single image.** A near-orthographic
> view from above and slightly in front, roughly 60 degrees down from horizontal.
> You see the top of the object and a little of its front face. Not a straight
> plan view from directly overhead, and not a side or hero view. Every prop must
> look like it was photographed by the same camera in the same session, because
> they are placed side by side on one map.
>
> **Lighting — also identical on every image.** A single hard sun from the upper
> left, fairly low. Lit faces are up and to the left; shadowed faces are down and
> to the right. Warm sunlight, cool sky bounce in the shadows. No rim light, no
> studio three-point setup, no dramatic backlighting.
>
> **Background — this is the part that breaks the pipeline if it is wrong.**
> Every image must be the object alone on a flat, uniform, mid-grey background,
> hex `#9AA0A6`, edge to edge. No gradient, no vignette, no texture, no ground,
> no sand, no floor plane, no horizon, no cast shadow on the ground, no contact
> shadow. The object floats on flat grey. The cutout tool flood-fills inward from
> the image edges, so anything touching the border is destroyed, and any part of
> the object that matches the background is eaten — that is why the background is
> mid-grey rather than white or black, because the props are pale sandstone and
> dark rusted iron and both extremes would be lost. Leave a clear margin of
> background on all four sides.
>
> **Style.** Physically believable, materially convincing, slightly stylised —
> premium mobile game art, not photoreal and not cartoon. Readable silhouette
> first: at map scale these are 30 to 90 pixels tall, so the shape has to carry
> the object and interior detail is a bonus. Weathered, sun-faded, dusty. Iron is
> rusted and oxidised, concrete is bleached and chipped, vegetation is drought-
> stressed.
>
> **Palette.** Bleached sand, pale sandstone, dust, khaki, drought olive, dry
> straw, oxidised rust, weathered steel grey, faded concrete. Vegetation is
> grey-green and olive, never lush or saturated green. No bright or primary
> colours anywhere. No neon, no glow, no magic.
>
> **Absolutely not.** No text, no labels, no watermarks, no logos, no UI frames,
> no cards, no rarity banners, no borders, no turntable strips, no multiple views
> in one image, no collage or contact sheet, no real-world national insignia or
> flags, no visible people or animals, no weapons pointed at the viewer, no snow,
> no water, no lush greenery.
>
> **Output.** PNG. 1024 × 1024 for everything except the six marked WIDE, which
> are 1536 × 1024. One object per image.
>
> ### The props
>
> Scale is given so they sit correctly next to each other. Keep the object's
> proportion within its frame roughly consistent with the scale given — a pylon
> should fill more of its frame than a fuel drum.
>
> **Vegetation — sparse, hardy, drought-stressed. Never a forest.**
> 1. `hardy_tree_a.png` — a lone wind-shaped desert tree, ~4 m, thin trunk, sparse grey-green canopy pushed to one side by prevailing wind.
> 2. `hardy_tree_b.png` — a second tree, ~5 m, more upright, half its branches dead and bare.
> 3. `hardy_tree_c.png` — a low, wide, gnarled thorn tree, ~3 m, umbrella-shaped canopy.
> 4. `thorn_brush_a.png` — a dense low thorn bush, ~1.2 m, olive and grey.
> 5. `thorn_brush_b.png` — a sprawling dead-looking brush clump, ~1 m, mostly bare twigs.
> 6. `thorn_brush_c.png` — three small brush clumps growing together, ~1.5 m across.
> 7. `dry_grass_a.png` — a tussock of pale straw-coloured dry grass, ~0.8 m.
> 8. `dry_grass_b.png` — a wider, flatter spread of dry grass, ~1.5 m across.
>
> **Rock — low, flat, sandstone.**
> 9. `sandstone_shelf_a.png` — WIDE. A low flat sandstone ledge stepping up ~1.5 m, layered strata visible on the exposed edge, ~8 m across.
> 10. `sandstone_shelf_b.png` — WIDE. A longer, lower, more broken shelf, ~12 m across, with a fallen slab at one end.
> 11. `boulder_cluster_a.png` — three or four weathered sandstone boulders, largest ~2 m.
>
> **Industrial leavings — the war has been through here.**
> 12. `rusted_pipe_run_a.png` — WIDE. A run of large rusted pipeline lying on the ground, ~10 m long, one section broken open.
> 13. `cable_spool_a.png` — a large industrial cable drum on its side, ~2.5 m, cable partly unwound.
> 14. `power_pylon_a.png` — a lattice steel transmission pylon, ~20 m, intact, rusted.
> 15. `power_pylon_b.png` — the same pylon collapsed and buckled, lying at an angle, cables trailing.
> 16. `cargo_container_a.png` — a weathered shipping container, ~6 m, faded paint, dented.
> 17. `cargo_container_b.png` — two containers, one stacked askew on the other, both rusted.
> 18. `fuel_drums_a.png` — a cluster of five or six oil drums, ~1 m each, some tipped over.
> 19. `scrap_pile_a.png` — a heap of broken machine parts, plate steel and torn panels, ~3 m.
> 20. `scrap_pile_b.png` — a scattered debris field of smaller machine fragments, ~5 m across, low.
>
> **Wrecks — the strongest silhouettes in the set.**
> 21. `mech_wreck_a.png` — the hulk of a large destroyed walking machine, ~8 m, collapsed onto its side, one leg folded under, armour plating torn open, no visible pilot or cockpit occupant.
> 22. `mech_wreck_b.png` — a smaller broken walker, ~5 m, still half standing, canted over, burnt.
> 23. `vehicle_wreck_a.png` — a burnt-out tracked vehicle, ~7 m, one track thrown, turret missing.
> 24. `ship_hull_wreck_a.png` — WIDE. The rusted hull of a small freighter stranded upright on dry ground where the sea left it, ~25 m, canted, hull plates streaked with rust.
>
> **Factory Ring structures — industry, weeks 3 to 5.**
> 25. `smokestack_a.png` — a tall industrial chimney, ~30 m, brick and steel, banded, no smoke.
> 26. `guard_tower_a.png` — a simple steel watchtower on legs with an enclosed cabin, ~12 m.
> 27. `loading_crane_a.png` — WIDE. A yard gantry crane, ~15 m tall and ~20 m wide, rusted.
>
> **Dominion Front structures — fortification, weeks 6 to 9.**
> 28. `barrier_block_a.png` — a line of three concrete anti-vehicle barriers, ~2 m each, chipped and stained.
> 29. `signal_tower_a.png` — a slim communications mast with dishes and antennae, ~18 m.
> 30. `siege_debris_a.png` — WIDE. A collapsed section of defensive wall with spilled rubble and twisted rebar, ~10 m.
>
> **Ground decals — these two are the exception to the rules above.** Flat, seen
> from directly overhead, no height, no lighting direction, soft irregular edges,
> on the same flat `#9AA0A6` background.
> 31. `scorch_a.png` — a blast scar on dry ground, dark charred centre fading to a pale ashy ring, ~6 m across, irregular.
> 32. `scorch_b.png` — a smaller, more scattered burn mark with debris flecks, ~3 m.

---

## After the art arrives

1. Drop everything in `tools/skinforge/art/terrain/`.
2. Tell Claude. Cutout, atlas packing and the placement catalogue are Claude's
   side of it, and none of it needs anything installed on Windows.
3. Anything that comes back wrong — a prop on visible sand, a shadow baked in, a
   different camera angle — gets regenerated rather than patched. A prop lit from
   the wrong side is obvious the moment it sits next to one that is not.

## Why these rules exist

Two of them were paid for already, and both are in `CLAUDE.md`:

- **A picture *of* a product sheet is not a prop.** A concept card with a title,
  a rarity banner and a turntable strip along the bottom becomes geometry when it
  goes through the pipeline. Objects only.
- **The cutout eats anything that matches the background.** One base skin came
  back as gold trim with the figure erased, because the subject was dark and so
  was the background it was generated on.

The third is new and specific to terrain: **props are placed next to each other
by the hundred**, so a single inconsistent camera or light direction is not one
bad asset, it is a map that looks assembled from stock. That is why the camera
and lighting paragraphs are stated as absolutes.
