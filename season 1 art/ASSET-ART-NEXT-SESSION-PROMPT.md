# World War Rogue — asset-art restart prompt

Use this prompt at the beginning of the next session.

---

I need to restart World War Rogue asset art. Do **not** continue or reuse the current Armour sheets as final art. They were useful exploration, but the tank designs are too similar, too generic, and not cartoonish enough.

## Goal

Create original, premium 3D mobile-game assets for World War Rogue. Each asset must be a character in its own right: recognizable at a glance, visually different from other assets in its category, and increasingly aggressive across six rank appearances.

The visual direction is **polished military cartoon**, not toy-like and not photorealistic:

- Keep believable military functionality and a detailed, readable silhouette.
- Use bold proportions, smooth simplified materials, cinematic lighting, chunky readable weapons, armor, cockpit glass, sensors, and equipment.
- Use clean color blocking, deliberate accent colors, and strong shapes. Do not rely on grime, camouflage, tiny surface detail, or real-world accuracy to make an asset interesting.
- The reference screenshots previously supplied are only a lesson in polish, progressive upgrade readability, and high-end cartoon rendering. Do not copy their helicopters, parts, angle, colors, UI, or designs.
- No brands, logos, flags, text, numbers, user interface, people, watermarks, hangars, or battle scenes.

## Critical correction: distinct character before progression

Every asset needs all four of these before it is rendered:

1. **Silhouette hook** — a big form visible at map scale: e.g. a low spearhead hull, fortress prow, broad shoulder armor, forward radar fork, tall rocket spine, asymmetric sensor fin, or an unusual track/wing/rotor layout. Do not make every asset a standard rectangular hull with a central cannon.
2. **Combat personality** — its role is visible: a breach asset makes its primary weapon and forward protection prominent; a screen asset is lighter, quicker, sensor-led; overwatch makes its long weapon/launcher dominant; recon makes sensing equipment dominant; lift makes the transport body dominant.
3. **Color/material identity** — each asset gets a restrained but distinct palette of two main military colors plus one controlled technical accent. Do not make every asset charcoal with blue lights and bronze trim.
4. **Upgrade language** — the six stages add equipment that logically reinforces its personality. A fast screen asset should gain sensors, cooling, active defenses and nimble propulsion—not slowly turn into the same fortress tank as every other asset.

## Six required stages

Produce exactly six renders for every asset. They represent, in order:

1. Rank 1–9
2. Rank 10–19
3. Rank 20–29
4. Rank 30–39
5. Rank 40–49
6. Rank 50

The player must instantly recognize that all six are the same machine. Visual growth should be meaningful at each stage:

- **1–9:** clean core silhouette, primary role readable.
- **10–19:** first functional reinforcement.
- **20–29:** larger role-defining weapon, armor, rotor/wing, sensor, or propulsion change.
- **30–39:** elite operating systems, defense hardware, and clear aggression increase.
- **40–49:** advanced structural refit that makes the vehicle visibly more capable without changing its identity.
- **50:** heroic final version with signature equipment, strongest visual focal point, and an unforgettable silhouette.

Do not merely add more antennae, boxes, missile pods, and glowing lights at every stage. Make each stage change one major readable system.

## Delivery format

- Work category-by-category. Complete **Armour** before Rotary, Fixed Wing, Artillery, and Drone. Naval is out of scope.
- For the review pass, make **one clean 3-column by 2-row progression sheet per asset**, ordered top-left to bottom-right by rank band. Each cell must show the same asset at the same camera angle and scale, fully visible, with broad gutters and no text or borders.
- Use a slightly elevated front three-quarter 3D display camera, but vary the vehicle designs—not the camera.
- Use a seamless pale neutral studio background and a small soft grounding shadow only. No environmental scene.
- After an asset sheet is approved, split or regenerate the six individual game-ready rank renders. Do not make the individual-file pass before the sheet is approved.
- Save every review sheet in `output/asset-art/<category>/` using a descriptive asset name. Do not overwrite a previous image; preserve rejected work separately.

## Armour roster and identity starting points

These are real-world-name placeholders used by the game. The renders must be original World War Rogue interpretations, not replicas.

| Asset | Role | Required distinctive character |
|---|---|---|
| Abrams | Breach | Hard-hitting assault leader: massive gun mantle, shark-like forward glacis, assertive wide stance. |
| Leopard | Breach | Precision armored specialist: clean angular protection wedges, refined repair/modular cues, disciplined silhouette. |
| Challenger | Breach | Stubborn fortress: extremely broad defensive shoulders, deep armor apron, short brutal heavy profile. |
| Leclerc | Screen | Fast precision runner: low lean hull, visible advanced suspension, narrow racer-like turret, selective armor. |
| Black Panther | Breach | High-tech predator: crisp faceted turret, tracking/sensor architecture, a strong cat-like forward profile. |
| Type 10 | Screen | Agile terrain dancer: compact body, adaptive suspension, light ceramic geometry, speed visually obvious. |
| Merkava | Breach | Crew guardian: unusual front-protection mass, shielded crew-capsule feeling, rugged defensive geometry. |
| Proryv | Breach | Rugged mass-production bruiser: practical heavy armor, blunt profile, many accessible field-fit components. |
| Altay | Breach | Young modern bruiser: bold geometric plates, powerful but slightly simpler, muscular middleweight presence. |
| Stridsvagn | Breach | Northern survivor: wedge defense, broad snow-plow-like front armor, cold palette and hardened silhouette. |
| Ariete | Screen | Road-fast cavalry: sleek long chassis, lighter turret, visible mobility hardware and responsive look. |
| Twardy | Screen | Rebuilt veteran: clearly upgraded older core, oversized modern optics/armor grafts, scrappy agile profile. |

## What to do first tomorrow

1. Before generating a full category, propose **three original visual identity directions for each of the first three Armour assets**: Abrams, Leopard, Challenger. Use concise silhouette/palette/specialization descriptions, not art yet.
2. Wait for selection or adjustment if possible. If no response is needed, choose the most distinct direction for each.
3. Generate only **three Armour sheets**: Abrams, Leopard, Challenger. Inspect them against this checklist:
   - Does each read as a different character in silhouette alone?
   - Could a player identify its role before reading its name?
   - Is the style polished and cartoonish without becoming toy-like?
   - Are all six stages clearly the same asset and visibly escalating?
   - Are there exactly six cells, no text, no logos, and no copied reference designs?
4. Show the three sheets for art-direction approval before rendering the rest of Armour.

## Stop conditions

Do not claim the art is implemented in the game or verified. Claude will decide how approved assets are integrated. If a sheet lacks character or repeats the same generic tank concept, reject it and remake it before moving on.

---

This is an art-direction prompt for ChatGPT/image generation, not an implementation prompt for Claude.
