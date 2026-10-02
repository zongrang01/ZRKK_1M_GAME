import { env } from 'cloudflare:workers';
import { initialPlayers } from '../../staff-roster';
import { accessFor, mergeEmployeeKpiUpdates } from '../../access';
import { defaults } from '../../state-defaults';
type StoredState = {
  month: string;
  missions: unknown[];
  players: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
export const dynamic = 'force-dynamic';
export async function GET() {
  let row = await env.DB.prepare('SELECT value FROM app_state WHERE key = ?')
    .bind('zrkk')
    .first<{ value: string }>();
  const state = row ? JSON.parse(row.value) : defaults;
  // Seed once; subsequent name edits are preserved, including intentionally blank names.
  if (!state.staffRoster20260922) {
    const players = Array.isArray(state.players) ? state.players : [];
    const additions = initialPlayers.filter(
      (seed) =>
        !players.some(
          (p: { name: string; role: string }) =>
            p.name.trim().toLowerCase() === seed.name.toLowerCase() &&
            p.role === seed.role,
        ),
    );
    const updatedAt = new Date().toISOString();
    const seeded = {
      ...state,
      players: [...players, ...additions],
      staffRoster20260922: true,
      updatedAt,
    };
    if (row)
      await env.DB.prepare(
        'UPDATE app_state SET value = ?, updated_at = ? WHERE key = ? AND value = ?',
      )
        .bind(JSON.stringify(seeded), updatedAt, 'zrkk', row.value)
        .run();
    else
      await env.DB.prepare(
        'INSERT INTO app_state (key,value,updated_at,updated_by) VALUES (?,?,?,?) ON CONFLICT(key) DO NOTHING',
      )
        .bind('zrkk', JSON.stringify(seeded), updatedAt, 'roster-setup')
        .run();
    row = await env.DB.prepare('SELECT value FROM app_state WHERE key = ?')
      .bind('zrkk')
      .first<{ value: string }>();
  }
  return Response.json(row ? JSON.parse(row.value) : state, {
    headers: { 'cache-control': 'no-store' },
  });
}
export async function POST(req: Request) {
  const body = (await req.json()) as StoredState;
  if (
    !body ||
    typeof body.month !== 'string' ||
    !Array.isArray(body.missions) ||
    !Array.isArray(body.players)
  )
    return Response.json({ error: 'Invalid data' }, { status: 400 });
  const updatedAt = new Date().toISOString();
  const user = req.headers.get('oai-authenticated-user-email') ?? 'local-user';
  const currentRow = await env.DB.prepare(
    'SELECT value FROM app_state WHERE key = ?',
  )
    .bind('zrkk')
    .first<{ value: string }>();
  const current = (
    currentRow ? JSON.parse(currentRow.value) : defaults
  ) as StoredState;
  const access = accessFor(
    user,
    (Array.isArray(current.players) ? current.players : []) as Array<{
      id: string;
      role: string;
      email?: string;
    }>,
  );
  let players = body.players;
  if (!access.canManageKpi)
    players = mergeEmployeeKpiUpdates(
      current.players ?? [],
      body.players,
      access.playerIds,
    );
  const saved = { ...body, players, updatedAt };
  await env.DB.prepare(
    'INSERT INTO app_state (key,value,updated_at,updated_by) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by',
  )
    .bind('zrkk', JSON.stringify(saved), updatedAt, user)
    .run();
  return Response.json(saved);
}
