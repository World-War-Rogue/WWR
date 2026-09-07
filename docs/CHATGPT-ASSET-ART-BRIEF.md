# Brief for ChatGPT — finish the Season 1 asset stage art

Written by Claude for Matt on 2026-09-07. Paste the block below into ChatGPT.

---

You are the art director for World War Rogue (WWR). Finish the Service Rank stage art for every remaining Season 1 asset, one asset at a time, in unlock order. Claude wires each set into the game as it lands; Matt approves each asset before the next starts.

WHAT EXISTS — match it exactly:
- The style is LOCKED: chunky, glossy, toy-like cartoon military hardware. Bold olive / tan / gunmetal colour blocks, oversized main weapon, big rounded wheels or fat rotor hubs, glossy status lights, clean edges, soft studio light, no grit. The six approved reference images are at C:\Users\mattr\Documents\Codex\<date>\outputs\assets\m1a2\style-ref\ (r01 plainest -> r50 bristling with slat armour and antennas), and eleven finished assets are in the repo under public/assets/<id>/r01.webp … r50.webp (m1a2, leclerc, f35a, rq4, m270a2, mi35m, akinci, k2, ch47f, f15ex, su57). Open a finished set for the same category before you start a new asset and match its camera, scale and lighting so every asset reads as one fleet.
- Six stages per asset, unlocked at Service Rank 1, 10, 20, 30, 40, 50. Each stage must be VERY visibly different from the last: weapons larger and more aggressive, armour thicker and stronger, more antennas / sensors / slat armour / stores, glossier lights. r01 is the plainest factory-fresh vehicle; r50 is bristling. Same chassis, same silhouette, same colour family throughout — a player must recognise the same vehicle growing, never a different one.
- Camera: front three-quarter hero, the same angle and elevation as the finished sets, vehicle centred, whole vehicle in frame with even margins. Aircraft and helicopters airborne (gear up, rotors as a soft disc); ground vehicles on a flat pale surface with a soft contact shadow only.
- Background: plain pale off-white, no scenery, no ground card, no frame, no UI. Claude cuts the subject out with an edge flood-fill, so nothing dark may touch the image edges and the vehicle must not sit on a dark or busy background.
- NO text, numbers, roundels, flags, national insignia, unit markings, brand names or real-world decals anywhere. Asset names in the game will be near-miss fictional names, so the art must not carry real ones.
- No humans. No weapon fire, smoke or damage. No 360° turnaround strips inside the hero image.

DELIVERY — per asset, one message:
1. Six hero images, square, at least 2048×2048 px, PNG: <id>-r01-hero.png, <id>-r10-hero.png, <id>-r20-hero.png, <id>-r30-hero.png, <id>-r40-hero.png, <id>-r50-hero.png.
2. Optionally one four-view turnaround sheet per stage (front ¾, side, rear ¾, top; 2048×1024, pale background) named <id>-r<rank>-turnaround.png — reference for the later 3D turntable, not shown in the game.
3. Save them to C:\Users\mattr\Documents\Codex\<today>\outputs\assets\<id>\ and append a line to asset-visuals-log.md there: id, date, stages delivered, anything Matt should check.
4. Show Matt the six side by side and wait for his approval before the next asset. If he asks for a change, redo only that stage.
Claude converts each hero to public/assets/<id>/rNN.webp (640×640, transparent) and lists the stages in shared/assetVisuals.ts; nothing else changes.

ORDER — by Season 1 unlock week (the season started Monday 7 September; week 3 unlocks on 21 September, so weeks 3 and 4 are urgent). Two assets are partial and need only r30, r40, r50. 49 assets, 288 images in all:

| Unlock week | id | Chassis | Name | Category | Needed |
|---|---|---|---|---|---|
| 2 | `phl191` | PHL 191 | PHL 191 | artillery | needs r30, r40, r50 only |
| 3 | `aw101` | AW101 | Merlin | rotary | all six stages |
| 3 | `f22` | F 22 | Raptor | fixed wing | all six stages |
| 3 | `k9` | K9 Thunder | K9 | artillery | all six stages |
| 3 | `merkava` | Merkava Mk.4 Barak | Merkava | armour | needs r30, r40, r50 only |
| 3 | `mq9a` | MQ 9A | Reaper | drone | all six stages |
| 3 | `pzh2000` | PzH 2000 | PzH 2000 | artillery | all six stages |
| 4 | `ch5` | CH 5 | Rainbow | drone | all six stages |
| 4 | `herontp` | Heron TP | Heron | drone | all six stages |
| 4 | `leopard2a7` | Leopard 2A7+ | Leopard | armour | all six stages |
| 4 | `smerch` | BM 30 | Smerch | artillery | all six stages |
| 4 | `tiger` | Tiger HAD | Tiger | rotary | all six stages |
| 4 | `typhoon` | Eurofighter Typhoon | Typhoon | fixed wing | all six stages |
| 5 | `ah64e` | AH 64E | Apache | rotary | all six stages |
| 5 | `ka52m` | Ka 52M | Alligator | rotary | all six stages |
| 5 | `strv122` | Stridsvagn 122 | Stridsvagn | armour | all six stages |
| 5 | `su34` | Su 34 | Fullback | fixed wing | all six stages |
| 5 | `tb2` | Bayraktar TB2 | TB2 | drone | all six stages |
| 5 | `tos1a` | TOS 1A | Solntsepyok | artillery | all six stages |
| 6 | `a10c` | A 10C | Thunderbolt II | fixed wing | all six stages |
| 6 | `ah1z` | AH 1Z | Viper | rotary | all six stages |
| 6 | `challenger3` | Challenger 3 | Challenger | armour | all six stages |
| 6 | `harop` | Harop | Harop | drone | all six stages |
| 6 | `himars` | M142 | HIMARS | artillery | all six stages |
| 6 | `type10` | Type 10 | Type 10 | armour | all six stages |
| 7 | `ariete` | Ariete AMV | Ariete | armour | all six stages |
| 7 | `fa18e` | F/A 18E | Super Hornet | fixed wing | all six stages |
| 7 | `k239` | K239 | Chunmoo | artillery | all six stages |
| 7 | `lancet3` | Lancet 3 | Lancet | drone | all six stages |
| 7 | `mi28nm` | Mi 28NM | Havoc | rotary | all six stages |
| 7 | `puls` | PULS | PULS | artillery | all six stages |
| 8 | `ac130j` | AC 130J | Ghostrider | fixed wing | all six stages |
| 8 | `mq1c` | MQ 1C | Gray Eagle | drone | all six stages |
| 8 | `rm70` | RM 70 Vampire | Vampire | artillery | all six stages |
| 8 | `switchblade` | Switchblade 600 | Switchblade | drone | all six stages |
| 8 | `t129` | T129 ATAK | ATAK | rotary | all six stages |
| 8 | `t90m` | T 90M Proryv | Proryv | armour | all six stages |
| 9 | `altay` | Altay | Altay | armour | all six stages |
| 9 | `astros` | Astros II MK6 | Astros | artillery | all six stages |
| 9 | `gripen` | JAS 39E | Gripen | fixed wing | all six stages |
| 9 | `rooivalk` | Rooivalk Mk1 | Rooivalk | rotary | all six stages |
| 9 | `uh60m` | UH 60M | Black Hawk | rotary | all six stages |
| 9 | `wingloong2` | Wing Loong II | Wing Loong | drone | all six stages |
| 10 | `archer` | Archer FH77 BW | Archer | artillery | all six stages |
| 10 | `kf21` | KF 21 | Boramae | fixed wing | all six stages |
| 10 | `orbiter4` | Orbiter 4 | Orbiter | drone | all six stages |
| 10 | `pt91` | PT 91 Twardy | Twardy | armour | all six stages |
| 10 | `rafale` | Rafale F4 | Rafale | fixed wing | all six stages |
| 10 | `z10me` | Z 10ME | Z 10 | rotary | all six stages |

Start with `phl191` and `merkava` (three stages each), then week 3 in the order listed. Naval is not in Season 1 and is not on this list.
