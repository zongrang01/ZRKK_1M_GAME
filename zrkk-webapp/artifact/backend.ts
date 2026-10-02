// Claude artifact backend: answers the dashboard's /api/state and /api/me
// requests from the artifact's shared `db` document and the viewer's
// claude.ai account, so dashboard-app.tsx runs unchanged.
import { mergeEmployeeKpiUpdates } from '../app/access';
import { seedRoster } from '../app/staff-roster';
import { defaults } from '../app/state-defaults';

type StoredState = {
  month: string;
  missions: unknown[];
  players: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
type Snap = { exists: boolean; data(): Record<string, unknown> | undefined };
type DocRef = {
  get(): Promise<Snap>;
  set(data: Record<string, unknown>): Promise<void>;
  onSnapshot(next: (s: Snap) => void, error?: (e: unknown) => void): () => void;
};
type ClaudeUse = { use(name: string): Promise<any> };

const STATE_PATH = 'app/zrkk';
const claude = (window as unknown as { claude?: ClaudeUse }).claude;

const dbPromise: Promise<any> = claude?.use('db').catch(() => null) ?? Promise.resolve(null);
const userPromise: Promise<any> = claude?.use('user').catch(() => null) ?? Promise.resolve(null);

// Live copy of the stored state, kept current by one subscription, so the
// dashboard's 5-second poll costs no store calls.
let latest: StoredState | null | undefined;
let ready: Promise<void> | undefined;
function subscribe(): Promise<void> {
  ready ??= dbPromise.then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        if (!db) return reject(new Error('db unavailable'));
        const ref: DocRef = db.doc(STATE_PATH);
        ref.onSnapshot(
          (snap) => {
            latest = snap.exists ? (snap.data() as StoredState) : null;
            resolve();
          },
          (error) => {
            ready = undefined;
            reject(error);
          },
        );
      }),
  );
  return ready;
}

// Same roster seeds as the Cloudflare route, applied in memory; they are
// stored the first time someone saves.
const withRoster = (state: StoredState) => seedRoster(state).state;

// Managers are the artifact's owner and anyone it is shared with as Editor.
// Everyone else is an employee, linked once to their own player record; the
// link lives in their private data/users/<id>/ subtree.
async function linkRef(): Promise<DocRef | null> {
  const [db, user] = await Promise.all([dbPromise, userPromise]);
  const id = user ? await user.id() : null;
  return db && id ? db.doc(`data/users/${id}/profile`) : null;
}

export async function linkedPlayerId(): Promise<string | null> {
  const ref = await linkRef();
  const snap = ref ? await ref.get().catch(() => null) : null;
  return snap?.exists ? String(snap.data()?.playerId ?? '') || null : null;
}

export async function linkPlayer(playerId: string) {
  const ref = await linkRef();
  if (!ref) throw new Error('No identity');
  await ref.set({ playerId });
}

export async function isManager() {
  const user = await userPromise;
  if (!user) return false;
  const [owner, editor] = await Promise.all([user.isOwner(), user.canEdit()]);
  return Boolean(owner || editor);
}

// Whether this viewer may change shared data under the artifact's db rules
// (only the owner and Editors once write is raised to "admin").
export async function canWriteData() {
  const user = await userPromise;
  if (!user) return false;
  return (await user.can('data.write')) !== false;
}

export async function rosterPlayers() {
  await subscribe().catch(() => undefined);
  return withRoster(latest ?? (defaults as StoredState)).players.map((p) => ({
    id: String(p.id),
    name: String(p.name ?? ''),
    role: String(p.role ?? ''),
  }));
}

async function currentAccess() {
  const [manager, playerId] = await Promise.all([isManager(), linkedPlayerId()]);
  return {
    email: '',
    playerIds: playerId ? [playerId] : [],
    canManageKpi: manager,
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

async function getState() {
  await subscribe();
  return json(withRoster(latest ?? (defaults as StoredState)));
}

async function postState(body: StoredState) {
  if (
    !body ||
    typeof body.month !== 'string' ||
    !Array.isArray(body.missions) ||
    !Array.isArray(body.players)
  )
    return json({ error: 'Invalid data' }, 400);
  const db = await dbPromise;
  if (!db) return json({ error: 'Storage unavailable' }, 503);
  const ref: DocRef = db.doc(STATE_PATH);
  const snap = await ref.get();
  const current = withRoster(
    (snap.exists ? snap.data() : defaults) as StoredState,
  );
  const access = await currentAccess();
  let players = body.players;
  if (!access.canManageKpi)
    players = mergeEmployeeKpiUpdates(
      current.players ?? [],
      body.players,
      access.playerIds,
    );
  const saved = { ...body, players, updatedAt: new Date().toISOString() };
  try {
    await ref.set(saved);
  } catch {
    return json({ error: 'Save rejected' }, 403);
  }
  latest = saved;
  return json(saved);
}

async function getMe() {
  return json(await currentAccess());
}

const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(
    typeof input === 'string' || input instanceof URL ? input : input.url,
    location.href,
  );
  const method = (init?.method ?? 'GET').toUpperCase();
  if (url.pathname === '/api/state')
    return method === 'POST'
      ? postState(JSON.parse(String(init?.body ?? 'null')))
      : getState();
  if (url.pathname === '/api/me') return getMe();
  return nativeFetch(input, init);
};
