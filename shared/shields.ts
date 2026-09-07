/**
 * Shields. ONBOARDING, SHIELDS & CONSTRUCTION v1 §2, with the owner's
 * ruling that only an ATTACK is hostile: reinforcing, moving the base and
 * the alliance rendezvous never touch a shield.
 *
 * A shielded base cannot be attacked or raided. One shield at a time, no
 * stacking, a cooldown after. A new account gets 48 hours; every week
 * brings one 8-hour and one 4-hour coupon that expire with the week; three
 * durations are sold for Tokens or Credits at equal value.
 */
export const NEW_SHIELD_MS = 48 * 3_600_000;
export const SHIELD_COOLDOWN_MS = 4 * 3_600_000;

export type ShieldKind = 'new' | 'coupon8' | 'coupon4' | 'paid8' | 'paid24' | 'paid72';

export const SHIELD_OPTIONS: ReadonlyArray<{kind: ShieldKind; ms: number; price: number; label: string}> = [
  {kind: 'coupon8', ms: 8 * 3_600_000, price: 0, label: '8-hour shield (free this week)'},
  {kind: 'coupon4', ms: 4 * 3_600_000, price: 0, label: '4-hour shield (free this week)'},
  {kind: 'paid8', ms: 8 * 3_600_000, price: 250, label: '8-hour shield'},
  {kind: 'paid24', ms: 24 * 3_600_000, price: 600, label: '24-hour shield'},
  {kind: 'paid72', ms: 72 * 3_600_000, price: 1500, label: '72-hour shield'},
];

export function shieldOption(kind: string) {
  return SHIELD_OPTIONS.find((o) => o.kind === kind) ?? null;
}

export function isShielded(shieldUntil: number | null | undefined, now: number): boolean {
  return typeof shieldUntil === 'number' && shieldUntil > now;
}

export const SHIELD_WORDING = {
  targetBlocked: 'This base is protected. Your Task Force cannot attack until the shield expires.',
  popupBody: 'Attacks and raids cannot land while this shield is active.',
  inbound: 'Shield unavailable: hostile march inbound.',
  outbound: 'Shield unavailable: an Attack is in progress.',
  active: 'Shield unavailable: another shield is active.',
  cooldown: (until: string) => `Shield unavailable until ${until}.`,
  confirm: (duration: string, until: string) =>
    `Your base cannot be attacked or raided until ${until}. You cannot attack while shielded.`,
} as const;
