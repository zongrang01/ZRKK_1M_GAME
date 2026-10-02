export const MANAGEMENT_ROLES = new Set([
  'Branding & Marketing Strategy',
  'Head of Marketing',
  'Sales Manager',
]);

const OWNER_EMAIL = 'haoabout@gmail.com';

type AccessPlayer = { id: string; role: string; email?: string };

export function normalizeEmail(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

export function accessFor(email: string | null, players: AccessPlayer[]) {
  const normalized = normalizeEmail(email);
  const assigned = players.filter(
    (player) => normalizeEmail(player.email) === normalized && normalized,
  );
  return {
    email: normalized,
    playerIds: assigned.map((player) => player.id),
    canManageKpi:
      normalized === OWNER_EMAIL ||
      assigned.some((player) => MANAGEMENT_ROLES.has(player.role)),
  };
}

export function mergeEmployeeKpiUpdates(
  currentPlayers: Array<Record<string, unknown>>,
  submittedPlayers: Array<Record<string, unknown>>,
  playerIds: string[],
) {
  const submitted = new Map(
    submittedPlayers.map((player) => [String(player.id), player]),
  );

  return currentPlayers.map((player) => {
    if (!playerIds.includes(String(player.id))) return player;
    const candidate = submitted.get(String(player.id));
    if (
      !candidate ||
      !Array.isArray(player.kpis) ||
      !Array.isArray(candidate.kpis)
    )
      return player;

    const proposedKpis = new Map(
      (candidate.kpis as Kpi[]).map((kpi) => [kpi.id, kpi]),
    );
    const kpis = (player.kpis as Kpi[]).map((kpi) => {
      const proposed = proposedKpis.get(kpi.id);
      return proposed
        ? {
            ...kpi,
            actual: Math.max(0, Number(proposed.actual) || 0),
            notes: String(proposed.notes ?? ''),
          }
        : kpi;
    });
    return { ...player, kpis, ...scoresFor(kpis) };
  });
}
import { scoresFor, type Kpi } from './game-rules';
