# Claude prompt — fix World War Rogue QA UI/UX issues (2026-09-07)

Copy everything below the line into Claude (in the WWR repo).

---

You are working in the **World War Rogue** repo (`WORLD WAR ROGUE`): Vite + React client under `src/`, Cloudflare Worker under `worker/`, shared types, D1, etc. Production: `https://worldwarrogue.com`. Do **not** invent features; fix the issues below with minimal, production-safe changes. Prefer client UI/layout/state fixes unless a bug clearly requires worker changes.

## Context from live QA (closed web / PWA)

Playtested on production with five live **testbot** accounts (`CorsairTestA`, `SentinelTestA`, `VanguardTestA`, `HalberdTestA`, `RedoubtTestA`). Canvas-heavy map UI; Admiral Rider onboarding overlays; Attack → Task Force composer flow.

**Do not change (working as intended):**
- Testbot attack refusal on live: message like “Test accounts may not attack on this server.”
- Shield remaining-duration display and “cannot attack/raid while shielded” gating.
- Early-game “Add a Drone to deploy this Task Force” gate (treat as design unless you find it is an accidental soft-lock with no way to obtain a Drone).

## Fix these, in priority order

### P0 — High: Attack composer controls clipped at default zoom

**Symptom:** When opening Attack / Task Force composer, primary controls are clipped or hidden at the default map/UI zoom. Player must zoom out ~twice before controls are reliably usable.

**Likely areas:** Attack / Task Force overlay components under `src/components/`, map zoom/camera state, fixed positioning vs viewport, safe-area / bottom chrome (COMMS, Home, Reports), onboarding panel competing for space.

**Acceptance:**
- At default zoom on a typical 1280×800 desktop viewport, Attack + Task Force composer actions (select TF, cancel, deploy/disabled reason) are fully visible and clickable without requiring zoom changes.
- Onboarding callout (if present) must not permanently cover composer primary actions (see also P1 onboarding).
- No regression: composer still cancels cleanly; deploy still respects Drone / shield / testbot rules.

### P1 — Medium: No discoverable sign-out

**Symptom:** No Sign out in avatar / profile / settings UI. `/logout` works as a hidden route but players cannot find it.

**Acceptance:**
- Add a clear **Sign out** control in an obvious account surface (profile panel, avatar menu, or settings — match existing UI patterns).
- Sign out clears session and returns to the “Report for duty” sign-in screen.
- Do not leave orphaned cookies/sessions; reuse existing logout endpoint/route if one exists.

### P1 — Medium: Blank map after leaving base / Task Force screens

**Symptom:** After closing My Base / Task Forces (or similar), the world map sometimes renders blank until the player waits or presses **Home**.

**Likely areas:** Map canvas mount/unmount, WebGL/canvas resize, visibility/tab restore, camera/world redraw not triggered on panel close.

**Acceptance:**
- Closing base / TF / similar overlays always restores a painted map without requiring Home or a timed wait.
- Resize and rapid open/close do not strand a blank canvas.
- If you find a race, fix the race; don’t paper over with a long arbitrary delay.

### P1 — Medium: Onboarding overlays block modals / no skip

**Symptom:** Admiral Rider callouts remain above modals and obscure controls. No obvious skip for returning players. X sometimes doesn’t clear the tutorial sequence cleanly.

**Acceptance:**
- Onboarding never sits above interactive modals/composers in a way that blocks primary actions (z-index / pause tutorial while modal open).
- Returning players (or accounts that already completed tutorial) should not be forced through the full sequence every login — persist completion; offer Skip/Dismiss that actually ends the tour.
- First-time path can stay: welcome → Home/own base → enemy base → Reports → Attack → Task Force.

### P2 — Low: Building open requires second click

**Symptom:** UI says “Tap again to open” but interaction is inconsistent; some buildings need a double-click / second click that isn’t obvious.

**Acceptance:**
- Single clear interaction model: either one click opens, or the “tap again” affordance is unmistakable and works every time on the selected building.
- No silent no-ops on the first confirmed selection.

### P2 — Low: Map callsigns truncate to “Lieuten…”

**Symptom:** Many map labels truncate so commanders are indistinguishable; dossier still has full name/id.

**Acceptance:**
- Map labels remain readable for typical lieutenant-style names (prefer smarter truncation, smaller type, tooltip on hover/long-press, or show unique suffix/id).
- Don’t blow up label density into unreadable overlap; pick the least-bad approach consistent with current art direction.

### P2 — Low: `cr` / `tk` have no legend

**Symptom:** Wallet/top bar shows `cr` and `tk` with no explanation.

**Acceptance:**
- First-run or always-visible plain labels/tooltips (e.g. Credits / Tokens) without cluttering the HUD. Prefer i18n-friendly strings under `src/i18n/` if that’s the pattern.

### P2 — Low: Upgrade prerequisites are a dead end

**Symptom:** Asset upgrade UI shows prerequisites but no link/path to satisfy them (e.g. need CC level / resources with no navigation).

**Acceptance:**
- From a failed/locked upgrade state, player can navigate to the blocking requirement (building, depot, rank gate) or see an actionable sentence that names exactly what to do next (mirror the clarity of API copy like “Need 749 more Alloy. Produce it at Materials Recovery Yard or buy it at the Depot.”).

## Out of scope for this pass (note only)

- Password reset for RookieFox / TrenchRat / BlitzHawk / SupplySarge / GhostOps human QA accounts.
- Changing live testbot attack policy.
- Full combat deploy E2E on production (testbots are refused there by design).
- Noisy API harness loop trying to level CC without Alloy (separate balance/bot-script issue unless you touch bot logic).

## How to work

1. Locate the relevant React components / map render path; skim before editing.
2. Implement P0 first, then P1s, then P2s.
3. Keep diffs focused; no drive-by refactors.
4. Manually verify on desktop viewport (~1280×800) and a narrower width if layout is responsive.
5. Summarize: files changed, what fixed, what you verified, any follow-ups.

Repo layout hints: `src/App.tsx`, `src/components/`, `src/live/`, `src/net/`, `worker/`, `tools/testbots/` (API harness — don’t commit secrets from `bots.json`).

Start by finding the Attack/Task Force composer and map zoom/overlay code, then ship P0.
