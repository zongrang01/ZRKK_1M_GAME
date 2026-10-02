'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Building2,
  ChevronDown,
  CircleDollarSign,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  duplicateNames,
  initialPlayers,
  nameKey,
  withoutRetiredDuplicates,
} from './staff-roster';
import { CreditBoard, OrgStructure, PlayerDetails } from './game-details';
import {
  caps,
  totalScore,
  previousMonth,
  type Kpi,
  type Credit,
} from './game-rules';
type Mission = {
  id: string;
  type: string;
  name: string;
  customerNames?: string;
  owner: string;
  teamMembers?: string;
  target: number;
  actual: number;
  status: string;
  channel?: string;
  targetCount?: number;
  actualCount?: number;
  talkTarget?: number;
  talkActual?: number;
  proposalTarget?: number;
  proposalActual?: number;
  prospects?: Prospect[];
};
type Prospect = {
  id: string;
  company: string;
  sourcedBy: string;
  owner: string;
  status: string;
  nextFollowUp: string;
  notes: string;
};
type Customer = {
  id: string;
  name: string;
  owner?: string;
  teamMembers?: string;
  visits: number;
  presentations: number;
  followUps: number;
  target?: number;
  actual?: number;
};
type Player = {
  id: string;
  name: string;
  email?: string;
  role: string;
  roleScore: number;
  revenue: number;
  growth: number;
  collaboration: number;
  execution: number;
  kpis?: Kpi[];
};
type State = {
  month: string;
  baseTarget: number;
  carryIn: number;
  revenue: number;
  updatedAt: string;
  missions: Mission[];
  customers: Customer[];
  players: Player[];
  credits?: Credit[];
  collectedRevenue?: number;
  otherRevenue?: number;
  history?: Record<string, Omit<State, 'history'>>;
};
function refreshRevenue(state: State): State {
  const total =
    state.missions.reduce((sum, m) => sum + m.actual, 0) +
    (state.customers ?? []).reduce((sum, c) => sum + (c.actual ?? 0), 0);
  const otherRevenue =
    state.otherRevenue ?? (state.revenue > 0 ? state.revenue - total : 0);
  return { ...state, otherRevenue, revenue: Math.max(0, total + otherRevenue) };
}
function snapshot(state: State): Omit<State, 'history'> {
  const { history, ...rest } = refreshRevenue(state);
  return rest;
}
function reconcileMonths(state: State): State {
  const months = { ...state.history, [state.month]: snapshot(state) };
  for (const month of Object.keys(months).sort()) {
    const prev = months[previousMonth(month)];
    months[month] = snapshot({
      ...months[month],
      ...(prev
        ? {
            carryIn: Math.max(0, prev.baseTarget + prev.carryIn - prev.revenue),
          }
        : {}),
    });
  }
  const active = months[state.month];
  delete months[state.month];
  return { ...active, history: months };
}
const missionSeed: Mission[] = [
  ['seminar-sme', 'Seminar Organizer', 'SME Branding'],
  ['seminar-belivin', 'Seminar Organizer', "belivin' ทำโรงแรมจากตึกเก่า"],
  ['seminar-ai', 'Seminar Organizer', 'Work smart with AI'],
  ['consult-workshop', 'Branding Consultant', '2 days workshop'],
  [
    'strategy-branding',
    'Branding & Marketing Strategy',
    'Branding Strategy Playbook',
  ],
  [
    'strategy-marketing',
    'Branding & Marketing Strategy',
    'Marketing Strategy Playbook',
  ],
  ['strategy-head', 'Branding & Marketing Strategy', 'head of marketing'],
  ['strategy-content', 'Branding & Marketing Strategy', 'contents strategy'],
  ['strategy-pillars', 'Branding & Marketing Strategy', 'contents pillars'],
].map(([id, type, name]) => ({
  id,
  type,
  name,
  owner: '',
  target: id === 'consult-workshop' ? 138000 : 0,
  actual: 0,
  status: 'In Progress',
  channel: type === 'Seminar Organizer' ? 'Offline + Online' : '',
  targetCount: id === 'consult-workshop' ? 2 : undefined,
  actualCount: id === 'consult-workshop' ? 0 : undefined,
}));
const customerSeed: Customer[] = [
  'Aeon',
  'Bangkok bank',
  'BLA ประกันของธนาคารกรุงเทพ',
  'Prudential',
  'SCBAM',
  'SCB Wealth',
].map((name, index) => ({
  id: `customer-${index + 1}`,
  name,
  visits: 0,
  presentations: 0,
  followUps: 0,
}));
const normalizeState = (incoming: State): State => {
  const savedMissions = Array.isArray(incoming.missions)
    ? incoming.missions
    : [];
  const usefulLegacy = savedMissions.filter(
    (mission) =>
      !['m1', 'm2', 'm3', 'm4'].includes(mission.id) ||
      mission.name.trim() ||
      mission.owner.trim() ||
      mission.target ||
      mission.actual,
  );
  return reconcileMonths({
    ...incoming,
    history: incoming.history
      ? Object.fromEntries(
          Object.entries(incoming.history).map(([month, past]) => [
            month,
            { ...past, players: withoutRetiredDuplicates(past.players ?? []) },
          ]),
        )
      : incoming.history,
    players: withoutRetiredDuplicates(incoming.players).map((player) => ({
      ...player,
      role:
        player.role === 'Graphic Designer & AI Expert'
          ? 'Graphic Designer / Contents Creator & AI Expert'
          : player.role === 'Operation & Admin'
            ? 'Admin'
            : player.role,
    })),
    missions: [
      ...missionSeed.map(
        (seed) =>
          usefulLegacy.find((mission) => mission.id === seed.id) ?? seed,
      ),
      ...usefulLegacy.filter(
        (mission) => !missionSeed.some((seed) => seed.id === mission.id),
      ),
    ],
    customers: [
      ...customerSeed.map(
        (seed) =>
          incoming.customers?.find((customer) => customer.id === seed.id) ??
          seed,
      ),
      ...(incoming.customers ?? []).filter(
        (customer) => !customerSeed.some((seed) => seed.id === customer.id),
      ),
    ],
  });
};
const initial: State = {
  month: '2026-09',
  baseTarget: 1000000,
  carryIn: 0,
  revenue: 0,
  updatedAt: '',
  missions: missionSeed,
  customers: customerSeed,
  players: initialPlayers,
};
const roles = [
  'Branding & Marketing Strategy',
  'Head of Marketing',
  'Graphic Designer / Contents Creator & AI Expert',
  'Production',
  'Branding Consultant / Trainer',
  'Seminar Organizer',
  'Sales Manager',
  'Admin',
];
const money = (n: number) => new Intl.NumberFormat('th-TH').format(n);
const level = (s: number) =>
  s >= 90
    ? 'L5 Game Changer'
    : s >= 80
      ? 'L4 Expert'
      : s >= 70
        ? 'L3 Performer'
        : s >= 60
          ? 'L2 Builder'
          : 'L1 Explorer';
const teamLevel = (r: number) =>
  r >= 1500000
    ? 'Diamond'
    : r >= 1200000
      ? 'Gold'
      : r >= 1000000
        ? 'Silver'
        : r >= 800000
          ? 'Bronze'
          : 'Below Bronze';
// Baht amount field: digits only, no leading zeros, thousands separators.
function MoneyInput({
  value,
  onValue,
}: {
  value: number;
  onValue: (value: number) => void;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={value ? money(value) : ''}
      placeholder="0"
      onChange={(event) =>
        onValue(Number(event.target.value.replace(/\D/g, '')) || 0)
      }
    />
  );
}
// Incharge picker: names from KPI รายบุคคล, keeping a saved name not in the list.
function InchargeSelect({
  value,
  names,
  onValue,
}: {
  value: string;
  names: string[];
  onValue: (value: string) => void;
}) {
  const options =
    value.trim() && !names.includes(value) ? [value, ...names] : names;
  return (
    <select value={value} onChange={(event) => onValue(event.target.value)}>
      <option value="">เลือกหัวหน้างาน</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
export default function DashboardApp() {
  const [data, setRawData] = useState(initial);
  const setData = (action: State | ((state: State) => State)) => {
    dirty.current = true;
    editVersion.current++;
    setRawData((old) =>
      reconcileMonths(typeof action === 'function' ? action(old) : action),
    );
  };
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<
    'dashboard' | 'missions' | 'players' | 'setup'
  >('dashboard');
  const [saving, setSaving] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>();
  const [live, setLive] = useState(false);
  const [access, setAccess] = useState({
    email: '',
    playerIds: [] as string[],
    canManageKpi: false,
  });
  const dirty = useRef(false);
  const hasLoaded = useRef(false);
  const editVersion = useRef(0);
  const load = useCallback(async () => {
    if (dirty.current) return;
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      if (r.ok && !dirty.current) {
        const incoming = (await r.json()) as State;
        if (dirty.current) return;
        const keepSelectedMonth = hasLoaded.current;
        hasLoaded.current = true;
        setRawData((current) => {
          const latest = normalizeState(incoming);
          if (!keepSelectedMonth) return latest;
          if (latest.month === current.month) return latest;
          const selected = latest.history?.[current.month];
          if (!selected) return latest;
          const history = {
            ...latest.history,
            [latest.month]: snapshot(latest),
          };
          delete history[current.month];
          return { ...selected, history };
        });
        dirty.current = false;
        setLive(true);
      }
    } catch {
      setLive(false);
    }
  }, []);
  useEffect(() => {
    load();
    fetch('/api/me', { cache: 'no-store' })
      .then(async (response) =>
        setAccess(
          (await response.json()) as {
            email: string;
            playerIds: string[];
            canManageKpi: boolean;
          },
        ),
      )
      .catch(() => undefined);
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);
  const duplicates = useMemo(() => duplicateNames(data.players), [data.players]);
  const teamNames = useMemo(
    () =>
      Array.from(
        new Set(data.players.map((p) => p.name.trim()).filter(Boolean)),
      ),
    [data.players],
  );
  const save = async () => {
    if (duplicates.size && access.canManageKpi) {
      setTab('players');
      setMessage('มีชื่อพนักงานซ้ำกัน กรุณาแก้ชื่อที่ซ้ำใน KPI รายบุคคลก่อนบันทึก');
      return;
    }
    setSaving(true);
    const revision = editVersion.current;
    setMessage('');
    try {
      const r = await fetch('/api/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (r.ok) {
        const saved = (await r.json()) as State;
        if (revision === editVersion.current) {
          setRawData(normalizeState(saved));
          dirty.current = false;
        }
        setLive(true);
        setMessage('บันทึกข้อมูลแล้ว');
      } else setMessage('บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองอีกครั้ง');
    } catch {
      setMessage('เชื่อมต่อไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาลองบันทึกอีกครั้ง');
    } finally {
      setSaving(false);
    }
  };
  const effective = data.baseTarget + data.carryIn,
    carry = Math.max(0, effective - data.revenue),
    progress = effective ? Math.min(100, (data.revenue / effective) * 100) : 0;
  const playerRows = useMemo(
    () =>
      data.players.map((p) => ({
        ...p,
        total: totalScore(p),
      })),
    [data.players],
  );
  const patchMission = (
    id: string,
    key: keyof Mission,
    value: string | number | Prospect[],
  ) =>
    setData((d) => ({
      ...d,
      missions: d.missions.map((m) =>
        m.id === id ? { ...m, [key]: value } : m,
      ),
    }));
  const patchCustomer = (
    id: string,
    key: keyof Customer,
    value: string | number,
  ) =>
    setData((d) => ({
      ...d,
      customers: d.customers.map((customer) =>
        customer.id === id ? { ...customer, [key]: value } : customer,
      ),
    }));
  const patchPlayer = (id: string, key: keyof Player, value: string | number) =>
    setData((d) => ({
      ...d,
      players: d.players.map((p) =>
        p.id === id
          ? {
              ...p,
              [key]:
                typeof value === 'number' && key in caps
                  ? Math.min(caps[key as keyof typeof caps], Math.max(0, value))
                  : value,
              ...(key === 'role' ? { kpis: undefined } : {}),
            }
          : p,
      ),
    }));
  const priorPlayers = data.history?.[previousMonth(data.month)]?.players ?? [];
  const bestScores: Record<string, number> = {};
  for (const [month, past] of Object.entries(data.history ?? {}))
    if (month < data.month)
      for (const p of past.players)
        bestScores[p.id] = Math.max(bestScores[p.id] ?? 0, totalScore(p));
  const switchMonth = (month: string) => {
    if (!/^\d{4}-\d{2}$/.test(month) || month === data.month) return;
    dirty.current = true;
    editVersion.current++;
    const history = { ...data.history, [data.month]: snapshot(data) };
    const existing = history[month];
    const latestBefore = Object.keys(history)
      .filter((key) => key < month)
      .sort()
      .pop();
    const source = latestBefore ? history[latestBefore] : snapshot(data);
    const next: State = existing ?? {
      ...source,
      month,
      revenue: 0,
      otherRevenue: 0,
      collectedRevenue: 0,
      carryIn: 0,
      credits: [],
      missions: source.missions.map((m) => ({
        ...m,
        actual: 0,
        actualCount: m.actualCount === undefined ? undefined : 0,
        talkActual: 0,
        proposalActual: 0,
        prospects: m.prospects?.filter(
          (p) => !['ปิดขายได้', 'ยังไม่สนใจ'].includes(p.status),
        ),
      })),
      customers: source.customers.map((c) => ({
        ...c,
        actual: 0,
        visits: 0,
        presentations: 0,
        followUps: 0,
      })),
      players: source.players.map((p) => ({
        ...p,
        roleScore: 0,
        revenue: 0,
        growth: 0,
        collaboration: 0,
        execution: 0,
        kpis: p.kpis?.map((k) => ({ ...k, actual: 0, notes: '' })),
      })),
    };
    delete history[month];
    setData({ ...next, history });
    setMessage('เปลี่ยนเดือนแล้ว กดบันทึกเพื่อเก็บเดือนนี้และประวัติ');
  };
  return (
    <main
      className="min-h-screen bg-background text-foreground"
      onChangeCapture={() => {
        dirty.current = true;
        editVersion.current++;
      }}
      onFocusCapture={(event) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement
        )
          dirty.current = true;
      }}
      onPointerDownCapture={(event) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement
        )
          dirty.current = true;
      }}
      onInputCapture={() => {
        dirty.current = true;
      }}
    >
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="brand-mark">ZR</div>
            <div>
              <h1 className="text-base font-bold">ZRKK 1M GAME</h1>
              <p className="text-xs text-muted-foreground">
                Performance & Revenue Command Center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`live-pill ${live ? 'is-live' : ''}`}>
              <span />
              {live ? 'Live' : 'Connecting'}
            </span>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-[#17324d] text-white hover:bg-[#245b78]"
            >
              <Save />
              {saving ? 'กำลังบันทึก' : 'บันทึกข้อมูล'}
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[220px_1fr] sm:px-7">
        <aside className="rounded-2xl border bg-card p-3 lg:sticky lg:top-24 lg:h-fit">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">
            Workspace
          </p>
          {[
            ['dashboard', 'ภาพรวม', BarChart3],
            ['missions', 'Revenue Missions', Target],
            ['players', 'Players & KPI', Users],
            ['setup', 'ตั้งค่า', Settings2],
          ].map(([id, label, Icon]) => (
            <button
              key={id as string}
              onClick={() => setTab(id as typeof tab)}
              className={`nav-item ${tab === id ? 'active' : ''}`}
            >
              <Icon className="size-4" />
              {label as string}
            </button>
          ))}
          <div className="mt-4 rounded-xl bg-[#f6f0df] p-3">
            <p className="text-xs font-bold text-[#7d5f1e]">เป้าหมายทีม</p>
            <p className="mt-1 text-xl font-black text-[#17324d]">฿1,000,000</p>
            <p className="mt-1 text-[11px] text-[#6f6756]">
              ยอดที่ขาดจะทบเป็นเป้าหมายเดือนถัดไปอัตโนมัติ
            </p>
          </div>
        </aside>
        <section className="min-w-0">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">MONTHLY PERFORMANCE</p>
              <h2 className="text-2xl font-black">
                {tab === 'dashboard'
                  ? 'ภาพรวมทีม'
                  : tab === 'missions'
                    ? 'Revenue Missions'
                    : tab === 'players'
                      ? 'Players & KPI'
                      : 'ตั้งค่าระบบ'}
              </h2>
            </div>
            <label className="month-control">
              <span>เดือน</span>
              <Input
                type="month"
                value={data.month}
                onChange={(e) => switchMonth(e.target.value)}
              />
              <ChevronDown className="size-4" />
            </label>
          </div>
          {message && (
            <p role="status" className="save-message">
              {message}
            </p>
          )}
          <p className="mission-help mb-4">
            ข้อมูลประจำเดือน {data.month} · ยอดขายรวมจาก Missions และลูกค้าเก่า ·
            เปลี่ยนเดือนเพื่อดูประวัติ แล้วกดบันทึกข้อมูล
          </p>
          {tab === 'dashboard' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  icon={CircleDollarSign}
                  label="Company Revenue"
                  value={`฿${money(data.revenue)}`}
                  sub={`${progress.toFixed(0)}% ของเป้าหมาย`}
                  tone="navy"
                />
                <Metric
                  icon={Target}
                  label="Effective Target"
                  value={`฿${money(effective)}`}
                  sub={`Base ฿${money(data.baseTarget)}`}
                  tone="blue"
                />
                <Metric
                  icon={Activity}
                  label="Carry to Next Month"
                  value={`฿${money(carry)}`}
                  sub={carry ? 'ยังต้องเร่งยอด' : 'ถึงเป้าหมายแล้ว'}
                  tone={carry ? 'amber' : 'green'}
                />
                <Metric
                  icon={Award}
                  label="Team Level"
                  value={teamLevel(data.revenue)}
                  sub="Bronze → Diamond"
                  tone="gold"
                />
              </div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <p className="eyebrow">REVENUE TRACK</p>
                      <h3>ความคืบหน้าสู่เป้าหมาย</h3>
                    </div>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="goal-rail">
                    <div style={{ width: `${progress}%` }} />
                    <i
                      style={{
                        left: `${Math.min(100, (800000 / effective) * 100)}%`,
                      }}
                    >
                      Bronze
                    </i>
                    <i
                      style={{
                        left: `${Math.min(100, (1000000 / effective) * 100)}%`,
                      }}
                    >
                      Silver
                    </i>
                  </div>
                  <div className="mt-7 grid grid-cols-3 gap-3">
                    <Mini
                      label="รายได้ปัจจุบัน"
                      value={`฿${money(data.revenue)}`}
                    />
                    <Mini label="ยอดที่เหลือ" value={`฿${money(carry)}`} />
                    <Mini label="เป้าหมายสูงสุด" value="฿1,500,000" />
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <p className="eyebrow">PLAYERS</p>
                      <h3>Players · พัฒนาการรายเดือน</h3>
                    </div>
                    <Sparkles className="size-5 text-[#d6a84b]" />
                  </div>
                  {playerRows.length ? (
                    playerRows.slice().map((p, i) => (
                      <button
                        className="player-line w-full text-left"
                        key={p.id}
                        onClick={() => {
                          setSelectedPlayer(p.id);
                          setTab('players');
                        }}
                      >
                        <b>{level(p.total).split(' ')[0]}</b>
                        <div>
                          <p>{p.name || 'ยังไม่ระบุชื่อ'}</p>
                          <small>
                            {level(p.total)} ·{' '}
                            {priorPlayers.some((old) => old.id === p.id)
                              ? `Growth ${(p.total - totalScore(priorPlayers.find((old) => old.id === p.id)!)).toFixed(1)}`
                              : 'ยังไม่มีเดือนก่อน'}{' '}
                            · Best {Math.max(bestScores[p.id] ?? 0, p.total)}
                          </small>
                        </div>
                        <strong>{p.total}</strong>
                      </button>
                    ))
                  ) : (
                    <Empty text="เพิ่มรายชื่อและคะแนนในหน้า Players" />
                  )}
                </div>
              </div>
              <div className="panel mt-5">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">MISSIONS</p>
                    <h3>Revenue Missions เดือนนี้</h3>
                  </div>
                  <Button variant="outline" onClick={() => setTab('missions')}>
                    ดูทั้งหมด
                  </Button>
                </div>
                <div className="mission-grid">
                  {[
                    'Seminar Organizer',
                    'Branding Consultant',
                    'Branding & Marketing Strategy',
                  ].map((type) => {
                    const missions = data.missions.filter(
                      (mission) => mission.type === type,
                    );
                    const actual = missions.reduce(
                      (total, mission) => total + mission.actual,
                      0,
                    );
                    const target = missions.reduce(
                      (total, mission) => total + mission.target,
                      0,
                    );
                    return (
                      <div className="mission-card" key={type}>
                        <div className="flex items-start justify-between">
                          <div className="mission-icon">
                            <Target />
                          </div>
                          <span className="status">{missions.length} หัวข้อ</span>
                        </div>
                        <p>REVENUE MISSION</p>
                        <h4>{type}</h4>
                        <div className="mission-numbers">
                          <span>฿{money(actual)}</span>
                          <small>/ ฿{money(target)}</small>
                        </div>
                        <div className="thin-progress">
                          <i
                            style={{
                              width: `${target ? Math.min(100, (actual / target) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mission-card">
                    <div className="mission-icon">
                      <Users />
                    </div>
                    <p>EXISTING CUSTOMER</p>
                    <h4>ติดตามลูกค้าเก่า</h4>
                    <div className="mission-numbers">
                      <span>
                        ฿
                        {money(
                          data.customers.reduce(
                            (sum, c) => sum + (c.actual ?? 0),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="mission-numbers">
                      <span>
                        {data.customers.reduce(
                          (total, customer) =>
                            total +
                            customer.visits +
                            customer.presentations +
                            customer.followUps,
                          0,
                        )}
                      </span>
                      <small>กิจกรรม / {data.customers.length} ลูกค้า</small>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          {tab === 'missions' && (
            <div className="mission-sections">
              {[
                {
                  type: 'Seminar Organizer',
                  description:
                    'กำหนดเป้ายอดขายรายหลักสูตร รองรับทั้ง Offline และ Online',
                },
                {
                  type: 'Branding Consultant',
                  description:
                    '2 days workshop ราคา ฿69,000 ต่อบริษัท เป้า 2 บริษัทต่อเดือน',
                },
                {
                  type: 'Branding & Marketing Strategy',
                  description: 'กำหนดเป้ายอดขายแยกตามบริการ',
                },
              ].map((group) => (
                <div className="panel" key={group.type}>
                  <div className="panel-head">
                    <div>
                      <p className="eyebrow">REVENUE MISSION</p>
                      <h3>{group.type}</h3>
                      <p className="mission-help">{group.description}</p>
                    </div>
                    {group.type !== 'Branding Consultant' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          dirty.current = true;
                          setData((d) => ({
                            ...d,
                            missions: [
                              ...d.missions,
                              {
                                id: crypto.randomUUID(),
                                type: group.type,
                                name: '',
                                owner: '',
                                target: 0,
                                actual: 0,
                                status: 'In Progress',
                                channel:
                                  group.type === 'Seminar Organizer'
                                    ? 'Offline + Online'
                                    : '',
                              },
                            ],
                          }));
                        }}
                      >
                        <Plus />
                        เพิ่มหัวข้อ
                      </Button>
                    )}
                  </div>
                  <div className="mission-edit-grid">
                    {data.missions
                      .filter((mission) => mission.type === group.type)
                      .map((mission) => (
                        <div className="mission-edit-card" key={mission.id}>
                          <label className="field-label">
                            หัวข้อ
                            <Input
                              value={mission.name}
                              placeholder="ชื่อหัวข้อ"
                              onChange={(event) =>
                                patchMission(
                                  mission.id,
                                  'name',
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="field-label">
                            ชื่อลูกค้า / บริษัท
                            <Input
                              value={mission.customerNames ?? ''}
                              placeholder="กรอกชื่อ คั่นหลายรายด้วยจุลภาค (,)"
                              onChange={(event) =>
                                patchMission(
                                  mission.id,
                                  'customerNames',
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="field-label">
                            Incharge (หัวหน้างาน)
                            <InchargeSelect
                              value={mission.owner}
                              names={teamNames}
                              onValue={(value) =>
                                patchMission(mission.id, 'owner', value)
                              }
                            />
                          </label>
                          <label className="field-label">
                            Team member (สมาชิกทีม)
                            <Input
                              value={mission.teamMembers ?? ''}
                              placeholder="ชื่อสมาชิก คั่นแต่ละคนด้วยจุลภาค (,)"
                              onChange={(event) =>
                                patchMission(
                                  mission.id,
                                  'teamMembers',
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          {group.type === 'Seminar Organizer' && (
                            <label className="field-label">
                              รูปแบบ
                              <select
                                value={mission.channel || 'Offline + Online'}
                                onChange={(event) =>
                                  patchMission(
                                    mission.id,
                                    'channel',
                                    event.target.value,
                                  )
                                }
                              >
                                <option>Offline + Online</option>
                                <option>Offline</option>
                                <option>Online</option>
                              </select>
                            </label>
                          )}
                          {group.type === 'Branding Consultant' ? (
                            <>
                              <div className="fixed-price">
                                ราคา ฿69,000 / บริษัท
                              </div>
                              <p className="mission-help">
                                กรอกยอดสะสมรายเดือนโดยนับบริษัทไม่ซ้ำ คุยแล้ว =
                                ได้พูดคุยความต้องการจริง ปิดขาย = ยืนยันซื้อหรือชำระมัดจำ
                              </p>
                              <div className="consult-funnel">
                                {(
                                  [
                                    ['talkTarget', 'เป้าคุยลูกค้า (บริษัท)'],
                                    ['talkActual', 'คุยแล้วจริง (บริษัท)'],
                                    ['proposalTarget', 'เป้าส่งข้อเสนอ (บริษัท)'],
                                    ['proposalActual', 'ส่งข้อเสนอแล้ว (บริษัท)'],
                                  ] as const
                                ).map(([key, label]) => (
                                  <label className="field-label" key={key}>
                                    {label}
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={mission[key] ?? 0}
                                      onChange={(event) =>
                                        patchMission(
                                          mission.id,
                                          key,
                                          Math.max(
                                            0,
                                            Math.floor(+event.target.value),
                                          ),
                                        )
                                      }
                                    />
                                  </label>
                                ))}
                              </div>
                              <label className="field-label">
                                เป้าปิดขาย (บริษัท)
                                <Input
                                  type="number"
                                  min="0"
                                  value={mission.targetCount ?? 2}
                                  onChange={(event) => {
                                    const count = Math.max(
                                      0,
                                      +event.target.value,
                                    );
                                    setData((d) => ({
                                      ...d,
                                      missions: d.missions.map((m) =>
                                        m.id === mission.id
                                          ? {
                                              ...m,
                                              targetCount: count,
                                              target: count * 69000,
                                            }
                                          : m,
                                      ),
                                    }));
                                  }}
                                />
                              </label>
                              <label className="field-label">
                                ปิดขายได้จริง (บริษัท)
                                <Input
                                  type="number"
                                  min="0"
                                  value={mission.actualCount ?? 0}
                                  onChange={(event) => {
                                    const count = Math.max(
                                      0,
                                      +event.target.value,
                                    );
                                    setData((d) => ({
                                      ...d,
                                      missions: d.missions.map((m) =>
                                        m.id === mission.id
                                          ? {
                                              ...m,
                                              actualCount: count,
                                              actual: count * 69000,
                                            }
                                          : m,
                                      ),
                                    }));
                                  }}
                                />
                              </label>
                              <div className="fixed-price">
                                อัตราปิดขาย{' '}
                                {mission.talkActual
                                  ? (
                                      ((mission.actualCount ?? 0) /
                                        mission.talkActual) *
                                      100
                                    ).toFixed(1) + '%'
                                  : '—'}
                                <p className="mission-help">
                                  บริษัทที่ปิดได้ ÷ บริษัทที่คุยแล้ว
                                </p>
                              </div>
                              {(mission.actualCount ?? 0) >
                                (mission.talkActual ?? 0) && (
                                <p role="status" className="mission-help">
                                  จำนวนที่ปิดได้มากกว่าจำนวนที่คุยแล้ว กรุณาตรวจสอบยอดสะสม
                                </p>
                              )}
                              <div className="panel-head">
                                <h3>รายชื่อลูกค้าเป้าหมาย</h3>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    dirty.current = true;
                                    patchMission(mission.id, 'prospects', [
                                      ...(mission.prospects ?? []),
                                      {
                                        id: crypto.randomUUID(),
                                        company: '',
                                        sourcedBy: '',
                                        owner: '',
                                        status: 'ยังไม่ได้ติดต่อ',
                                        nextFollowUp: '',
                                        notes: '',
                                      },
                                    ]);
                                  }}
                                >
                                  <Plus />
                                  เพิ่มรายชื่อ
                                </Button>
                              </div>
                              <p className="mission-help">
                                ใช้ติดตามงานรายบริษัท แล้วอัปเดตยอดสะสมด้านบนให้ตรงกัน
                              </p>
                              <div className="customer-grid">
                                {(mission.prospects ?? []).map((prospect) => {
                                  const update = (
                                    key: keyof Prospect,
                                    value: string,
                                  ) =>
                                    patchMission(
                                      mission.id,
                                      'prospects',
                                      (mission.prospects ?? []).map((p) =>
                                        p.id === prospect.id
                                          ? { ...p, [key]: value }
                                          : p,
                                      ),
                                    );
                                  return (
                                    <div
                                      className="customer-card"
                                      key={prospect.id}
                                    >
                                      {(
                                        [
                                          ['company', 'ชื่อบริษัท'],
                                          ['sourcedBy', 'ผู้หาลูกค้ามา'],
                                          ['owner', 'ผู้รับผิดชอบติดตาม'],
                                        ] as const
                                      ).map(([key, label]) => (
                                        <label
                                          className="field-label"
                                          key={key}
                                        >
                                          {label}
                                          <Input
                                            value={prospect[key]}
                                            onChange={(e) =>
                                              update(key, e.target.value)
                                            }
                                          />
                                        </label>
                                      ))}
                                      <label className="field-label">
                                        สถานะ
                                        <select
                                          value={prospect.status}
                                          onChange={(e) =>
                                            update('status', e.target.value)
                                          }
                                        >
                                          {[
                                            'ยังไม่ได้ติดต่อ',
                                            'คุยความต้องการแล้ว',
                                            'ส่งข้อเสนอแล้ว',
                                            'รอตัดสินใจ',
                                            'ปิดขายได้',
                                            'ยังไม่สนใจ',
                                          ].map((status) => (
                                            <option key={status}>
                                              {status}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <label className="field-label">
                                        วันติดตามครั้งถัดไป
                                        <Input
                                          type="date"
                                          value={prospect.nextFollowUp}
                                          onChange={(e) =>
                                            update(
                                              'nextFollowUp',
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </label>
                                      <label className="field-label">
                                        หมายเหตุ
                                        <Input
                                          value={prospect.notes}
                                          onChange={(e) =>
                                            update('notes', e.target.value)
                                          }
                                        />
                                      </label>
                                    </div>
                                  );
                                })}
                                {!mission.prospects?.length && (
                                  <p className="mission-help">
                                    ยังไม่มีรายชื่อ กด “เพิ่มรายชื่อ” เพื่อเริ่มติดตามลูกค้า
                                  </p>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <label className="field-label">
                                เป้ายอดขาย (บาท)
                                <MoneyInput
                                  value={mission.target}
                                  onValue={(value) =>
                                    patchMission(mission.id, 'target', value)
                                  }
                                />
                              </label>
                              <label className="field-label">
                                ยอดขายจริง (บาท)
                                <MoneyInput
                                  value={mission.actual}
                                  onValue={(value) =>
                                    patchMission(mission.id, 'actual', value)
                                  }
                                />
                              </label>
                            </>
                          )}
                          <div className="mission-total">
                            ฿{money(mission.actual)} / ฿{money(mission.target)}
                            <span>
                              {mission.target
                                ? Math.round(
                                    (mission.actual / mission.target) * 100,
                                  )
                                : 0}
                              % ของเป้า
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">EXISTING CUSTOMER</p>
                    <h3>ติดตามลูกค้าเก่า</h3>
                    <p className="mission-help">
                      นับกิจกรรมที่ทำจริงในเดือนนี้แยกตามลูกค้า
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      dirty.current = true;
                      setData((d) => ({
                        ...d,
                        customers: [
                          ...d.customers,
                          {
                            id: crypto.randomUUID(),
                            name: '',
                            visits: 0,
                            presentations: 0,
                            followUps: 0,
                          },
                        ],
                      }));
                    }}
                  >
                    <Plus />
                    เพิ่มลูกค้า
                  </Button>
                </div>
                <div className="customer-grid">
                  {data.customers.map((customer) => (
                    <div className="customer-card" key={customer.id}>
                      <label className="field-label">
                        ลูกค้า
                        <Input
                          value={customer.name}
                          placeholder="ชื่อลูกค้า"
                          onChange={(event) =>
                            patchCustomer(
                              customer.id,
                              'name',
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="field-label">
                        Incharge (หัวหน้างาน)
                        <InchargeSelect
                          value={customer.owner ?? ''}
                          names={teamNames}
                          onValue={(value) =>
                            patchCustomer(customer.id, 'owner', value)
                          }
                        />
                      </label>
                      <label className="field-label">
                        Team member (สมาชิกทีม)
                        <Input
                          value={customer.teamMembers ?? ''}
                          placeholder="ชื่อสมาชิก คั่นแต่ละคนด้วยจุลภาค (,)"
                          onChange={(event) =>
                            patchCustomer(
                              customer.id,
                              'teamMembers',
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <div className="customer-activities">
                        {(
                          [
                            ['visits', 'ไปพบลูกค้า'],
                            ['presentations', 'นำเสนอสื่อกระตุ้น'],
                            ['followUps', 'โทรติดตามผล'],
                          ] as const
                        ).map(([key, label]) => (
                          <label className="field-label" key={key}>
                            {label} (ครั้ง)
                            <Input
                              type="number"
                              min="0"
                              value={customer[key]}
                              onChange={(event) =>
                                patchCustomer(
                                  customer.id,
                                  key,
                                  Math.max(0, +event.target.value),
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <div className="consult-funnel">
                        <label className="field-label">
                          เป้ายอดขายลูกค้าเก่า (บาท)
                          <MoneyInput
                            value={customer.target ?? 0}
                            onValue={(value) =>
                              patchCustomer(customer.id, 'target', value)
                            }
                          />
                        </label>
                        <label className="field-label">
                          ยอดขายจริงลูกค้าเก่า (บาท)
                          <MoneyInput
                            value={customer.actual ?? 0}
                            onValue={(value) =>
                              patchCustomer(customer.id, 'actual', value)
                            }
                          />
                        </label>
                      </div>
                      <p className="mission-help">
                        หากบันทึกดีลนี้ใน Mission อื่นแล้ว ไม่ต้องใส่ยอดซ้ำที่นี่
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {(tab === 'missions' || tab === 'dashboard') && (
            <details className="panel mt-5" open={tab === 'missions'}>
              <summary>
                Goal / Assist · {(data.credits ?? []).length} ดีลในเดือนนี้
              </summary>
              <CreditBoard
                credits={data.credits ?? []}
                players={data.players}
                missions={data.missions}
                change={(credits) => {
                  dirty.current = true;
                  setData((d) => ({ ...d, credits }));
                }}
              />
            </details>
          )}
          {tab === 'players' && (
            <>
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">100 POINT SCORECARD</p>
                    <h3>KPI รายบุคคล</h3>
                    <p className="mission-help">
                      {access.canManageKpi
                        ? `สิทธิ์ผู้บริหาร · ${access.email || 'บัญชีเจ้าของระบบ'}`
                        : access.playerIds.length
                          ? 'สิทธิ์พนักงาน · กรอกได้เฉพาะ Actual และหลักฐานของตัวเอง'
                          : 'ยังไม่ได้ผูกอีเมลกับพนักงาน · ดูข้อมูลได้ แต่ยังกรอก KPI ไม่ได้'}
                    </p>
                    {duplicates.size > 0 && (
                      <p role="alert" className="duplicate-warning">
                        ชื่อซ้ำกัน: {data.players
                          .filter((p, i, all) =>
                            duplicates.has(nameKey(p.name)) &&
                            all.findIndex((q) => nameKey(q.name) === nameKey(p.name)) === i,
                          )
                          .map((p) => p.name.trim())
                          .join(', ')}{' '}
                        · 1 คนควรมีได้ชื่อเดียวใน KPI รายบุคคล
                      </p>
                    )}
                  </div>
                  {access.canManageKpi && (
                    <Button
                      onClick={() =>
                        setData((d) => ({
                          ...d,
                          players: [
                            ...d.players,
                            {
                              id: crypto.randomUUID(),
                              name: '',
                              role: roles[0],
                              roleScore: 0,
                              revenue: 0,
                              growth: 0,
                              collaboration: 0,
                              execution: 0,
                            },
                          ],
                        }))
                      }
                    >
                      <Plus />
                      เพิ่มพนักงาน
                    </Button>
                  )}
                </div>
                <div className="table-wrap">
                  <table className="mobile-form player-table">
                    <thead>
                      <tr>
                        <th>ชื่อ</th>
                        <th>อีเมลเข้าสู่ระบบ</th>
                        <th>Role</th>
                        <th>Role /40</th>
                        <th>Revenue /25</th>
                        <th>Growth /15</th>
                        <th>Collab /10</th>
                        <th>Execution /10</th>
                        <th>Total</th>
                        <th>Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerRows.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <Input
                              readOnly={!access.canManageKpi}
                              value={p.name}
                              aria-invalid={duplicates.has(nameKey(p.name)) || undefined}
                              className={
                                duplicates.has(nameKey(p.name))
                                  ? 'duplicate-name'
                                  : undefined
                              }
                              placeholder="ชื่อพนักงาน"
                              onChange={(e) =>
                                patchPlayer(p.id, 'name', e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <Input
                              type="email"
                              readOnly={!access.canManageKpi}
                              value={p.email ?? ''}
                              placeholder="name@company.com"
                              onChange={(e) =>
                                patchPlayer(p.id, 'email', e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <select
                              disabled={!access.canManageKpi}
                              value={p.role}
                              onChange={(e) =>
                                patchPlayer(p.id, 'role', e.target.value)
                              }
                            >
                              {roles.map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                          </td>
                          {(
                            [
                              'roleScore',
                              'revenue',
                              'growth',
                              'collaboration',
                              'execution',
                            ] as const
                          ).map((k) => (
                            <td key={k}>
                              <Input
                                className="score"
                                type="number"
                                min="0"
                                max={caps[k]}
                                readOnly={!!p.kpis || !access.canManageKpi}
                                value={p[k]}
                                onChange={(e) =>
                                  patchPlayer(p.id, k, +e.target.value)
                                }
                              />
                            </td>
                          ))}
                          <td>
                            <strong>{p.total}</strong>
                          </td>
                          <td>
                            <span className="level">{level(p.total)}</span>
                          </td>
                        </tr>
                      ))}
                      {!playerRows.length && (
                        <tr>
                          <td colSpan={10}>
                            <Empty text="กด “เพิ่มพนักงาน” เพื่อเริ่มกรอก Scorecard" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <PlayerDetails
                selected={selectedPlayer}
                players={data.players}
                previous={priorPlayers}
                best={bestScores}
                canManage={access.canManageKpi}
                editablePlayerIds={access.playerIds}
                change={(id, values) => {
                  dirty.current = true;
                  setData((d) => ({
                    ...d,
                    players: d.players.map((p) =>
                      p.id === id ? { ...p, ...values } : p,
                    ),
                  }));
                }}
              />
            </>
          )}
          {(tab === 'setup' || tab === 'dashboard') && (
            <div className="game-stack mt-5">
              <OrgStructure roles={roles} />
              <details className="panel" open={tab === 'setup'}>
                <summary>ตั้งค่าเป้าหมาย การเก็บเงิน และกติกาคะแนน</summary>
                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="panel">
                    <div className="panel-head">
                      <div>
                        <p className="eyebrow">COMPANY TARGET</p>
                        <h3>ตั้งค่าเป้าหมายรายเดือน</h3>
                      </div>
                      <Settings2 />
                    </div>
                    <div className="form-grid">
                      <label>
                        Base Target
                        <Input
                          type="number"
                          min="0"
                          value={data.baseTarget}
                          onChange={(e) =>
                            setData({
                              ...data,
                              baseTarget: Math.max(0, +e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Carry-in
                        <Input
                          type="number"
                          readOnly={!!data.history?.[previousMonth(data.month)]}
                          value={data.carryIn}
                          onChange={(e) =>
                            setData({
                              ...data,
                              carryIn: Math.max(0, +e.target.value),
                            })
                          }
                        />
                      </label>
                      <p className="mission-help">
                        ทบส่วนขาดจากเดือนก่อนอัตโนมัติเมื่อมีประวัติ
                        หากยังไม่มีเดือนก่อนให้กรอกยอดยกมาเอง
                        ยอดเกินเป้าไม่ทบลดเป้าเดือนถัดไป
                      </p>
                      <label>
                        ยอดขายอื่น / ยอดปรับปรุง (บาท)
                        <Input
                          type="number"
                          value={data.otherRevenue ?? 0}
                          onChange={(e) =>
                            setData({ ...data, otherRevenue: +e.target.value })
                          }
                        />
                      </label>
                      <p className="mission-help">
                        ยอดรวม ฿{money(data.revenue)} = Missions + ลูกค้าเก่า +
                        ยอดปรับปรุง • บันทึกแต่ละดีลในแหล่งเดียวเพื่อไม่ให้นับซ้ำ
                      </p>
                      <label>
                        เก็บเงินได้จริง (บาท)
                        <Input
                          type="number"
                          min="0"
                          value={data.collectedRevenue ?? 0}
                          onChange={(e) =>
                            setData({
                              ...data,
                              collectedRevenue: Math.max(0, +e.target.value),
                            })
                          }
                        />
                      </label>
                      <p className="mission-help">
                        ยอดขายที่ยังไม่เก็บเงิน ฿
                        {money(
                          Math.max(
                            0,
                            data.revenue - (data.collectedRevenue ?? 0),
                          ),
                        )}{' '}
                        · ยอดขายใช้วัด Team Level แยกจากเงินที่เก็บได้จริง
                      </p>
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-head">
                      <div>
                        <p className="eyebrow">LEVEL RULES</p>
                        <h3>ระดับ Gamification</h3>
                      </div>
                      <Award />
                    </div>
                    <div className="levels">
                      {[
                        ['L1 Explorer', '< 60'],
                        ['L2 Builder', '60–69'],
                        ['L3 Performer', '70–79'],
                        ['L4 Expert', '80–89'],
                        ['L5 Game Changer', '90+'],
                      ].map((x, i) => (
                        <div key={x[0]}>
                          <b>{i + 1}</b>
                          <span>{x[0]}</span>
                          <strong>{x[1]}</strong>
                        </div>
                      ))}
                    </div>
                    <p className="mission-help">Team Revenue Levels</p>
                    <div className="team-levels">
                      {[
                        ['Bronze', 800000],
                        ['Silver', 1000000],
                        ['Gold', 1200000],
                        ['Diamond', 1500000],
                      ].map(([label, amount]) => (
                        <div
                          key={label}
                          className={
                            data.revenue >= Number(amount) ? 'reached' : ''
                          }
                        >
                          {label}
                          <br />฿{money(Number(amount))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-top">
        <span>
          <Icon />
        </span>
        <small>{label}</small>
      </div>
      <strong>{value}</strong>
      <p>{sub}</p>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Building2 />
      <span>{text}</span>
    </div>
  );
}
