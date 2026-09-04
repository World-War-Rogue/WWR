/**
 * Access requests, the age check, and the mail that carries a decision.
 *
 * The game is closed: registering creates a request, and an account exists
 * only once somebody has approved it.
 */

export type Validation<T> = {ok: true; value: T} | {ok: false; error: string};

/** Minimum age to hold an account. */
export const MINIMUM_AGE = 18;

/**
 * Callsign rules: 6-20 letters, nothing else.
 *
 * Letters only keeps names readable at nameplate size on the map and avoids
 * the impersonation tricks that digits and punctuation invite - a zero for an
 * O, a dot inserted into somebody else's name.
 */
export const CALLSIGN_PATTERN = /^[A-Za-z]{6,20}$/;
export const CALLSIGN_RULE = 'Callsign must be 6-20 letters, no numbers or symbols.';

export function validateCallsign(value: unknown): Validation<string> {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!CALLSIGN_PATTERN.test(name)) return {ok: false, error: CALLSIGN_RULE};
  return {ok: true, value: name};
}

/** Deliberately permissive: the only real test of an address is mail arriving at it. */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value) && value.length <= 254;
}

export function isCountryCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value);
}

export interface AccessRequest {
  email: string;
  username: string;
  password: string;
  country: string;
  locale: string;
  skin: string;
}

export function validateAccessRequest(body: unknown): Validation<AccessRequest> {
  if (typeof body !== 'object' || body === null) return {ok: false, error: 'Expected a JSON object.'};
  const b = body as Record<string, unknown>;

  const email = typeof b.email === 'string' ? b.email.trim() : '';
  if (!isPlausibleEmail(email)) return {ok: false, error: 'Enter a valid email address.'};

  const callsign = validateCallsign(b.username);
  if (!callsign.ok) return {ok: false, error: callsign.error};
  const username = callsign.value;

  const password = typeof b.password === 'string' ? b.password : '';
  if (password.length < 8 || password.length > 200) {
    return {ok: false, error: 'Password must be at least 8 characters.'};
  }

  // A declaration, not a verified fact - and checked here rather than trusted
  // from the form, because a form control is not a security boundary.
  if (b.ageConfirmed !== true) {
    return {ok: false, error: `You must confirm you are ${MINIMUM_AGE} or over.`};
  }

  const country = typeof b.country === 'string' ? b.country.toUpperCase() : '';
  if (!isCountryCode(country)) return {ok: false, error: 'Choose your country.'};

  const locale = typeof b.locale === 'string' && /^[a-z]{2}$/.test(b.locale) ? b.locale : 'en';
  const skin = typeof b.skin === 'string' ? b.skin : 'desert_fob';

  return {ok: true, value: {email, username, password, country, locale, skin}};
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface MailerConfig {
  apiKey: string;
  from: string;
  owner: string;
}

/**
 * Sends one message through Resend.
 *
 * Failures are reported to the caller rather than thrown: an access request
 * that was stored successfully should not look like a server error just
 * because the notification did not go out.
 */
export async function sendMail(
  config: MailerConfig,
  to: string,
  subject: string,
  html: string,
): Promise<{ok: true} | {ok: false; error: string}> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({from: config.from, to: [to], subject, html}),
    });
    if (!response.ok) {
      const detail = await response.text();
      return {ok: false, error: `Resend ${response.status}: ${detail.slice(0, 300)}`};
    }
    return {ok: true};
  } catch (error) {
    return {ok: false, error: error instanceof Error ? error.message : 'Mail request failed.'};
  }
}

export function approvalEmail(params: {
  username: string;
  email: string;
  country: string;
  origin: string;
  token: string;
  pendingCount: number;
}): {subject: string; html: string} {
  const approve = `${params.origin}/api/access/decide?token=${params.token}&decision=approve`;
  const decline = `${params.origin}/api/access/decide?token=${params.token}&decision=decline`;

  // The applicant's own words are escaped: a callsign is untrusted input, and
  // it is being put into an HTML document that lands in your inbox.
  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px">
      <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#c2410c;margin:0">
        World War Rogue
      </p>
      <h2 style="margin:6px 0 16px;font-size:20px">Access request</h2>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Callsign</td><td><strong>${escapeHtml(params.username)}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Email</td><td>${escapeHtml(params.email)}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Country</td><td>${escapeHtml(params.country)}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Age</td><td>Confirmed 18 or over</td></tr>
      </table>
      <p style="margin:20px 0">
        <a href="${approve}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Approve</a>
        <a href="${decline}" style="margin-left:10px;color:#6b7280;text-decoration:underline">Decline</a>
      </p>
      <p style="font-size:12px;color:#9ca3af;margin:0">
        ${params.pendingCount} request${params.pendingCount === 1 ? '' : 's'} pending.
        These links work once.
      </p>
    </div>`;

  return {subject: `Access request: ${params.username}`, html};
}

export function decisionEmail(params: {username: string; approved: boolean; origin: string}): {
  subject: string;
  html: string;
} {
  const html = params.approved
    ? `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px">
         <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#c2410c;margin:0">World War Rogue</p>
         <h2 style="margin:6px 0 12px;font-size:20px">You're in, ${escapeHtml(params.username)}</h2>
         <p style="font-size:14px;color:#374151">Your access request has been approved. Sign in with the callsign and password you chose.</p>
         <p style="margin:18px 0"><a href="${params.origin}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Sign in</a></p>
       </div>`
    : `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px">
         <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#c2410c;margin:0">World War Rogue</p>
         <h2 style="margin:6px 0 12px;font-size:20px">Access request declined</h2>
         <p style="font-size:14px;color:#374151">Your request to join World War Rogue was not approved. The game is in closed testing and places are limited.</p>
       </div>`;

  return {
    subject: params.approved ? 'Your World War Rogue access is approved' : 'World War Rogue access request',
    html,
  };
}
