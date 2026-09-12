# Skin atlases go here

A finished atlas dropped in this folder is served at `/skins/<name>.webp`.

To make the game use it, add an `art` block to that skin in
`src/live/skins.ts`:

```ts
art: {
  src: '/skins/signature_one.webp',
  frames: 24,   // 1 for a single still
  cols: 6,
  frameW: 512,
  frameH: 640,
  fps: 12,
  overhang: 0.25,   // frameH / frameW - 1
},
```

`overhang` must match the frame proportions or the art will be squashed:
512 × 640 is 0.25, 512 × 768 is 0.5.

The skin keeps its drawn recipe as the fallback, so the map stays complete
while the atlas is loading and forever for skins that never get art.

**Do not declare an `art` block pointing at a file that is not here.** A
missing atlas logs a warning on every player's console for as long as it is
wrong.

The full specification to hand an artist is `docs/SKIN-ART-SPEC.md`.
