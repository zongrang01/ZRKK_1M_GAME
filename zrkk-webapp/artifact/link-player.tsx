// One-time "who are you" bar for employees: links this claude.ai account to
// a player record so they can update their own Actual and Notes.
import { useEffect, useState } from 'react';
import {
  canWriteData,
  isManager,
  linkPlayer,
  linkedPlayerId,
  rosterPlayers,
} from './backend';

type RosterPlayer = { id: string; name: string; role: string };

export default function LinkPlayer() {
  const [players, setPlayers] = useState<RosterPlayer[] | null>(null);
  const [choice, setChoice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if ((await isManager()) || !(await canWriteData()) || (await linkedPlayerId()))
        return;
      setPlayers((await rosterPlayers()).filter((p) => p.name.trim()));
    })().catch(() => undefined);
  }, []);

  if (!players?.length) return null;
  const confirm = async () => {
    try {
      await linkPlayer(choice);
      location.reload();
    } catch {
      setError('บันทึกไม่ได้ ต้องได้รับสิทธิ์ Contributor ขึ้นไปจากเจ้าของแอป');
    }
  };
  return (
    <div className="link-player" role="region" aria-label="เลือกชื่อของคุณ">
      <label htmlFor="link-player-select">คุณคือใครในทีม? เลือกชื่อเพื่ออัปเดต KPI ของตัวเอง</label>
      <div className="link-player-row">
        <select id="link-player-select" value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">เลือกชื่อ…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.role}
            </option>
          ))}
        </select>
        <button type="button" disabled={!choice} onClick={confirm}>
          ยืนยัน
        </button>
      </div>
      {error && <p className="link-player-error">{error}</p>}
    </div>
  );
}
