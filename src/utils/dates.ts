import { addDays, format, parseISO, isToday, isTomorrow, startOfDay } from 'date-fns';
import { Frequency, FREQUENCY_DAYS } from '../types/client';

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function calculateNextDate(lastServiceDate: string | null, frequency: Frequency): string {
  const base = lastServiceDate ? parseISO(lastServiceDate) : new Date();
  const days = FREQUENCY_DAYS[frequency];
  return format(addDays(base, days), 'yyyy-MM-dd');
}

export function isDateToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return isToday(parseISO(dateStr));
}

export function isDateTomorrow(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return isTomorrow(parseISO(dateStr));
}

export function formatDisplayDate(dateStr: string | null, lang: 'en' | 'am' = 'en'): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  if (lang === 'am') {
    // Simple Amharic-friendly format
    return format(d, 'dd/MM/yyyy');
  }
  return format(d, 'MMM d, yyyy');
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = startOfDay(parseISO(dateStr));
  const now = startOfDay(new Date());
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
