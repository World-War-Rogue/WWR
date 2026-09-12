/**
 * The approvals page.
 *
 * An owner-only page listing everyone waiting, with approve and decline
 * buttons. It exists so that email being misconfigured never stops a tester
 * getting in, and so there is somewhere to see the queue rather than only
 * being notified about it.
 *
 * Access is the owner's own signed-in session. There is no shared key and
 * nothing secret in the URL, so nothing lands in browser history or in logs
 * along the way, and there is no secret to rotate or lose. Owner rights are
 * granted only with database access (scripts/promote_owner.sql), so a
 * compromised account cannot promote itself.
 */

function html(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Access requests</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;background:#0a0c0b;color:#e5e7eb;margin:0;padding:32px 20px}
  .wrap{max-width:720px;margin:0 auto}
  .eyebrow{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#ea580c;margin:0}
  h1{font-size:22px;margin:8px 0 24px}
  .card{border:1px solid #262626;background:#131614;border-radius:8px;padding:16px;margin-bottom:12px}
  .row{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start}
  .name{font-weight:600;font-size:16px;margin:0 0 4px}
  .meta{color:#9ca3af;font-size:13px;margin:0}
  .actions{display:flex;gap:8px;align-items:center}
  a.btn{background:#ea580c;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px}
  a.ghost{color:#9ca3af;text-decoration:underline;font-size:14px}
  .empty{color:#6b7280;font-size:14px}
  .note{color:#6b7280;font-size:12px;margin-top:24px;line-height:1.6}
</style>
<div class="wrap">${body}</div>`,
    {status, headers: {'Content-Type': 'text/html; charset=utf-8'}},
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface PendingRow {
  id: string;
  email: string;
  username: string;
  country: string;
  skin: string;
  created_at: number;
  decide_token: string;
}

export async function handleAdminRequests(
  env: {DB: D1Database},
  player: {id: string; username: string; role: string},
): Promise<Response> {
  // A signed-in player who is not the owner is told the page does not exist,
  // rather than that they are not allowed - there is no reason to confirm to
  // an ordinary account that an approvals page is there at all.
  if (player.role !== 'owner') {
    return html(`<p class="eyebrow">World War Rogue</p><h1>Not found</h1>`, 404);
  }

  const rows = await env.DB.prepare(
    `SELECT id, email, username, country, skin, created_at, decide_token
       FROM signups WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100`,
  ).all<PendingRow>();

  const pending = rows.results ?? [];
  const decided = await env.DB.prepare(
    `SELECT status, COUNT(*) AS n FROM signups WHERE status != 'pending' GROUP BY status`,
  ).all<{status: string; n: number}>();

  const summary = (decided.results ?? [])
    .map((r) => `${r.n} ${escapeHtml(r.status)}`)
    .join(' · ');

  const cards = pending.length
    ? pending
        .map((row) => {
          const waited = Math.max(0, Math.round((Date.now() - row.created_at) / 60000));
          const waitedText =
            waited < 60 ? `${waited} min ago` : `${Math.round(waited / 60)} h ago`;
          return `<div class="card"><div class="row">
            <div>
              <p class="name">${escapeHtml(row.username)}</p>
              <p class="meta">${escapeHtml(row.email)} · ${escapeHtml(row.country)} · ${escapeHtml(row.skin)}</p>
              <p class="meta">Requested ${waitedText}</p>
            </div>
            <div class="actions">
              <a class="btn" href="/api/access/decide?token=${encodeURIComponent(row.decide_token)}&decision=approve">Approve</a>
              <a class="ghost" href="/api/access/decide?token=${encodeURIComponent(row.decide_token)}&decision=decline">Decline</a>
            </div>
          </div></div>`;
        })
        .join('')
    : `<p class="empty">Nobody is waiting.</p>`;

  return html(
    `<p class="eyebrow">World War Rogue</p>
     <h1>Access requests</h1>
     ${cards}
     <p class="note">
       ${pending.length} pending${summary ? ` · ${summary}` : ''}.
       Signed in as ${escapeHtml(player.username)}.
     </p>`,
  );
}
