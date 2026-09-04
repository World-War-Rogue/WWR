"""
Turns a rendered image into a finished skin atlas.

    python3 tools/skinforge/cutout.py <image> <skin-id>

Writes the atlas straight into public/skins/<skin-id>.webp, keeps the cut-out
source in tools/skinforge/art/<skin-id>.png, and prints the art block to paste
into src/live/skins.ts.

This is the manual half of the pipeline, and it is a script rather than a
remembered sequence because every step in it has a silent failure mode. A
global colour key punches holes in the lantern cores. An untrimmed image leaves
the base floating a third of the way up its plot. A frame that is not 512x640
makes the overhang number a lie and the art renders squashed. None of those
throw an error - they produce a skin that is quietly wrong on the map.

Background removal is a flood fill inward from the frame edge, not a colour
key. Only pixels actually connected to the outside are background, so the white
of an eye or the hot centre of a lamp survives even though it is the same
colour as the sky behind the base.
"""

import os
import sys
from collections import deque

from PIL import Image, ImageFilter

FRAME_W, FRAME_H = 512, 640

# A pixel is background only if it is at least this bright on every channel AND
# reachable from the frame edge. Generous enough to swallow JPEG mush around
# the edge, tight enough to keep pale stonework.
THRESHOLD = 238


def cut_out(src: Image.Image) -> Image.Image:
    w, h = src.size
    px = src.load()

    background = bytearray(w * h)
    seen = bytearray(w * h)
    queue: deque = deque()

    def visit(x: int, y: int) -> None:
        i = y * w + x
        if seen[i]:
            return
        seen[i] = 1
        r, g, b = px[x, y]
        if r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD:
            background[i] = 1
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

    alpha = Image.frombytes(
        'L', (w, h), bytes(0 if flag else 255 for flag in background),
    )
    # A hard mask leaves a staircase along every diagonal, and a JPEG source
    # leaves a halo of near-white just inside it. Blurring then re-contrasting
    # the mask gives a clean antialiased edge and eats the halo with it.
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8)).point(
        lambda v: 0 if v < 90 else (255 if v > 170 else int((v - 90) * 255 / 80)),
    )

    out = src.convert('RGBA')
    out.putalpha(alpha)
    return out


def reframe(art: Image.Image) -> Image.Image:
    """
    Footprint fills the frame width and sits on the bottom edge.

    Everything the art does not use of the headroom stays transparent. This is
    what the game's `overhang` assumes, and it is why a base grows upward out of
    its plot instead of being centred in it.
    """
    art = art.crop(art.getbbox())
    art = art.resize((FRAME_W, round(art.height * FRAME_W / art.width)), Image.LANCZOS)
    if art.height > FRAME_H:
        art = art.resize((round(art.width * FRAME_H / art.height), FRAME_H), Image.LANCZOS)

    frame = Image.new('RGBA', (FRAME_W, FRAME_H), (0, 0, 0, 0))
    frame.paste(art, ((FRAME_W - art.width) // 2, FRAME_H - art.height), art)
    return frame


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit('Usage: cutout.py <image> <skin-id>')

    source, skin_id = sys.argv[1], sys.argv[2]
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

    src = Image.open(source).convert('RGB')
    art = cut_out(src)

    opaque = sum(1 for a in art.getchannel('A').tobytes() if a > 128)
    share = opaque / (src.width * src.height)
    if share > 0.92:
        print(
            'WARNING: almost nothing was removed. The background is probably '
            'not light, or not plain. Check the cut-out before shipping it.',
        )
    elif share < 0.08:
        print(
            'WARNING: almost everything was removed. A dark subject on a dark '
            'background cannot be separated - regenerate the art on white.',
        )

    frame = reframe(art)

    art_path = os.path.join(root, 'tools', 'skinforge', 'art', f'{skin_id}.png')
    webp_path = os.path.join(root, 'public', 'skins', f'{skin_id}.webp')
    os.makedirs(os.path.dirname(art_path), exist_ok=True)
    os.makedirs(os.path.dirname(webp_path), exist_ok=True)
    frame.save(art_path)
    frame.save(webp_path, 'WEBP', quality=92, method=6)

    print(f'  source   {src.width}x{src.height}, {share:.0%} kept')
    print(f'  art      {art_path}')
    print(f'  atlas    {webp_path}  ({os.path.getsize(webp_path) // 1024} KB)')
    print('\n  art block for src/live/skins.ts:\n')
    print('    art: {')
    print(f"      src: '/skins/{skin_id}.webp',")
    print('      frames: 1,')
    print('      cols: 1,')
    print(f'      frameW: {FRAME_W},')
    print(f'      frameH: {FRAME_H},')
    print('      fps: 12,')
    print(f'      overhang: {round(FRAME_H / FRAME_W - 1, 4)},')
    print('      fill: 1.34,')
    print('    },')


main()
