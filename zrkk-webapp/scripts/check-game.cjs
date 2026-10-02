const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const rulesText = fs.readFileSync('app/game-rules.ts', 'utf8');
const rules = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(rulesText, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: rules.exports, module: rules },
);
const { previousMonth, kpiScore, templateFor, scoresFor, totalScore } =
  rules.exports;
const accessModule = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('app/access.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  {
    exports: accessModule.exports,
    module: accessModule,
    require: (id) => (id === './game-rules' ? rules.exports : require(id)),
  },
);
const { accessFor, mergeEmployeeKpiUpdates } = accessModule.exports;
assert.equal(previousMonth('2027-01'), '2026-12');
assert.equal(
  kpiScore({ target: 0, actual: 12, weight: 10, direction: 'up' }),
  0,
);
assert.equal(
  kpiScore({ target: 10, actual: 20, weight: 10, direction: 'up' }),
  10,
);
assert.equal(
  kpiScore({ target: 10, actual: 20, weight: 10, direction: 'down' }),
  5,
);
assert.equal(
  kpiScore({ target: 10, actual: 0, weight: 10, direction: 'down' }),
  10,
);
assert.equal(Object.keys(rules.exports.roleTemplates).length, 8);
for (const role of Object.keys(rules.exports.roleTemplates)) {
  const rows = templateFor(role).map((k) => ({ ...k, target: 10, actual: 10 }));
  assert.equal(totalScore(scoresFor(rows)), 100);
}
const source = fs.readFileSync('app/dashboard-app.tsx', 'utf8');
const functions = source.slice(
  source.indexOf('function refreshRevenue'),
  source.indexOf('const missionSeed'),
);
const context = { previousMonth };
vm.createContext(context);
vm.runInContext(
  ts.transpileModule(functions, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText,
  context,
);
const month = (key, actual) => ({
  month: key,
  baseTarget: 1000000,
  carryIn: 0,
  revenue: actual,
  otherRevenue: 0,
  missions: [{ actual }],
  customers: [],
  players: [],
});
const november = {
  ...month('2026-11', 0),
  history: {
    '2026-09': month('2026-09', 820000),
    '2026-10': month('2026-10', 1300000),
  },
};
const result = context.reconcileMonths(november);
assert.equal(result.history['2026-10'].carryIn, 180000);
assert.equal(result.carryIn, 0);
november.history['2026-09'].missions[0].actual = 700000;
november.history['2026-10'].missions[0].actual = 1100000;
assert.equal(context.reconcileMonths(november).carryIn, 200000);
assert.equal(
  context.refreshRevenue({
    ...month('2026-09', 100000),
    customers: [{ actual: 20000 }],
    credits: [{ amount: 100000 }],
  }).revenue,
  120000,
);
assert.equal(context.snapshot(november).history, undefined);
const accessPlayers = [
  { id: 'manager', role: 'Head of Marketing', email: 'boss@zrkk.co' },
  { id: 'staff', role: 'Production', email: 'staff@zrkk.co' },
];
assert.equal(accessFor('BOSS@ZRKK.CO', accessPlayers).canManageKpi, true);
assert.equal(accessFor('staff@zrkk.co', accessPlayers).canManageKpi, false);
assert.deepEqual(accessFor('staff@zrkk.co', accessPlayers).playerIds, [
  'staff',
]);
assert.deepEqual(accessFor('unknown@zrkk.co', accessPlayers).playerIds, []);
const currentPlayers = [
  {
    id: 'staff',
    name: 'Original',
    role: 'Production',
    kpis: [
      {
        id: 'k1',
        category: 'roleScore',
        label: 'Approved KPI',
        target: 10,
        actual: 1,
        weight: 10,
        direction: 'up',
        notes: '',
      },
    ],
  },
  {
    id: 'other',
    name: 'Other',
    role: 'Admin',
    kpis: [
      {
        id: 'k2',
        category: 'roleScore',
        label: 'Other KPI',
        target: 10,
        actual: 2,
        weight: 10,
        direction: 'up',
        notes: '',
      },
    ],
  },
];
const submittedPlayers = JSON.parse(JSON.stringify(currentPlayers));
submittedPlayers[0].name = 'Tampered';
submittedPlayers[0].kpis[0].label = 'Tampered KPI';
submittedPlayers[0].kpis[0].target = 1;
submittedPlayers[0].kpis[0].actual = 7;
submittedPlayers[0].kpis[0].notes = 'proof';
submittedPlayers[1].kpis[0].actual = 9;
const mergedPlayers = mergeEmployeeKpiUpdates(
  currentPlayers,
  submittedPlayers,
  ['staff'],
);
assert.equal(mergedPlayers[0].name, 'Original');
assert.equal(mergedPlayers[0].kpis[0].label, 'Approved KPI');
assert.equal(mergedPlayers[0].kpis[0].target, 10);
assert.equal(mergedPlayers[0].kpis[0].actual, 7);
assert.equal(mergedPlayers[0].kpis[0].notes, 'proof');
assert.equal(mergedPlayers[0].roleScore, 7);
assert.equal(mergedPlayers[1].kpis[0].actual, 2);
const rosterModule = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('app/staff-roster.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: rosterModule.exports, module: rosterModule },
);
const { initialPlayers, withoutRetiredDuplicates, duplicateNames, seedRoster } =
  rosterModule.exports;
assert.equal(initialPlayers.length, 10);
assert.equal(
  initialPlayers.find((p) => p.name === 'Bumm').role,
  'Graphic Designer / Contents Creator & AI Expert',
);
const fresh = seedRoster({ players: [] });
assert.equal(fresh.state.players.length, 10);
const seededBefore = seedRoster({
  players: [{ id: 'staff-0-jane', name: 'Jane' }],
  staffRoster20260922: true,
});
assert.equal(seededBefore.state.players.map((p) => p.name).join(','), 'Jane,Bumm');
assert.equal(seedRoster(seededBefore.state).changed, false);
assert.equal(duplicateNames(initialPlayers).size, 0);
assert.equal(
  initialPlayers.find((p) => p.name === 'Fa').role,
  'Branding Consultant / Trainer',
);
const legacyRoster = [
  { id: 'staff-0-vee', name: 'Vee' },
  { id: 'staff-1-vee', name: 'Vee' },
  { id: 'staff-3-pooh', name: 'Pooh' },
  { id: 'custom', name: ' vee ' },
];
assert.deepEqual(
  withoutRetiredDuplicates(legacyRoster).map((p) => p.id),
  ['staff-0-vee', 'staff-3-pooh', 'custom'],
);
assert.deepEqual(Array.from(duplicateNames(legacyRoster)), ['vee']);
console.log(
  'Passed: 8 role templates, score boundaries, month carry-forward, revenue total, manager/employee access rules, and unique roster names with seeded additions.',
);
