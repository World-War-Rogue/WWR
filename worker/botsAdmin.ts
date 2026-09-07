/**
 * The bots page: every bot account, a sign-in-as link for each, and a
 * plant button per world. Owner-only, same access model as the approvals
 * page (worker/admin.ts): the owner's own session, nothing in the URL.
 */
import {FARM_CEILING_SEASON_1, FARM_TARGET_PER_WORLD, PLANT_BATCH_MAX, botCountsByWorld, listBots} from './bots';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function html(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bots</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;background:#0a0c0b;color:#e5e7eb;margin:0;padding:32px 20px}
  .wrap{max-width:860px;margin:0 auto}
  .eyebrow{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#ea580c;margin:0}
  h1{font-size:22px;margin:8px 0 8px} h2{font-size:15px;margin:28px 0 10px;color:#9ca3af}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #1f2320}
  th{color:#6b7280;font-weight:500}
  a.btn{background:#ea580c;color:#fff;padding:6px 12px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px}
  button{background:#ea580c;color:#fff;border:0;padding:8px 14px;border-radius:6px;font-weight:600;font-size:13px;cursor:pointer}
  .card{border:1px solid #262626;background:#131614;border-radius:8px;padding:14px 16px;margin-bottom:12px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
  .meta{color:#9ca3af;font-size:13px}
  .note{color:#6b7280;font-size:12px;margin-top:24px;line-height:1.6}
  #out{color:#9ca3af;font-size:13px;margin-top:8px;white-space:pre-wrap}
</style>
<div class="wrap">${body}</div>`,
    {status, headers: {'Content-Type': 'text/html; charset=utf-8'}},
  );
}

export async function handleBotsPage(
  env: {DB: D1Database},
  player: {id: string; username: string; role: string},
): Promise<Response> {
  if (player.role !== 'owner') return html(`<p class="eyebrow">World War Rogue</p><h1>Not found</h1>`, 404);

  const [bots, counts, worlds] = await Promise.all([
    listBots(env.DB),
    botCountsByWorld(env.DB),
    env.DB.prepare(`SELECT id, name FROM worlds WHERE kind = 'home' ORDER BY id`).all<{id: number; name: string}>(),
  ]);
  const byWorld = new Map(counts.map((c) => [c.worldId, c]));

  const worldCards = (worlds.results ?? [])
    .map((w) => {
      const c = byWorld.get(w.id);
      return `<div class="card">
        <div><strong>${escapeHtml(w.name)}</strong> <span class="meta">#${w.id}</span><br>
          <span class="meta">${c?.farm ?? 0} farm bots · ${c?.test ?? 0} test bots</span></div>
        <button onclick="plant(${w.id}, ${c?.farm ?? 0}, ${PLANT_BATCH_MAX})">Plant ${PLANT_BATCH_MAX}</button>
        <button onclick="plant(${w.id}, ${c?.farm ?? 0}, ${FARM_TARGET_PER_WORLD})">Fill to ${FARM_TARGET_PER_WORLD}</button>
      </div>`;
    })
    .join('');

  const rows = bots
    .map(
      (b) => `<tr>
        <td>${escapeHtml(b.username)}</td>
        <td>${b.kind}</td>
        <td>${b.worldId ?? '—'}</td>
        <td>${b.commandCenter}</td>
        <td class="meta">${new Date(b.plantedAt).toISOString().slice(0, 16).replace('T', ' ')}</td>
        <td><a class="btn" href="/api/admin/impersonate?player=${encodeURIComponent(b.playerId)}">Sign in as</a></td>
      </tr>`,
    )
    .join('');

  return html(`
    <p class="eyebrow">World War Rogue</p>
    <h1>Bots</h1>
    <p class="meta">Farm bots grow on their own to Command Center ${FARM_CEILING_SEASON_1} this season, never shield, never march. Test bots are driven by tools/testbots.</p>
    <h2>Worlds</h2>
    ${worldCards || '<p class="meta">No home worlds yet.</p>'}
    <div id="out"></div>
    <h2>${bots.length} accounts</h2>
    <table><thead><tr><th>Callsign</th><th>Kind</th><th>World</th><th>CC</th><th>Planted (UTC)</th><th></th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="meta">None yet.</td></tr>'}</tbody></table>
    <p class="note">"Sign in as" replaces your own session with that account's. Sign out and back in to return to your own account.</p>
    <script>
      // Plants in small batches until the world holds the target, so no single
      // request has to create more than a handful of accounts.
      async function plant(worldId, have, target) {
        const out = document.getElementById('out');
        let total = have;
        for (let guard = 0; guard < 60 && total < target; guard += 1) {
          out.textContent = 'Planting… ' + total + ' / ' + target;
          const count = Math.min(${PLANT_BATCH_MAX}, target - total);
          const r = await fetch('/api/admin/farmbots/plant', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({worldId, count})});
          const j = await r.json().catch(() => ({}));
          if (!r.ok) { out.textContent = 'Failed at ' + total + ': ' + (j.error || r.status); return; }
          total += j.planted;
          if (j.planted === 0) break;
        }
        out.textContent = 'Planted. ' + total + ' farm bots in world ' + worldId + '. Reloading…';
        setTimeout(() => location.reload(), 800);
      }
    </script>
  `);
}
