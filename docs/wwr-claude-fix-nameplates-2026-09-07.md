# Claude prompt — map nameplate numeric suffix only (2026-09-07)

Copy everything below the line into Claude (in the WWR repo).

---

You are in the **World War Rogue** repo. **Only fix map nameplate truncation.** Do not touch account menu, Skip tour, Attack composer, upgrades, wallet labels, map paint, or anything else — those already passed QA on the test realm.

## Bug

**Expected:** Truncated map nameplates read like **`Lieu…482913`** — a short name stub + ellipsis + a **stable numeric ID suffix** so nearby commanders stay distinguishable.

**Actual (retested on `https://wwr-test.shy-mouse-f4e2.workers.dev` after other fixes):** Labels still truncate into the callsign tail, e.g. `Senti...stA`, `Harri...stA`, `Cors...estA` / `...estA`. **No numeric ID** appears.

## Acceptance

- Other players’ map nameplates use a unique numeric suffix (player id fragment, plot id, or whatever stable numeric the design already intends) in a form equivalent to **`Name…######`**.
- Truncation must not eat only alphabetic tails of the callsign while dropping the id.
- Own base label can stay full callsign if that’s current behavior; focus on **other commanders**.
- Keep label density readable — no huge full names overlapping; don’t break zoom/pan performance.
- Match existing art/UI/i18n patterns under `src/`.

## How to find it

Search the client for map label / nameplate / callsign truncation (likely canvas text draw or a small formatter near map rendering in `src/components/`, `src/live/`, or utils). Fix the formatter or the arguments passed into it so the numeric suffix is always reserved in the visible string.

## Out of scope

- Live vs test attack policy, shields, Alloy/Trade Post/Credits design items
- Reworking dossier/profile names (dossier already shows full identity)

## Done when

1. Minimal diff that changes nameplate formatting only.
2. Brief note: files touched + how to verify on the test-realm map (zoom out, read several NPC/player labels — should show numeric tails, not `...stA`).

Start by locating the nameplate truncation helper and what ID fields are available on map entities.
