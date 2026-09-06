/** base board strings. See ../en.ts for what this file is part of. */
export const BASE = {
  // Building names, keyed on the ids in shared/base.ts
  'building.command_center': 'Command Center',
  'building.depot': 'Depot',
  'building.armour_hub': 'Armour Building',
  'building.artillery_hub': 'Missile Building',
  'building.rotary_hub': 'Helicopter Building',
  'building.fixed_wing_hub': 'Fixed-Wing Building',
  'building.drone_hub': 'Drone Building',

  // The board
  'board.level': 'Level {level}',
  'board.fixed': 'The Command Center stays where it is.',
  'board.tfLine': 'That is the Task Force line.',
  'board.tfHome': 'Home',
  'board.tfOut': 'Out',
  'board.tfEmpty': 'Empty',
  'board.openHint': 'Tap again to open · hold to move',
  'board.clockUnknown': 'RST --:--',

  // Command Center
  'cc.title': 'Command Center',
  'cc.baseLevel': 'Base Level',
  'cc.events': 'Events',
  'cc.wars': 'Wars',
  'cc.departments': 'Departments',
  'cc.profile': 'Profile',
  'cc.eventsSoon': 'Season operations, daily objectives and event rewards will run from here.',
  'cc.warsSoon': 'War windows, alliance assaults and objective control will be commanded from here.',
  'cc.capNote': 'Nothing in the base can be raised above the Command Center. Raise it first.',

  // Depot
  'depot.title': 'Depot',
  'depot.supplies': 'Supplies',
  'depot.modules': 'Modules',
  'depot.cosmetics': 'Cosmetics',
  'depot.services': 'Services',
  'depot.suppliesSoon': 'Fuel, steel, munitions and alloy, for Credits or Tokens at the same price.',
  'depot.modulesSoon': 'Ordnance, Protection, Powertrain and Electronic modules. Fit them at the asset’s own building.',
  'depot.cosmeticsSoon': 'Base skins, nameplates and task force effects. One cosmetic clearance per week.',
  'depot.servicesSoon': 'A second engineer team, relocation charges and other one-time services.',
  'depot.comingSoon': 'Opening soon',
  'depot.customise': 'Customise base',
} as const;
