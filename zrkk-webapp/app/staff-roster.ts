export const staffRoster = [
  ['Branding & Marketing Strategy', ['Vee', 'Jane']],
  ['Head of Marketing', ['Pooh', 'Vee']],
  [
    'Graphic Designer / Contents Creator & AI Expert',
    ['Nueng', 'Kaew', 'Aeaw', 'Bumm'],
  ],
  ['Production', ['Fa', 'Pooh', 'Kaew']],
  ['Branding Consultant / Trainer', ['Fa']],
  ['Seminar Organizer', ['Joo']],
  ['Sales Manager', ['Tong']],
  ['Admin', ['Joo']],
] as const;
// People listed under two roles keep one record, scored on this role's KPI.
// Their other role is still shown in staffRoster for the org structure.
export const primaryRole: Record<string, string> = {
  Vee: 'Branding & Marketing Strategy',
  Pooh: 'Head of Marketing',
  Kaew: 'Graphic Designer / Contents Creator & AI Expert',
  Fa: 'Branding Consultant / Trainer',
  Joo: 'Seminar Organizer',
};
const rosterEntries = staffRoster.flatMap(([role, names], roleIndex) =>
  names.map((name) => ({
    id: `staff-${roleIndex}-${name.toLowerCase()}`,
    name,
    role,
    kept: (primaryRole[name] ?? role) === role,
  })),
);
// Ids of the duplicate records the roster created before 2026-10-02.
export const retiredRosterIds = rosterEntries
  .filter((entry) => !entry.kept)
  .map((entry) => entry.id);
export const initialPlayers = rosterEntries
  .filter((entry) => entry.kept)
  .map(({ id, name, role }) => ({
    id,
    name,
    email: '',
    role,
    roleScore: 0,
    revenue: 0,
    growth: 0,
    collaboration: 0,
    execution: 0,
  }));

export const nameKey = (name: string) => name.trim().toLowerCase();

// Drops the retired duplicate roster records when the person's kept record
// is present, so each name appears once in KPI รายบุคคล.
export function withoutRetiredDuplicates<P extends { id: string; name: string }>(
  players: P[],
): P[] {
  const keptNames = new Set(
    players
      .filter((p) => !retiredRosterIds.includes(p.id))
      .map((p) => nameKey(p.name)),
  );
  return players.filter(
    (p) => !retiredRosterIds.includes(p.id) || !keptNames.has(nameKey(p.name)),
  );
}

// Names (as typed) that more than one player uses; blank names are ignored.
export function duplicateNames(players: Array<{ name: string }>) {
  const seen = new Map<string, number>();
  for (const p of players)
    if (nameKey(p.name)) seen.set(nameKey(p.name), (seen.get(nameKey(p.name)) ?? 0) + 1);
  return new Set(
    Array.from(seen)
      .filter(([, n]) => n > 1)
      .map(([key]) => key),
  );
}

// Roster seeds, each applied once per stored state so later renames and
// deletions stick. Add a new step (new flag) to add people to live data.
const rosterSeeds: Array<{ flag: string; ids?: string[] }> = [
  { flag: 'staffRoster20260922' },
  { flag: 'staffRoster20261002', ids: ['staff-2-bumm'] },
];

export function seedRoster<S extends { players?: unknown }>(
  state: S,
): { state: S; changed: boolean } {
  let players = (Array.isArray(state.players) ? state.players : []) as Array<{
    id?: unknown;
    name?: unknown;
  }>;
  const flags: Record<string, true> = {};
  for (const { flag, ids } of rosterSeeds) {
    if ((state as Record<string, unknown>)[flag]) continue;
    const taken = new Set(players.map((p) => nameKey(String(p.name ?? ''))));
    const additions = initialPlayers.filter(
      (seed) => (!ids || ids.includes(seed.id)) && !taken.has(nameKey(seed.name)),
    );
    players = [...players, ...additions];
    flags[flag] = true;
  }
  if (!Object.keys(flags).length) return { state, changed: false };
  return { state: { ...state, players, ...flags }, changed: true };
}
