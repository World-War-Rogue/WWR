"""
Turns generated terrain prop renders into the map's prop atlas.

    python3 tools/skinforge/props.py

Reads every PNG in tools/skinforge/art/terrain/, cuts the flat background out,
trims, scales, packs them into public/terrain/props-v1.webp, and writes the
frame rectangles to shared/terrainAtlas.ts. Also drops a contact sheet at
tools/skinforge/art/terrain/_contact.png so all of it can be checked at a
glance rather than one file at a time.

── Why this is not cutout.py ─────────────────────────────────────────────────

`cutout.py` is for base skins and it decides background by BRIGHTNESS: a pixel
is background if it is above 238 on every channel and reachable from the frame
edge. That is right for art generated on white. Terrain props are generated on
a mid-grey, roughly #9AA0A6, so nothing in them passes that test and cutout.py
would remove nothing at all while reporting success.

Three things this has to do that cutout.py does not:

1. SAMPLE THE KEY PER IMAGE. The renders are not exactly #9AA0A6. Measured at
   the frame edges they drift - (151,152,155), (150,152,158), (145,149,155) -
   and they vary within a single image. A hardcoded key leaves a halo, so the
   key and the tolerance are both measured from each image's own border.

2. PRODUCE SOFT ALPHA. `power_pylon_a` is an open lattice: background shows
   through several hundred thin struts, and every strut edge is anti-aliased
   toward grey. A binary mask leaves a grey outline on every member, which
   against pale sand reads as scaffolding drawn in pencil.

3. DE-FRINGE. A half-transparent pixel still carries half the background's grey.
   Un-mixing it - solving C = a*F + (1-a)*key for F - is what stops every soft
   edge in the set from being subtly grey. Without it the props look like
   stickers.

The flood-fill-from-the-edge principle is kept from cutout.py, and for the same
reason: only pixels actually connected to the outside are background, so a grey
patch enclosed inside a wreck survives.
"""

import json
import os
import sys
from collections import deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "tools", "skinforge", "art", "terrain")
ATLAS = os.path.join(ROOT, "public", "terrain", "props-v1.webp")
CATALOGUE = os.path.join(ROOT, "shared", "terrainAtlas.ts")
CONTACT = os.path.join(SRC, "_contact.png")

# The longest edge any prop is drawn at, and the atlas quality.
#
# A plot is `zoom` pixels and zoom tops out at 190, so a two-plot landmark wants
# about 380 to be pixel-exact at maximum zoom. 340 is deliberately a little under
# that: the oldest phone a tester will use is about five years old, and what
# costs that device is not the file but the DECODED atlas sitting in memory.
# 384 at quality 92 is 1010 KB and 9.2 MB decoded; 340 at 86 is 717 KB and
# 7.2 MB. The only visible difference is a touch of softness on the largest
# landmarks at maximum zoom, which nobody will see and everybody would feel.
MAX_EDGE = 340
QUALITY = 86

# Atlas width. Height grows in shelves to fit.
ATLAS_W = 2048
PAD = 2


def border_key(im):
    """
    The background colour and how much it wanders, measured from this image's
    own frame edge rather than assumed.

    Returns (key, tolerance). Tolerance is three standard deviations of the
    border, so a clean render gets a tight threshold and a noisy one gets a
    looser one - clamped at both ends, because a very clean border would
    otherwise produce a threshold so tight that the anti-aliased ring around
    the subject never fills.
    """
    w, h = im.size
    px = im.load()
    samples = []
    for x in range(0, w, 2):
        samples.append(px[x, 0])
        samples.append(px[x, h - 1])
    for y in range(0, h, 2):
        samples.append(px[0, y])
        samples.append(px[w - 1, y])

    n = len(samples)
    key = tuple(sum(s[i] for s in samples) // n for i in range(3))
    var = sum(sum((s[i] - key[i]) ** 2 for i in range(3)) for s in samples) / n
    sd = var ** 0.5
    tol = max(14.0, min(34.0, sd * 3.0))
    return key, tol


def cut_out(im):
    """Background out, soft alpha in, grey cast removed."""
    w, h = im.size
    px = im.load()
    key, tol = border_key(im)
    kr, kg, kb = key

    # Distance from the key, per pixel, once.
    dist = [0.0] * (w * h)
    for y in range(h):
        row = y * w
        for x in range(w):
            r, g, b = px[x, y]
            dr, dg, db = r - kr, g - kg, b - kb
            dist[row + x] = (dr * dr + dg * dg + db * db) ** 0.5

    # Flood fill inward. Only pixels connected to the frame edge are background,
    # which is what protects an enclosed grey patch inside a wreck.
    bg = bytearray(w * h)
    seen = bytearray(w * h)
    queue = deque()

    def visit(x, y):
        i = y * w + x
        if seen[i]:
            return
        seen[i] = 1
        if dist[i] <= tol:
            bg[i] = 1
            queue.append((x, y))

    for x in range(w):
        visit(x, 0)
        visit(x, h - 1)
    for y in range(h):
        visit(0, y)
        visit(w - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            visit(x - 1, y)
        if x < w - 1:
            visit(x + 1, y)
        if y > 0:
            visit(x, y - 1)
        if y < h - 1:
            visit(x, y + 1)

    # Alpha. Background is gone outright; everything else ramps in over the band
    # just above the tolerance, which is where anti-aliased edges live.
    lo, hi = tol, tol * 2.4
    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            i = row + x
            if bg[i]:
                op[x, y] = (0, 0, 0, 0)
                continue
            d = dist[i]
            a = 1.0 if d >= hi else (0.0 if d <= lo else (d - lo) / (hi - lo))
            if a <= 0.0:
                op[x, y] = (0, 0, 0, 0)
                continue
            r, g, b = px[x, y]
            if a < 0.985:
                # Un-mix the background out of a partly transparent pixel.
                r = (r - kr * (1 - a)) / a
                g = (g - kg * (1 - a)) / a
                b = (b - kb * (1 - a)) / a
            op[x, y] = (
                max(0, min(255, int(round(r)))),
                max(0, min(255, int(round(g)))),
                max(0, min(255, int(round(b)))),
                int(round(a * 255)),
            )
    return out, key, tol


def fit(im):
    """Trim to what survived, then scale so the longest edge is MAX_EDGE."""
    box = im.getbbox()
    if box:
        im = im.crop(box)
    w, h = im.size
    if max(w, h) > MAX_EDGE:
        s = MAX_EDGE / max(w, h)
        im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    return im


def pack(items):
    """Shelf packing. Twenty props do not need anything cleverer."""
    items = sorted(items, key=lambda it: -it[1].size[1])
    x = y = shelf = 0
    frames = {}
    for name, im in items:
        w, h = im.size
        if x + w + PAD > ATLAS_W:
            x = 0
            y += shelf + PAD
            shelf = 0
        frames[name] = (x, y, w, h)
        x += w + PAD
        shelf = max(shelf, h)
    height = y + shelf + PAD
    atlas = Image.new("RGBA", (ATLAS_W, height), (0, 0, 0, 0))
    for name, im in items:
        fx, fy, _, _ = frames[name]
        atlas.paste(im, (fx, fy))
    return atlas, frames


def contact_sheet(items):
    """Every prop on one sheet, over a basin-coloured ground, at map scale."""
    cols = 5
    cell = 260
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * cell), (198, 172, 126))
    for i, (name, im) in enumerate(items):
        w, h = im.size
        s = min((cell - 30) / w, (cell - 30) / h)
        thumb = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
        cx = (i % cols) * cell + (cell - thumb.width) // 2
        cy = (i // cols) * cell + cell - 14 - thumb.height
        sheet.paste(thumb, (cx, cy), thumb)
    return sheet


def main():
    if not os.path.isdir(SRC):
        print(f"no source folder at {SRC}")
        return 1
    names = sorted(
        f for f in os.listdir(SRC) if f.endswith(".png") and not f.startswith("_")
    )
    if not names:
        print(f"no props in {SRC}")
        return 1

    print(f"{len(names)} props from {SRC}\n")
    print(f"  {'prop':26s}{'source':>12s}{'key':>18s}{'tol':>6s}{'kept':>7s}{'packed':>12s}")

    items = []
    for f in names:
        src = Image.open(os.path.join(SRC, f)).convert("RGB")
        cut, key, tol = cut_out(src)
        alpha = cut.getchannel("A")
        kept = sum(alpha.point(lambda v: 255 if v > 8 else 0).histogram()[255:]) / (
            cut.size[0] * cut.size[1]
        )
        fitted = fit(cut)
        items.append((f[:-4], fitted))
        print(
            f"  {f[:-4]:26s}{f'{src.size[0]}x{src.size[1]}':>12s}"
            f"{str(key):>18s}{tol:>6.1f}{kept:>6.0%}"
            f"{f'{fitted.size[0]}x{fitted.size[1]}':>12s}"
        )

    atlas, frames = pack(items)
    os.makedirs(os.path.dirname(ATLAS), exist_ok=True)
    atlas.save(ATLAS, "WEBP", quality=QUALITY, method=6)

    sheet = contact_sheet(items)
    sheet.save(CONTACT)

    lines = [
        "/**",
        " * Terrain prop frames in public/terrain/props-v1.webp.",
        " *",
        " * GENERATED by tools/skinforge/props.py - do not edit by hand.",
        " * Re-run the script when art is added or replaced.",
        " *",
        " * Frames only. What a prop IS - its class, whether it blocks base",
        " * placement, its logical footprint in plots - lives in",
        " * shared/terrainProps.ts, which is written by hand.",
        " */",
        "",
        "export interface AtlasFrame {",
        "  x: number;",
        "  y: number;",
        "  w: number;",
        "  h: number;",
        "}",
        "",
        f"export const PROP_ATLAS_SRC = '/terrain/props-v1.webp';",
        f"export const PROP_ATLAS_W = {atlas.size[0]};",
        f"export const PROP_ATLAS_H = {atlas.size[1]};",
        "",
        "export const PROP_FRAMES: Record<string, AtlasFrame> = {",
    ]
    for name in sorted(frames):
        x, y, w, h = frames[name]
        lines.append(f"  {name}: {{x: {x}, y: {y}, w: {w}, h: {h}}},")
    lines.append("};")
    lines.append("")
    with open(CATALOGUE, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    kb = os.path.getsize(ATLAS) / 1024
    print(f"\n  atlas    {atlas.size[0]}x{atlas.size[1]}  {kb:.0f} KB  -> {ATLAS}")
    print(f"  frames   {len(frames)}                -> {CATALOGUE}")
    print(f"  contact  sheet                  -> {CONTACT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
