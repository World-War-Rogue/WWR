"""
Turns a delivered asset hero PNG into the game's stage file.

    python3 tools/assetart/cutout.py <hero.png> <asset-id> <rank>

Writes public/assets/<asset-id>/r<rank>.webp (640x640, transparent, subject
centred with an even margin) - then list the stage in shared/assetVisuals.ts.

Background removal is a flood fill inward from the frame edge against the
frame's own border colour, so the pale studio background AND the soft
contact shadow under a vehicle go, while a white launcher panel enclosed by
the vehicle's outline stays. The threshold is a Manhattan RGB distance from
the border key; 120 handles the delivered sets (pale ground, soft shadow).
Check the result on a coloured background before shipping - a dark subject on
a dark background cannot be separated and must be regenerated.
"""
import os
import sys
from collections import deque

from PIL import Image, ImageFilter

SIZE = 640
MARGIN = 0.04
THRESHOLD = 120


def border_key(im):
    w, h = im.size
    px = im.load()
    pts = []
    for x in range(0, w, 16):
        pts.append(px[x, 0])
        pts.append(px[x, h - 1])
    for y in range(0, h, 16):
        pts.append(px[0, y])
        pts.append(px[w - 1, y])
    n = len(pts)
    return tuple(sum(p[i] for p in pts) // n for i in range(3))


def cut(src, thr=THRESHOLD):
    im = src.convert('RGB')
    w, h = im.size
    px = im.load()
    key = border_key(im)
    bg = bytearray(w * h)
    seen = bytearray(w * h)
    q = deque()

    def near(p):
        return abs(p[0] - key[0]) + abs(p[1] - key[1]) + abs(p[2] - key[2]) <= thr

    def visit(x, y):
        i = y * w + x
        if seen[i]:
            return
        seen[i] = 1
        if near(px[x, y]):
            bg[i] = 1
            q.append((x, y))

    for x in range(w):
        visit(x, 0)
        visit(x, h - 1)
    for y in range(h):
        visit(0, y)
        visit(w - 1, y)
    while q:
        x, y = q.popleft()
        if x > 0:
            visit(x - 1, y)
        if x < w - 1:
            visit(x + 1, y)
        if y > 0:
            visit(x, y - 1)
        if y < h - 1:
            visit(x, y + 1)
    alpha = Image.frombytes('L', (w, h), bytes(0 if f else 255 for f in bg))
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.2)).point(
        lambda v: 0 if v < 90 else (255 if v > 170 else int((v - 90) * 255 / 80)),
    )
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out, key


def frame(art):
    a = art.crop(art.getbbox())
    inner = int(SIZE * (1 - 2 * MARGIN))
    s = min(inner / a.width, inner / a.height)
    a = a.resize((max(1, round(a.width * s)), max(1, round(a.height * s))), Image.LANCZOS)
    f = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    f.paste(a, ((SIZE - a.width) // 2, (SIZE - a.height) // 2), a)
    return f


def main():
    if len(sys.argv) != 4:
        raise SystemExit('Usage: cutout.py <hero.png> <asset-id> <rank>')
    source, asset_id, rank = sys.argv[1], sys.argv[2], int(sys.argv[3])
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    dst = os.path.join(root, 'public', 'assets', asset_id, f'r{rank:02d}.webp')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(source)
    art, key = cut(im)
    keep = sum(1 for v in art.getchannel('A').tobytes() if v > 128) / (im.width * im.height)
    if keep > 0.92 or keep < 0.08:
        print('WARNING: the cut-out kept %.0f%% of the frame - check it before shipping.' % (keep * 100))
    frame(art).save(dst, 'WEBP', quality=90, method=6)
    print(f'{dst}  key {key}  kept {keep:.0%}  ({os.path.getsize(dst) // 1024} KB)')


if __name__ == '__main__':
    main()
