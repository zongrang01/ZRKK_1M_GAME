// Initial app state, shared by the Cloudflare API route and the Claude artifact backend.
export const defaults = {
  month: '2026-09',
  baseTarget: 1000000,
  carryIn: 0,
  revenue: 0,
  updatedAt: '',
  missions: [
    ['m1', 'Digital Product'],
    ['m2', 'Seminar Engine'],
    ['m3', 'Agency Sales'],
    ['m4', 'Branding Consult'],
  ].map(([id, type]) => ({
    id,
    type,
    name: '',
    owner: '',
    target: 0,
    actual: 0,
    status: 'In Progress',
  })),
  players: [],
};
