import { Preferences } from '@capacitor/preferences';
import { Client } from '../types/client';

const CLIENTS_KEY = 'salon_clients_v1';
const LANG_KEY = 'salon_lang';
const SALON_NAME_KEY = 'salon_name';

export async function loadClients(): Promise<Client[]> {
  try {
    const { value } = await Preferences.get({ key: CLIENTS_KEY });
    if (!value) return [];
    return JSON.parse(value) as Client[];
  } catch {
    return [];
  }
}

export async function saveClients(clients: Client[]): Promise<void> {
  await Preferences.set({
    key: CLIENTS_KEY,
    value: JSON.stringify(clients),
  });
}

export async function loadLanguage(): Promise<'en' | 'am'> {
  const { value } = await Preferences.get({ key: LANG_KEY });
  return value === 'am' ? 'am' : 'en';
}

export async function saveLanguage(lang: 'en' | 'am'): Promise<void> {
  await Preferences.set({ key: LANG_KEY, value: lang });
}

export async function loadSalonName(): Promise<string> {
  const { value } = await Preferences.get({ key: SALON_NAME_KEY });
  return value || 'My Salon';
}

export async function saveSalonName(name: string): Promise<void> {
  await Preferences.set({ key: SALON_NAME_KEY, value: name });
}
