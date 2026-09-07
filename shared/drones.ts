/**
 * Drones in a Task Force. Decided in docs/DRONE-RULES-v1.md.
 *
 * A Task Force needs at least one drone to leave the base, and may be all
 * drones. Every drone is a trade: it speeds the whole column (the Drone
 * Network) and costs every asset armour. Where a drone stands changes how
 * it fights - the front fires an opening wave and dies fast, the rear lasts
 * and shoots softer - and the resolver reads that in shared/combat.ts.
 *
 * The Network comes from each drone's own mobility and detection AFTER rank,
 * packages and the Drone Building, so Propulsion on a drone is a march
 * upgrade for its whole Task Force.
 */
import {ASSET_BY_ID} from './assets';

/** Per drone in the Task Force, on every asset's armour. Six drones = -42%. */
export const DRONE_ARMOUR_COST = 0.07;

/** The most a Drone Network may speed a march. */
export const DRONE_NETWORK_CAP = 1.25;

/** Best drone first; the rest count for less. */
export const DRONE_NETWORK_WEIGHTS = [1, 0.65, 0.45, 0.3, 0.2, 0.15] as const;

/** Front drones: the opening wave's share of a normal shot, then HP and draw. */
export const FRONT_DRONE_WAVE = 0.7;
export const FRONT_DRONE_HP = 0.78;
export const FRONT_DRONE_DRAW = 2;

/** Rear drones: hit points up, every shot down. */
export const REAR_DRONE_HP = 1.3;
export const REAR_DRONE_DAMAGE = 0.9;

export function isDrone(assetId: string): boolean {
  return ASSET_BY_ID[assetId]?.category === 'drone';
}

export function droneCount(assetIds: ReadonlyArray<string | null | undefined>): number {
  return assetIds.filter((id) => id && isDrone(id)).length;
}

/** What the Task Force's armour is multiplied by for carrying this many drones. */
export function droneArmourMultiplier(drones: number): number {
  return Math.max(0, 1 - DRONE_ARMOUR_COST * Math.max(0, drones));
}

/** One drone's share of the Network, from its resolved mobility and detection. */
export function droneContribution(mobility: number, detection: number): number {
  return 0.02 + 0.012 * Math.log(1 + Math.max(0, mobility)) + 0.002 * Math.log(1 + Math.max(0, detection));
}

/**
 * The Network multiplier for a set of drones. Order-independent: drones are
 * sorted by contribution (ties by id) before the weights apply, so the same
 * six drones in any slots give the same number.
 */
export function droneNetworkMultiplier(
  drones: ReadonlyArray<{id: string; mobility: number; detection: number}>,
): number {
  const sorted = drones
    .map((d) => ({id: d.id, c: droneContribution(d.mobility, d.detection)}))
    .sort((a, b) => b.c - a.c || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let total = 0;
  sorted.forEach((d, i) => {
    total += d.c * (DRONE_NETWORK_WEIGHTS[i] ?? 0);
  });
  return Math.min(DRONE_NETWORK_CAP, 1 + total);
}

/**
 * The mobility the column paces on: the slowest non-drone, or the slowest
 * drone when there is nothing else. Drones never slow a column.
 */
export function paceMobility(units: ReadonlyArray<{id: string; mobility: number}>): number {
  const ground = units.filter((u) => !isDrone(u.id));
  const pool = ground.length > 0 ? ground : units;
  return pool.length === 0 ? 5 : Math.min(...pool.map((u) => u.mobility));
}

export const DRONE_WORDING = {
  needDrone: 'Add a Drone to deploy this Task Force. Drones provide recon and march speed.',
  slotHint: 'Front: opening wave, −22% HP, draws 2× fire. Rear: +30% HP, −10% damage.',
  propulsion: 'Propulsion on any deployed drone raises Drone Network march speed.',
  network: (mult: number, drones: number) =>
    `Drone Network — ×${mult.toFixed(2)} March Speed · −${Math.round(DRONE_ARMOUR_COST * drones * 100)}% Armour`,
} as const;
