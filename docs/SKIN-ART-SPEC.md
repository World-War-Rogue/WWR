# Base skin art specification

Hand this to a 3D artist. It is written so that a competent Blender freelancer
can deliver something that drops into the game with no further conversation.

The game already plays these. There is nothing to build on our side once the
files arrive — a finished atlas is one data entry in `src/live/skins.ts`.

---

## 1. What the game is

A top-down strategy map. Each player holds one square plot and their base sits
on it. Bases are drawn side by side, so the silhouette has to read at a glance
against fifty neighbours.

Look at Last War: Survival for the register — bright, chunky, readable, a bit
absurd. That is the target, not photorealism. A photoreal military base at
40 pixels across reads as a grey smudge.

---

## 2. Camera — the part people get wrong

**Orthographic. Zero yaw. 58° elevation.**

The map grid is axis-aligned squares, not isometric diamonds. Most mobile
strategy art is rendered isometric (45° yaw), and isometric art dropped onto a
square grid looks subtly wrong in a way that is expensive to fix later.

In Blender:

- Camera → Orthographic
- Rotation: **X 58°, Y 0°, Z 0°**
- Position the base at the world origin, camera directly in front on −Y
- Orthographic scale set so the **footprint fills the full frame width**

The footprint — the ground the base occupies — must be a square that touches
the left and right edges of the frame and sits flush with the bottom edge.
Everything above the footprint is the structure rising up, and it uses the
extra height described below.

---

## 3. Frame size

Two sizes. Pick one per skin and say which you used.

| Tier | Frame | Structure headroom |
| :--- | :--- | :--- |
| Standard | **512 × 640** | 25% above the footprint |
| Tall | **512 × 768** | 50% above the footprint |

The bottom 512 × 512 of every frame is the footprint. The remainder is
headroom for towers, masts, raised characters and anything that overhangs.

Nothing may extend past the left or right edges. Neighbouring bases are
directly adjacent and horizontal overhang will overlap them.

---

## 4. Animation

**Seamless loop. 24 frames. 12 fps. Two seconds.**

Frame 24 must flow into frame 1 with no visible cut. Test it by playing the
loop three times in a row.

What reads well at this size, in order of value:

1. **One large motion.** Something rises, rotates, opens or falls. This is what
   makes a skin worth paying for — a character emerging from the base, a
   rotating dome, a falling fountain. Big and slow beats small and fast.
2. **A secondary motion** at a different period, so the loop does not feel
   mechanical. A flag, a fan, a light sweeping.
3. **Emissive pulse.** Cheap and effective.

What does not read and is not worth paying for: fine particle detail, subtle
cloth simulation, anything under about 8 pixels of movement. The game layers
its own smoke, fire, embers and blast rings over the top of every skin, so
**do not bake damage effects, fire or smoke into the art.**

A still is acceptable as a first delivery — see §9.

---

## 5. Blender output settings

Render an **RGBA PNG image sequence**. Nothing else. FBX, glTF and .blend are
model formats the game does not read, and MP4 or WebM discard the alpha channel
— a base exported as video arrives with a black box behind it.

| Where | Setting |
| :--- | :--- |
| Render Properties → Film | **Transparent ✓** — without this you get sky, not alpha |
| Output → File Format | **PNG** |
| Output → Color | **RGBA**, not RGB |
| Output → Color Depth | 8 |
| Output → Resolution | **512 × 640** (or 512 × 768 for a tall skin), 100% |
| Output → Frame Rate | Custom, **12 fps** |
| Frame range | **1 to 24** |
| Camera → Type | **Orthographic** |
| Camera → Rotation | **X 58°, Y 0°, Z 0°** |

**Animate the model, never the camera.** A camera that drifts even a pixel
between frames shifts the footprint, and the base visibly jitters on its plot.
Lock it and leave it.

Name frames zero-padded — `name_0001.png` through `name_0024.png` — so they
sort correctly when packed.

---

## 6. Files to deliver

1. **PNG sequence** — `name_0001.png` … `name_0024.png`, straight (unassociated)
   alpha, transparent background.
2. **Packed atlas** — a single **WebP**, frames left to right then top to
   bottom, **6 columns × 4 rows**. At 512 × 640 that is 3072 × 2560 pixels.
   Target under **1.5 MB**; lossy quality 85 is normally plenty.
3. **The .blend file**, with materials and rig intact.
4. **A single hero still** at 1024 × 1280 for the store listing.

To pack the sequence into the atlas, with ImageMagick:

```
magick montage name_00*.png -tile 6x4 -geometry +0+0 -background none PNG32:atlas.png
magick atlas.png -quality 88 name.webp
```

`-background none` and the `PNG32:` prefix are both required; without them the
alpha channel is flattened and every frame gets a white square behind it.

Frames must be identically sized and identically registered — the footprint
must not drift between frames, or the base will jitter on its plot.

---

## 7. Content rules

- No text, letterforms or numerals anywhere in the art. The game draws its own
  nameplates and level badges over the top.
- No real-world logos, insignia, national flags or brand marks.
- No recognisable characters or designs from other games, films or franchises.
  This is a commercial product and copied designs are not usable.
- A soft contact shadow under the base is welcome, inside the frame.
- Keep the value range clear. Very dark skins disappear against the map's
  ground; very light ones flare against the salt flats.

---

## 8. Rights

Buy **full assignment of copyright**, in writing, including the .blend and the
right to modify and resell. A licence is cheaper and will become a problem the
first time a skin needs re-rendering at a different size.

---

## 9. Two ways to buy this

**Start with a still.** One high-quality render — no rig, no loop — costs a
fraction of a full animation. The game applies its own motion over a still: a
slow rise and fall, a pulsing halo, a gentle lean. It is not a rotating dome,
but on a map where everything else is static it reads as alive, and it proves
whether people buy skins before real money goes into animation.

**Then commission the loop** for whichever skin actually sells. Upgrading a
still to a full animation later changes one data entry in the code — the
still is not wasted work.

Rough costs for a freelance 3D artist, as of writing:

| Deliverable | Typical range | Time |
| :--- | :--- | :--- |
| Single rendered still | $150 – $600 | 2–4 days |
| Still + simple loop (rotation, pulse) | $400 – $1,200 | ~1 week |
| Full rigged character animation | $800 – $3,000 | 1–2 weeks |

---

## 10. One-of-one commissions

A skin sold to a single player and never sold again. The database enforces
this — a second grant of an exclusive item is rejected by a unique index, not
by somebody remembering — so the promise survives a support agent, a refund, a
retry and a second admin.

Two things worth settling in writing before taking money for one:

- **What the buyer gets if the game shuts down.** A one-of-one digital item at
  a high price is a long-lived promise. Say plainly, up front, what happens to
  it. Buyers accept a clear answer; they do not accept discovering there wasn't
  one.
- **Whether it grants any advantage.** It should not. The moment an exclusive
  item affects combat, every other player has a reason to resent the person who
  bought it, and the item stops being a status symbol and becomes a grievance.

I am not a lawyer and this is not legal advice — for a sale at that size, have
someone who is look at the terms.
