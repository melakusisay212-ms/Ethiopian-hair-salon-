export type Frequency = '2weeks' | '1month' | '2months' | '3months';

export type ClientStatus = 'new' | 'returning';

export interface Client {
  id: string;
  name: string;
  phone: string;
  status: ClientStatus;
  frequency: Frequency;
  lastServiceDate: string | null; // ISO date YYYY-MM-DD
  nextExpectedDate: string | null;
  cyclesCompleted: number;
  notes: string;
  reminderSentForDate: string | null; // the date for which reminder was sent
  createdAt: string;
  updatedAt: string;
}

export const FREQUENCY_DAYS: Record<Frequency, number> = {
  '2weeks': 14,
  '1month': 30,
  '2months': 60,
  '3months': 90,
};

export const FREQUENCY_LABELS: Record<Frequency, { en: string; am: string }> = {
  '2weeks': { en: 'Every 2 weeks', am: 'በየ 2 ሳምንቱ' },
  '1month': { en: 'Every 1 month', am: 'በየ ወሩ' },
  '2months': { en: 'Every 2 months', am: 'በየ 2 ወሩ' },
  '3months': { en: 'Every 3 months', am: 'በየ 3 ወሩ' },
};
