# World War Rogue — glossary

_The words we use, so Matt, Claude and the designer mean the same thing. Last
updated 2026-09-06. When a word changes, change it here first._

The rule for renames: **ids in the database, the API and `shared/` never
change.** A player-facing word changes in the string table (`src/i18n/en/`).
So "squad" still appears in code and is still "Task Force" to a player.

| Term | Means | Don't call it |
| :--- | :--- | :--- |
| **Task Force** | One of four groups of up to six assets a player sends out or keeps home: Alpha, Bravo, Charlie, Delta. A temporary unit for one operation. | squad, team, army |
| **Asset** | One piece of real military hardware a player owns. The asset *is* the hero. 72 exist, 12 per category. | hero, unit, troop |
| **Category** | The six asset types: Armour, Artillery, Rotary (helicopters), Fixed Wing (jets), Drone, Naval. Naval is off until the map has water. | class, type |
| **Service Rank** | An asset's level, 1–50, ten per season. Permanent once bought. | level |
| **Package** | One of four upgrade tracks on an asset: Armament (firepower), Protection (armour), Propulsion (mobility), Electronics (detection). Capped at the asset's Service Rank. Can be stripped and refunded. | upgrade, mod |
| **Module** | The consumable a package upgrade costs: Ordnance, Protection, Powertrain, Electronic Modules. Bought at the Depot, earned from events and daily tasks. | part, material |
| **Attributes** | An asset's combat numbers: Firepower, Armour, Mobility, Range, Detection. These are the real names. | Attack, Defence, Durability, March Speed |
| **Counter ring** | Closed loop of category advantages: perfect ×1.20, medium ×1.10. | rock-paper-scissors |
| **Tokens** | Purchased currency, $1 = 10, capped at 10,000 per week. | gems, gold, coins |
| **Command Credits** | Earned currency. Spends equal to Tokens on everything. | cash |
| **Test Tokens** | Not a separate currency: the normal Tokens balance set to 100,000 for testers. | — |
| **Resources** | Base production: Fuel, Steel, Munitions, Alloy. | materials |
| **Forward Command Base** | The player's base; what opens from "My base". | HQ, city, camp |
| **Board** | The painting of the base with its pads. | map (that is the world map) |
| **Pad** | A concrete slab on the board that a building stands on. Board v2: 19 pads — 1 centre, 14 department pads, 4 Task Force pads. | slot, tile |
| **Department** | Any building on the base. "Building" is fine too. | — |
| **Command Center** | The fixed centre building. Base Level cap, Events, Wars, Profile. | Command Post (old name) |
| **Base Level** | The Command Center's level. Nothing in the base can exceed it. | town hall level |
| **Depot** | The store building: Supplies, Modules, Cosmetics, Services. | Maintenance Depot, shop, Base Exchange |
| **Asset buildings** | Five buildings, one per playable category. Double-tap opens that category's assets, where all upgrades and module fitting happen. | landmarks, hubs |
| **Alliance Trading Post** | Building for private barter between alliance members. 48-hour membership rule, escrow. | market, auction |
| **Task Force line** | The four pads at the bottom of the board showing which Task Forces are home defending the base. | garrison row |
| **March** | A Task Force crossing the map to attack. Travels at its slowest asset's speed. | move, send |
| **Reinforcement** | A march to an ally's base; joins their defence for 8 hours. | support |
| **Recall** | Turning a march around; home takes as long as out took. | retreat |
| **Ambush** | Planned: one player starts, up to four alliance members join within 3 minutes, then a combined attack. | rally |
| **Alliance** | The player group. Ranks General / Lieutenant / Soldier. Capacity 100. | guild, clan |
| **Alliance Supplies** | Alliance currency (Season 1). | guild coins |
| **Season** | Ten-week campaign. Season 1 is "Mech Uprising — Iron Dominion". | event, chapter |
| **Readiness Band** | The season's weekly cap on the Service Rank that counts in combat. | combat cap |
| **Technical Dossiers** | Research tree, Chapters I–V. | blueprints, tech tree |
| **Combat Systems** | Task-Force-wide upgrades: Fire-Control, Survivability, Sustainment Suites. | squad systems |
| **Rogue Standard Time (RST)** | The game clock. UTC-7 always, no DST, 24-hour. Written `20:00 RST (UTC-7)`. | server time, Arizona time |
| **Base Skin** | Cosmetic that changes the base's look; grants a category buff (equipped full, owned smaller). | theme |
| **Nameplate / Base Effect / Task Force Effect** | The other cosmetic-power products. | squad effect |
| **Cosmetic Purchase Clearance** | The one cosmetic buy allowed per player per RST week. | weekly limit |
| **Second Engineer Team** | Permanent purchase: a second build queue. | builder |
| **Development Score** | Planned honest measure of base progress for the alliance leaderboard, replacing building power. | power |
| **General Rider** | The mascot: a cartoon general who runs onboarding. Fixed look. | — |
| **Colossus** | Season 1's server-wide boss. | raid boss |
