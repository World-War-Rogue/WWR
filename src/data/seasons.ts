import { SeasonTheater } from '../types';

export const SEASONS_DATA: SeasonTheater[] = [
  {
    id: 'sandstorm',
    seasonNumber: 1,
    name: 'Season 1: Operation Sandstorm',
    codeName: 'SCORCHED DUST',
    theaterLocation: 'Al-Khabar Petroleum Basin & Arid Dunes',
    terrainType: 'Loose Dune Sand, Rocky Canyons & Oil Well Outposts',
    weatherCondition: 'Choking Dust Storms & 48°C Thermal Shimmer',
    buffDescription: 'Thermal Gen-3 Optics gain +30% target acquisition range through heat waves.',
    debuffDescription: 'Optical sights suffer -35% effective range during howling dust storms; wheeled units burn +20% fuel.',
    accentColor: '#f59e0b', // Amber / Desert gold
    bgColor: '#1c160c',
    cardBanner: 'Dunes & Desert Warfare',
    hazardEffect: {
      opticModifier: 0.65,
      speedModifier: 0.9,
      fuelConsumptionRate: 1.2,
    },
  },
  {
    id: 'frostbite',
    seasonNumber: 2,
    name: 'Season 2: Operation Frostbite',
    codeName: 'GLACIAL SILO',
    theaterLocation: 'Siberian Permafrost & Sub-Zero Mountain Silos',
    terrainType: 'Deep Powder Snow, Glacial Pack Ice & Pine Tree Bluffs',
    weatherCondition: 'Violent Sub-Zero Blizzards & Extreme Freezing Fog',
    buffDescription: 'Tracer munitions and muzzle flashes provide +25% visual tracking against high-contrast snow.',
    debuffDescription: 'Heavy tanks suffer -20% tread traverse speed in deep drifts; battery/shield recovery reduced by 15%.',
    accentColor: '#38bdf8', // Frost Blue
    bgColor: '#0c1520',
    cardBanner: 'Arctic Glaciers & Polar Front',
    hazardEffect: {
      opticModifier: 0.85,
      speedModifier: 0.8,
      fuelConsumptionRate: 1.15,
    },
  },
  {
    id: 'iron_jungle',
    seasonNumber: 3,
    name: 'Season 3: Operation Iron Jungle',
    codeName: 'MONSOON DELTA',
    theaterLocation: 'Mekong River Delta & Triple-Canopy Rainforest',
    terrainType: 'Muddy Switchbacks, River Chokepoints & Mangrove Swamps',
    weatherCondition: 'Monsoon Torrential Rain & Dense Canopy Mist',
    buffDescription: 'Amphibious and light recon units gain +35% ambush concealment bonus within foliage.',
    debuffDescription: 'Dense canopy blocks high-altitude airstrikes; heavy vehicles experience high mud friction (-18% speed).',
    accentColor: '#10b981', // Emerald / Tactical Olive
    bgColor: '#0a1a12',
    cardBanner: 'Tropical Canopy & River Warfare',
    hazardEffect: {
      opticModifier: 0.75,
      speedModifier: 0.82,
      fuelConsumptionRate: 1.05,
    },
  },
  {
    id: 'neo_rogue',
    seasonNumber: 4,
    name: 'Season 4: Operation Neo-Rogue (Elite)',
    codeName: 'SHATTERED METROPOLIS',
    theaterLocation: 'New Geneva Megacity Ruins & Sub-Terranean Forts',
    terrainType: 'Reinforced Concrete Rubble, Skybridge Chokepoints & Steel Grid',
    weatherCondition: 'Acid Precipitation & Localized EMP Grid Flashes',
    buffDescription: 'Kinetic armor ricochet probability increased by +40% off angled skyscraper ruins.',
    debuffDescription: 'High destructible density causes secondary structural collapse damage when heavy munitions detonate.',
    accentColor: '#a855f7', // Cyber Purple
    bgColor: '#160d21',
    cardBanner: 'Urban Megacity Ruins',
    hazardEffect: {
      opticModifier: 0.9,
      speedModifier: 0.95,
      fuelConsumptionRate: 1.0,
    },
  },
];
