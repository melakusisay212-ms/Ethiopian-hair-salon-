import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Client, Frequency } from '../types/client';
import { loadClients, saveClients } from '../utils/storage';
import { calculateNextDate, todayISO, isDateToday, isDateTomorrow } from '../utils/dates';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await loadClients();
      setClients(data);
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (next: Client[]) => {
    setClients(next);
    await saveClients(next);
  }, []);

  const addClient = useCallback(async (data: {
    name: string;
    phone: string;
    status: 'new' | 'returning';
    frequency: Frequency;
    lastServiceDate?: string | null;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    const last = data.lastServiceDate || null;
    const nextDate = calculateNextDate(last, data.frequency);

    const client: Client = {
      id: uuidv4(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      status: data.status,
      frequency: data.frequency,
      lastServiceDate: last,
      nextExpectedDate: nextDate,
      cyclesCompleted: data.status === 'returning' ? 1 : 0,
      notes: data.notes || '',
      reminderSentForDate: null,
      createdAt: now,
      updatedAt: now,
    };

    await persist([client, ...clients]);
    return client;
  }, [clients, persist]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    const next = clients.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...updates, updatedAt: new Date().toISOString() };
      if (updates.frequency || updates.lastServiceDate !== undefined) {
        updated.nextExpectedDate = calculateNextDate(
          updated.lastServiceDate,
          updated.frequency
        );
      }
      return updated;
    });
    await persist(next);
  }, [clients, persist]);

  const deleteClient = useCallback(async (id: string) => {
    await persist(clients.filter(c => c.id !== id));
  }, [clients, persist]);

  const markDone = useCallback(async (id: string) => {
    const today = todayISO();
    const next = clients.map(c => {
      if (c.id !== id) return c;
      const newCycles = c.cyclesCompleted + 1;
      const newNext = calculateNextDate(today, c.frequency);
      return {
        ...c,
        lastServiceDate: today,
        nextExpectedDate: newNext,
        cyclesCompleted: newCycles,
        status: 'returning' as const,
        reminderSentForDate: null,
        updatedAt: new Date().toISOString(),
      };
    });
    await persist(next);
  }, [clients, persist]);

  const markReminderSent = useCallback(async (id: string, forDate: string) => {
    await updateClient(id, { reminderSentForDate: forDate });
  }, [updateClient]);

  /** Import many clients from CSV (appends, skips exact phone duplicates) */
  const importClients = useCallback(async (newClients: Client[]) => {
    const existingPhones = new Set(clients.map(c => c.phone.replace(/\s+/g, '')));
    const unique = newClients.filter(c => !existingPhones.has(c.phone.replace(/\s+/g, '')));
    const skipped = newClients.length - unique.length;
    await persist([...unique, ...clients]);
    return { imported: unique.length, skipped };
  }, [clients, persist]);

  const todayClients = clients.filter(c => isDateToday(c.nextExpectedDate));
  const tomorrowClients = clients.filter(c => isDateTomorrow(c.nextExpectedDate));

  return {
    clients,
    loading,
    todayClients,
    tomorrowClients,
    addClient,
    updateClient,
    deleteClient,
    markDone,
    markReminderSent,
    importClients,
  };
}
