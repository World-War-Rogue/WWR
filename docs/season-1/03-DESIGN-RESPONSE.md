\# Season 1 Design Response



Your implementation response improves the design rather than changing its intent. The following decisions replace the ambiguous parts of the Season 1 brief.



\## 1. Core finale: cumulative held time



Use \*\*cumulative Core control time during the final war window\*\*, not last touch.



The Core is still capture-and-hold. “Hold” now has literal value: every valid interval an alliance controls the Core contributes to its final Core Hold Score.



\- The final window begins with the Core controlled by Iron Dominion, not a player alliance.

\- When an alliance first captures it, its hold time begins.

\- Every later valid ownership change ends one alliance’s interval and begins another’s.

\- At the final deadline, the alliance with the greatest total Core Hold Score wins.

\- If scores tie, the alliance holding the Core at the deadline wins.

\- If still tied, the alliance that first captured the Core during the final window wins.

\- If no player alliance ever captures the Core, Iron Dominion retains it and no human champion is named.



The score is derived from recorded ownership events and absolute timestamps when the season is read. It does not require ticking.



The map must show the current holder and each eligible alliance’s current Core Hold Score during the final window. Do not describe the finale as “last touch.”



\## 2. Factory output: pro-rated control, not daily theft



Use the same ownership-event history for factories.



A factory’s seasonal supply yield is earned in proportion to the time an alliance controls it during each logical season day. An alliance that holds a factory for twenty-three hours receives approximately twenty-three hours of that day’s yield; an alliance that captures it just before day rollover receives only its short period of control.



Factory output should settle whenever a relevant season, map, factory, or alliance read occurs. It is not an individual claim button and should not be stealable by whichever member taps first.



The interface shows:



\- Current factory controller.

\- Current day’s accrued share for the controlling alliance.

\- A short recent-control history.

\- Projected output only as a projection, clearly separate from settled supply.



This is a deliberate cost: ownership history is now required for fairness in both the factory and final-Core systems. It is worth paying once rather than shipping two exploitable shortcuts.



\## 3. Alliance changes during an assault



Do \*\*not\*\* lock a player into an alliance while a seasonal assault is unresolved.



A seasonal assault carries the alliance identity that launched it, just as it carries a frozen squad snapshot. It resolves for that launch alliance even if the player later leaves.



A player who launches an assault and changes alliance before it resolves:



\- Does not change the assault’s side.

\- Does not redirect it toward or away from their new alliance.

\- Does not receive personal season contribution from the eventual result unless they still belong to the launching alliance.

\- Does not cause the launching alliance to lose a valid action already committed.



The player may leave normally. The residual cost of leaving the alliance that benefits from the action is sufficient deterrence; a membership lock is not worth the complexity or player frustration.



\## 4. Champion reward



Season 1’s exclusive champion reward is a permanent \*\*title and alliance banner\*\*, not a skin.



The title and banner must grant no power, resources, visibility, or strategic effect. They exist only as public prestige.



Do not make Season 1’s reward dependent on closing the current tester-wide skin-unlock setting. Closing that setting remains necessary before any future exclusive skin reward is introduced, but it does not block this season.



\## 5. Logical season day



Use \*\*days since season start\*\*, derived from the season’s absolute start instant.



This avoids time-zone ambiguity and ensures every player sees the same logical day regardless of location. The interface should show a countdown to the next daily refresh in the game’s displayed server time.



This day definition applies consistently to:



\- Daily operations.

\- Per-player contribution caps.

\- Factory yield intervals.

\- Any daily seasonal reward limit.



\## 6. War windows



A regular war window must be at least \*\*two hours\*\* long.



A seasonal assault may only launch if its known arrival time falls before the window close. The interface must show arrival time and closing time before the player commits.



Season 1 uses:



\- Two regular war windows per week.

\- Each regular window lasts two hours.

\- One final Week 10 Core window lasts three hours.



The exact timestamps are selected and published before the season starts as part of the season schedule. They should be expressed as absolute server-controlled instants and shown in the game’s named server time. They must not depend on browser locale or a recurring background scheduler.



This preserves map distance as a tactical consideration without making distant targets impossible to contest.



\## 7. Population gate and staged release



The ten-week competitive season does not formally begin while the live beta has only a handful of accounts and no reliable path to recruit more.



Accept the proposed staged build order, with this product rule:



\- Stages A and B may ship as a \*\*Preseason Boot Sequence\*\* for the current testers.

\- Preseason is not Season 1, does not award the champion title or banner, and exists to test map presentation, phase settlement, daily operations, catch-up, and contribution.

\- Factories may be introduced in Preseason only as neutral or controlled test objectives.

\- Scheduled alliance warfare, the Core, and champion rewards do not begin until text filtering and new-player access are ready, and the beta has at least two active alliances with at least two active accounts each.



This is not a content cut. It prevents an untestable ten-week competitive system from being declared live before it can be contested.



\## 8. Combat and protection dependencies



Do not create seasonal-only versions of unfinished combat systems.



\- Scheduled warfare waits for the existing hostile-map state and defender warning/countdown experience.

\- Shield Array waits for the general protection mechanic, rather than inventing a parallel seasonal shield system.

\- War-asset values are not finalized until the known combat baseline issues have been re-simulated and corrected.



Seasonal modifiers remain frozen battle inputs. They are temporary strategic effects, not permanent squad-power changes.



The Season 1 art and map objectives must not use naval assets or water gameplay.



\## 9. Dominion Colossus



Use \*\*one shared server-wide Colossus integrity pool\*\* plus alliance-local participation thresholds.



The event should remain a shared threat, but a low-population server must still be able to experience a meaningful result.



\- The Colossus has one shared integrity pool.

\- Its integrity is sized from recent distinct season participants, using a low beta-safe floor and a sensible upper cap.

\- Each alliance earns its standard temporary event reward by meeting its own participation threshold.

\- Defeating the shared pool grants a modest extra reward to all qualifying alliances.

\- There is no last-hit prize.

\- The event remains useful even when the pool is not defeated.



A player’s score-bearing attempts are capped. This prevents one account from turning the event into an unlimited farming loop.



\## 10. Supply fairness and small alliances



Do not add a hidden percentage “underdog bonus.” It would make battle outcomes harder to understand and would need a definition of alliance size that players can game.



Instead, make the season fair through visible limits:



\- Daily Alliance Supply contribution has a meaningful per-player cap.

\- An alliance has one primary offensive objective per war window.

\- One objective should be contestable by one strong squad, with existing valid reinforcement mechanics available where appropriate.

\- No Season 1 reward ranking is based purely on total alliance member count or total grind volume.

\- Factories, routes, and the Core reward intelligent concentration of effort rather than unlimited simultaneous attacks.



The trade-off is deliberate: large alliances retain breadth, but do not gain unlimited strength against a single target merely from having more members.



\## 11. Required build order



Accept the staged order:



1\. Season skeleton and map presentation.

2\. Preseason Boot Sequence.

3\. Factories, supply balance, and ownership history.

4\. Scheduled warfare and assault settlement.

5\. War assets after combat measurement is complete.

6\. Dominion Colossus, Core finale, and rewards.



Each stage should have a playable purpose before the next one begins. A formal Season 1 launch occurs only after every stage is ready and the population gate is met.



\## 12. Review requirements



Before implementation, identify any remaining collision with:



\- Server-authoritative outcomes.

\- Read-settled timers.

\- Database-enforced uniqueness.

\- Computed rather than stored power.

\- Existing combat purity.

\- Translation cost and fixed-string UI.

\- Closed-beta population limits.



After testers run a stage, provide the observed behavior, screenshots, relevant query output, and bug reports. The design review can then compare those results to this intent; it must not be presented as verification until someone has actually run the game.

