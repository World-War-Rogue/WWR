/**
 * Admiral Rider's walkthrough. ONBOARDING, SHIELDS & CONSTRUCTION v1 §3 -
 * every line is the document's final copy. A step advances on NEXT or when
 * the named event fires (see bus.ts); the highlight names a data-guide
 * attribute somewhere on screen.
 */
export interface GuideStep {
  id: number;
  say: string;
  /** 'next' for a button; otherwise the event that completes the step. */
  advance: 'next' | 'finish' | string;
  highlight?: string;
}

export const GUIDE_STEPS: GuideStep[] = [
  {id: 1, say: 'Welcome, Commander. I am Admiral Rider. I will bring your command post online, one decision at a time.', advance: 'next'},
  {id: 2, say: 'This is your base on the world map. Tap it whenever you need to return home.', advance: 'tap:own-base'},
  {id: 3, say: 'Nearby bases are other commanders. Their position, alliance, and protection status decide whether they are a target or a neighbor.', advance: 'next'},
  {id: 4, say: 'Select a valid enemy base to inspect it. Attack sends a Task Force; a shielded base cannot be attacked.', advance: 'next'},
  {id: 5, say: 'Reports record every battle, blocked attack, raid, and return. Check them before changing a formation.', advance: 'screen:battles', highlight: 'reports'},
  {id: 6, say: 'RV sets a rendezvous point. Home returns you to this base view from anywhere on the map.', advance: 'next', highlight: 'home'},
  {id: 7, say: 'This is RST, the server clock. Events, releases, resets, and every timer use this time.', advance: 'next', highlight: 'clock'},
  {id: 8, say: 'Open My Base. Your Command Center controls what the installation can become.', advance: 'screen:base', highlight: 'my-base'},
  {id: 9, say: 'Command Center is the ceiling. Finish its next level before starting that level anywhere else.', advance: 'open:building:command_center', highlight: 'building:command_center'},
  {id: 10, say: "Tank Building holds armour assets. Its level improves every tank's five baseline stats.", advance: 'open:building:armour_hub', highlight: 'building:armour_hub'},
  {id: 11, say: "Missile Building holds artillery assets. Its level improves every artillery asset's five baseline stats.", advance: 'open:building:artillery_hub', highlight: 'building:artillery_hub'},
  {id: 12, say: "Fixed-Wing Building holds aircraft assets. Its level improves every fixed-wing asset's five baseline stats.", advance: 'open:building:fixed_wing_hub', highlight: 'building:fixed_wing_hub'},
  {id: 13, say: "Helicopter Building holds rotary assets. Its level improves every rotary asset's five baseline stats.", advance: 'open:building:rotary_hub', highlight: 'building:rotary_hub'},
  {id: 14, say: 'Drone Building holds drones. Drones are required in every Task Force and improve its marching network.', advance: 'open:building:drone_hub', highlight: 'building:drone_hub'},
  {id: 15, say: 'Tactical Operations Center makes every Task Force march faster. Its bonus combines with your Drone Network.', advance: 'open:building:tactical_operations_center', highlight: 'building:tactical_operations_center'},
  {id: 16, say: 'Signals Center spots inbound attacks earlier and reveals only carried categories before a battle lands.', advance: 'open:building:signals_center', highlight: 'building:signals_center'},
  {id: 17, say: 'Bulk Fuel Point produces Fuel. Fuel powers construction and pays for vehicle-heavy asset builds.', advance: 'open:building:fuel_point', highlight: 'building:fuel_point'},
  {id: 18, say: 'Base Fabrication Shop produces Steel. Steel is the backbone of buildings, armour, and base growth.', advance: 'open:building:fabrication_shop', highlight: 'building:fabrication_shop'},
  {id: 19, say: 'Garrison Barracks produces Munitions. Munitions pays for weapon systems and artillery construction.', advance: 'open:building:garrison_barracks', highlight: 'building:garrison_barracks'},
  {id: 20, say: 'Materials Recovery Yard produces Alloy. Alloy pays for advanced frames, electronics, and air assets.', advance: 'open:building:recovery_yard', highlight: 'building:recovery_yard'},
  {id: 21, say: 'Quartermaster Warehouse holds your stock, raises storage, and protects part of it from raids.', advance: 'open:building:quartermaster_warehouse', highlight: 'building:quartermaster_warehouse'},
  {id: 22, say: 'Engineer Support Yard shortens new building timers. At Level 10, hire the permanent Second Engineer Team.', advance: 'open:building:engineer_support_yard', highlight: 'building:engineer_support_yard'},
  {id: 23, say: 'Depot sells supplies today. Modules, cosmetics, and services appear here when they are available.', advance: 'open:building:depot', highlight: 'building:depot'},
  {id: 24, say: 'Alliance Trading Post is for private alliance barter. Trade unlocks 48 hours after joining an alliance.', advance: 'open:building:alliance_trading_post', highlight: 'building:alliance_trading_post'},
  {id: 25, say: 'This is Task Force Alpha. Every Task Force has six positions: two front, two centre, and two rear.', advance: 'screen:squads', highlight: 'slab:Alpha'},
  {id: 26, say: 'Build a formation around roles, not just power. Front positions take contact; centre brings fire; rear provides information and reach.', advance: 'tap:slot'},
  {id: 27, say: 'Every Task Force needs at least one drone. More drone mobility raises its network speed, but the formation still follows its slowest asset.', advance: 'tap:drone'},
  {id: 28, say: 'Open an owned asset. Service Rank raises all of its baseline stats and changes its battlefield appearance at milestone ranks.', advance: 'open:asset'},
  {id: 29, say: 'Packages improve one stat on one asset: Armament, Protection, Propulsion, or Electronics. Choose the role you need.', advance: 'next'},
  {id: 30, say: 'Asset appearance upgrades at Service Ranks 1, 10, 20, 30, 40, and 50. Rank remains the main source of power.', advance: 'next'},
  {id: 31, say: 'Return to the Depot to cover a shortfall. Resources can be produced over time or purchased with Tokens or Command Credits.', advance: 'open:building:depot', highlight: 'building:depot'},
  {id: 32, say: 'Alliance and world chat coordinate moves quickly. Keep combat plans short, clear, and tied to the server clock.', advance: 'open:chat', highlight: 'chat'},
  {id: 33, say: 'Settings controls sound, notifications, and this guide. Turn Rider off whenever you are ready to command alone.', advance: 'open:settings', highlight: 'settings'},
  {id: 34, say: 'Your command post is ready, Commander. I will remain available for tips while you build, march, and defend.', advance: 'finish'},
];

/** What Rider says when a building is opened out of order: that building's line. */
export const BUILDING_LINE: Record<string, string> = {};
for (const s of GUIDE_STEPS) {
  // The FIRST step for a building is its introduction; a later step that
  // sends the player back there (the Depot at 31) is not.
  if (s.advance.startsWith('open:building:')) BUILDING_LINE[s.advance.slice('open:building:'.length)] ??= s.say;
}

/** Tips mode: once each, after the walkthrough or alongside it. */
export const TIPS: Record<string, (v: Record<string, string | number>) => string> = {
  shortfall: (v) => `You are short ${v.amount} ${v.resource}. Produce it, expand storage if full, or buy it at the Depot.`,
  march: () => 'Alpha is moving. Drone Network improves its pace, but every drone still carries the formation\'s strengths and weaknesses.',
  shield: (v) => `Your shield expires in ${v.remaining}. Plan a shield, reinforce allies, or bring Task Forces home.`,
  locked: (v) => `This asset opens in Week ${v.week}. Inspect it now, then build it at its category building when released.`,
};
