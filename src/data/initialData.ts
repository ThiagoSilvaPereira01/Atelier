import type { AppData } from '../types';

export function getTodayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().split('T')[0];
}

export function addDaysISO(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().split('T')[0];
}

export function createInitialData(userName = 'Raquel'): AppData {
  return {
    settings: {
      brandName: 'Atelier',
      brandSubtitle: 'PSICOLOGIA & ROTINA',
      userName,
      theme: 'pastel',
      hideFinancialValues: false,
      internshipHoursDone: 0,
      internshipHoursTarget: 300,
    },
    events: [],
    tasks: [],
    transactions: [],
    habits: [],
    goals: [],
    courses: [],
    readings: [],
  };
}
