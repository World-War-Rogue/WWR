import { PilotHero, VehicleType, UnitRole, CountryCode, HeroCategory } from '../types';

export const HERO_CATEGORIES_CONFIG: Record<
  HeroCategory,
  {
    id: HeroCategory;
    name: string;
    singular: string;
    icon: string;
    color: string;
    activeTabClass: string;
    badgeName: string;
    description: string;
  }
> = {
  tanks: {
    id: 'tanks',
    name: 'Tanks',
    singular: 'Tank',
    icon: '🛡️',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    activeTabClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    badgeName: 'Tank Ace',
    description: 'Armored combat vehicles with heavy rifled/smoothbore guns and reactive protection.',
  },
  airplanes: {
    id: 'airplanes',
    name: 'Airplanes',
    singular: 'Airplane',
    icon: '✈️',
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    activeTabClass: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
    badgeName: 'Fighter Pilot',
    description: 'Fixed-wing supersonic stealth fighters, heavy interdictors, and close-air-support jets.',
  },
  helicopters: {
    id: 'helicopters',
    name: 'Helicopters',
    singular: 'Helicopter',
    icon: '🚁',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    activeTabClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    badgeName: 'Rotor Ace',
    description: 'Rotary-wing attack gunships and multi-role heavy assault platforms.',
  },
  ships: {
    id: 'ships',
    name: 'Ships',
    singular: 'Ship',
    icon: '⚓',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    activeTabClass: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    badgeName: 'Naval Commander',
    description: 'Surface combatants including guided missile destroyers, cruisers, and frigates.',
  },
  submarines: {
    id: 'submarines',
    name: 'Submarines',
    singular: 'Submarine',
    icon: '🌊',
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    activeTabClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
    badgeName: 'Submarine Skipper',
    description: 'Stealth nuclear attack and air-independent propulsion hunter-killer submarines.',
  },
  missiles: {
    id: 'missiles',
    name: 'Missiles',
    singular: 'Missile System',
    icon: '🚀',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    activeTabClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    badgeName: 'Missile Officer',
    description: 'Long-range air defense batteries, hypersonic cruise TELs, and guided rocket artillery.',
  },
  drones: {
    id: 'drones',
    name: 'Drones',
    singular: 'Drone',
    icon: '🛰️',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    activeTabClass: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
    badgeName: 'Drone Operator',
    description: 'Unmanned combat aerial vehicles (UCAVs), autonomous loitering munitions, and electronic surveillance swarms.',
  },
};

export const HERO_PILOTS_REGISTRY: PilotHero[] = [
  // =========================================================================
  // 1. TANK ACES & ARMORED CAVALRY COMMANDERS (15 Characters)
  // =========================================================================
  {
    id: 'char_001_viper',
    name: 'Capt. Jack "Viper" Vance',
    callsign: 'Viper',
    rank: 'Captain',
    specialty: '120mm Tungsten Kinetic Penetration & Glacis Targeting',
    avatarIcon: '🪖',
    avatarBgColor: '#ea580c',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'US',
    quote: "Armor is only as tough as the will behind the crosshairs.",
    firingCallout: "Sabot loaded—impact imminent!",
    killCallout: "Direct hit! Hostile turret tossed!",
  },
  {
    id: 'char_002_ironclad',
    name: 'Maj. Brigitte "Ironclad" Meyer',
    callsign: 'Ironclad',
    rank: 'Major',
    specialty: 'Composite Armor Matrix & Trophy APS Interception',
    avatarIcon: '🛡️',
    avatarBgColor: '#059669',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'DE',
    quote: "Stand firm behind the glacis plate. We do not yield an inch.",
    firingCallout: "DM63 APFSDS away—clean bore line!",
    killCallout: "Armor collapsed! Target neutralized!",
  },
  {
    id: 'char_003_hammer',
    name: 'Sgt. Maj. Roman "Hammer" Kovalsky',
    callsign: 'Hammer',
    rank: 'Command Sgt. Major',
    specialty: 'Heavy Frontal Breaching & High-Explosive Squash Head',
    avatarIcon: '🔨',
    avatarBgColor: '#b45309',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'UA',
    quote: "If they won't yield the line, we ram straight through their perimeter.",
    firingCallout: "Main gun full battery—punch it!",
    killCallout: "Frontal breach confirmed! Clean kill!",
  },
  {
    id: 'char_004_ronin',
    name: 'Lt. Col. Hiroshi "Ronin" Tanaka',
    callsign: 'Ronin',
    rank: 'Lt. Colonel',
    specialty: 'Hydropneumatic Suspension Slew & High-Speed Gunnery',
    avatarIcon: '⚔️',
    avatarBgColor: '#dc2626',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'JP',
    quote: "One shell, one kill. Absolute precision is our tradition.",
    firingCallout: "Laser lock verified—releasing APFSDS!",
    killCallout: "Critical carousel detonation!",
  },
  {
    id: 'char_005_tiger',
    name: 'Capt. Jin-Woo "Tiger" Park',
    callsign: 'Tiger',
    rank: 'Captain',
    specialty: 'KSTAM Top-Attack Smart Munitions Gunnery',
    avatarIcon: '🐯',
    avatarBgColor: '#d97706',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'KR',
    quote: "Speed is our shield, precision our blade.",
    firingCallout: "Smart munition trajectory locked—fire!",
    killCallout: "Top-armor kill verified!",
  },
  {
    id: 'char_006_crusader',
    name: 'Major Alistair "Crusader" Sterling',
    callsign: 'Crusader',
    rank: 'Major',
    specialty: 'Challenger L55A1 Heavy Standoff Gunnery',
    avatarIcon: '🛡️',
    avatarBgColor: '#334155',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'GB',
    quote: "Hesh or sabot, British steel brooks no argument.",
    firingCallout: "Target acquired at two-thousand meters—engage!",
    killCallout: "Target penetrated and ablaze!",
  },
  {
    id: 'char_007_bulldog',
    name: '1st Sgt. Travis "Bulldog" Miller',
    callsign: 'Bulldog',
    rank: 'Master Sergeant',
    specialty: 'Close-Quarters Urban Maneuver & TUSK Armor Survivability',
    avatarIcon: '🐶',
    avatarBgColor: '#78350f',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'US',
    quote: "We don't avoid the bottleneck; we clear it.",
    firingCallout: "Cannister round ready—sweep the corridor!",
    killCallout: "Defensive bunker collapsed!",
  },
  {
    id: 'char_008_anvil',
    name: 'Capt. Jean-Luc "Anvil" Moreau',
    callsign: 'Anvil',
    rank: 'Captain',
    specialty: 'Autoloader Rapid-Cycle Gunnery (12 rounds/min)',
    avatarIcon: '⚡',
    avatarBgColor: '#1d4ed8',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'FR',
    quote: "Twelve rounds a minute means three targets burning before they sight us.",
    firingCallout: "Autoloader cycling—round away!",
    killCallout: "Target disabled! Shifting fire to secondary!",
  },
  {
    id: 'char_009_rampart',
    name: 'Maj. Yoni "Rampart" Ben-David',
    callsign: 'Rampart',
    rank: 'Major',
    specialty: 'Windbreaker Radar APS & Hull-Down Defilade',
    avatarIcon: '🏰',
    avatarBgColor: '#0369a1',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'IL',
    quote: "Our armor protects our crew so our crew can protect the line.",
    firingCallout: "Trophy active—main gun engaging!",
    killCallout: "Hostile sabot deflected, return fire destroyed target!",
  },
  {
    id: 'char_010_bastion',
    name: 'Lt. Col. Gunnar "Bastion" Lindqvist',
    callsign: 'Bastion',
    rank: 'Lt. Colonel',
    specialty: 'Sub-Arctic Camouflage & Heavy Glacis Hull-Down',
    avatarIcon: '❄️',
    avatarBgColor: '#0284c7',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'SE',
    quote: "The snow swallows sound; our 120mm breaks the silence.",
    firingCallout: "Thermal lock through the blizzard—fire!",
    killCallout: "Glacis breached! Tank immobile and burning!",
  },
  {
    id: 'char_011_centurion',
    name: 'Capt. Matteo "Centurion" Rossi',
    callsign: 'Centurion',
    rank: 'Captain',
    specialty: 'Composite Armor Skirt War & Rapid Traverse Slew',
    avatarIcon: '🏛️',
    avatarBgColor: '#15803d',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'IT',
    quote: "Speed without courage is hesitation; we have both speed and fire.",
    firingCallout: "Oto Melara battery loaded—fire!",
    killCallout: "Direct hit to ammunition stowage!",
  },
  {
    id: 'char_012_steelhead',
    name: 'Chief Warrant Officer Dale "Steelhead" Larson',
    callsign: 'Steelhead',
    rank: 'Chief Warrant Officer 4',
    specialty: 'Depleted Uranium Core Ballistics & Thermal Sight Calibration',
    avatarIcon: '🐟',
    avatarBgColor: '#4338ca',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'US',
    quote: "Calibrate by the millimeter; strike by the ton.",
    firingCallout: "Thermal crosshairs centered—release!",
    killCallout: "Clean armor perforation front to back!",
  },
  {
    id: 'char_013_sabot',
    name: 'Sgt. First Class Piotr "Sabot" Wójcik',
    callsign: 'Sabot',
    rank: 'Sergeant 1st Class',
    specialty: 'Tungsten Penetrator Trajectory & Reactive Armor Neutralization',
    avatarIcon: '🎯',
    avatarBgColor: '#be123c',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'PL',
    quote: "ERA tiles won't save them from heavy kinetic energy.",
    firingCallout: "Tungsten dart away at 1,750 meters per second!",
    killCallout: "Armor split wide! Fuel ignition confirmed!",
  },
  {
    id: 'char_014_dreadnought',
    name: 'Lt. Viktor "Dreadnought" Morozov',
    callsign: 'Dreadnought',
    rank: 'Lieutenant',
    specialty: 'Relikt ERA Reactive Defense & Heavy Autoloader Engagement',
    avatarIcon: '🔥',
    avatarBgColor: '#991b1b',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'UA',
    quote: "Heavy steel pushes the frontier forward.",
    firingCallout: "125mm gun firing high-velocity sabot!",
    killCallout: "Enemy vehicle neutralized!",
  },
  {
    id: 'char_015_vanguard',
    name: 'Maj. Caleb "Vanguard" Wright',
    callsign: 'Vanguard',
    rank: 'Major',
    specialty: 'Armored Spearhead Coordination & Combined Arms Maneuver',
    avatarIcon: '🎖️',
    avatarBgColor: '#b45309',
    badgeType: 'tank_ace',
    heroCategory: 'tanks',
    badge: 'Tank Ace',
    serviceBranch: 'Army',
    country: 'AU',
    quote: "When the armored brigade advances, everything else follows.",
    firingCallout: "Squadron fire on my trace—fire!",
    killCallout: "Target line obliterated!",
  },

  // =========================================================================
  // 2. FIGHTER PILOTS & STRATEGIC AVIATION (15 Characters)
  // =========================================================================
  {
    id: 'char_016_valkyrie',
    name: 'Col. Sarah "Valkyrie" Chen',
    callsign: 'Valkyrie',
    rank: 'Colonel',
    specialty: 'Supersonic Stealth Intercept & BVR Radar Tactics',
    avatarIcon: '✈️',
    avatarBgColor: '#0284c7',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'US',
    quote: "From angels twenty, death descends before they even hear the engine roar.",
    firingCallout: "Fox Three! AIM-120D active radar tracking!",
    killCallout: "Splash one hostile! Smoking debris on scope!",
  },
  {
    id: 'char_017_phantom',
    name: 'Capt. Carlos "Phantom" Vega',
    callsign: 'Phantom',
    rank: 'Captain',
    specialty: 'AN/APG-81 Multi-Target Air Superiority & EOTS Tracking',
    avatarIcon: '⚡',
    avatarBgColor: '#6366f1',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'US',
    quote: "Radar stealth active. Engaging targets on vector zero-niner.",
    firingCallout: "AMRAAM away! Tracking radar lock!",
    killCallout: "Target evaporated from the screen!",
  },
  {
    id: 'char_018_warthog',
    name: 'Capt. Buck "Warthog" Davis',
    callsign: 'Warthog',
    rank: 'Captain',
    specialty: '30mm GAU-8 Gatling Strafe & Close Air Support',
    avatarIcon: '🐗',
    avatarBgColor: '#475569',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'US',
    quote: "BRRRRRTTT! That is the sound of total friendly air supremacy!",
    firingCallout: "Guns, guns, guns! 30mm depleted uranium rain!",
    killCallout: "Shredded to scrap metal! Target destroyed!",
  },
  {
    id: 'char_019_raptor',
    name: 'Maj. Nathan "Raptor" Cross',
    callsign: 'Raptor',
    rank: 'Major',
    specialty: 'F-22 Supercruise Air Dominance & Thrust Vectoring G-Turns',
    avatarIcon: '🦅',
    avatarBgColor: '#0f172a',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'US',
    quote: "First look, first shot, first kill. They never saw the flight path.",
    firingCallout: "Fox Two! High-off-boresight Sidewinder off the rail!",
    killCallout: "Direct missile intercept! Visual confirmation splash!",
  },
  {
    id: 'char_020_tempest',
    name: 'Wing Commander Oliver "Tempest" Scott',
    callsign: 'Tempest',
    rank: 'Lt. Colonel',
    specialty: 'Eurofighter Meteor BVRAAM Ramjet Engagements',
    avatarIcon: '🌪️',
    avatarBgColor: '#0369a1',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'GB',
    quote: "Ramjet propulsion gives our missiles no-escape zones over 60 miles.",
    firingCallout: "Fox Three! Meteor away—ramjet sustained burn!",
    killCallout: "Target neutralized at extreme range!",
  },
  {
    id: 'char_021_ghost',
    name: 'Capt. Emilie "Mirage" Laurent',
    callsign: 'Mirage',
    rank: 'Captain',
    specialty: 'Rafale SPECTRA Electronic Warfare & SCALP-EG Precision',
    avatarIcon: '✨',
    avatarBgColor: '#2563eb',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'FR',
    quote: "Omnirole supremacy means we strike air and ground in one mission.",
    firingCallout: "MICA infrared missile off the wing pylons!",
    killCallout: "Critical airframe destruction confirmed!",
  },
  {
    id: 'char_022_blackbird',
    name: 'Lt. Col. Marcus "Strike" Sterling',
    callsign: 'Strike',
    rank: 'Lt. Colonel',
    specialty: 'Heavy Strike Ordnance Delivery & Deep Terrain Penetration',
    avatarIcon: '🦅',
    avatarBgColor: '#1e293b',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'US',
    quote: "Twenty-nine thousand pounds of ordnance delivered on schedule.",
    firingCallout: "JDAM package released—GPS guidance tracking!",
    killCallout: "Target coordinates eliminated! Impact recorded!",
  },
  {
    id: 'char_023_wildcat',
    name: 'Capt. Liam "Wildcat" O\'Connor',
    callsign: 'Wildcat',
    rank: 'Captain',
    specialty: 'High-Alpha Low-Altitude Intercept & Evasive Breakouts',
    avatarIcon: '🐱',
    avatarBgColor: '#0d9488',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'AU',
    quote: "Low on the deck, under their radar horizon, we strike like lightning.",
    firingCallout: "Tally-ho! Missile locked on exhaust plume!",
    killCallout: "Splash one bandit! Returning to defensive escort!",
  },
  {
    id: 'char_024_hornet',
    name: 'Lt. Cmdr. Maya "Hornet" Jenkins',
    callsign: 'Hornet',
    rank: 'Lt. Commander',
    specialty: 'Carrier Air Wing Catapult Launch & Anti-Ship Harpoon Runs',
    avatarIcon: '🐝',
    avatarBgColor: '#d97706',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "Catapult off the carrier deck into combat within ninety seconds.",
    firingCallout: "Harpoon anti-ship missile skimming the waves!",
    killCallout: "Direct hit beneath the enemy warship bridge!",
  },
  {
    id: 'char_025_maverick',
    name: 'Capt. Kenji "Zero" Sato',
    callsign: 'Zero',
    rank: 'Captain',
    specialty: 'AAM-4 Active Radar BVR & Off-Boresight Dogfighting',
    avatarIcon: '🗾',
    avatarBgColor: '#dc2626',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'JP',
    quote: "Our airspace is inviolable. Every intrusion is answered in seconds.",
    firingCallout: "AAM-4 active seeker engaged—tracking target!",
    killCallout: "Confirmed splash! Sector secure!",
  },
  {
    id: 'char_026_thunder',
    name: 'Maj. Eric "Thunder" Holm',
    callsign: 'Thunder',
    rank: 'Major',
    specialty: 'Dispersed Highway Runway Takeoff & Gripen Quick Turnaround',
    avatarIcon: '⚡',
    avatarBgColor: '#0284c7',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'SE',
    quote: "We rearm and refuel on a forest road in under ten minutes.",
    firingCallout: "RBS-15 anti-ship missile away!",
    killCallout: "Target eradicated! Returning to dispersed landing strip!",
  },
  {
    id: 'char_027_razor',
    name: 'Capt. Danylo "Falcon" Shevchenko',
    callsign: 'Falcon',
    rank: 'Captain',
    specialty: 'Low-Level Anti-Radar SEAD & HARM Missile Strikes',
    avatarIcon: '🦅',
    avatarBgColor: '#eab308',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'UA',
    quote: "We hunt their air defense radars by riding their own beams down.",
    firingCallout: "Magnum! AGM-88 HARM tracking radar emitter!",
    killCallout: "Enemy radar dish obliterated! SAM battery blind!",
  },
  {
    id: 'char_028_eclipse',
    name: 'Col. Raymond "Eclipse" Shaw',
    callsign: 'Eclipse',
    rank: 'Colonel',
    specialty: 'Next-Gen B-21 Long-Range Stealth Penetration & Electronic Attack',
    avatarIcon: '🌑',
    avatarBgColor: '#09090b',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'US',
    quote: "We fly through the most contested airspace without leaving a ripple.",
    firingCallout: "Internal weapon bay open—standoff ordnance released!",
    killCallout: "Strategic target destroyed. Zero radar return registered.",
  },
  {
    id: 'char_029_cyclone',
    name: 'Major Marco "Typhoon" Bellini',
    callsign: 'Typhoon',
    rank: 'Major',
    specialty: 'Super-cruise Intercept & IRST Electro-Optical Stealth Pursuit',
    avatarIcon: '🌀',
    avatarBgColor: '#059669',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'IT',
    quote: "With IRST passive sensors, we track targets without emitting a watt.",
    firingCallout: "Passive thermal lock acquired—missile away!",
    killCallout: "Target shattered in mid-air!",
  },
  {
    id: 'char_030_blade',
    name: 'Lt. Tyler "Blade" Harrison',
    callsign: 'Blade',
    rank: '1st Lieutenant',
    specialty: 'F-35 MADL Networked Sensor Fusion & Wingman Datalink',
    avatarIcon: '🗡️',
    avatarBgColor: '#3b82f6',
    badgeType: 'fighter_pilot',
    heroCategory: 'airplanes',
    badge: 'Fighter Pilot',
    serviceBranch: 'Air Force',
    country: 'CA',
    quote: "Our four-ship formation sees the battlefield as a single digital grid.",
    firingCallout: "Datalink target shared—firing on lead vector!",
    killCallout: "Target neutralized before defensive maneuvers could initiate!",
  },

  // =========================================================================
  // 3. ROTARY WING & ATTACK HELICOPTER PILOTS (15 Characters)
  // =========================================================================
  {
    id: 'char_031_reaper',
    name: 'Chief Warrant Officer 5 Alex "Reaper" Stone',
    callsign: 'Reaper',
    rank: 'Chief Warrant Officer 5',
    specialty: 'Longbow Hellfire Standoff & 30mm Chain Gun Slaved Targeting',
    avatarIcon: '🚁',
    avatarBgColor: '#16a34a',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'US',
    quote: "Mask behind the ridgeline. Pop up, launch four, and disappear.",
    firingCallout: "Hellfire missile away! Laser paint solid!",
    killCallout: "Tandem warhead impact! Target cooked off!",
  },
  {
    id: 'char_032_cobra',
    name: 'Major Klaus "Cobra" Müller',
    callsign: 'Cobra',
    rank: 'Major',
    specialty: 'Tiger HAD Mast Sight & Spike-ER Fire-and-Forget Salvo',
    avatarIcon: '🐍',
    avatarBgColor: '#0d9488',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'DE',
    quote: "Low-level nap-of-the-earth flight. They will never spot the rotor blades.",
    firingCallout: "Missile salvo launched! Tracking thermal exhaust!",
    killCallout: "Hostile armor incinerated!",
  },
  {
    id: 'char_033_havoc',
    name: 'Major Viktor "Havoc" Rostov',
    callsign: 'Havoc',
    rank: 'Major',
    specialty: 'Coaxial Rotor Flight Dynamics & Heavy Vikhr-1 ATGM Salvo',
    avatarIcon: '☠️',
    avatarBgColor: '#7f1d1d',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'UA',
    quote: "Coaxial rotors eliminate the tail rotor vulnerability entirely.",
    firingCallout: "Vikhr laser-guided missiles launched—dual salvo!",
    killCallout: "Enemy armor cooked off! Secondary blast verified!",
  },
  {
    id: 'char_034_talon',
    name: 'Capt. Sean "Talon" Bradley',
    callsign: 'Talon',
    rank: 'Captain',
    specialty: 'AH-1Z Viper Target Sight System & Air-to-Air AIM-9 Defense',
    avatarIcon: '🦅',
    avatarBgColor: '#b45309',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Marine Corps',
    country: 'US',
    quote: "Marine rotary aviation strikes where the landing force needs us most.",
    firingCallout: "TOW-2 missile wire active—holding crosshairs steady!",
    killCallout: "Direct hit on enemy command post!",
  },
  {
    id: 'char_035_nightshade',
    name: 'Chief Warrant Officer 4 Diane "Nightshade" Fox',
    callsign: 'Nightshade',
    rank: 'Chief Warrant Officer 4',
    specialty: '160th SOAR Night Stalkers Low-Altitude Blind Penetration',
    avatarIcon: '🌙',
    avatarBgColor: '#312e81',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'US',
    quote: "Night Stalkers Don't Quit. Under zero moon, we own the tree line.",
    firingCallout: "30mm chain gun burst on muzzle flashes below!",
    killCallout: "Hostile ambush nest wiped clean!",
  },
  {
    id: 'char_036_gator',
    name: 'Capt. Boris "Alligator" Vlasov',
    callsign: 'Alligator',
    rank: 'Captain',
    specialty: 'Armored Cockpit Capsule Combat & High-Speed Strafe Runs',
    avatarIcon: '🐊',
    avatarBgColor: '#14532d',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'UA',
    quote: "Armored glass stops 12.7mm rounds cold. We fly directly into fire.",
    firingCallout: "Rockets ripple fire! S-8 80mm unguided barrage!",
    killCallout: "Target grid obliterated!",
  },
  {
    id: 'char_037_stalker',
    name: 'Capt. Pierre "Stalker" Dubois',
    callsign: 'Stalker',
    rank: 'Captain',
    specialty: 'Mistral Air-to-Air Rotor Escort & High Agility Evasion',
    avatarIcon: '🐅',
    avatarBgColor: '#1e3a8a',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'FR',
    quote: "We hunt enemy helicopters before they can touch our ground troops.",
    firingCallout: "Mistral air-to-air missile locked and fired!",
    killCallout: "Hostile gunship rotor severed! Target crashed!",
  },
  {
    id: 'char_038_dragonfly',
    name: 'Lt. Andrea "Dragonfly" Conti',
    callsign: 'Dragonfly',
    rank: '1st Lieutenant',
    specialty: 'AW129 Lightweight Agility & 20mm Rotary Cannon Strafe',
    avatarIcon: '🪲',
    avatarBgColor: '#047857',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'IT',
    quote: "Lightweight frames turn tighter than any heavy gunship can track.",
    firingCallout: "20mm rotary cannon burst—walking fire on target!",
    killCallout: "Hostile armored car immobilized and burning!",
  },
  {
    id: 'char_039_dustoff',
    name: 'Maj. Colin "Dustoff" Henderson',
    callsign: 'Dustoff',
    rank: 'Major',
    specialty: 'CH-47 Chinook Heavy Armed Insertion & Twin Minigun Cover',
    avatarIcon: '💨',
    avatarBgColor: '#64748b',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'US',
    quote: "Tandem rotors generate the lift to bring armed firepower anywhere.",
    firingCallout: "Door gunners open fire! Suppress the treeline!",
    killCallout: "Landing zone cleared of hostile infantry!",
  },
  {
    id: 'char_040_killer_egg',
    name: 'Capt. Ryan "Killer Egg" O\'Neil',
    callsign: 'Killer Egg',
    rank: 'Captain',
    specialty: 'MH-6 Little Bird Precision Rooftop Snipe & Minigun Strafe',
    avatarIcon: '🥚',
    avatarBgColor: '#1c1917',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'US',
    quote: "Small enough to land on a garage roof; lethal enough to wipe a company.",
    firingCallout: "Twin M134 miniguns spinning—6,000 rounds per minute!",
    killCallout: "Hostile position silenced!",
  },
  {
    id: 'char_041_hydra',
    name: 'Lt. Wei "Hydra" Zhang',
    callsign: 'Hydra',
    rank: '1st Lieutenant',
    specialty: 'HJ-10 Heavy Fiber-Optic Anti-Armor Missile Guidance',
    avatarIcon: '🐉',
    avatarBgColor: '#b91c1c',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'UA',
    quote: "Fiber-optic control cannot be jammed by electromagnetic decoys.",
    firingCallout: "HJ-10 launched! Manual optical targeting active!",
    killCallout: "Target struck dead center! Total demolition!",
  },
  {
    id: 'char_042_timberwolf',
    name: 'Chief Warrant Officer 3 Mark "Wolf" Campbell',
    callsign: 'Wolf',
    rank: 'Chief Warrant Officer 3',
    specialty: 'APKWS Laser-Guided 70mm Rocket Precision Fire',
    avatarIcon: '🐺',
    avatarBgColor: '#475569',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'CA',
    quote: "Why drop a bomb when a laser-guided rocket puts steel through the window?",
    firingCallout: "APKWS rocket away—laser seeker homing in!",
    killCallout: "Window breached! Fortified gun team eliminated!",
  },
  {
    id: 'char_043_blackhawk',
    name: 'Capt. Luke "Voodoo" Turner',
    callsign: 'Voodoo',
    rank: 'Captain',
    specialty: 'DAP Direct Action Penetrator Heavy Weapons Delivery',
    avatarIcon: '🦇',
    avatarBgColor: '#374151',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'US',
    quote: "A Black Hawk carrying 30mm cannons and Hellfires commands respect.",
    firingCallout: "Dual 30mm chain guns engaging armored vehicles!",
    killCallout: "Hostile convoy halted and burning!",
  },
  {
    id: 'char_044_cyclops',
    name: 'Maj. David "Cyclops" Stern',
    callsign: 'Cyclops',
    rank: 'Major',
    specialty: 'Mast-Mounted Thermal Sights & Radar Wave Reconnaissance',
    avatarIcon: '👁️',
    avatarBgColor: '#0284c7',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Air Force',
    country: 'IL',
    quote: "Only the mast optics rise above the dunes; the enemy never sees us.",
    firingCallout: "Spike NLOS launched over the hill!",
    killCallout: "Direct top-down armor strike confirmed!",
  },
  {
    id: 'char_045_vortex',
    name: 'Lt. Ethan "Vortex" Davies',
    callsign: 'Vortex',
    rank: '1st Lieutenant',
    specialty: 'High-Altitude Hover Gunnery & Thermal Sensor Tracking',
    avatarIcon: '🌀',
    avatarBgColor: '#0369a1',
    badgeType: 'rotor_ace',
    heroCategory: 'helicopters',
    badge: 'Rotor Ace',
    serviceBranch: 'Army',
    country: 'GB',
    quote: "Maintain stable hover, track target telemetry, release on mark.",
    firingCallout: "Brimstone missile ignited off launcher rail!",
    killCallout: "Multiple targets detonated in sequence!",
  },

  // =========================================================================
  // 4. AIR DEFENSE & BALLISTIC MISSILE OFFICERS (15 Characters)
  // =========================================================================
  {
    id: 'char_046_aegis',
    name: 'Lt. Cmdr. Rachel "Aegis" Foster',
    callsign: 'Aegis',
    rank: 'Lt. Commander',
    specialty: 'PAC-3 MSE Hit-to-Kill Ballistic Missile Interception',
    avatarIcon: '📡',
    avatarBgColor: '#2563eb',
    badgeType: 'missile_officer',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Army',
    country: 'US',
    quote: "The airspace above this theater belongs exclusively to us.",
    firingCallout: "SAM interceptor ignited! Mach 4 burn!",
    killCallout: "Air threat intercepted and neutralized!",
  },
  {
    id: 'char_047_patriot',
    name: 'Col. Donald "Patriot" Vance',
    callsign: 'Patriot',
    rank: 'Colonel',
    specialty: 'AN/MPQ-65 Phased Array Sector Defense Coordination',
    avatarIcon: '🚀',
    avatarBgColor: '#1e40af',
    badgeType: 'missile_officer',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Army',
    country: 'US',
    quote: "Not a single hostile warhead touches friendly soil while my battery stands.",
    firingCallout: "Patriot launcher battery salvo fired!",
    killCallout: "Incoming ballistic missile destroyed at apogee!",
  },
  {
    id: 'char_048_arrowhead',
    name: 'Capt. Tariq "Arrowhead" Al-Mansoor',
    callsign: 'Arrowhead',
    rank: 'Captain',
    specialty: 'Iron Dome Tamir Interceptor & Real-Time C-RAM Trajectory',
    avatarIcon: '🏹',
    avatarBgColor: '#0891b2',
    badgeType: 'air_defense',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Air Force',
    country: 'IL',
    quote: "We calculate the impact point in milliseconds. If it's empty sand, we save the missile.",
    firingCallout: "Tamir missile away! Trajectory interception locked!",
    killCallout: "Hostile rocket salvo intercepted in mid-air!",
  },
  {
    id: 'char_049_overlord',
    name: 'Maj. General Thomas "Overlord" Keller',
    callsign: 'Overlord',
    rank: 'Major General',
    specialty: 'HIMARS Deep Operational Strike & ATACMS Trajectory',
    avatarIcon: '⭐',
    avatarBgColor: '#b45309',
    badgeType: 'missile_officer',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Army',
    country: 'US',
    quote: "HIMARS redefines the depth of the battlefield out to three hundred kilometers.",
    firingCallout: "Pods elevated! GMLRS six-round ripple fire!",
    killCallout: "Enemy command headquarters leveled! Total destruction!",
  },
  {
    id: 'char_050_citadel',
    name: 'Col. Heinrich "Citadel" Weber',
    callsign: 'Citadel',
    rank: 'Colonel',
    specialty: 'IRIS-T SLM Agile Radar & High-Speed Low-RCS Drone Intercept',
    avatarIcon: '🏰',
    avatarBgColor: '#059669',
    badgeType: 'air_defense',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Air Force',
    country: 'DE',
    quote: "Our thrust-vectoring interceptor turns 360 degrees within half a second.",
    firingCallout: "IRIS-T vertical launch—optical thrust vectoring engaged!",
    killCallout: "Target drone eradicated from the sky!",
  },
  {
    id: 'char_051_bulwark',
    name: 'Capt. Astrid "Bulwark" Nygård',
    callsign: 'Bulwark',
    rank: 'Captain',
    specialty: 'NASAMS 3 Dispersed Canister Network & AMRAAM-ER Intercept',
    avatarIcon: '🛡️',
    avatarBgColor: '#0284c7',
    badgeType: 'air_defense',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Air Force',
    country: 'NO',
    quote: "Our launchers are buried in the fjords, linked by secure fiber optics.",
    firingCallout: "Canister hatch open—AMRAAM-ER away!",
    killCallout: "Hostile cruise missile splashed in flight!",
  },
  {
    id: 'char_052_sentinel',
    name: 'Capt. Mykola "Sentinel" Bondar',
    callsign: 'Sentinel',
    rank: 'Captain',
    specialty: 'S-400 40N6 Ultra Long-Range Missile Tracking & Radar Jamming',
    avatarIcon: '🎯',
    avatarBgColor: '#dc2626',
    badgeType: 'air_defense',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Air Defense',
    country: 'UA',
    quote: "Four hundred kilometers range means the enemy must stay grounded.",
    firingCallout: "Cold launch gas ejection! Main rocket motor ignited!",
    killCallout: "Hostile airborne radar command plane eliminated!",
  },
  {
    id: 'char_053_harpooner',
    name: 'Cmdr. Henrik "Harpooner" Olsen',
    callsign: 'Harpooner',
    rank: 'Commander',
    specialty: 'Naval Strike Missile Coastal Defense & Autonomous Target ID',
    avatarIcon: '🌊',
    avatarBgColor: '#0f766e',
    badgeType: 'missile_officer',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Navy',
    country: 'NO',
    quote: "The missile skims five feet above the swells and selects the warship's engine room.",
    firingCallout: "NSM booster ignited! Sea-skimming profile initiated!",
    killCallout: "Critical hit on enemy warship waterline!",
  },
  {
    id: 'char_054_redline',
    name: 'Lt. Col. Arthur "Redline" Sterling',
    callsign: 'Redline',
    rank: 'Lt. Colonel',
    specialty: 'Tomahawk Cruise Missile TERCOM Terrain-Following Guidance',
    avatarIcon: '🧭',
    avatarBgColor: '#7c2d12',
    badgeType: 'missile_officer',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "A thousand miles away, the missile flies down the chimney.",
    firingCallout: "Tomahawk booster ignition! Entering terrain-contour following!",
    killCallout: "Strategic target bunker penetrated and collapsed!",
  },
  {
    id: 'char_055_radar',
    name: 'Capt. Kenji "Radar" Takahashi',
    callsign: 'Radar',
    rank: 'Captain',
    specialty: 'Type 03 Chū-SAM Active Phased Array Defense',
    avatarIcon: '📡',
    avatarBgColor: '#991b1b',
    badgeType: 'air_defense',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Air Force',
    country: 'JP',
    quote: "Our AESA radar detects stealth signatures at tactical range.",
    firingCallout: "Chū-SAM interceptor away—data uplink locked!",
    killCallout: "Supersonic anti-ship missile shot down!",
  },
  {
    id: 'char_056_archangel',
    name: 'Major Daniel "Archangel" Price',
    callsign: 'Archangel',
    rank: 'Major',
    specialty: 'Theater Ballistic Missile Defense & Exo-atmospheric Kinetic Kill',
    avatarIcon: '🪽',
    avatarBgColor: '#4338ca',
    badgeType: 'missile_officer',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Army',
    country: 'US',
    quote: "Stopping warheads in near space requires pure mathematical perfection.",
    firingCallout: "SM-3 kinetic kill vehicle detached—tracking reentry vehicle!",
    killCallout: "Exo-atmospheric collision confirmed! Warhead vaporized!",
  },
  {
    id: 'char_057_flak',
    name: 'Staff Sgt. Pawel "Flak" Kaminski',
    callsign: 'Flak',
    rank: 'Staff Sergeant',
    specialty: 'Piorun MANPADS Short-Range Infrared Drone Hunting',
    avatarIcon: '💥',
    avatarBgColor: '#b91c1c',
    badgeType: 'air_defense',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Army',
    country: 'PL',
    quote: "Low-flying loitering munitions cannot escape our dual-channel seeker.",
    firingCallout: "Shoulder launch! Proximity fuze armed!",
    killCallout: "Direct hit! Recon drone down in flames!",
  },
  {
    id: 'char_058_ramjet',
    name: 'Cmdr. Kemal "Ramjet" Demir',
    callsign: 'Ramjet',
    rank: 'Commander',
    specialty: 'BrahMos Mach 3 Supersonic Coastal Battery Operations',
    avatarIcon: '🚀',
    avatarBgColor: '#c2410c',
    badgeType: 'missile_officer',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Navy',
    country: 'TR',
    quote: "Mach three gives the defense less than thirty seconds to react.",
    firingCallout: "Ramjet ignition! Accelerating to Mach 3.0!",
    killCallout: "Kinetic impact broke the enemy hull in two!",
  },
  {
    id: 'char_059_skywatch',
    name: 'Capt. Chloe "Skywatch" Martin',
    callsign: 'Skywatch',
    rank: 'Captain',
    specialty: 'SAMP/T Mamba Aster 30 Terminal Defense Integration',
    avatarIcon: '🔭',
    avatarBgColor: '#1d4ed8',
    badgeType: 'air_defense',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Air Force',
    country: 'FR',
    quote: "Aster's PIF-PAF lateral thrusters provide 50G terminal maneuvers.",
    firingCallout: "Aster 30 launched! Terminal lateral thrusters active!",
    killCallout: "High-speed diving cruise missile destroyed!",
  },
  {
    id: 'char_060_sentry',
    name: 'Lt. Lucas "Sentry" Walker',
    callsign: 'Sentry',
    rank: '1st Lieutenant',
    specialty: 'Counter-UAS Electronic Spoofing & Kinetic Gun Defense',
    avatarIcon: '🛡️',
    avatarBgColor: '#475569',
    badgeType: 'air_defense',
    heroCategory: 'missiles',
    badge: 'Missile Officer',
    serviceBranch: 'Army',
    country: 'AU',
    quote: "We blind their control links then shred them with airburst 30mm.",
    firingCallout: "Airburst programmable munitions firing!",
    killCallout: "Hostile drone swarm neutralized!",
  },

  // =========================================================================
  // 5. NAVAL WARSHIP CAPTAINS & SURFACE COMMANDERS (15 Characters)
  // =========================================================================
  {
    id: 'char_061_trident',
    name: 'Capt. Jonathan "Trident" Hayes',
    callsign: 'Trident',
    rank: 'Captain',
    specialty: 'Aegis Destroyer Multi-Mission Warfare & 96-Cell VLS Strikes',
    avatarIcon: '🔱',
    avatarBgColor: '#0369a1',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "A guided missile destroyer is an unsinkable shield and an unyielding sword.",
    firingCallout: "VLS cell doors open—missiles ripple away!",
    killCallout: "Hostile combatant struck amidships! Sinking rapidly!",
  },
  {
    id: 'char_062_poseidon',
    name: 'Rear Admiral Marcus "Poseidon" Vance',
    callsign: 'Poseidon',
    rank: 'Rear Admiral',
    specialty: 'Carrier Strike Group Air Defense Commander & Fleet Coordination',
    avatarIcon: '🌊',
    avatarBgColor: '#1e3a8a',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "Command the surface, the air above it, and the depths below it.",
    firingCallout: "Fleet air defense volley initiated!",
    killCallout: "Hostile missile raid wiped out! Fleet integrity one hundred percent!",
  },
  {
    id: 'char_063_seawolf',
    name: 'Cmdr. Eric "Sea Wolf" Jensen',
    callsign: 'Sea Wolf',
    rank: 'Commander',
    specialty: 'Fast Attack Submarine Acoustic Stealth & Mk 48 ADCAP Torpedoes',
    avatarIcon: '🐺',
    avatarBgColor: '#0f172a',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "Silent service. We track our targets for days before they realize they're dead.",
    firingCallout: "Tubes one and two flooded—torpedoes swimming out!",
    killCallout: "Detonation under the keel! Target broken in two!",
  },
  {
    id: 'char_064_nautilus',
    name: 'Capt. William "Nautilus" Drake',
    callsign: 'Nautilus',
    rank: 'Captain',
    specialty: 'Virginia Payload Module Tomahawk Land Attack Standoff',
    avatarIcon: '🐚',
    avatarBgColor: '#134e4a',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "Twenty-eight cruise missiles launched without breaching the surface.",
    firingCallout: "VPM tubes firing—submerged launch sequence active!",
    killCallout: "Shore battery destroyed by submarine strike!",
  },
  {
    id: 'char_065_dread',
    name: 'Capt. Charles "Dread" Montgomery',
    callsign: 'Dread',
    rank: 'Captain',
    specialty: 'Type 45 SAMPSON Radar & PAAMS Sea Viper Air Interception',
    avatarIcon: '⚓',
    avatarBgColor: '#1e293b',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'GB',
    quote: "SAMPSON radar can track a cricket ball traveling at three times the speed of sound.",
    firingCallout: "Sea Viper missile launched! Aster 30 tracking!",
    killCallout: "Supersonic target neutralized! Threat cleared!",
  },
  {
    id: 'char_066_corsair',
    name: 'Cmdr. François "Corsair" Le Gall',
    callsign: 'Corsair',
    rank: 'Commander',
    specialty: 'FREMM Multi-Mission Frigate Anti-Submarine Warfare',
    avatarIcon: '⚔️',
    avatarBgColor: '#1d4ed8',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'FR',
    quote: "Our towed array sonar hears the propeller rotation of a submarine thirty miles off.",
    firingCallout: "MU90 lightweight torpedo dropped into water!",
    killCallout: "Submarine hull implosion registered on hydrophones!",
  },
  {
    id: 'char_067_ghost_hull',
    name: 'Cmdr. Carl "Ghost Hull" Lindstrom',
    callsign: 'Ghost Hull',
    rank: 'Commander',
    specialty: 'Visby Stealth Corvette Carbon-Fiber Radar Evasion',
    avatarIcon: '👻',
    avatarBgColor: '#334155',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'SE',
    quote: "Radar cross section smaller than a fishing buoy. We hit and vanish in the archipelago.",
    firingCallout: "Bofors 57mm stealth gun opening fire!",
    killCallout: "Target fast craft disintegrated by 3P ammunition!",
  },
  {
    id: 'char_068_kraken',
    name: 'Capt. Mehmet "Kraken" Yilmaz',
    callsign: 'Kraken',
    rank: 'Captain',
    specialty: 'Type 055 Dual-Band AESA Radar & Anti-Ship Hypersonic Salvo',
    avatarIcon: '🦑',
    avatarBgColor: '#991b1b',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'TR',
    quote: "One hundred twelve VLS cells grant total saturation dominance.",
    firingCallout: "YJ-18 supersonic anti-ship missiles away!",
    killCallout: "Direct hit! Target vessel engulfed in flames!",
  },
  {
    id: 'char_069_iron_ship',
    name: 'Capt. Klaus "Iron Ship" Brandt',
    callsign: 'Iron Ship',
    rank: 'Captain',
    specialty: 'APAR Phased Array Radar & SMART-L Long-Range Search',
    avatarIcon: '🚢',
    avatarBgColor: '#047857',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'DE',
    quote: "Continuous wave illumination guides thirty-two missiles simultaneously.",
    firingCallout: "Evolved Sea Sparrow Missile quad-pack firing!",
    killCallout: "Four hostile air threats splashed simultaneously!",
  },
  {
    id: 'char_070_anchor',
    name: 'Cmdr. Bruce "Anchor" MacIntyre',
    callsign: 'Anchor',
    rank: 'Commander',
    specialty: 'Canberra Amphibious Warship Flight Deck & Defense Operations',
    avatarIcon: '⚓',
    avatarBgColor: '#d97706',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'AU',
    quote: "Delivering mechanized battalions over the beach under fleet air cover.",
    firingCallout: "Phalanx CIWS opening fire on incoming projectile!",
    killCallout: "Close-in weapon system destroyed missile at 800 yards!",
  },
  {
    id: 'char_071_helm',
    name: 'Lt. Cmdr. Sarah "Helm" Bradley',
    callsign: 'Helm',
    rank: 'Lt. Commander',
    specialty: 'Constellation Frigate EASR 3D Radar & NSM Box Launcher Strikes',
    avatarIcon: '🧭',
    avatarBgColor: '#0284c7',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "Next-gen frigate combining European hull agility with US Aegis punch.",
    firingCallout: "NSM anti-ship canister fired!",
    killCallout: "Direct waterline breach! Target listing heavily!",
  },
  {
    id: 'char_072_deep_blue',
    name: 'Cmdr. Anton "Deep Blue" Petrenko',
    callsign: 'Deep Blue',
    rank: 'Commander',
    specialty: 'Admiral Gorshkov Stealth Frigate Zircon Hypersonic Operations',
    avatarIcon: '🌊',
    avatarBgColor: '#7c2d12',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'UA',
    quote: "Hypersonic speed gives the target zero window for electronic defense.",
    firingCallout: "3M22 Zircon hypersonic cruise missile away!",
    killCallout: "Catastrophic hull detonation on hostile capital ship!",
  },
  {
    id: 'char_073_sonar',
    name: 'Lt. Scott "Sonar" Henderson',
    callsign: 'Sonar',
    rank: 'Lieutenant',
    specialty: 'Towed Sonar Array Acoustic Analysis & Torpedo Defense',
    avatarIcon: '🎧',
    avatarBgColor: '#475569',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'CA',
    quote: "Hydrophones don't lie. I can tell you the sub's propeller RPM.",
    firingCallout: "Acoustic decoy launched! Full rudder turn!",
    killCallout: "Hostile torpedo diverted and detonated harmlessly!",
  },
  {
    id: 'char_074_gunner_mate',
    name: 'Senior Chief Anthony "Gunner" Marino',
    callsign: 'Gunner',
    rank: 'Senior Chief Petty Officer',
    specialty: '5-Inch/62 Caliber Mk 45 Naval Gun Shore Bombardment',
    avatarIcon: '🎯',
    avatarBgColor: '#b45309',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "Twenty rounds a minute of high-explosive steel right onto the beach.",
    firingCallout: "Five-inch naval gun rapid salvo—twenty rounds away!",
    killCallout: "Hostile coastal fortress suppressed and destroyed!",
  },
  {
    id: 'char_075_broadside',
    name: 'Capt. Filippo "Broadside" De Luca',
    callsign: 'Broadside',
    rank: 'Captain',
    specialty: 'Oto Melara 76mm Strales Guided Munition CIWS Defense',
    avatarIcon: '🛡️',
    avatarBgColor: '#15803d',
    badgeType: 'naval_commander',
    heroCategory: 'ships',
    badge: 'Naval Commander',
    serviceBranch: 'Navy',
    country: 'IT',
    quote: "Guided ammunition turns our 76mm naval gun into a missile shield.",
    firingCallout: "DART guided projectile fired from 76mm turret!",
    killCallout: "Direct kinetic kill on inbound sea-skimmer!",
  },

  // =========================================================================
  // 6. SUBMARINE SKIPPERS & UNDERSEA WARFARE COMMANDERS (12 Characters)
  // =========================================================================
  {
    id: 'char_076_silent_run',
    name: 'Capt. John "Silent Run" Mercer',
    callsign: 'Silent Run',
    rank: 'Captain',
    specialty: 'Virginia SSN Submerged Tomahawk VPM Salvo & Hydrophone Masking',
    avatarIcon: '🌊',
    avatarBgColor: '#0c4a6e',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "The silent service strikes from the abyss without ever surfacing.",
    firingCallout: "Submerged Tomahawk launch—boosters ignited!",
    killCallout: "Coastal radar station annihilated by submarine strike!",
  },
  {
    id: 'char_077_astute',
    name: 'Cmdr. William "Astute" Sterling',
    callsign: 'Astute',
    rank: 'Commander',
    specialty: 'Astute Sonar 2076 Processing & Spearfish Wire-Guided Torpedoes',
    avatarIcon: '🦈',
    avatarBgColor: '#1e293b',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'GB',
    quote: "Sonar 2076 hears an enemy pump turn from three oceans away.",
    firingCallout: "Spearfish heavy torpedo swimming on fiber-optic line!",
    killCallout: "Keel broken by thermal torpedo! Target sunk!",
  },
  {
    id: 'char_078_abyss',
    name: 'Cmdr. Viktor "Abyss" Morozov',
    callsign: 'Abyss',
    rank: 'Commander',
    specialty: 'Yasen-M Low-Magnetic Hull & Oniks Supersonic Sea-Skimmer Standoff',
    avatarIcon: '⚓',
    avatarBgColor: '#7f1d1d',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'UA',
    quote: "Our stealth cruise missiles breach the water at supersonic speed.",
    firingCallout: "Vertical silos dry fired—Oniks missile traveling!",
    killCallout: "Hostile capital ship burning to the waterline!",
  },
  {
    id: 'char_079_deep_wolf',
    name: 'Fregattenkapitän Hans "Deep Wolf" Meyer',
    callsign: 'Deep Wolf',
    rank: 'Commander',
    specialty: 'Type 212A Hydrogen Fuel-Cell Silent AIP Patrol & Non-Magnetic Hull',
    avatarIcon: '🐺',
    avatarBgColor: '#14532d',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'DE',
    quote: "Three weeks submerged without air, completely invisible to magnetic detectors.",
    firingCallout: "DM2A4 Seehecht torpedo discharged quietly!",
    killCallout: "Hostile escort ship neutralized in littoral ambush!",
  },
  {
    id: 'char_080_nautilus_fr',
    name: 'Capitaine de frégate Laurent "Nautilus" Moreau',
    callsign: 'Nautilus',
    rank: 'Commander',
    specialty: 'Scorpène SUBTICS Combat Integration & SM39 Sub-Exocet Anti-Ship',
    avatarIcon: '🐚',
    avatarBgColor: '#1e3a8a',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'FR',
    quote: "Exocet capsule breaks the waves and ignites its solid rocket motor.",
    firingCallout: "Sub-surface Exocet missile launch sequence locked!",
    killCallout: "Direct missile penetration on hostile frigate hull!",
  },
  {
    id: 'char_081_periscope',
    name: 'Cmdr. Torsten "Periscope" Lund',
    callsign: 'Periscope',
    rank: 'Commander',
    specialty: 'Gotland-Class Stirling AIP Archipelagic Ambush & Torped 62',
    avatarIcon: '👁️',
    avatarBgColor: '#075985',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'SE',
    quote: "We slip between Baltic granite islands where enemy sonar is blind.",
    firingCallout: "Torped 62 dual wire-guided track locked!",
    killCallout: "Target propulsion knocked out! Enemy sinking!",
  },
  {
    id: 'char_082_kraken_sub',
    name: 'Cmdr. Kenji "Kraken" Takahashi',
    callsign: 'Kraken',
    rank: 'Commander',
    specialty: 'Taigei Lithium-Ion Battery Surge Sprint & Type 18 Heavy Torpedoes',
    avatarIcon: '🦑',
    avatarBgColor: '#431407',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'JP',
    quote: "Lithium-ion power gives us sprint speeds that outrun enemy counter-torpedoes.",
    firingCallout: "Type 18 wake-homing torpedo launched!",
    killCallout: "Acoustic signature extinguished! Confirmed kill!",
  },
  {
    id: 'char_083_shadow_tide',
    name: 'Cmdr. Min-Seok "Shadow Tide" Park',
    callsign: 'Shadow Tide',
    rank: 'Commander',
    specialty: 'KSS-III Dosan Hyunmoo-4-4 Submarine-Launched Ballistic Missile Strikes',
    avatarIcon: '🌊',
    avatarBgColor: '#042f2e',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'KR',
    quote: "Conventional ballistic precision strikes launched from under the thermocline.",
    firingCallout: "Hyunmoo-4-4 cold-gas ejection—motor ignition confirmed!",
    killCallout: "Enemy fortified underground bunker destroyed by SLBM!",
  },
  {
    id: 'char_084_depth_charge',
    name: 'Capt. Robert "Depth Charge" Hayes',
    callsign: 'Depth Charge',
    rank: 'Captain',
    specialty: 'Ohio-Class SSGN 154-Tomahawk Saturation & Special Operations Insertion',
    avatarIcon: '💣',
    avatarBgColor: '#312e81',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "One hundred fifty-four Tomahawks ready to rain fire on twenty targets at once.",
    firingCallout: "SSGN ripple salvo firing—four missiles away every second!",
    killCallout: "Hostile naval shipyard complex comprehensively leveled!",
  },
  {
    id: 'char_085_sonar_strike',
    name: 'Capitano di corvetta Marco "Sonar Strike" Rossi',
    callsign: 'Sonar Strike',
    rank: 'Lt. Commander',
    specialty: 'Todaro U212A Choke Point Interdiction & Black Shark Torpedoes',
    avatarIcon: '🎧',
    avatarBgColor: '#134e4a',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'IT',
    quote: "We sit motionless on the seafloor until the enemy fleet sails into our sights.",
    firingCallout: "Black Shark fiber-optic homing torpedo away!",
    killCallout: "Direct hit beneath the stern! Rudder and screws shredded!",
  },
  {
    id: 'char_086_vanguard',
    name: 'Cmdr. Patrick "Vanguard" Kelly',
    callsign: 'Vanguard',
    rank: 'Commander',
    specialty: 'Submarine Towed Sonar Array Bathymetric Navigation & Decoy Tactics',
    avatarIcon: '🛡️',
    avatarBgColor: '#1c1917',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'GB',
    quote: "Dive beneath the thermal layer and they will never know where the torpedo came from.",
    firingCallout: "Acoustic mobile decoy released—turning to attack course!",
    killCallout: "Hostile anti-submarine torpedo tracked decoy and detonated harmlessly!",
  },
  {
    id: 'char_087_cavitation',
    name: 'Lt. Cmdr. Sarah "Cavitation" Vance',
    callsign: 'Cavitation',
    rank: 'Lt. Commander',
    specialty: 'Shrouded Pump-Jet Propulsor Quietude & Wake Homing Torpedo Defense',
    avatarIcon: '🌀',
    avatarBgColor: '#0f172a',
    badgeType: 'submarine_skipper',
    heroCategory: 'submarines',
    badge: 'Submarine Skipper',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "Zero propeller cavitation. We run at twenty knots as silent as snowfall.",
    firingCallout: "Mk 48 Mod 7 CBASS torpedo active acoustic ping on target!",
    killCallout: "Target vessel hull ruptured! Sinking fast!",
  },

  // =========================================================================
  // 7. DRONE & COMBAT UAV MISSION OPERATORS (13 Characters)
  // =========================================================================
  {
    id: 'char_088_reaper',
    name: 'Capt. Lucas "Reaper" Stone',
    callsign: 'Reaper',
    rank: 'Captain',
    specialty: 'MQ-9A Reaper Standoff Hellfire Laser-Guided Precision Strikes',
    avatarIcon: '🎯',
    avatarBgColor: '#0369a1',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Air Force',
    country: 'US',
    quote: "Twenty-four hours over the battle space, delivering surgical precision.",
    firingCallout: "Hellfire AGM-114 missile off the rail—laser guide steady!",
    killCallout: "Direct turret penetration! Tank brew-up confirmed!",
  },
  {
    id: 'char_089_bayraktar',
    name: 'Major Selim "Bayraktar" Yilmaz',
    callsign: 'Bayraktar',
    rank: 'Major',
    specialty: 'Bayraktar TB2 Autonomous Strike & MAM-L Armor Penetration',
    avatarIcon: '🦅',
    avatarBgColor: '#b91c1c',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Air Force',
    country: 'TR',
    quote: "Low radar cross section and laser glide bombs erase hostile convoys.",
    firingCallout: "MAM-L micro-munition released from left wing pylon!",
    killCallout: "Hostile command vehicle and radar mast demolished!",
  },
  {
    id: 'char_090_global_eye',
    name: 'Lt. Col. David "Global Eye" Miller',
    callsign: 'Global Eye',
    rank: 'Lt. Colonel',
    specialty: 'RQ-4 Global Hawk High-Altitude SAR Imaging & Laser Designation',
    avatarIcon: '👁️',
    avatarBgColor: '#1e1b4b',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Air Force',
    country: 'US',
    quote: "At sixty thousand feet, we paint targets for the entire allied theater.",
    firingCallout: "SAR real-time target feed injected into tactical datalink!",
    killCallout: "Friendly strike package annihilated all targeted armor!",
  },
  {
    id: 'char_091_switchblade',
    name: 'Capt. Tyler "Switchblade" Cole',
    callsign: 'Switchblade',
    rank: 'Captain',
    specialty: 'Switchblade 600 Tube-Launched Anti-Armor Kamikaze Operations',
    avatarIcon: '🗡️',
    avatarBgColor: '#92400e',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Army',
    country: 'US',
    quote: "A cruise missile in a backpack with a tandem HEAT warhead.",
    firingCallout: "Switchblade canister popped—wings locked, dive initiated!",
    killCallout: "Terminal dive through driver's hatch! Vehicle catastrophic kill!",
  },
  {
    id: 'char_092_valkyrie',
    name: 'Major Elena "Valkyrie" Vance',
    callsign: 'Valkyrie',
    rank: 'Major',
    specialty: 'XQ-58A Autonomous AI Loyal Wingman & Drone Swarm Coordination',
    avatarIcon: '⚡',
    avatarBgColor: '#581c87',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Air Force',
    country: 'US',
    quote: "Unmanned stealth wingmen take the risks that human pilots cannot.",
    firingCallout: "Autonomous loyal wingman deployed to suppress air defenses!",
    killCallout: "Enemy SAM radar site disabled by wingman glide bomb!",
  },
  {
    id: 'char_093_heron',
    name: 'Capt. Ziv "Heron" Cohen',
    callsign: 'Heron',
    rank: 'Captain',
    specialty: 'Heron TP Strategic Multi-Payload Standoff Surveillance & Strike',
    avatarIcon: '🛰️',
    avatarBgColor: '#065f46',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Air Force',
    country: 'IL',
    quote: "Standoff optics provide 4K thermal tracking beyond enemy missile range.",
    firingCallout: "Precision standoff munition launched from underwing!",
    killCallout: "Hostile MLRS battery neutralized before launch!",
  },
  {
    id: 'char_094_shahed_hunter',
    name: 'Capt. Dmytro "Interceptor" Koval',
    callsign: 'Interceptor',
    rank: 'Captain',
    specialty: 'Autonomous Loitering Interceptor & Swarm Perimeter Defense',
    avatarIcon: '🏹',
    avatarBgColor: '#eab308',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Air Defense',
    country: 'UA',
    quote: "We hunt and neutralize enemy drones using counter-swarm loitering assets.",
    firingCallout: "Loitering interceptor scrambled on acoustic vector!",
    killCallout: "Hostile strike drone intercepted mid-air and detonated!",
  },
  {
    id: 'char_095_stingray',
    name: 'Cmdr. Travis "Stingray" Scott',
    callsign: 'Stingray',
    rank: 'Commander',
    specialty: 'MQ-25 Carrier Unmanned Flight Operations & Tactical Tanking',
    avatarIcon: '⚓',
    avatarBgColor: '#0284c7',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Navy',
    country: 'US',
    quote: "First autonomous combat aircraft to catapult off a supercarrier flight deck.",
    firingCallout: "Autonomous carrier catapult launch complete—climbing to altitude!",
    killCallout: "Carrier air wing strike range successfully extended by 500 miles!",
  },
  {
    id: 'char_096_anka',
    name: 'Major Burak "Anka" Demir',
    callsign: 'Anka',
    rank: 'Major',
    specialty: 'TAI Anka-3 Flying-Wing Stealth Deep Penetration & SOM-J Cruise Standoff',
    avatarIcon: '🛩️',
    avatarBgColor: '#831843',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Air Force',
    country: 'TR',
    quote: "Flying-wing tailless design slips through dense radar nets without detection.",
    firingCallout: "Internal weapons bay doors open—SOM-J cruise missile dropped!",
    killCallout: "Enemy hardened command bunker demolished in deep rear!",
  },
  {
    id: 'char_097_warmate',
    name: 'Capt. Piotr "Warmate" Zielinski',
    callsign: 'Warmate',
    rank: 'Captain',
    specialty: 'Warmate Micro-Loitering Munitions & High-G Diving Armor Strikes',
    avatarIcon: '💥',
    avatarBgColor: '#dc2626',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Army',
    country: 'PL',
    quote: "Two kilograms of explosive directed with millimeter accuracy into the engine deck.",
    firingCallout: "Warmate launched from pneumatic rail—diving at 150 km/h!",
    killCallout: "Direct hit to engine compartment! Target immobilized and ablaze!",
  },
  {
    id: 'char_098_cipher_uav',
    name: 'Capt. Nicole "Cipher" Vance',
    callsign: 'Cipher',
    rank: 'Captain',
    specialty: 'Cyber Infiltration UAVs & Tactical Fire-Control Datalink Exploitation',
    avatarIcon: '💻',
    avatarBgColor: '#059669',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Air Force',
    country: 'US',
    quote: "Our cyber drone injects telemetry drift into their fire control computers.",
    firingCallout: "Airborne digital injection packet transmitted!",
    killCallout: "Hostile battery blinded by ghost targets on radar screens!",
  },
  {
    id: 'char_099_hornet',
    name: 'Staff Sgt. Jack "Hornet" Walker',
    callsign: 'Hornet',
    rank: 'Staff Sgt.',
    specialty: 'Black Hornet Nano-UAV Urban Room Clearing & Micro Recon',
    avatarIcon: '🐝',
    avatarBgColor: '#15803d',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Marine Corps',
    country: 'CA',
    quote: "Thirty-gram helicopter that slips through a window to locate every sniper.",
    firingCallout: "Nano-drone launched through window frame—streaming HD video!",
    killCallout: "Enemy ambush coordinates revealed and neutralized by friendly mortar!",
  },
  {
    id: 'char_100_nexus',
    name: 'Capt. Jin-Woo "Nexus" Lee',
    callsign: 'Nexus',
    rank: 'Captain',
    specialty: 'Autonomous Mesh Drone Swarm Self-Healing Network Commander',
    avatarIcon: '🌐',
    avatarBgColor: '#312e81',
    badgeType: 'drone_operator',
    heroCategory: 'drones',
    badge: 'Drone Operator',
    serviceBranch: 'Air Force',
    country: 'KR',
    quote: "If thirty drones are shot down, the remaining seventy instantly re-route their attack vectors.",
    firingCallout: "One hundred drone mesh launched—dynamic swarm AI engaged!",
    killCallout: "Hostile defensive perimeter overwhelmed simultaneously from thirty angles!",
  },
];

// Enemy Rival Aces (Used to seed opposing squads with formidable enemy commanders!)
export const ENEMY_HERO_PILOTS: PilotHero[] = [
  {
    id: 'enemy_pilot_ironclaw',
    name: 'Col. Boris "Ironclaw" Petrov',
    callsign: 'Ironclaw',
    rank: 'Colonel',
    specialty: 'Relikt Heavy Reactive Armor & Arena APS',
    avatarIcon: '💀',
    avatarBgColor: '#991b1b',
    badgeType: 'tank_ace',
    serviceBranch: 'Army',
    country: 'UA',
    quote: "Your front lines will shatter under our heavy armor barrage.",
    firingCallout: "Refleks guided missile fired! Tear them apart!",
    killCallout: "Hostile vehicle erased from formation!",
  },
  {
    id: 'enemy_pilot_havoc',
    name: 'Major Viktor "Havoc" Rostov',
    callsign: 'Havoc',
    rank: 'Major',
    specialty: 'Ka-52 Coaxial Rotor Vikhr ATGM Strike',
    avatarIcon: '☠️',
    avatarBgColor: '#7f1d1d',
    badgeType: 'rotor_ace',
    serviceBranch: 'Army',
    country: 'UA',
    quote: "Nothing escapes the Alligator's optical targeting sight.",
    firingCallout: "Vikhr laser-guided missiles launched!",
    killCallout: "Enemy armor cooked off!",
  },
  {
    id: 'enemy_pilot_ghost_strike',
    name: 'Capt. Sergei "Shadow" Volkov',
    callsign: 'Shadow',
    rank: 'Captain',
    specialty: 'Su-57 Stealth Thrust Vectoring & R-77 Salvo',
    avatarIcon: '🛩️',
    avatarBgColor: '#831843',
    badgeType: 'fighter_pilot',
    serviceBranch: 'Air Force',
    country: 'UA',
    quote: "Radar invisibility confirmed. Strike from the blind zone.",
    firingCallout: "Fox Three! Hypersonic air interceptor away!",
    killCallout: "Hostile bird splashed!",
  },
  {
    id: 'enemy_pilot_baron',
    name: 'General Alexander "Brimstone" Vance',
    callsign: 'Brimstone',
    rank: 'General',
    specialty: 'Heavy Thermobaric MLRS & Shock Tactics',
    avatarIcon: '🔥',
    avatarBgColor: '#b91c1c',
    badgeType: 'artillery_master',
    serviceBranch: 'Army',
    country: 'US',
    quote: "Scorched earth is our canvas. Fire everything!",
    firingCallout: "Thermobaric rockets away! Cleanse the sector!",
    killCallout: "Total structural destruction confirmed!",
  },
  {
    id: 'enemy_pilot_triumf',
    name: 'Col. Grigory "Triumf" Moroz',
    callsign: 'Triumf',
    rank: 'Colonel',
    specialty: 'S-400 Long-Range Anti-Air Missile Net',
    avatarIcon: '🚀',
    avatarBgColor: '#991b1b',
    badgeType: 'missile_officer',
    serviceBranch: 'Air Defense',
    country: 'UA',
    quote: "The sky is closed. Turn back or turn to scrap.",
    firingCallout: "Interception salvo away! 40N6 tracking!",
    killCallout: "Hostile jet eliminated at Mach 5!",
  },
  {
    id: 'enemy_pilot_gorshkov',
    name: 'Capt. 1st Rank Oleg "Leviathan" Sorokin',
    callsign: 'Leviathan',
    rank: 'Captain',
    specialty: 'Hypersonic Zircon Anti-Ship Salvo',
    avatarIcon: '🚢',
    avatarBgColor: '#581c87',
    badgeType: 'naval_commander',
    serviceBranch: 'Navy',
    country: 'UA',
    quote: "The seas belong to the fleet that strikes first.",
    firingCallout: "Hypersonic missile launch from forward silos!",
    killCallout: "Enemy warship hull broken in two!",
  },
];

/**
 * Accurately determines the visual vehicle type based on unit role, id, and name.
 */
export function determineVehicleType(unit: { id?: string; name?: string; role?: string }): VehicleType {
  const n = (unit.name || '').toLowerCase();
  const id = (unit.id || '').toLowerCase();
  const r = unit.role || '';

  // 1. Submarines (Check first before ships)
  if (
    r === 'Attack Submarine' ||
    n.includes('submarine') ||
    n.includes(' sub') ||
    n.endsWith(' sub') ||
    id.includes('submarine') ||
    id.includes('astute') ||
    id.includes('yasen') ||
    id.includes('scorpene') ||
    id.includes('gotland') ||
    id.includes('taigei') ||
    id.includes('dosan') ||
    id.includes('ohio') ||
    id.includes('todaro') ||
    id.includes('type212')
  ) {
    return 'submarine';
  }

  // 2. Drones & UCAVs
  if (
    r === 'Combat UAV Drone' ||
    r === 'Drone Carrier' ||
    n.includes('drone') ||
    n.includes('ucav') ||
    n.includes('uav') ||
    n.includes('reaper') ||
    n.includes('bayraktar') ||
    n.includes('global hawk') ||
    n.includes('switchblade') ||
    n.includes('valkyrie') ||
    n.includes('heron') ||
    n.includes('shahed') ||
    n.includes('stingray') ||
    n.includes('anka') ||
    n.includes('warmate') ||
    id.includes('drone') ||
    id.includes('reaper') ||
    id.includes('bayraktar') ||
    id.includes('globalhawk') ||
    id.includes('switchblade') ||
    id.includes('valkyrie') ||
    id.includes('heron') ||
    id.includes('shahed') ||
    id.includes('stingray') ||
    id.includes('anka') ||
    id.includes('warmate')
  ) {
    return 'drone';
  }

  // 3. Guided Missile Warships & Surface Combatants
  if (
    r === 'Guided Missile Warship' ||
    n.includes('destroyer') ||
    n.includes('frigate') ||
    n.includes('cruiser') ||
    n.includes('corvette') ||
    n.includes('warship') ||
    n.includes('escort') ||
    n.includes('arleigh burke') ||
    n.includes('sejong') ||
    n.includes('type 055') ||
    n.includes('type 45') ||
    n.includes('fremm') ||
    n.includes('visby') ||
    n.includes("sa'ar") ||
    n.includes('iver huitfeldt') ||
    n.includes('canberra') ||
    n.includes('constellation') ||
    n.includes('bergamini') ||
    id.includes('burke') ||
    id.includes('warship') ||
    id.includes('frigate') ||
    id.includes('destroyer') ||
    id.includes('corvette') ||
    id.includes('fremm')
  ) {
    return 'ship';
  }

  // 4. Guided Missile Systems & Batteries
  if (
    r === 'Missile Battery' ||
    n.includes('himars') ||
    n.includes('patriot') ||
    n.includes('s-400') ||
    n.includes('nsm') ||
    n.includes('tomahawk') ||
    n.includes('nasams') ||
    n.includes('iris-t') ||
    n.includes('iskander') ||
    n.includes('iron dome') ||
    n.includes('brahmos') ||
    id.includes('himars') ||
    id.includes('patriot') ||
    id.includes('s400') ||
    id.includes('nsm') ||
    id.includes('tomahawk') ||
    id.includes('nasams') ||
    id.includes('iris-t') ||
    id.includes('iskander') ||
    id.includes('iron-dome') ||
    id.includes('brahmos')
  ) {
    return 'missile';
  }

  // 5. Airplanes / Fighter Jets / Close Air Support
  if (
    n.includes('f-22') ||
    n.includes('raptor') ||
    n.includes('f-35') ||
    n.includes('lightning') ||
    n.includes('typhoon') ||
    n.includes('eurofighter') ||
    n.includes('rafale') ||
    n.includes('f-15') ||
    n.includes('eagle') ||
    n.includes('su-57') ||
    n.includes('felon') ||
    n.includes('a-10') ||
    n.includes('warthog') ||
    n.includes('su-35') ||
    n.includes('flanker') ||
    n.includes('gripen') ||
    n.includes('jas 39') ||
    n.includes('b-21') ||
    n.includes('raider') ||
    n.includes('jet') ||
    n.includes('aircraft') ||
    id.includes('f22') ||
    id.includes('f35') ||
    id.includes('typhoon') ||
    id.includes('rafale') ||
    id.includes('f15') ||
    id.includes('su57') ||
    id.includes('a10') ||
    id.includes('su35') ||
    id.includes('gripen') ||
    id.includes('b21')
  ) {
    return 'airplane';
  }

  // 6. Attack & Combat Helicopters
  if (
    r === 'Attack Helicopter' ||
    n.includes('apache') ||
    n.includes('alligator') ||
    n.includes('ka-52') ||
    n.includes('mi-28') ||
    n.includes('havoc') ||
    n.includes('tiger') ||
    n.includes('viper') ||
    n.includes('ah-1') ||
    n.includes('black hawk') ||
    n.includes('mangusta') ||
    n.includes('aw129') ||
    n.includes('chinook') ||
    n.includes('ch-47') ||
    n.includes('z-10') ||
    n.includes('little bird') ||
    id.includes('apache') ||
    id.includes('ka52') ||
    id.includes('mi28') ||
    id.includes('tiger') ||
    id.includes('viper') ||
    id.includes('blackhawk') ||
    id.includes('chinook') ||
    id.includes('mangusta')
  ) {
    return 'helicopter';
  }

  // 7. Surface-to-Air SAM Systems
  if (
    r === 'Air Defense SAM' ||
    n.includes('gepard') ||
    n.includes('tunguska') ||
    n.includes('pantsir') ||
    n.includes('avenger') ||
    n.includes('tor-m') ||
    id.includes('gepard') ||
    id.includes('tunguska') ||
    id.includes('pantsir') ||
    id.includes('avenger')
  ) {
    return 'sam';
  }

  // 8. Self-Propelled Artillery
  if (
    r === 'Heavy Artillery' ||
    n.includes('pzh 2000') ||
    n.includes('archer') ||
    n.includes('caesar') ||
    n.includes('k9 thunder') ||
    n.includes('paladin') ||
    n.includes('m109') ||
    n.includes('crusader') ||
    id.includes('pzh2000') ||
    id.includes('archer') ||
    id.includes('caesar') ||
    id.includes('k9') ||
    id.includes('m109')
  ) {
    return 'artillery';
  }

  // 9. Infantry Fighting Vehicles & Light Recon
  if (
    r === 'Infantry Fighting Vehicle' ||
    r === 'Armored Recon' ||
    n.includes('bradley') ||
    n.includes('bmp') ||
    n.includes('marder') ||
    n.includes('puma') ||
    n.includes('cv90') ||
    n.includes('stryker') ||
    n.includes('warrior') ||
    n.includes('ajax') ||
    n.includes('amx-10') ||
    n.includes('btr') ||
    id.includes('bradley') ||
    id.includes('bmp') ||
    id.includes('marder') ||
    id.includes('puma') ||
    id.includes('cv90') ||
    id.includes('stryker')
  ) {
    return 'ifv';
  }

  // 10. Railgun / Laser
  if (r === 'Experimental Railgun' || r === 'Directed Energy Laser') {
    return 'railgun';
  }

  // 11. Exoskeleton Infantry
  if (r === 'Exoskeleton Infantry') {
    return 'infantry';
  }

  // Default to Main Battle Tank
  return 'tank';
}

/**
 * Returns the HeroCategory for any given unit or vehicle type
 */
export function getHeroCategory(
  unitOrType: { role?: string; id?: string; name?: string; vehicleType?: VehicleType; heroCategory?: HeroCategory } | VehicleType
): HeroCategory {
  if (typeof unitOrType === 'object' && unitOrType.heroCategory) {
    return unitOrType.heroCategory;
  }
  const vType = typeof unitOrType === 'string' ? unitOrType : unitOrType.vehicleType || determineVehicleType(unitOrType);
  if (vType === 'submarine') return 'submarines';
  if (vType === 'drone') return 'drones';
  if (vType === 'ship') return 'ships';
  if (vType === 'missile' || vType === 'sam' || vType === 'artillery') return 'missiles';
  if (vType === 'airplane') return 'airplanes';
  if (vType === 'helicopter') return 'helicopters';
  return 'tanks';
}

/**
 * Returns or dynamically matches a Hero Pilot for a given unit.
 */
export function getPilotForUnit(
  unitId: string,
  role: UnitRole,
  country: CountryCode,
  unitName: string,
  isEnemy: boolean = false
): PilotHero {
  if (isEnemy) {
    const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return ENEMY_HERO_PILOTS[hash % ENEMY_HERO_PILOTS.length];
  }

  const vType = determineVehicleType({ id: unitId, name: unitName, role });

  // 1. Submarine Skippers
  if (vType === 'submarine') {
    const subSkippers = HERO_PILOTS_REGISTRY.filter((p) => p.badgeType === 'submarine_skipper' || p.heroCategory === 'submarines');
    const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return subSkippers[hash % subSkippers.length] || subSkippers[0];
  }

  // 2. Drone Operators
  if (vType === 'drone') {
    const droneOps = HERO_PILOTS_REGISTRY.filter((p) => p.badgeType === 'drone_operator' || p.heroCategory === 'drones');
    const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return droneOps[hash % droneOps.length] || droneOps[0];
  }

  // 3. Guided Missile Warships & Naval Combatants
  if (vType === 'ship') {
    const navalOfficers = HERO_PILOTS_REGISTRY.filter((p) => p.badgeType === 'naval_commander');
    const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return navalOfficers[hash % navalOfficers.length] || navalOfficers[0];
  }

  // 4. Guided Missile Batteries & Launch Officers
  if (vType === 'missile') {
    const missileOfficers = HERO_PILOTS_REGISTRY.filter((p) => p.badgeType === 'missile_officer' || p.badgeType === 'air_defense');
    const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return missileOfficers[hash % missileOfficers.length] || missileOfficers[0];
  }

  // 5. Fighter Pilots & Aviation
  if (vType === 'airplane') {
    const planePilots = HERO_PILOTS_REGISTRY.filter((p) => p.badgeType === 'fighter_pilot');
    const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return planePilots[hash % planePilots.length] || planePilots[0];
  }

  // 6. Rotor Aces
  if (vType === 'helicopter') {
    const rotorPilots = HERO_PILOTS_REGISTRY.filter((p) => p.badgeType === 'rotor_ace');
    const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return rotorPilots[hash % rotorPilots.length] || rotorPilots[0];
  }

  // 7. Air Defense Officers
  if (vType === 'sam') {
    const samPilots = HERO_PILOTS_REGISTRY.filter((p) => p.badgeType === 'air_defense' || p.badgeType === 'missile_officer');
    const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return samPilots[hash % samPilots.length] || samPilots[0];
  }

  // 8. Artillery & Support
  if (vType === 'artillery') {
    const artyPilots = HERO_PILOTS_REGISTRY.filter((p) => p.badgeType === 'missile_officer' || p.badgeType === 'tank_ace');
    const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return artyPilots[hash % artyPilots.length] || artyPilots[0];
  }

  // 9. IFV & Recon Specialists
  if (vType === 'ifv') {
    const ifvPilots = HERO_PILOTS_REGISTRY.filter((p) => p.badgeType === 'tank_ace');
    const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
    return ifvPilots[hash % ifvPilots.length] || ifvPilots[0];
  }

  // 10. Tank Aces
  const tankAces = HERO_PILOTS_REGISTRY.filter((p) => p.badgeType === 'tank_ace');
  const countryMatch = tankAces.find((p) => p.country === country);
  if (countryMatch) return countryMatch;

  const hash = Math.abs(unitId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return tankAces[hash % tankAces.length] || tankAces[0];
}
