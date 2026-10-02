'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  caps,
  kpiScore,
  templateFor,
  scoresFor,
  totalScore,
  type Kpi,
  type Credit,
} from './game-rules';
type Person = {
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
export function PlayerDetails({
  players,
  change,
  previous,
  best,
  selected,
  canManage,
  editablePlayerIds,
}: {
  players: Person[];
  change: (id: string, values: Partial<Person>) => void;
  previous: Person[];
  best: Record<string, number>;
  selected?: string;
  canManage: boolean;
  editablePlayerIds: string[];
}) {
  return (
    <div className="game-stack">
      {players.map((player) => {
        const canEnterActual =
          canManage || editablePlayerIds.includes(player.id);
        const score = totalScore(player);
        const prior = previous.find((p) => p.id === player.id);
        const delta = prior
          ? Math.round((score - totalScore(prior)) * 10) / 10
          : null;
        const update = (id: string, values: Partial<Kpi>) => {
          const kpis = player.kpis!.map((k) =>
            k.id === id ? { ...k, ...values } : k,
          );
          change(player.id, { kpis, ...scoresFor(kpis) });
        };
        return (
          <details
            className="panel"
            key={player.id}
            open={selected === player.id}
          >
            <summary>
              <strong>
                {player.name || 'ยังไม่ระบุชื่อ'} · {score}/100
              </strong>
              <span className="game-meta">
                {player.role} · Growth{' '}
                {delta === null
                  ? '— ยังไม่มีเดือนก่อน'
                  : `${delta >= 0 ? '+' : ''}${delta}`}{' '}
                · Personal Best {Math.max(best[player.id] ?? 0, score)}
              </span>
            </summary>
            <p className="mission-help">
              40 Role + 25 Revenue Contribution + 15 Growth / New Skill + 10
              Collaboration + 10 Execution • คะแนนพัฒนาการด้านบนคือผลต่างคะแนนรวม
              ไม่ใช่คะแนน Growth /15
            </p>
            <p className="mission-help">
              กำหนด Target และหลักฐานร่วมกันก่อนเริ่มเดือน
              งานสนับสนุนใช้ผลลัพธ์ที่ตกลงและเครดิต Assist ได้ ไม่จำเป็นต้องเป็นผู้ขายตรง
            </p>
            <p className={`access-badge ${canManage ? 'manager' : ''}`}>
              {canManage
                ? 'ผู้บริหาร: ตั้ง KPI, Target, เกณฑ์ และตรวจ Actual ได้'
                : canEnterActual
                  ? 'พนักงาน: กรอกได้เฉพาะ Actual และหลักฐานของตัวเอง'
                  : 'ดูอย่างเดียว'}
            </p>
            {!player.kpis ? (
              canManage ? (
                <Button
                  onClick={() => {
                    const kpis = templateFor(player.role);
                    change(player.id, { kpis, ...scoresFor(kpis) });
                  }}
                >
                  เริ่มใช้ KPI ตาม Role (แทนคะแนนกรอกเอง)
                </Button>
              ) : (
                <p className="mission-help">รอผู้บริหารกำหนด KPI และ Target</p>
              )
            ) : (
              <>
                <p className="mission-help">
                  คะแนน = Actual ÷ Target × น้ำหนัก จำกัดไม่เกินน้ำหนัก หากเลือก
                  “ยิ่งน้อยยิ่งดี” จะใช้ Target ÷ Actual • Target 0 = ยังไม่ตั้งเป้าและได้ 0
                  คะแนน
                </p>
                <div className="kpi-grid">
                  {player.kpis.map((k) => (
                    <div className="customer-card" key={k.id}>
                      <label className="field-label">
                        ตัวชี้วัด ·{' '}
                        {k.category === 'roleScore' ? 'Role' : k.category} /
                        {k.weight}
                        <Input
                          readOnly={!canManage}
                          value={k.label}
                          onChange={(e) =>
                            update(k.id, { label: e.target.value })
                          }
                        />
                      </label>
                      <div className="consult-funnel">
                        <label className="field-label">
                          Target
                          <Input
                            type="number"
                            min="0"
                            readOnly={!canManage}
                            value={k.target}
                            onChange={(e) =>
                              update(k.id, {
                                target: Math.max(0, +e.target.value),
                              })
                            }
                          />
                        </label>
                        <label className="field-label">
                          Actual
                          <Input
                            type="number"
                            min="0"
                            readOnly={!canEnterActual}
                            value={k.actual}
                            onChange={(e) =>
                              update(k.id, {
                                actual: Math.max(0, +e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                      <label className="field-label">
                        เกณฑ์
                        <select
                          disabled={!canManage}
                          value={k.direction}
                          onChange={(e) =>
                            update(k.id, {
                              direction: e.target.value as Kpi['direction'],
                            })
                          }
                        >
                          <option value="up">ยิ่งมากยิ่งดี</option>
                          <option value="down">ยิ่งน้อยยิ่งดี</option>
                        </select>
                      </label>
                      <label className="field-label">
                        Notes / หลักฐาน
                        <Input
                          readOnly={!canEnterActual}
                          value={k.notes}
                          placeholder="ผลลัพธ์ ลิงก์งาน หรือผู้รับรอง"
                          onChange={(e) =>
                            update(k.id, { notes: e.target.value })
                          }
                        />
                      </label>
                      <strong>
                        Score {kpiScore(k)} / {k.weight}
                      </strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </details>
        );
      })}
    </div>
  );
}
export function CreditBoard({
  credits,
  players,
  missions,
  change,
}: {
  credits: Credit[];
  players: Person[];
  missions: { id: string; name: string; type: string }[];
  change: (credits: Credit[]) => void;
}) {
  const update = (id: string, values: Partial<Credit>) =>
    change(credits.map((c) => (c.id === id ? { ...c, ...values } : c)));
  return (
    <div className="panel game-stack">
      <div className="panel-head">
        <div>
          <p className="eyebrow">GOAL & ASSIST</p>
          <h3>เครดิตผู้สร้างยอดและทีมสนับสนุน</h3>
        </div>
        <Button
          onClick={() =>
            change([
              ...credits,
              {
                id: crypto.randomUUID(),
                missionId: '',
                description: '',
                amount: 0,
                goal: '',
                assists: [],
              },
            ])
          }
        >
          เพิ่มเครดิต
        </Button>
      </div>
      <p className="mission-help">
        บันทึกหนึ่งครั้งต่อดีล ผู้สร้างยอด 1 คน และผู้ช่วยได้หลายคน
        จำนวนเงินเป็นยอดอ้างอิงเพื่อให้เครดิต ไม่บวกซ้ำในยอดขายบริษัท และไม่แปลงเป็นคะแนน KPI
        อัตโนมัติ
      </p>
      <div className="customer-grid">
        {credits.map((c) => (
          <div className="customer-card" key={c.id}>
            <label className="field-label">
              ดีล / ลูกค้า
              <Input
                value={c.description}
                onChange={(e) => update(c.id, { description: e.target.value })}
              />
            </label>
            <label className="field-label">
              Mission
              <select
                value={c.missionId}
                onChange={(e) => update(c.id, { missionId: e.target.value })}
              >
                <option value="">เลือก Mission</option>
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.type} · {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              ยอดอ้างอิง (บาท)
              <Input
                type="number"
                min="0"
                value={c.amount}
                onChange={(e) =>
                  update(c.id, { amount: Math.max(0, +e.target.value) })
                }
              />
            </label>
            <label className="field-label">
              Goal — ผู้สร้างยอด
              <select
                value={c.goal}
                onChange={(e) =>
                  update(c.id, {
                    goal: e.target.value,
                    assists: c.assists.filter((id) => id !== e.target.value),
                  })
                }
              >
                <option value="">เลือกพนักงาน</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || 'ยังไม่ระบุชื่อ'} · {p.role}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>Assist — ผู้สนับสนุน</legend>
              {players
                .filter((p) => p.id !== c.goal)
                .map((p) => (
                  <label className="assist-check" key={p.id}>
                    <input
                      type="checkbox"
                      checked={c.assists.includes(p.id)}
                      onChange={(e) =>
                        update(c.id, {
                          assists: e.target.checked
                            ? [...c.assists, p.id]
                            : c.assists.filter((id) => id !== p.id),
                        })
                      }
                    />
                    {p.name || 'ยังไม่ระบุชื่อ'} · {p.role}
                  </label>
                ))}
              {!players.length && (
                <p className="mission-help">เพิ่มพนักงานใน Players & KPI ก่อน</p>
              )}
            </fieldset>
          </div>
        ))}
      </div>
      {!credits.length && <p className="mission-help">ยังไม่มีเครดิตในเดือนนี้</p>}
      <div className="customer-grid">
        {players
          .filter((p) =>
            credits.some((c) => c.goal === p.id || c.assists.includes(p.id)),
          )
          .map((p) => (
            <div className="mini" key={p.id}>
              <b>{p.name || 'ยังไม่ระบุชื่อ'}</b>
              <p>
                Goal ฿
                {credits
                  .filter((c) => c.goal === p.id)
                  .reduce((s, c) => s + c.amount, 0)
                  .toLocaleString('th-TH')}{' '}
                · Assist{' '}
                {credits.filter((c) => c.assists.includes(p.id)).length} ดีล
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
export function OrgStructure({ roles }: { roles: string[] }) {
  return (
    <details className="panel">
      <summary>
        <strong>โครงสร้างทีม · 8 Functions ระดับเดียวกัน</strong>
      </summary>
      <div className="org-banner">ZRKK · Company Target ฿1,000,000 / เดือน</div>
      <p className="org-collab">↔ ทุก Function ทำงานร่วมกันข้ามทีม ↔</p>
      <div className="org-grid">
        {roles.map((role) => (
          <div key={role}>{role}</div>
        ))}
      </div>
      <p className="mission-help">
        ตัวอย่างการส่งต่องาน: Branding Consultant → Strategy → Graphic / Contents /
        AI → Production → Head of Marketing → Sales Manager โดย Admin สนับสนุนทุกทีม
      </p>
    </details>
  );
}
