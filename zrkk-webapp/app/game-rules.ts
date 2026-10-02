export type Kpi = {
  id: string;
  category: 'roleScore' | 'revenue' | 'growth' | 'collaboration' | 'execution';
  label: string;
  target: number;
  actual: number;
  weight: number;
  direction: 'up' | 'down';
  notes: string;
};
export type Credit = {
  id: string;
  missionId: string;
  description: string;
  amount: number;
  goal: string;
  assists: string[];
};
export const caps = {
  roleScore: 40,
  revenue: 25,
  growth: 15,
  collaboration: 10,
  execution: 10,
};
export const roleTemplates: Record<string, string[]> = {
  'Branding & Marketing Strategy': [
    'Strategy ที่ลูกค้าอนุมัติ (งาน)',
    'ความพึงพอใจลูกค้า (%)',
    'Playbook ที่นำไปใช้จริง (งาน)',
    'งานผ่านตามรอบแก้ที่ตกลง (%)',
  ],
  'Head of Marketing': [
    'Action Plan ที่ทำสำเร็จ (%)',
    'งานเสร็จตาม Timeline (%)',
    'KPI ลูกค้าที่บรรลุ (%)',
    'ลูกค้าต่อสัญญา (ราย)',
  ],
  'Graphic Designer / Contents Creator & AI Expert': [
    'งานผ่านเกณฑ์คุณภาพ (%)',
    'เวลาที่ลดได้โดยคุณภาพไม่ลด (%)',
    'งานจริงที่ใช้ AI และมีผลลัพธ์วัดได้ (งาน)',
    'สื่อที่บรรลุเป้าหมายธุรกิจ (ชิ้น)',
  ],
  Production: [
    'Video / Photo ที่ส่งมอบ (ชิ้น)',
    'ส่งมอบตรงเวลา (%)',
    'ชิ้นงานที่นำไปใช้ได้ (%)',
    'Content ที่บรรลุเป้าหมาย (ชิ้น)',
  ],
  'Branding Consultant / Trainer': [
    'ประชุมความต้องการลูกค้า (บริษัท)',
    'ข้อเสนอที่ส่ง (บริษัท)',
    'Workshop ที่ลูกค้าพึงพอใจ (%)',
    'โอกาส Cross-sell ที่ผ่านเกณฑ์ (ราย)',
  ],
  'Seminar Organizer': [
    'ผู้เข้าร่วมจริง (คน)',
    'งานที่คุมต้นทุนตามงบ (%)',
    'ความพึงพอใจผู้เข้าร่วม (%)',
    'Lead ที่มีคุณภาพจากงาน (ราย)',
  ],
  'Sales Manager': [
    'Lead ที่ผ่านเกณฑ์ (ราย)',
    'นัดคุยกับผู้ตัดสินใจ (ราย)',
    'อัตราปิดขาย (%)',
    'โอกาส Upsell / Retainer (ราย)',
  ],
  Admin: [
    'Invoice ถูกต้องและตรงเวลา (%)',
    'งานควบคุมต้นทุนผ่านเกณฑ์ (%)',
    'ตอบกลับภายใน SLA (%)',
    'งานเอกสารถูกต้อง (%)',
  ],
};
export function templateFor(role: string): Kpi[] {
  const rows: Kpi[] = (roleTemplates[role] ?? roleTemplates.Admin).map(
    (label, i) => ({
      id: `role-${i}`,
      category: 'roleScore',
      label,
      target: 0,
      actual: 0,
      weight: 10,
      direction: 'up',
      notes: '',
    }),
  );
  return [
    ...rows,
    {
      id: 'revenue',
      category: 'revenue',
      label:
        role === 'Admin'
          ? 'เงินที่เก็บได้จริง (บาท)'
          : 'ผลลัพธ์สร้างรายได้ / สนับสนุนการขายที่ตกลง (หน่วย)',
      target: 0,
      actual: 0,
      weight: 25,
      direction: 'up',
      notes: '',
    },
    {
      id: 'growth',
      category: 'growth',
      label: 'ทักษะใหม่ที่นำมาใช้จริงและมีหลักฐาน (เรื่อง)',
      target: 0,
      actual: 0,
      weight: 15,
      direction: 'up',
      notes: '',
    },
    {
      id: 'collaboration',
      category: 'collaboration',
      label: 'งานข้ามทีมที่ช่วยจนสำเร็จ (งาน)',
      target: 0,
      actual: 0,
      weight: 10,
      direction: 'up',
      notes: '',
    },
    {
      id: 'execution',
      category: 'execution',
      label: 'งานเสร็จตรงเวลา (%)',
      target: 0,
      actual: 0,
      weight: 10,
      direction: 'up',
      notes: '',
    },
  ];
}
export const kpiScore = (k: Kpi) =>
  k.target > 0
    ? Math.round(
        Math.min(
          1,
          k.direction === 'down'
            ? k.actual === 0
              ? 1
              : k.target / k.actual
            : Math.max(0, k.actual) / k.target,
        ) *
          k.weight *
          10,
      ) / 10
    : 0;
export function scoresFor(rows: Kpi[]) {
  const scores = {
    roleScore: 0,
    revenue: 0,
    growth: 0,
    collaboration: 0,
    execution: 0,
  };
  for (const row of rows) scores[row.category] += kpiScore(row);
  for (const key of Object.keys(caps) as (keyof typeof caps)[])
    scores[key] = Math.min(caps[key], Math.round(scores[key] * 10) / 10);
  return scores;
}
export const totalScore = (p: {
  roleScore: number;
  revenue: number;
  growth: number;
  collaboration: number;
  execution: number;
}) =>
  Math.round(
    Object.keys(caps).reduce(
      (sum, key) =>
        sum +
        Math.min(
          caps[key as keyof typeof caps],
          Math.max(0, p[key as keyof typeof caps] || 0),
        ),
      0,
    ) * 10,
  ) / 10;
export function previousMonth(month: string) {
  const [year, m] = month.split('-').map(Number);
  return `${m === 1 ? year - 1 : year}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
}
