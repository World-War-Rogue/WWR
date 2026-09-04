# Skinforge

Turns an image into an animated base skin the game can load.

## Using it

1. Put a **cut-out PNG of the base alone** in `art/` — transparent
   background, no card frame, no text, no rarity badge. Just the base.
2. Copy `skins/signature_one.json`, point `source` at your file, give it an
   `id` that matches a skin in `src/live/skins.ts`.
3. Double-click **Build Skin.bat**.

Frames land in `out/<id>/frames/`. Tell me and I'll pack them into the atlas
and wire the skin up — packing runs on the Linux side of your machine, so you
do not need ImageMagick or anything else installed on Windows.

## What you need installed

Blender, from <https://www.blender.org/download/>. Standard installer,
default location. Nothing else.

## The input that matters

**The cut-out is the whole job.** A concept card — the kind with a title, a
rarity banner and a 360° strip along the bottom — is a picture *of* a product
sheet, not a base. Fed in as-is, the text and the panels become geometry.

What works: the base alone, filling the frame, on transparency or on a flat
colour that keys out cleanly.

## Two ways it builds depth

**relief** (default) treats the image as a surface and pushes it out along its
own brightness, so light rakes across real geometry. One image, no cutting up,
and it is the right choice for a single rendered view of a whole base.

**cards** stands regions of the art up as separate planes at different depths,
which buys genuine parallax — towers passing in front of each other as the
base breathes. Costs one cut-out PNG per layer. Add a `cards` array to the
config instead of `source`:

```json
"cards": [
  {"name": "ground",   "image": "art/emp_ground.png",  "z": 0.00, "lean": 90},
  {"name": "throne",   "image": "art/emp_throne.png",  "z": 0.18, "lean": 8},
  {"name": "spires",   "image": "art/emp_spires.png",  "z": 0.30, "lean": 4}
]
```

`lean` is degrees from flat: 90 lies on the ground, 0 stands upright.

## Settings worth turning

| Key | What it does |
| :--- | :--- |
| `relief.height` | Depth pulled from the image. Raise until light rakes; too far and it tears |
| `emission` | How hard the brightest parts glow. Lanterns want it, pale walls do not |
| `motion.bob` | Rise and fall per loop, in footprint units |
| `motion.sway` | Lean, in degrees |
| `motion.spin` | Full turns per loop. Use for domes and rings, not whole bases |
| `framing.lift` | Nudges the subject down the frame if the headroom looks wrong |

## What this does not do

It does not model anything. It gets real depth, real lighting and real motion
out of art that already exists, which is enough for most of a catalogue and
is not enough for a flagship — a rigged model that actually moves is still a
3D artist's job. `docs/SKIN-ART-SPEC.md` is the brief for that.

The camera, ortho scale, film transparency, RGBA output and frame registration
are set in `skinforge.py` and are not configurable. Every one of them fails
silently when it is wrong, so they are code rather than instructions.
