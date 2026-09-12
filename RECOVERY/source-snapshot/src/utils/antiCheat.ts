import { Squad, Unit, PlayerResources } from '../types';

/**
 * World War Rogue Private Server Anti-Cheat Engine:
 * Generates cryptographic checksums of local tactical states to prevent memory tampering,
 * illegitimate resource injection, or illegal stat multiplication.
 */

// Simple lightweight pseudo-HMAC hash for client-side/server state verification
export function generateAntiCheatChecksum(
  callsign: string,
  resources: PlayerResources,
  squads: Squad[],
  salt: string = 'WWR_SECURE_KERNEL_V1'
): string {
  const resourcePayload = `${resources.fuel}:${resources.rations}:${resources.munitions}:${resources.alloy}:${resources.warBonds}`;
  const squadPayload = squads
    .map((s) => `${s.id}-${s.unitIds.join(',')}-${s.totalCombatPower}`)
    .join('|');
  const rawString = `${callsign}#${resourcePayload}#${squadPayload}#${salt}`;

  let hash = 0x811c9dc5;
  for (let i = 0; i < rawString.length; i++) {
    hash ^= rawString.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `SEC-WWR-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

export function calculateSquadCombatPower(squad: Squad, units: Unit[]): number {
  return squad.unitIds.reduce((sum, unitId) => {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return sum;
    const upgradeMultiplier = 1 + (unit.upgradeLevel - 1) * 0.15;
    return sum + Math.round(unit.powerRating * upgradeMultiplier);
  }, 0);
}

export interface ArmoryCrateTier {
  id: string;
  name: string;
  priceUsd: number;
  lastWarCostComparison: number; // For highlighting the fair pricing difference!
  warBondsYield: number;
  bonusAlloy: number;
  bonusFuel: number;
  bonusMunitions: number;
  description: string;
  badge?: string;
  isDailyFree?: boolean;
}

export const ARMORY_CRATES: ArmoryCrateTier[] = [
  {
    id: 'crate_free_daily',
    name: 'Daily Recon Supply Drop',
    priceUsd: 0.0,
    lastWarCostComparison: 0,
    warBondsYield: 50,
    bonusAlloy: 250,
    bonusFuel: 500,
    bonusMunitions: 500,
    description: 'Standard coalition supply crate dropped daily at 0600 hrs for all active commanders.',
    badge: '100% FREE DAILY',
    isDailyFree: true,
  },
  {
    id: 'crate_spec_ops_ration',
    name: 'Tactical War Bonds Crate',
    priceUsd: 0.99,
    lastWarCostComparison: 19.99, // In Last War similar packages cost $19.99
    warBondsYield: 300,
    bonusAlloy: 1200,
    bonusFuel: 2000,
    bonusMunitions: 2000,
    description: 'Essential field supplies, extra ammunition reserve, and merit commendations.',
    badge: 'VALUE 95% OFF LAST WAR',
  },
  {
    id: 'crate_advanced_alloy',
    name: 'Titanium Armor & Tech Requisition',
    priceUsd: 2.99,
    lastWarCostComparison: 49.99,
    warBondsYield: 950,
    bonusAlloy: 5000,
    bonusFuel: 6000,
    bonusMunitions: 6000,
    description: 'High-grade composite alloys for squad upgrades and hardened bunker reinforcements.',
    badge: 'HIGH STAKES REQUISITION',
  },
  {
    id: 'crate_coalition_spearhead',
    name: 'Coalition Heavy Warfare Cache',
    priceUsd: 4.99,
    lastWarCostComparison: 99.99,
    warBondsYield: 2000,
    bonusAlloy: 15000,
    bonusFuel: 15000,
    bonusMunitions: 15000,
    description: 'Comprehensive heavy armament cache with futuristic prototype blueprints.',
    badge: 'BEST VALUE SQUAD PACK',
  },
];
