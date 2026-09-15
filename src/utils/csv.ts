import { Client, Frequency } from '../types/client';
import { v4 as uuidv4 } from 'uuid';
import { calculateNextDate, todayISO } from './dates';

/**
 * Simple CSV parser (handles quoted fields and basic cases)
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        current.push(field.trim());
        field = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && next === '\n') i++;
        current.push(field.trim());
        if (current.some(c => c.length > 0)) {
          rows.push(current);
        }
        current = [];
        field = '';
      } else {
        field += char;
      }
    }
  }

  // last field
  if (field || current.length > 0) {
    current.push(field.trim());
    if (current.some(c => c.length > 0)) {
      rows.push(current);
    }
  }

  return rows;
}

function mapFrequency(raw: string): Frequency {
  const v = raw.toLowerCase().replace(/\s+/g, '');
  if (v.includes('2week') || v.includes('2w') || v === '14') return '2weeks';
  if (v.includes('2month') || v.includes('2m') || v === '60') return '2months';
  if (v.includes('3month') || v.includes('3m') || v === '90') return '3months';
  return '1month'; // default
}

function mapStatus(raw: string): 'new' | 'returning' {
  const v = raw.toLowerCase();
  if (v.includes('return') || v.includes('old') || v.includes('regular')) return 'returning';
  return 'new';
}

/**
 * Convert CSV rows into Client objects.
 * Expected common headers (flexible):
 * name, phone, frequency, status, last_service, notes
 * Also accepts Kobo-style headers.
 */
export function csvToClients(csvText: string): { clients: Client[]; errors: string[] } {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return { clients: [], errors: ['CSV must have a header row and at least one data row'] };
  }

  const headers = rows[0].map(h => h.toLowerCase().replace(/[_\s]+/g, ''));
  const errors: string[] = [];
  const clients: Client[] = [];
  const now = new Date().toISOString();

  const findCol = (...names: string[]) => {
    for (const n of names) {
      const idx = headers.findIndex(h => h.includes(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const nameIdx = findCol('name', 'fullname', 'clientname', 'fullname');
  const phoneIdx = findCol('phone', 'mobile', 'tel', 'phonenumber', 'telephone');
  const freqIdx = findCol('frequency', 'freq', 'howoften', 'cycle', 'interval');
  const statusIdx = findCol('status', 'type', 'neworreturning', 'clienttype');
  const lastIdx = findCol('lastservice', 'lastdate', 'lastvisit', 'last');
  const notesIdx = findCol('notes', 'note', 'comment', 'remark');

  if (nameIdx < 0 || phoneIdx < 0) {
    return {
      clients: [],
      errors: ['Could not find "name" and "phone" columns. Please check your CSV headers.'],
    };
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[nameIdx] || '').trim();
    const phone = (row[phoneIdx] || '').trim();

    if (!name || !phone) {
      errors.push(`Row ${i + 1}: missing name or phone – skipped`);
      continue;
    }

    const frequency = freqIdx >= 0 ? mapFrequency(row[freqIdx] || '') : '1month';
    const status = statusIdx >= 0 ? mapStatus(row[statusIdx] || '') : 'new';
    const lastServiceDate = lastIdx >= 0 && row[lastIdx] ? row[lastIdx].trim() : null;
    const notes = notesIdx >= 0 ? (row[notesIdx] || '').trim() : '';

    const nextExpectedDate = calculateNextDate(lastServiceDate, frequency);

    clients.push({
      id: uuidv4(),
      name,
      phone,
      status,
      frequency,
      lastServiceDate,
      nextExpectedDate,
      cyclesCompleted: status === 'returning' ? 1 : 0,
      notes,
      reminderSentForDate: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { clients, errors };
}
