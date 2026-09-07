# WWR backlog — from ChatGPT + Grok feedback, 2026-09-07

Owner: Matt. Implementer: Claude. Designer: ChatGPT (Grok alongside).
Status marks: [x] done and pushed · [~] in progress · [ ] not started · [?] blocked on a decision or design.
Each item is one or more commits; Claude updates this file in the same commit.

## P0 — Playtest blockers (QA fix list, docs/wwr-claude-fix-prompt-2026-09-07.md)

- [x] Rename Admiral Rider → General Rider in code
- [x] Attack / Task Force composer clipped under the chat bar; Rider hides while any modal is open
- [x] Discoverable Sign out (account menu on map + base; Settings)
- [x] Blank map after leaving base / Task Forces
- [x] Skip tour on every Rider step
- [x] Building "tap again to open" works on any second tap
- [x] Map nameplates keep the digits ("Lieu…482913")
- [x] cr / tk → Credits / Tokens
- [x] Blocked upgrade names the shortfall and links to the Command Center
- [x] Task Force slot picker (Squads screen) has the same chat-bar overlap — pad it like the composer
- [ ] Verify all of the above in the deployed game (Matt / testers)

## P1 — Progression audit (read-only, prerequisite for everything below)

- [x] `docs/progression/inventory/progression-inventory.md` + `.json`: every built upgradeable system, caps, cost at 1/10/20/30/40/50, power formulas, 1:1 check, hardcoded prices, not-built list, missing-info list, files that must change
- [x] Hand the inventory to ChatGPT for the level 1–50 balance matrix (sent; Combat Systems decision came back)
- [ ] Load ChatGPT's building 11–50 numbers into `shared/buildings.ts` when they arrive (registry follows automatically) (per-level cost, cumulative cost, time, prerequisite, power gain, cumulative power)

## P2 — Progression framework (build, in dependency order; needs Matt's approval of the plan first)

1. [x] Central progression registry in `shared/progression.ts` (24 tracks × levels 1–50, validated; buildings flagged placeholder from 11) — one table of level 1–50 cost / time / power / effects / prerequisites per track; every resolver, screen and quote reads from it; validation that every visible track has levels 1–50 with no gaps
2. [x] Existing values feed the registry unchanged (registry is built from the live curves; tests pin registry = resolver prices)
3. [ ] Buildings 1–50: real cost/time curves for levels 11–50 (today's are placeholder extrapolations) — [?] numbers from ChatGPT's matrix
4. [ ] Assets: every chassis visibly progresses Service Rank 1–50; four package lanes resolve next level / cost / effect / duration / prerequisite from the server; Trade Post Package Component Selector stays a wrapper
5. [x] Player power breakdown screen (every contributing source) + battle report naming every modifier used (Combat Systems lines)
6. [x] Dev-only progression test account `qa-progression-max` (worker/devProgression.ts, DevTools screen, test realm only) on the test realm: gated by `ALLOW_DEV_PROGRESSION_SEEDS`, reset / set-all-to-10-20-30-40-50 / max-one / grant currency / clear limits / seed all liveries; transactional, audited, unreachable from production
7. [x] Combat Systems per Task Force (decision 2026-09-07): three 1–50 lanes, ceil(50×1.10^(L−2)), resolver + repair effects, battle-report lines, Task Force card panel
8. [ ] Liveries: per-asset ownership, eligibility, equip/unequip, visual reference, itemised modifiers, battle-report source line; starter liveries grant zero power — [?] blocked on ChatGPT's livery design
9. [ ] Trade Post: shelves read from the registry; every card shows Token and Credit cost 1:1, remaining limit, reset time, result, eligible target; no unbuilt offers
10. [ ] Screens: building upgrade detail, Service Rank detail to 50, four package lanes, three Combat Systems, livery inventory, Trade Post shelves, power breakdown, dev tools
11. [~] Automated tests (10 registry/Combat Systems tests in tools/tests/progression.test.ts; still owed: server-side idempotency/timers at 1/10/20/30/40/50, migration safety, dev-tools-unreachable-on-live): every track has exactly 1–50; Token = Credit cost; cumulative power = sum of effects; quote/UI/payment/battle use one value; prerequisites, timers, limits, idempotency at 1/10/20/30/40/50; no level > 50; seed tools unreachable outside the test realm; livery effects in reports; migrations safe
12. [ ] Test-realm screenshots at levels 1/10/20/30/40/50 for each surface, and access instructions for `qa-progression-max`

## P2b — Season 1 live operations (approved order; docs/SEASON-1-LIVE-OPS-v1.md + decisions 2026-09-07)

- [x] Damage / repair
- [x] Season skeleton: shared/season1Ops.ts (windows, phase, rewards), event_reward_grants, Events tab, Rewards history
- [x] Daily Operations: six lanes, 4-of-6 Cache, neutral contract for solo Cooperation
- [x] Daily map exercises: five NPC target types spawned per player per day (signal_relay, abandoned_convoy, fuel_silo, factory_probe, disabled_mech_patrol) — provisional reward amounts in shared/exercises.ts
- [ ] Arena phase A (weeks 1–4): benchmark squad, three attempts a day, daily/weekly leaderboards, Sunday→Monday settlement
- [ ] Dominion Warfront: Assault / Operations / Support metrics, caps, alliance score, treasury
- [ ] Arena phase B (weeks 5–10): head-to-head ladder
- [ ] Small alliance operations (convoy_escort, relay_triangulation, factory_sabotage)
- [ ] Weekly settlement job, "Calculating rewards" state
- [ ] Replace week-1 reward numbers with ChatGPT's finalized tables when docs/SEASON-1-EVENTS-AND-ALLIANCE-v1.md lands (constants in shared/season1Ops.ts)

## P3 — Known follow-ups not in any prompt

- [~] Season 1 events, daily/weekly loop, Command Credit income and the alliance layer — brief sent to ChatGPT (docs/CHATGPT-SEASON-1-EVENTS-AND-ALLIANCE-BRIEF.md); implement from docs/SEASON-1-EVENTS-AND-ALLIANCE-v1.md when it lands

- [x] Package strip refunds only the Credit-paid share; Tokens never come back — Matt's final ruling, overriding ChatGPT's original-currency proposal; Tokens spent are never refunded (ruling 2026-09-07, closes the Token→Credit conversion found by the inventory)

- [ ] Command Credit earning design — [?] ChatGPT (prompt sent 2026-09-07)
- [ ] Asset name list (near-miss fictional names, "Abraham") — [?] ChatGPT
- [ ] `docs/ONBOARDING-SHIELDS-CONSTRUCTION-v1.md` still says Admiral Rider — designer doc, ChatGPT's next revision
- [ ] `ALL_SKINS_UNLOCKED` back to false before the game opens to strangers (CLAUDE.md)
