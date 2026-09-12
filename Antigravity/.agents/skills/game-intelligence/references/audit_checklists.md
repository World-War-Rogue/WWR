# A.E.G.I.S. Game Intelligence Audit Checklists

## 1. Game Design Checklist
- [ ] Are all unit roles distinct with defined tactical strengths and vulnerabilities?
- [ ] Does the Rock-Paper-Scissors cycle provide at least 25% tactical advantage to counters?
- [ ] Is baseline Time-to-Kill within the 3.0s - 25.0s window?
- [ ] Are resource generation rates balanced against squad deployment and base maintenance costs?
- [ ] Are crisis swarms properly scaled so they challenge high-tier players without soft-locking beginners?

## 2. UI & UX Checklist
- [ ] Do all critical operational views maintain under 600 lines of code?
- [ ] Does any individual view contain > 28 interactive controls without sub-tab division?
- [ ] Are modal stacks limited to a maximum depth of 2?
- [ ] Are tactical military color tokens (phosphor green #22c55e, amber #f59e0b, dark slate #0f172a) applied consistently?
- [ ] Are all high-frequency data tables memoized to avoid stuttering?

## 3. Upgrades & Progression Checklist
- [ ] Are building upgrades structured without sharp diminishing returns or economic traps?
- [ ] Is the power leap between tech eras controlled (< 2.0x immediately upon era unlock)?
- [ ] Are pilot skills and squad doctrines synergized without infinite stacking loops?
- [ ] Does the player always have a viable counter available at every progression level?

## 4. Computing & Performance Checklist
- [ ] Is total frame time kept below 16.66ms under 100 active units and 150 projectiles?
- [ ] Are projectile collision checks using spatial partitioning instead of nested brute-force loops?
- [ ] Are timers (`setInterval`, `requestAnimationFrame`) and event listeners cleanly torn down in `useEffect` cleanup handlers?
- [ ] Are array operations (`.filter`, `.map`, `.sort`) inside React render paths memoized with `useMemo`?
