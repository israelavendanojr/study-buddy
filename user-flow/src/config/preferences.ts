export const PREFERENCES = [
  {
    key: 'cooking-goal',
    label: 'Cooking Goal',
    options: ['Learn to cook from scratch', 'Cook better at home', 'Master a specific skill'],
    defaultIndex: 1,
  },
  {
    key: 'cook-frequency',
    label: 'Cooks How Often',
    options: ['Rarely', 'Sometimes', 'Often', 'Daily'],
    defaultIndex: 1,
  },
  {
    key: 'experience',
    label: 'Experience',
    options: ['Total Beginner', 'Occasional Cook', 'Confident Home Cook', 'Kitchen Pro'],
    defaultIndex: 1,
  },
  {
    key: 'feedback-style',
    label: 'Feedback Style',
    options: ['Encouraging', 'Balanced', 'Strict'],
    defaultIndex: 1,
  },
  {
    key: 'daily-goal',
    label: 'Daily Goal',
    options: ['5 mins / day', '10 mins / day', '20 mins / day', '30 mins / day'],
    defaultIndex: 1,
  },
] as const;

export type PrefKey = (typeof PREFERENCES)[number]['key'];

export const PREF_STORAGE_KEY = (key: string) => `@garlic_pref_${key}`;
