import React, { useState, useEffect, useRef } from 'react';
import { useClients } from './hooks/useClients';
import { translations, Lang, TranslationKey } from './i18n/translations';
import { loadLanguage, saveLanguage, loadSalonName } from './utils/storage';
import { FREQUENCY_LABELS, Frequency, Client } from './types/client';
import { formatDisplayDate, todayISO } from './utils/dates';
import { sendReminderSms } from './utils/sms';
import { csvToClients } from './utils/csv';

type Tab = 'today' | 'tomorrow' | 'clients';

function App() {
  const {
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
  } = useClients();

  const [lang, setLang] = useState<Lang>('en');
  const [salonName, setSalonName] = useState('My Salon');
  const [tab, setTab] = useState<Tab>('today');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [smsPreview, setSmsPreview] = useState<{ client: Client; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: TranslationKey) => translations[lang][key];

  useEffect(() => {
    (async () => {
      const l = await loadLanguage();
      setLang(l);
      const name = await loadSalonName();
      setSalonName(name);
    })();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const toggleLang = async () => {
    const next = lang === 'en' ? 'am' : 'en';
    setLang(next);
    await saveLanguage(next);
  };

  // Form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    status: 'new' as 'new' | 'returning',
    frequency: '1month' as Frequency,
    lastServiceDate: '',
    notes: '',
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      phone: '',
      status: 'new',
      frequency: '1month',
      lastServiceDate: '',
      notes: '',
    });
    setShowForm(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone,
      status: c.status,
      frequency: c.frequency,
      lastServiceDate: c.lastServiceDate || '',
      notes: c.notes,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast(t('errorName'));
      return;
    }
    if (!form.phone.trim()) {
      showToast(t('errorPhone'));
      return;
    }

    if (editing) {
      await updateClient(editing.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        status: form.status,
        frequency: form.frequency,
        lastServiceDate: form.lastServiceDate || null,
        notes: form.notes,
      });
      showToast(t('successSaved'));
    } else {
      await addClient({
        name: form.name,
        phone: form.phone,
        status: form.status,
        frequency: form.frequency,
        lastServiceDate: form.lastServiceDate || null,
        notes: form.notes,
      });
      showToast(t('successSaved'));
    }
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('confirmDelete'))) {
      await deleteClient(id);
      showToast(t('successDeleted'));
    }
  };

  const handleMarkDone = async (id: string) => {
    await markDone(id);
    showToast(t('successDone'));
  };

  const handleSendReminder = async (client: Client) => {
    const msg = t('defaultMessage').replace('{name}', client.name);
    setSmsPreview({ client, message: msg });
  };

  const confirmSendSms = async () => {
    if (!smsPreview) return;
    const { client, message } = smsPreview;
    const result = await sendReminderSms(client.phone, message);
    if (result.success) {
      await markReminderSent(client.id, client.nextExpectedDate || todayISO());
      showToast(result.method === 'silent' ? 'SMS sent!' : t('openSmsApp'));
    } else {
      showToast('Failed to open SMS');
    }
    setSmsPreview(null);
  };

  // CSV Import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { clients: parsed, errors } = csvToClients(text);

      if (errors.length > 0 && parsed.length === 0) {
        showToast(t('importError'));
        console.warn(errors);
        return;
      }

      const { imported, skipped } = await importClients(parsed);
      let msg = t('importSuccess').replace('{count}', String(imported));
      if (skipped > 0) {
        msg += ' ' + t('importSkipped').replace('{skipped}', String(skipped));
      }
      showToast(msg);
    } catch (err) {
      console.error(err);
      showToast(t('importError'));
    }

    // reset input so same file can be chosen again
    e.target.value = '';
  };

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const renderClientCard = (c: Client, showActions: 'today' | 'tomorrow' | 'all') => {
    const reminderAlreadySent = c.reminderSentForDate === c.nextExpectedDate;

    return (
      <div key={c.id} className="card client-card">
        <div className="client-header">
          <div>
            <div className="client-name">{c.name}</div>
            <div className="client-phone">{c.phone}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${c.status === 'new' ? 'badge-new' : 'badge-returning'}`}>
              {c.status === 'new' ? t('newClient') : t('returning')}
            </span>
          </div>
        </div>

        <div className="client-meta">
          <span>{FREQUENCY_LABELS[c.frequency][lang]}</span>
          <span>•</span>
          <span className="badge badge-cycles">{c.cyclesCompleted} {t('cycles')}</span>
          {c.nextExpectedDate && (
            <>
              <span>•</span>
              <span>{t('nextExpected')}: {formatDisplayDate(c.nextExpectedDate, lang)}</span>
            </>
          )}
        </div>

        {c.notes && (
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{c.notes}</div>
        )}

        <div className="client-actions">
          {showActions === 'tomorrow' && (
            <button
              className={`btn btn-sm ${reminderAlreadySent ? 'btn-outline' : 'btn-primary'}`}
              onClick={() => handleSendReminder(c)}
              disabled={reminderAlreadySent}
            >
              {reminderAlreadySent ? t('reminderSent') : t('sendReminder')}
            </button>
          )}

          {showActions === 'today' && (
            <button className="btn btn-sm btn-success" onClick={() => handleMarkDone(c.id)}>
              {t('markDone')}
            </button>
          )}

          {(showActions === 'all' || showActions === 'today' || showActions === 'tomorrow') && (
            <>
              <button className="btn btn-sm btn-outline" onClick={() => openEdit(c)}>
                {t('editClient')}
              </button>
              {showActions === 'all' && (
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>
                  {t('deleteClient')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>{salonName || t('appName')}</h1>
        <div className="header-actions">
          <button className="lang-btn" onClick={toggleLang}>
            {lang === 'en' ? 'አማ' : 'EN'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs">
        <button
          className={`tab ${tab === 'today' ? 'active' : ''}`}
          onClick={() => setTab('today')}
        >
          {t('today')}
          {todayClients.length > 0 && (
            <span className="tab-badge">{todayClients.length}</span>
          )}
        </button>
        <button
          className={`tab ${tab === 'tomorrow' ? 'active' : ''}`}
          onClick={() => setTab('tomorrow')}
        >
          {t('tomorrow')}
          {tomorrowClients.length > 0 && (
            <span className="tab-badge">{tomorrowClients.length}</span>
          )}
        </button>
        <button
          className={`tab ${tab === 'clients' ? 'active' : ''}`}
          onClick={() => setTab('clients')}
        >
          {t('clients')}
          <span className="tab-badge">{clients.length}</span>
        </button>
      </nav>

      {/* Content */}
      <main className="content">
        {tab === 'today' && (
          <>
            {todayClients.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">✂️</div>
                <div>{t('noClientsToday')}</div>
              </div>
            ) : (
              todayClients.map(c => renderClientCard(c, 'today'))
            )}
          </>
        )}

        {tab === 'tomorrow' && (
          <>
            {tomorrowClients.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📅</div>
                <div>{t('noClientsTomorrow')}</div>
              </div>
            ) : (
              tomorrowClients.map(c => renderClientCard(c, 'tomorrow'))
            )}
          </>
        )}

        {tab === 'clients' && (
          <>
            <div className="search-bar">
              <input
                type="search"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Import CSV button */}
            <div style={{ marginBottom: 12 }}>
              <button className="btn btn-outline btn-block" onClick={handleImportClick}>
                📥 {t('importCsv')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6, textAlign: 'center' }}>
                {t('chooseCsv')}
              </div>
            </div>

            {filteredClients.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">👥</div>
                <div>{t('noClients')}</div>
              </div>
            ) : (
              filteredClients.map(c => renderClientCard(c, 'all'))
            )}
          </>
        )}
      </main>

      {/* FAB */}
      <button className="fab" onClick={openAdd} aria-label={t('addClient')}>
        +
      </button>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? t('editClient') : t('addClient')}</h2>

            <div className="form-group">
              <label>{t('name')}</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Abebe Kebede"
              />
            </div>

            <div className="form-group">
              <label>{t('phone')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="09xxxxxxxx"
              />
            </div>

            <div className="form-group">
              <label>{t('status')}</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as any })}
              >
                <option value="new">{t('newClient')}</option>
                <option value="returning">{t('returning')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('frequency')}</label>
              <select
                value={form.frequency}
                onChange={e => setForm({ ...form, frequency: e.target.value as Frequency })}
              >
                {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map(f => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f][lang]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('lastService')} (optional)</label>
              <input
                type="date"
                value={form.lastServiceDate}
                onChange={e => setForm({ ...form, lastServiceDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>{t('notes')}</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>
                {t('cancel')}
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Preview Modal */}
      {smsPreview && (
        <div className="modal-overlay" onClick={() => setSmsPreview(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{t('messagePreview')}</h2>
            <div className="form-group">
              <label>{t('phone')}</label>
              <input value={smsPreview.client.phone} readOnly />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                rows={3}
                value={smsPreview.message}
                onChange={e =>
                  setSmsPreview({ ...smsPreview, message: e.target.value })
                }
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setSmsPreview(null)}>
                {t('cancel')}
              </button>
              <button className="btn btn-primary" onClick={confirmSendSms}>
                {t('sendReminder')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
