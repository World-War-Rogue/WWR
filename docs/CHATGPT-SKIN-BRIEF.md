# Base skin brief — paste this into ChatGPT

Paste this whole file as your first message. Then say which skin you want,
in one line, for example:

> Make me a skin: a frozen radar station on a glacier, pale blue and white.

---

## Your job

You are producing **base skin art** for World War Rogue, a top-down multiplayer
strategy game. A base skin is the artwork for one player's base on a shared
world map. Every player has one. They are sold, so they have to be worth buying.

The game is already built and already renders these. Nothing has to be
engineered — a finished image plus a short block of settings drops straight in.

---

## First, the honest part: what you can and cannot do

**You can generate one excellent still image.** That is the deliverable that
works, and it is not a compromise — read the next section before assuming
otherwise.

**You cannot generate an animation loop.** If you are asked for 24 frames of a
base rotating, you will produce 24 images that are each slightly different
buildings. On a game map that reads as the base morphing and jittering in place,
which looks broken rather than animated. Do not attempt it, and say so if asked.

**You can write Blender Python** to animate a model that already exists. That is
the real path to a rendered loop, and it comes later.

So: **one still, done properly, plus the motion settings the game will drive it
with.** That is the whole job.

---

## How the animation actually works

The game animates a still image in code. A skin declares its motion and the
renderer applies it every frame:

- **bob** — the whole base rises and falls
- **glow** — a coloured halo pulses behind it, at its own tempo
- **sway** — a slow lean, left and right

Three motions at three different periods do not line up, so the loop never
repeats visibly. Next to bases that are not moving at all, it reads as alive.

This is why a still is the right deliverable and not a downgrade. It also means
a still can be upgraded to a real 24-frame Blender loop later by changing two
numbers in the game's config — the still is never wasted work.

---

## The one rule that ruins everything if broken

**Render the subject isolated on a plain white background.**

No text. No title. No frame or border. No rarity banner. No description panel.
No 360° turnaround strip. No UI. No drop shadow onto a coloured card. Nothing
but the object on white.

The pipeline cuts the background out by flooding inward from the edges of the
image. A dark base rendered on a dark or busy background has **no separable
edge**, and no tool, threshold or background remover can recover one — the
information is not in the file. This has already destroyed one commission: a
figure on a dark card came back as gold trim with the character erased.

Include this phrasing in every image prompt you write, verbatim:

> isolated on a plain white background, centred, no text, no frame, no border,
> no UI, no banner, product render

---

## Framing

- **Top-down at an angle**, looking down at about 60° from vertical — so 30°
  above the horizon. Low enough to see the front of the structure, high enough
  that the ground it sits on still reads as a square.
- **Straight on. No isometric, no 45° rotation.** The game's grid is
  axis-aligned squares, not diamonds. Isometric art on a square grid looks
  subtly and expensively wrong.
- **Orthographic, not perspective.** No converging verticals.
- The **ground the base occupies is a square** that fills the width of the
  image and sits flush with the bottom edge.
- Everything above that square is the structure rising up. Aim for the
  structure to occupy the **bottom two-thirds to three-quarters** of a
  **portrait image, roughly 4:5**.
- **Nothing may run off the left or right edge.** Neighbouring bases sit
  directly against this one, and horizontal overhang overlaps them.

---

## What makes a skin worth money

The map draws these small — sometimes 40 pixels across, with fifty of them on
screen at once. Design for that first and detail second.

**Silhouette is the product.** At map size every interior detail is gone.
Outline and glow are all that survive. A skin that is distinctive in outline is
worth buying; a skin that is distinctive only in its texture work is not.

**Differ in shape, not just theme.** Two skins that are both "a fortress, but
one is icy" become the same grey lump at map zoom. The catalogue needs a tall
narrow one, a wide squat one, a spiky one, a domed one.

**Keep a clear value range, and vary it between skins.** The ground of Season 1
is a pale dry basin. A very dark skin disappears into a dark map; a very pale
one flares against the salt flats. Do not design ten dark skins.

**Give it one bright accent colour** that a halo can be built from. The game's
glow should be a colour the art already contains — a halo in a colour that is
nowhere in the image reads as a filter laid over it rather than as light coming
off it.

**Register:** bright, chunky, readable, a little absurd. Look at *Last War:
Survival* for the tone. **Not photorealism** — a photoreal military base at 40
pixels is a grey smudge.

**Do not paint in fire, smoke, embers, blast damage or debris.** The game layers
all of that over the top during combat, and baked-in effects fight with it.

---

## Content rules — these are hard limits

- **No text, letterforms or numerals anywhere in the art.** The game draws its
  own nameplates and level badges over the top, and they will collide.
- **No real-world logos, insignia, national flags or brand marks.**
- **No recognisable characters, buildings or designs from other games, films,
  shows or franchises** — and this is judged by what the finished picture adds
  up to, not by what it is called. Restyling it, changing the colours, or
  putting it in a new setting does not make it original. This is a commercial
  product that sells these skins, so a copied design is not usable at any price
  and is a takedown risk to the whole game. If a request would land there, say
  so and offer an original alternative instead.
- Everything you produce must be **original work**.
- A soft contact shadow under the base is welcome, inside the image.

---

## What to hand back

For each skin, give these four things.

### 1. The image
One PNG or WebP, portrait, as large as you can render it. White background,
following every rule above.

### 2. The image prompt you used
Written out in full, so it can be re-run or handed to a modeller later.

### 3. A name and a one-line blurb
The blurb is what a player reads in the store. One sentence, in the world's
voice, not a description of the art.

> *"A sworn guard, cast in iron. The sword has not gone out since."*

### 4. The settings block

Fill this in and hand it back as-is. It is pasted straight into the game.

```ts
skin_id: {
  id: 'skin_id',
  name: 'Display Name',
  blurb: 'One line, in the voice of the world.',
  palette: {
    ground: '#______',     // the ground it stands on
    structure: '#______',  // the main mass
    accent: '#______',     // the bright colour — the halo is built from this
    roof: '#______',
    wall: '#______',
  },
  perimeter: 'blast',      // 'blast' | 'wire' | 'wall'
  landmark: 'tower',       // 'tower' | 'dome' | 'mast' | 'none'
  starter: false,
  art: {
    src: '/skins/skin_id.webp',
    frames: 1,             // 1 = still, animated by code. Leave at 1.
    cols: 1,
    frameW: 512,
    frameH: 640,
    fps: 12,
    overhang: 0.25,        // 0.25 standard, 0.5 for a tall skin
    fill: 1.3,             // 1.0 = exactly its plot. 1.3 if the art leaves
                           // margin at the sides, so it does not sit small.
  },
  motion: {
    bob:  {amplitude: 0.018, periodMs: 3800},
    glow: {color: '#______', radius: 0.9, periodMs: 2400},
    sway: {amount: 0.015, periodMs: 7200},
  },
},
```

**Choosing the motion numbers** — this is a judgement about what the thing *is*,
so make it deliberately and say why in a comment:

| The subject is | bob amplitude | bob period | glow period | sway |
| :--- | :--- | :--- | :--- | :--- |
| Stone, a monument, heavy | 0.010–0.014 | 4200–4800ms | 1800–2000ms | omit |
| A structure, a building | 0.015–0.020 | 3600–4200ms | 2200–2600ms | 0.010 |
| A figure, a banner, light | 0.020–0.026 | 3200–3600ms | 2400–2800ms | 0.015–0.020 |

A plinth that bobs like a flag reads as weightless. Firelight flickers faster
than the object it is on. Keep the three periods unequal — that is what stops
the loop looking mechanical.

`glow.color` must be a colour that is already in the art.

---

## Checklist before you hand anything over

- [ ] Plain white background, nothing else in the image
- [ ] No text, numbers, frame, border, banner or panel anywhere
- [ ] Straight on — not isometric, not rotated 45°
- [ ] Looking down at roughly 60°; the ground reads as a square
- [ ] Ground square flush with the bottom edge, filling the width
- [ ] Nothing running off the left or right edge
- [ ] Portrait, about 4:5
- [ ] Distinctive in outline alone — squint at it small and check
- [ ] One clear bright accent colour
- [ ] No fire, smoke, embers or damage painted in
- [ ] Original — nothing recognisable from another franchise
- [ ] Name, blurb, prompt and filled-in settings block included

---

## If you are asked for a real animated loop later

Only once a model exists. The deliverable is then a **24-frame seamless loop at
12 fps**, rendered from Blender as an RGBA PNG sequence with **Film →
Transparent** on, camera **orthographic, rotation X 60° / Y 0° / Z 0°**, at
512×640, packed into a single WebP atlas **6 columns × 4 rows** (3072×2560),
under 1.5 MB.

**Animate the model, never the camera** — a camera that drifts one pixel between
frames makes the base jitter on its plot.

What reads at this size, in order of value: one large slow motion (something
rises, opens, rotates); one secondary motion at a different period; an emissive
pulse. What does not read and is not worth paying for: fine particles, cloth
simulation, anything under about 8 pixels of movement.

You can write the Blender Python for the camera, render settings and keyframes.
You cannot produce the model or the frames yourself.
