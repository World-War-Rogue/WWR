# Ambush — what is settled, and what is not

Decisions made by the owner on 2026-09-05 and 2026-09-06. **Nothing here is
built.** There is no ambush code, no table, no endpoint and no button; the only
occurrences of the word in the repo are in `src/components/` and `src/data/`,
which are dead pre-build mockup that `main.tsx` never renders.

This file exists because these decisions were made in conversation and would
otherwise be lost. The remaining design is out with the designer.

## Settled

**One initiator, up to four joiners.** A player starts an ambush against an
enemy base or a target; four other members of their alliance may join it.

**A three-minute join window.** Selecting Ambush starts a three-minute timer.

**The defender sees it assembling, and so does their alliance.** The window is
visible to the target and to every member of the target's alliance, so they can
reinforce during it if they choose. An ambush is a declared assault, not a
surprise one.

**Waves, in join order.** The initiator attacks first, whoever joined first
attacks second, and so on. This is not one merged force of up to thirty assets:
it is up to five sequential battles against a defender who carries damage
forward and does not recover between them.

## What that makes true, and what it costs

The initiator's role becomes expensive and specific: they fight the defender at
full strength and soften them for everyone behind. Joining early is meaningfully
different from joining late. Both are good.

Two consequences that need answering before this is built:

**The resolver cannot do waves.** `resolve()` in `shared/combat.ts` builds both
sides fresh at full strength every time. Carrying a defender's damage between
waves means the resolver has to accept starting damage as an input. That is the
same architectural change Field Orders already need — the caller assembling
combat inputs rather than the resolver looking them up — so it costs nothing
extra. But it does make waves the first place in this game where one battle's
outcome is another battle's input, and every edge case has to be answerable in
that order.

**Five waves against one defender is close to unloseable.** Five consecutive
five-round battles is twenty-five rounds against a force that never heals.
Against an unreinforced defender the outcome is not in doubt. The reinforcement
window is currently the ONLY counterweight, and it only works if the defender's
alliance is awake. Either that is the intent, or a second brake is needed.

## Still open, with the designer

- The balance brake, if there is to be one.
- What the initiator gets for going first, given they take an undamaged target.
- Whether waves three to five still march and still earn anything when the
  defender is destroyed in wave two.
- Departure and arrival: five squads leave five bases at different distances.
  Do they depart together and arrive in join order regardless, or march on their
  own times — in which case arrival order and join order can disagree and the
  wave sequence breaks.
- Whether reinforcements arriving between waves join the defence from the next
  wave onward.
- Per-player loss attribution. Each participant brought their own assets and
  damage must attribute back to its owner, never spread evenly.
- The reward split across five waves of unequal difficulty.
- Failure and edges: nobody joins; the initiator is beaten during the window; a
  joiner leaves the alliance mid-window; the target relocates; two ambushes on
  one target; an ambush on a target already defending someone else.
- What stops a permanent rolling ambush on one player.

## Related, and also unbuilt

The owner also specified, on 2026-09-05 and never planned since:

- **Relocations as a purchasable consumable** — an allowable number of relocates
  bought from the store, with a visible inventory inside the base view.
- **Leaderboards and ranking** — "tracked and ranked" appears in the medal
  economy brief and no document covers the surface it implies.
