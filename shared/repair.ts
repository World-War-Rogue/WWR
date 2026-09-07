/**
 * Damage and repair. GAME-MATH v1 §5.
 *
 * q is the share of hit points lost. Repair costs Fuel, Steel and Munitions
 * scaled by the asset's resolved firepower and armour, and takes
 * 900q seconds scaled by rank. Disabled assets are repaired, never deleted.
 * A damaged asset fights damaged and marches slower; a disabled or repairing
 * one does not march at all.
 */
import {type Asset} from './assets';
import {type Packages, NO_PACKAGES, attributesWith} from './upgrades';

export interface RepairBill {
  fuel: number;
  steel: number;
  munitions: number;
  alloy: number;
  ms: number;
  /** Share of hit points missing, 0-1. */
  q: number;
}

export function repairBill(
  asset: Asset,
  level: number,
  packages: Packages | undefined,
  boost: number,
  hpFraction: number,
): RepairBill {
  const q = Math.max(0, Math.min(1, 1 - hpFraction));
  const a = attributesWith(asset, level, packages ?? NO_PACKAGES, boost);
  const F = a.firepower;
  const A = a.armour;
  return {
    fuel: Math.ceil(20 * q * (0.7 * F + 1.3 * A)),
    steel: Math.ceil(16 * q * (0.5 * F + 1.5 * A)),
    munitions: Math.ceil(8 * q * F),
    alloy: 0,
    ms: Math.ceil(900 * q * (1 + 0.02 * level)) * 1000,
    q,
  };
}

/** A column moves no slower than half pace however battered it is. */
export function marchHpFactor(hpFraction: number): number {
  return Math.max(0.5, Math.min(1, hpFraction));
}

export function isDisabled(hpFraction: number): boolean {
  return hpFraction <= 0.0005;
}

export const REPAIR_WORDING = {
  disabled: (name: string) => `${name} is disabled. Repair it before this Task Force marches.`,
  repairing: (name: string) => `${name} is under repair. Wait for it, or move it out of the Task Force.`,
} as const;
