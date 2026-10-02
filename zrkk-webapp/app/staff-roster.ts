export const staffRoster = [
  ['Branding & Marketing Strategy', ['Vee', 'Jane']],
  ['Head of Marketing', ['Pooh', 'Vee']],
  [
    'Graphic Designer / Contents Creator & AI Expert',
    ['Nueng', 'Kaew', 'Aeaw'],
  ],
  ['Production', ['Fa', 'Pooh', 'Kaew']],
  ['Branding Consultant / Trainer', ['Fa']],
  ['Seminar Organizer', ['Joo']],
  ['Sales Manager', ['Tong']],
  ['Admin', ['Joo']],
] as const;
export const initialPlayers = staffRoster.flatMap(([role, names], roleIndex) =>
  names.map((name) => ({
    id: `staff-${roleIndex}-${name.toLowerCase()}`,
    name,
    email: '',
    role,
    roleScore: 0,
    revenue: 0,
    growth: 0,
    collaboration: 0,
    execution: 0,
  })),
);
