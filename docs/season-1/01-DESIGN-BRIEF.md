\# Season 1 Design Brief — Mech Uprising: Iron Dominion



\## Purpose and boundaries



Season 1 is a ten-week, single-server alliance campaign set in the game’s existing pale dry basin. The Iron Dominion is not a new world or a replacement for the existing military game; it is a hostile automated-industrial occupation layered onto the current map.



The season begins as a safe, learnable PvE loop and becomes alliance warfare only after players have had time to form squads, learn the map, and join an alliance. It must remain playable and meaningful with only two people online.



It has no cross-server competition, no naval content, no rarity system, no cosmetic power, and no reliance on chat coordination.



The season’s strategic objects are:



\- Outer Scraplands: neutral learning and PvE objectives.

\- Factory Ring: neutral, then contested, production sites.

\- Dominion Front: route control and high-stakes warfare.

\- Iron Dominion Core: the final capture-and-hold objective.



All permanent map, base, squad, and asset progression remains intact. The season adds temporary objectives, temporary strategic resources, and permanent prestige rewards.



\## Constraint impacts and deliberate choices



\- \*\*No background work:\*\* Convoys are fixed map contracts, not vehicles that continuously move. Factories do not generate a live hourly stream; their earned output is settled when a player interacts with the season.

\- \*\*Pure combat:\*\* Seasonal effects become recorded battle inputs. The battle resolver receives a frozen squad, a frozen objective defense, and a frozen seasonal modifier; it does not query the map, clock, or database.

\- \*\*Tiny population:\*\* The opening theatre uses a compact set of objectives. No objective requires a large group or synchronous attendance.

\- \*\*No raw roster-size victory:\*\* There is no season leaderboard based on total member count or endless individual grinding. Daily supply credit is capped, one alliance may pursue only one primary offensive objective per war window, and map control matters more than aggregate activity.

\- \*\*Pale dry basin:\*\* The season uses salt flats, rusted automated wrecks, relay towers, pale dust, cyan machine signals, and amber warnings. It does not introduce dark terrain or water.

\- \*\*Translations:\*\* All interface language is short, fixed, and localisable. Map objective names may remain English server data, but players do not need to understand free-text chat to participate.



\## 1. Season lifecycle and map theatre



\### What the player does



A player opens the world map and sees the active season, current week, unlocked region, current objective markers, and next war window. They can select an available objective to see its purpose, eligibility, rewards, and any required squad action.



The compact theatre contains:



\- Four Outer Scraplands objective markers.

\- Three Factory Ring markers.

\- Two Dominion Front route or hardpoint markers.

\- One Iron Dominion Core marker at the central salt-flat theatre.



These markers are strategic overlays. They do not consume claimable player-base plots or prevent normal movement.



\### Stored state and authority



The server owns one season record per world: identity, start and end instants, phase schedule, war-window schedule, and final status.



Each strategic objective has one record for its location, type, phase gate, current status, and current owner when ownership applies. An objective may have only one controlling alliance at a time; that uniqueness must be guaranteed at the database level.



Only the existing server-owner or administrator authority may configure a season before it begins. Players and alliance leaders cannot alter dates, phases, objective definitions, or war windows.



\### What is shown



The world map shows:



\- A small season status panel.

\- Locked and unlocked regions.

\- Objective markers with a simple purpose icon: patrol, salvage, convoy contract, factory, relay, route, or Core.

\- Current controller where relevant.

\- The next war window in the game’s named server time.



A player who ignores the season still sees normal bases, movement, alliances, and map play. Season markers remain visible but do not block those systems.



\### Edges and exploits



When a phase boundary passes, the next map or season read calculates the current phase from absolute time. Nothing must run at the boundary.



Two players reading the map at the same moment must see the same phase based on the same stored schedule. A client cannot select a future region or change the phase locally.



\### Working check



Set a test season at each phase boundary. A player opening the map before and after each boundary sees the correct regions and objective states without any background process having run.



\### Cost



This uses bounded seasonal map records per world and normal map-read queries. It uses no AI and no per-player scheduled work.



\## 2. Weeks 1–2: Boot Sequence onboarding



\### What the player does



For the first fourteen days, every player can repeatedly choose from the same four approachable operations in the Outer Scraplands:



\- Defeat a rogue mech patrol.

\- Recover salvage.

\- Escort a fixed convoy contract.

\- Activate a power node.

\- Complete a training siege against a neutral automated target.



The convoy is a marked route contract, not a moving world object. A player sends a squad to its fixed objective and resolves the escort when the mission arrives. The training siege is a risk-free seasonal encounter; it can be completed alone, while multiple alliance members contribute to an alliance training milestone if they participate.



\### Stored state and authority



The server records each player’s daily operation progress by season, player, logical season day, and operation type. A player can only receive a completion and reward once for each daily operation; that uniqueness must be enforced by the database.



The server determines mission eligibility, squad availability, PvE encounter composition, combat outcome, rewards, and contribution. The browser only presents available actions and returned results.



The shared seasonal catalogue defines operation names, phases, encounter types, reward categories, and fixed gameplay values used by both server and client.



\### What is shown



The world map and season panel state clearly:



\- “Protected onboarding” during Weeks 1–2.

\- The four available operation types.

\- Personal operation completion.

\- Alliance contribution progress.

\- A short explanation that enemy territory cannot change hands yet.



The alliance screen shows aggregate participation without requiring chat messages or coordination prose.



\### Edges and exploits



A double-tap or two devices attempting the same daily claim must result in one completed operation and one reward only.



If a player closes the game mid-mission, the mission remains in its stored state and settles on the next relevant read. No mission is lost because nobody was online at its arrival instant.



If the season ends before a mission can arrive, it cannot be launched. If it was already eligible to arrive before season end, its outcome is settled using its recorded arrival instant when the season is next read.



A player cannot repeat operations by changing device time, browser state, or language.



\### Working check



Create a new approved account during Week 2. It can see, complete, and claim each onboarding operation; it cannot capture a factory, route, or enemy territory. Repeating the same operation does not create a second reward.



\### Cost



Each completed operation is a bounded database write and one normal battle or mission resolution. No AI, chat translation, or scheduled process is used.



\## 3. New-player catch-up



\### What the player does



A player first joining during Weeks 1–2 receives a one-time Boot Sequence catch-up track. Their first three completed onboarding operations accelerate access to basic seasonal participation, such as initial blueprint progress and the training milestone.



The track lets a late player become useful quickly. It does not grant higher squad power, extra permanent assets, cosmetic power, or unlimited Alliance Supplies.



\### Stored state and authority



The server records whether a player has used the catch-up track for that season. It is tied to the player account’s first eligible onboarding participation, not alliance membership.



The server checks eligibility. Leaving and rejoining an alliance, changing devices, or creating a new application cannot reset the track.



\### What is shown



Eligible players see a small, plain catch-up progress indicator on the season panel. Ineligible players do not see a misleading locked reward; they simply use the normal daily operation track.



\### Edges and exploits



The catch-up track grants no extra alliance supply beyond the normal per-player contribution cap. It cannot be farmed through alternate accounts to accelerate an alliance’s strategic resource pool.



\### Working check



A late Week 2 account can complete the three catch-up operations and contribute to its alliance. The same account cannot restart the track by leaving and returning, and its alliance does not gain uncapped supplies.



\### Cost



One small seasonal participation record per eligible player. No AI or recurring processing.



\## 4. Alliance Supplies, factories, and supply links



\### What the player does



Players earn Alliance Supplies from capped daily participation, selected PvE objectives, factory claims, and alliance milestones. Alliance command uses those supplies to start seasonal projects, prepare a siege, or create temporary war assets.



Factories appear as neutral sites in Week 3. They become contestable in Week 4. Holding a factory grants a once-per-season-day supply claim and contributes to supply-link status.



A supply link exists when the same alliance controls the required connected factory and relay objectives. It is a strategic condition derived from current control, not an additional map that must tick.



\### Stored state and authority



Alliance Supplies are a stored season-only alliance balance. Any reward or spend is decided by the server.



Each factory has one current controller. The database must enforce one controller per factory objective. A factory’s daily output can only be claimed once per logical season day, regardless of how many alliance members press it.



Only existing alliance command roles with strategic authority may spend Alliance Supplies or choose the alliance’s active project. Ordinary members may earn supplies but cannot spend the shared balance.



\### What is shown



The map shows factory controller, availability, and whether a supply link is active. The alliance screen shows:



\- Alliance Supplies.

\- Active factory control.

\- Available supply claim.

\- Current seasonal project.

\- The next strategic choice command may make.



Players outside command can see the result and progress, but not spend buttons.



\### Edges and exploits



Two alliance members claiming the same factory output at once result in one credited claim only.



If factory control changes, any unclaimed output belongs to the controller that held the site for the relevant settled period. Factory output is not a continuous background stream; it is calculated and settled when an eligible claim or relevant map read occurs.



No factory can alter a player’s permanent base power or asset power. It only creates season-limited strategic options.



\### Working check



With two alliances, capture a factory in a valid window. Confirm that exactly one alliance is shown as controller, that one daily output claim succeeds, and that a second claim in the same season day does not add supplies.



\### Cost



A bounded set of factory and control records per world, plus claims made by players. No per-hour job and no bulk player updates.



\## 5. Scheduled territory warfare



\### What the player does



Beginning in Week 4, players can launch season assaults against eligible factories, routes, and later the Core. They select a squad, see travel time and the next available war window, and commit only if the action can resolve within that window.



Each alliance may choose one primary offensive objective per war window. This prevents a large alliance from spreading unlimited pressure across every site and gives a small alliance a realistic chance to contest one meaningful fight.



A defender does not need to be online. Objective defense uses the stored controller state, valid garrisons, and frozen seasonal modifiers.



\### Stored state and authority



The server stores each season assault’s launch alliance, target objective, squad snapshot, departure and arrival instants, valid war-window identifier, and frozen combat inputs.



A launch is accepted only when it can arrive before the relevant war window closes. The server rejects launches outside a window or too late to resolve.



When a map or objective is read, all due arrivals for that objective are settled in deterministic arrival order. Exact ties use a stable stored order. Combat remains a pure function of frozen inputs; the surrounding mission system decides only whether the result can change control.



\### What is shown



The map shows:



\- Current war-window state.

\- Next window when inactive.

\- Which objectives can be attacked.

\- The alliance’s selected primary offensive objective.

\- Incoming and outgoing seasonal assaults where existing map visibility rules permit.

\- A clear locked reason outside a window.



\### Edges and exploits



Two assaults arriving at the same objective cannot both create ownership. The objective has one controller, and due arrivals settle in deterministic order.



If a player quits or is removed from an alliance mid-flight, the mission retains its launch alliance and frozen squad snapshot. The player may not join another alliance until the season mission has resolved or returned, preventing alliance-swapping to change the side of an attack.



If an alliance no longer exists at resolution, its unresolved season missions return without changing control.



If the season ends, launches that cannot arrive before the recorded end instant are rejected. Eligible arrivals are settled according to their recorded arrival order before the season’s final state is determined.



\### Working check



With two accounts in opposing alliances:



\- An assault outside a war window is rejected.

\- An assault too late to arrive before window close is rejected.

\- A valid assault resolves from its frozen squad snapshot.

\- Two near-simultaneous assaults leave one objective owner, never two.

\- An alliance switch is blocked while a season assault is unresolved.



\### Cost



Normal mission and battle storage only. No polling loop, background scheduler, AI, or new chat requirement.



\## 6. Temporary seasonal war assets



\### What the player does



Alliance command spends Alliance Supplies and factory progress to create limited seasonal strategic assets:



\- \*\*Drone Swarm:\*\* reveals target defense information before an assault.

\- \*\*Shield Array:\*\* protects one selected friendly factory or hardpoint during one war window.

\- \*\*EMP Relay:\*\* applies a one-window defensive disruption to one selected enemy strategic objective.

\- \*\*Siege Titan:\*\* strengthens one selected alliance assault against a strategic objective.

\- \*\*Rail Cannon:\*\* grants one limited final-approach or Core assault advantage.



Unlock order:



\- Drone Swarm: Week 4.

\- Shield Array: Week 5.

\- EMP Relay and Siege Titan: Week 7.

\- Rail Cannon: Week 9.



The design requires a maximum of one active offensive asset and one active defensive asset per alliance per war window. This preserves meaningful choice and keeps small alliances viable.



\### Stored state and authority



War assets are season-only alliance inventory and activation records. They are not player cosmetics, permanent assets, rarity tiers, or stored player power.



Only alliance command may begin projects or activate an asset. The server validates unlock phase, available supplies, target eligibility, active-window limits, and one-use rules.



The battle receives any valid asset effect as a frozen named modifier. It does not inspect live map state after launch.



Initial numeric values must be chosen as shared balance data and simulated before launch. They must be explicit, modest, and applied only to the relevant seasonal encounter. They must not change permanent displayed squad power.



\### What is shown



The alliance screen shows each asset’s unlock week, current availability, cost, selected target, and whether it is committed for the next window.



The map shows concise icons for revealed target intelligence, active shield protection, disruption, and selected siege support. It must never rely on cosmetic appearance to hide a power effect.



\### Edges and exploits



Two command members activating the last asset charge at once result in one successful activation only.



An asset cannot be activated before its phase, outside its valid window, against an invalid objective, or after season end.



If a target changes ownership before an asset’s window begins, the asset returns unused when its purpose no longer makes sense; it must not silently damage the new friendly owner.



\### Working check



Attempt each asset before and after its unlock phase, with and without sufficient supplies, and from two command accounts at once. Only valid activations succeed; the resulting battle report records the active modifier; permanent squad power remains unchanged.



\### Cost



No AI and no recurring operation. Asset actions create bounded alliance-level records and ordinary battle inputs.



\## 7. Dominion Colossus — Week 8



\### What the player does



In Week 8, players can send squads against one fixed server-wide automated boss target: the Dominion Colossus. Each valid encounter contributes to the alliance’s event participation and to the boss’s remaining integrity.



A single player can participate. Two or more alliance members improve the alliance result, but no mechanic requires a large group or synchronized chat.



Rewards are based on clear participation thresholds and contribution bands, not last hit. The reward is a temporary strategic benefit for later warfare, not permanent power or a guaranteed season win.



\### Stored state and authority



The server stores the boss’s current integrity, event start and end instants, each player’s capped participation, and each alliance’s contribution.



The server resolves each attempt using frozen combat inputs. Boss integrity updates atomically so two simultaneous attempts cannot over-defeat it. Final-hit status gives no exclusive advantage.



At event end, the next event or season read settles the outcome from the recorded end instant. There is no background boss process.



\### What is shown



The map shows the Colossus marker, event time, remaining integrity, alliance participation tier, and available reward category. It does not expose a prose-heavy global coordination requirement.



\### Edges and exploits



A player has a capped number of score-bearing attempts. Replaying weak attacks indefinitely cannot farm contribution.



If the boss is defeated, later attempts are declined. If the event ends with integrity remaining, rewards still use participation thresholds; players are not punished because the tiny beta population did not finish the boss.



\### Working check



Run the event with one player, then with two players. Confirm that both can earn meaningful participation credit, the boss cannot be reduced below zero, a repeated capped attempt does not add score, and rewards remain temporary.



\### Cost



Bounded event and participation records. No AI, no chat translation, and no scheduled work.



\## 8. Core Breach and the finale



\### What the player does



In Week 9, alliances contest the final Dominion Front routes. Controlling routes improves practical access to the Core, but does not make the finale impossible for every other alliance.



In Week 10, the Iron Dominion Core opens. The final war window is a capture-and-hold fight. The alliance that holds the Core at the exact recorded end of that window is the season champion.



\### Stored state and authority



The Core is one unique strategic objective with one controller. All final-window assaults use the same deterministic arrival and settlement rules as other season assaults.



At or after the final deadline, the first relevant season read settles every eligible arrival with an arrival instant no later than the final deadline, in deterministic order, then reads Core ownership as of that deadline.



The server records the champion once. It cannot be recalculated by a later request, device clock, or map refresh.



\### What is shown



The map and alliance screen prominently show:



\- Core locked, approaching, or open status.

\- Final war-window start and end.

\- Current Core holder.

\- The player’s alliance route status.

\- Champion state once settled.



\### Edges and exploits



A flight that cannot arrive before the final deadline cannot launch. A flight eligible to arrive before that deadline is resolved based on recorded arrival time even if no player opened the map until later.



A final-window ownership tie uses deterministic mission ordering. There is never more than one Core holder.



\### Empty-finale trade-off



“Exactly one champion” conflicts with the closed-beta reality that no alliance may capture the Core at all.



The proposed integrity-preserving rule is: if no player alliance has ever captured the Core by the deadline, the Iron Dominion retains it and no human champion reward is issued.



If a champion must be named even when nobody captures the Core, a fallback ranking is required. That would weaken the stated capture-and-hold fantasy by allowing an alliance to win without holding the final objective. This is a product decision, not an implementation detail.



\### Working check



With two alliances, resolve attacks around the final deadline and confirm one recorded Core holder and one champion reward. Run a separate no-capture scenario and confirm that the chosen empty-finale policy is communicated correctly.



\### Cost



One Core-control record and normal final assault settlement. No background job or bulk finalization process.



\## 9. Rewards and season end



\### What the player does



Players earn:



\- Personal participation rewards for meaningful operations and event involvement.

\- Alliance rewards for factory, route, and event achievement.

\- Permanent prestige cosmetics or titles for the champion alliance.



The champion reward is cosmetic or status-only. It grants no combat, production, resource, or visibility advantage in a future season.



\### Stored state and authority



The server records earned season reward eligibility, participation thresholds, and the champion outcome.



When the season has ended, the next relevant read closes seasonal actions, resolves eligible in-flight actions, freezes the final outcome, and makes reward claims available. Rewards may be claimed by each player when they next enter the game; there is no need to write rewards to every account at the deadline.



Season-only territory, supplies, factories, event state, and war assets reset. Normal bases, squads, permanent assets, player progression, and owned cosmetics do not reset.



\### What is shown



At season end, players see a concise result panel:



\- Champion or no-champion outcome.

\- Their own participation reward eligibility.

\- Their alliance’s outcome.

\- A clear distinction between permanent rewards and reset seasonal state.



A player who ignored the season sees no loss of normal game progress.



\### Edges and exploits



A player cannot claim the same reward twice. An account that joins an alliance after the finale does not inherit that alliance’s champion reward.



A player who leaves before reward settlement receives only rewards tied to their own recorded participation, not later alliance-only rewards.



\### Working check



End a test season with participation from multiple accounts, including one who leaves an alliance before settlement. Confirm that normal progression remains, seasonal state becomes unavailable, claims are single-use, and champion prestige goes only to eligible members.



\### Cost



Reward claims are demand-driven. No AI, no mass notification job, and no bulk per-player write at the season deadline.



\## 10. Interface, communication, and accessibility



\### What the player does



The player can understand the season without entering chat:



\- The map tells them what is active.

\- The season panel tells them what to do next.

\- The alliance screen tells them what their group needs.

\- Battle and mission reports explain the result with fixed, short labels.



\### What is shown and where



\*\*World map\*\*



\- Season phase, countdown, unlocked regions, objectives, ownership, war-window status, and clear lock reasons.



\*\*Alliance screen\*\*



\- Alliance Supplies, active strategic project, factories, supply links, available war assets, and current primary offensive objective.



\*\*Battle and mission reports\*\*



\- Objective involved, valid seasonal modifier, result, control consequence, and earned contribution.



\*\*For players who ignore the feature\*\*



\- A compact season status remains visible, but no forced flow interrupts normal building, movement, profile, alliance, or chat use.



\### Translation and chat rules



Use fixed interface labels, short sentences, icons, and numeric timers. Do not use runtime-generated narrative, idiom, puns, or mechanics that depend on translated chat.



All shared names, unlock timing, fixed objective definitions, and balance values are defined once for consistent server and client use.



\### Working check



Switch the client language and walk through a basic season action. A player can identify their available action, lock reason, and reward without needing untranslated chat or a long English paragraph.



\### Cost



New fixed translation keys only. No added chat translation traffic and no AI cost.



\## Handoff expectations



Before code is written, respond with an implementation plan and questions only. Call out any part of this brief that conflicts with the game’s current data model or hard constraints.



After implementation, report the player flows completed, migration needs, tests added, build result, and anything deferred. Do not represent a feature as verified until Matt or a tester has run it in the actual game.

