/** base board strings. See ../en.ts for what this file is part of. */
export const BASE = {
  // Building names, keyed on the ids in shared/base.ts
  'building.command_center': 'Command Center',
  'building.depot': 'Depot',
  'building.armour_hub': 'Armour Command Tank',
  'building.artillery_hub': 'Artillery Command Platform',
  'building.rotary_hub': 'Rotary Wing Command Helicopter',
  'building.fixed_wing_hub': 'Fixed Wing Command Jet',
  'building.drone_hub': 'Drone Operations Aircraft',

  // The board
  'board.level': 'Level {level}',
  'board.emptyPad': 'Empty pad',
  'board.arrange': 'Arrange',
  'board.arranging': 'Tap a building, then tap where it should go.',
  'board.arrangeDone': 'Done',
  'board.tapToMove': 'Now tap an empty pad, or another building to swap.',
  'board.swapTitle': 'Swap positions?',
  'board.swapBody': '{a} and {b} will trade pads.',
  'board.swapConfirm': 'Swap',
  'board.cancel': 'Cancel',
  'board.fixed': 'The Command Center stays where it is.',
  'board.openHint': 'Tap again to open',
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
