# Terrain props go here

Raw generated PNGs from `docs/CHATGPT-TERRAIN-ART-BRIEF.md`, one object per
file, named exactly as the brief lists them. Nothing in this folder is cut out
yet — drop them in as they come back.

Claude runs the cutout, packs the atlas to `public/terrain/props.webp`, and
writes the placement catalogue. None of that needs anything installed on
Windows.

**Two rules the brief exists to enforce**, both already paid for once:

- The object alone, on flat `#9AA0A6`, with a clear margin on all four sides.
  The cutout flood-fills inward from the edges, so anything touching the border
  is destroyed and anything matching the background is eaten.
- No baked shadow and no ground plane. Contact shadows are drawn in code so they
  sit correctly on terrain that moves under them.

A prop with the wrong camera or the wrong light direction gets regenerated
rather than patched. Hundreds of these sit next to each other on one map, so one
inconsistent asset does not read as one bad prop — it reads as a map assembled
from stock.
