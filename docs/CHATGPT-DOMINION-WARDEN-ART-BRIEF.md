# ChatGPT brief: the Dominion Warden (Arena enemy art)

Paste everything below the line to ChatGPT.

---

You are producing the finished art for the **Dominion Warden**, the enemy war machine every player fights in the World War Rogue Iron Dominion Arena (Season 1, weeks 1–4). The game currently shows a temporary shape-built placeholder labelled "temp art"; your images replace it. Nothing else in the game changes.

## What the Warden is

- One fictional, chunky, toy-like armored war machine. Not a real vehicle, not a robot with a face, not a mech with human proportions. Think a heavy tracked/legged fortress-crawler: wide low hull, big shoulders, a lot of plating, glossy premium surfaces.
- It belongs to the **Iron Dominion**: dark gunmetal iron with deep red accents and warm amber lamps. No flags, insignia, text, numbers or logos anywhere on it.
- Same art style as the finished WWR asset sets you have already produced (the M1A2, Leclerc, F-35A, RQ-4, M270A2, Mi-35M, PHL-191 heroes): premium, chunky, glossy, saturated, clean edges, soft studio light, pale studio ground with a soft contact shadow only. No scenery, no smoke, no fire, no people, no gore, no damage textures, no horror.

## The six hardpoints (must be visible and distinct)

The game maps six enemy systems onto the machine and knocks them out one at a time during a battle, so each must read as its own part from the front three-quarter view:

1. **Main gun turret** — a big central turret with one heavy barrel.
2. **Rocket battery** — a boxy multi-tube rocket pod on the left shoulder.
3. **Missile rack** — a rail of three or four long missiles on the right shoulder.
4. **Autocannon pod (left)** — a twin-barrel pod low on the front-left hull.
5. **Autocannon pod (right)** — the mirror of 4 on the front-right.
6. **Sensor mast** — a tall mast with a glowing red sensor head rising from the rear of the hull.

## Deliverables

All PNG, square, at least 2048×2048, front three-quarter hero, whole machine in frame with even margins, pale studio ground, soft contact shadow only, no text.

1. `warden-hero.png` — the machine whole, every hardpoint intact.
2. `warden-hero-damaged.png` — the same framing with every hardpoint knocked out: darkened, cracked plating, a few cold sparks, small dark scorch marks. No fire, no smoke, no gore. The hull itself stays whole.
3. Six **hardpoint cutouts**, transparent PNG, each the isolated hardpoint at the same angle and scale as the hero so it can be overlaid exactly in place: `warden-hp-turret.png`, `warden-hp-rockets.png`, `warden-hp-missiles.png`, `warden-hp-autocannon-left.png`, `warden-hp-autocannon-right.png`, `warden-hp-mast.png`. Provide each in an intact and a knocked-out version (`-out` suffix), 12 files.
4. `warden-review.png` — one strip with the hero, the damaged hero and the six intact cutouts side by side, for a quick check.
5. `warden-anchors.json` — for each hardpoint, the pixel centre of its muzzle/launcher (where a shot leaves from) and the pixel centre of its body (where a hit lands), in hero-image pixel coordinates:
   `{"turret": {"muzzle": [x, y], "body": [x, y]}, "rockets": {...}, "missiles": {...}, "autocannonLeft": {...}, "autocannonRight": {...}, "mast": {...}}`

Claude converts the hero to `public/assets/warden/hero.webp` and the cutouts to `public/assets/warden/hp-<name>.webp` at 1024 wide, transparent, and reads the anchors into the battle view. Keep the same camera and scale across every file or the overlays will not line up.

## Do not

- No PvP imagery, no player insignia, no real-world military markings.
- No humans, no faces, no eyes on the machine, no skulls.
- No weapon fire, muzzle flash, tracers or explosions in the art — the game draws those.
- No 360° turnaround strips inside a hero image.
