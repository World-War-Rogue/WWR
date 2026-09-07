# Claude follow-up — remaining WWR QA misses (2026-09-07)

Copy everything below the line into Claude (in the WWR repo).

---

You are in the **World War Rogue** repo. A prior fix pass landed most UI QA items on the test realm (`https://wwr-test.shy-mouse-f4e2.workers.dev`). **Do not reopen fixed work.** Only ship the three misses below (plus one optional nit).

## Already verified PASS — leave alone

- Skip tour on Rider bubble (persists after navigation)
- Attack → Task Force composer fully visible at normal/default zoom
- Second tap opens a selected building
- Wallet shows full Credits / Tokens (or Command Credits) labels
- Returning from My base paints the map immediately
- Live attacks work when shields are down
- Alloy shortfall copy, Trade Post empty-when-packages-equal-rank, and 0 Credits with no Credit income are **design** — do not “fix”

## Fix these three

### 1) Account menu missing on Task Forces (FAIL)

**Expected:** The round portrait button top-right opens an account menu with **Sign out** and **Settings** on **every** screen (map, My base, Task Forces, Reports, etc.).

**Actual:** Menu works on map and My base; **no portrait / account menu on Task Forces**.

**Acceptance:** Same portrait control + Sign out + Settings visible and usable while the Task Forces overlay/screen is open (and ideally on Reports too). Reuse the existing account-menu component; don’t fork a second menu.

### 2) Map nameplates lack numeric ID suffix (FAIL)

**Expected:** Truncated nameplates read like **`Lieu…482913`** (name stub + numeric id suffix) so labels stay unique.

**Actual:** Forms like `Senti...stA`, `Harri...stA`, `Cors...stA` — ellipsis into the callsign tail, **no numeric ID**.

**Acceptance:** Nameplates for other commanders use a stable unique suffix (player id / plot / numeric fragment as designed). Prefer `Name…######` over chopping only alphabetic tails. Don’t explode label overlap; keep density sane.

### 3) Blocked upgrade missing “Go to Command Center” (PARTIAL)

**Expected:** A blocked upgrade shows the **exact shortfall** *and* a **“Go to Command Center”** button.

**Actual:** Exact shortfall text works (e.g. “Need 425 more Alloy”) and upgrade CTA is disabled, but **no “Go to Command Center”** button.

**Acceptance:** When the blocker is Command Center level (or CC-gated), show an actionable **Go to Command Center** control that navigates to / focuses the CC. Keep the exact shortfall sentence. If the blocker is purely Alloy/resources (not CC), either still offer Go to CC when CC is on the path, or offer the correct destination (e.g. Materials Recovery Yard / Depot) — but the verified gap was the missing **Go to Command Center** button specifically; implement that for CC-gated / CC-related blocks at minimum.

## Optional nit (if cheap)

- First open of **Reports** briefly rendered black until reload. If there’s an obvious canvas/mount race like the old blank-map bug, fix it; don’t boil the ocean.

## How to work

1. Minimal diffs; match existing UI patterns / i18n.
2. Verify on test realm mentally against the acceptance lines above.
3. Summarize files changed + how to re-test each of the three.

Start with (1) Task Forces account menu chrome, then (2) nameplate formatter, then (3) upgrade CTA.
