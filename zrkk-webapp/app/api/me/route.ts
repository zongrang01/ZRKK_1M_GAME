import { env } from 'cloudflare:workers';
import { accessFor } from '../../access';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const row = await env.DB.prepare('SELECT value FROM app_state WHERE key = ?')
    .bind('zrkk')
    .first<{ value: string }>();
  const state = row ? JSON.parse(row.value) : { players: [] };
  const access = accessFor(
    req.headers.get('oai-authenticated-user-email'),
    Array.isArray(state.players) ? state.players : [],
  );
  return Response.json(access, { headers: { 'cache-control': 'no-store' } });
}
