// Medicines page: daily reminder checklist, medicines grouped by timing slot, stock levels and refill tracking.
import { useRef, useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { Badge } from '../components/Badge.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useEmergencyAlert } from '../context/EmergencyAlertContext.jsx';
import { MEDICINES, DAILY_MEDICINE_SLOTS } from '../data/mockData.js';

// Stock level (in days) that counts as low and shows the low-stock badge.
const LOW_STOCK_DAYS = 7;

// Stock days that a refill restores; used for the progress bar scale and the refill reset.
const FULL_STOCK_DAYS = 30;

// Translation keys for each daily slot's label and time, keyed by the slot id from the data.
const SLOT_TEXT_KEYS = {
  morning: { label: 'medicineTiming.morning', time: 'medicineTiming.morningTime' },
  'post-breakfast': { label: 'medicineTiming.postBreakfast', time: 'medicineTiming.postBreakfastTime' },
  afternoon: { label: 'medicineTiming.afternoon', time: 'medicineTiming.afternoonTime' },
  evening: { label: 'medicineTiming.evening', time: 'medicineTiming.eveningTime' },
};

// Tab definitions for the schedule view: each tab shows medicines whose schedule matches its id.
const SCHEDULE_TABS = [
  { id: 'morning', labelKey: 'pages.medicines.slotMorning' },
  { id: 'post-breakfast', labelKey: 'pages.medicines.slotPostBreakfast' },
  { id: 'afternoon', labelKey: 'pages.medicines.slotAfternoon' },
  { id: 'evening', labelKey: 'pages.medicines.slotEvening' },
  { id: 'weekly', labelKey: 'pages.medicines.slotWeekly' },
];

// Mock data for the "Medicines needed" card (not from the backend).
const NEEDED_MEDICINES = [
  { name: 'Fever tablet (Paracetamol 650 mg)', note: 'Requested via Chitti for Savitramma', status: 'Requested today' },
  { name: 'Metformin 500 mg', note: 'Refill needed', status: 'Refill due this week' },
  { name: 'Amlodipine 5 mg', note: 'Refill needed', status: 'Refill due this week' },
];


// Empty values for one medicine entry in the add medicine form.
const EMPTY_MEDICINE_ENTRY = {
  type: '',
  name: '',
  dosage: '',
  frequency: '',
  startDate: '',
  endDate: '',
  prescribedBy: '',
  notes: '',
};

// Build one blank medicine entry with a unique key for React lists.
function createEntry() {
  return { ...EMPTY_MEDICINE_ENTRY, key: `entry-${Date.now()}-${Math.random().toString(36).slice(2)}` };
}

// Medicines page with the taken checklist, slot tabs, stock progress and a mark-refilled action.
export function MedicinesPage() {
  // Translation helper and toast trigger.
  const { t } = useTranslation();
  const { show } = useToast();
  // Medicine requests raised by the elder via Chitti, and a way to mark one done.
  const { medicineRequests, clearMedicineRequest } = useEmergencyAlert();


  // Medicine list kept in state so refills update the stock figures.
  const [medicines, setMedicines] = useState(() => MEDICINES.map((item) => ({ ...item })));
  // Taken state for each daily reminder slot, keyed by slot id.
  const [takenSlots, setTakenSlots] = useState({});
  // Slot tab currently selected in the schedule view.
  const [activeSlot, setActiveSlot] = useState('morning');
  // Add medicine form: showAddForm opens the panel; entries holds one object per medicine being added.
  const [showAddForm, setShowAddForm] = useState(false);
  const [entries, setEntries] = useState(() => [createEntry()]);
  const [photoName, setPhotoName] = useState('');
  const [formError, setFormError] = useState('');
  const [formKey, setFormKey] = useState(0);
  // Medicines added through the form this session. Local state only.
  const [addedMedicines, setAddedMedicines] = useState([]);
  // Upload box: ref opens the hidden file picker, isDragOver highlights the box while a file is dragged over.
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // True when every daily reminder slot has been ticked as taken.
  const allTaken = DAILY_MEDICINE_SLOTS.every((slot) => takenSlots[slot.id]);

  // Flip the taken state of one reminder slot and confirm with a toast.
  function toggleSlot(slotId) {
    const nextTaken = !takenSlots[slotId];
    setTakenSlots((previous) => ({ ...previous, [slotId]: nextTaken }));
    show(t(nextTaken ? 'pages.medicines.toastTaken' : 'pages.medicines.toastNotTaken'), nextTaken ? 'success' : 'info');
  }

  // Record a refill for one medicine: stock returns to a full month and a toast confirms it.
  function handleRefill(id) {
    setMedicines((previous) => previous.map((item) => (item.id === id ? { ...item, stockDaysLeft: FULL_STOCK_DAYS } : item)));
    show(t('pages.medicines.toastRefilled'), 'success');
  }

  // Open the add form with one blank medicine entry.
  function openAddForm() {
    setEntries([createEntry()]);
    setPhotoName('');
    setFormError('');
    setFormKey((k) => k + 1);
    setShowAddForm(true);
  }

  // Close the form without saving anything and reset it.
  function closeAddForm() {
    setShowAddForm(false);
    setEntries([createEntry()]);
    setPhotoName('');
    setFormError('');
  }

  // Update one field of one medicine entry, found by its key.
  function setEntryField(key, name, value) {
    setEntries((prev) => prev.map((entry) => (entry.key === key ? { ...entry, [name]: value } : entry)));
  }

  // Append a blank medicine entry to the form.
  function addEntry() {
    setEntries((prev) => [...prev, createEntry()]);
  }

  // Remove one medicine entry. The first entry stays so at least one is always kept.
  function removeEntry(key) {
    setEntries((prev) => (prev.length > 1 ? prev.filter((entry) => entry.key !== key) : prev));
  }

  // Validate every entry, then add them to the page list and close the form.
  function handleSaveMedicines(e) {
    e.preventDefault();
    const missing = entries.some((entry) => !entry.type || !entry.name.trim() || !entry.startDate);
    if (missing) {
      setFormError('Please fill in the required fields for each medicine.');
      return;
    }

    const newItems = entries.map((entry) => ({
      id: entry.key,
      type: entry.type,
      name: entry.name.trim(),
      dosage: entry.dosage.trim(),
      frequency: entry.frequency.trim(),
      startDate: entry.startDate,
      endDate: entry.endDate,
      prescribedBy: entry.prescribedBy.trim(),
      notes: entry.notes.trim(),
      photoName,
    }));
    // NOTE: saving to the database is not connected yet. Entries are kept in local state only.
    setAddedMedicines((prev) => [...prev, ...newItems]);
    closeAddForm();
  }

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, boxSizing: 'border-box' };
  const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 };

  // Medicines that belong to the selected schedule tab.
  const visibleMedicines = medicines.filter((item) => item.schedule === activeSlot);

  // Tab definitions built with the current language.
  const tabs = SCHEDULE_TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey) }));

  return (
    <div className="stack">
      {/* Page header with the translated section name and a short description */}
      <SectionHeader title={t('nav.medicines')} subtitle={t('pages.medicines.subtitle')} />

      {/* Add medicine: button above the cards, opening the inline form panel */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-sm" onClick={openAddForm}>
          Add medicine
        </button>
      </div>

      {/* Add medicine form panel: shared photo at the top, then one block per medicine */}
      {showAddForm && (
        <div className="policy-card">
          <h4 className="policy-provider" style={{ marginBottom: 12 }}>
            Add medicine
          </h4>
          <form key={formKey} onSubmit={handleSaveMedicines} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                Prescription or medicine photo (PDF or image)
                <div
                  className={`upload-dropzone${isDragOver ? ' upload-dropzone--active' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) setPhotoName(file.name);
                  }}
                >
                  <div className="upload-dropzone__content">
                    <svg
                      className="upload-dropzone__icon"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 15V4" />
                      <path d="M7 9l5-5 5 5" />
                      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
                    </svg>
                    <div>
                      <p className="upload-dropzone__text">Drag and drop files here or upload</p>
                      <p className="upload-dropzone__hint">Accepted file types: JPEG, PNG, WEBP, PDF</p>
                    </div>
                  </div>
                  <button type="button" className="upload-dropzone__button" onClick={() => fileInputRef.current?.click()}>
                    Upload
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="upload-dropzone__input"
                  aria-label="Prescription or medicine photo"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setPhotoName(e.target.files[0]?.name ?? '')}
                />
                <span style={{ fontSize: 13, opacity: 0.8 }}>{photoName ? `Selected: ${photoName}` : 'No file chosen'}</span>
              </label>
            </div>

            {entries.map((entry, index) => (
              <div key={entry.key} style={{ border: '1px solid var(--color-border, #cccccc)', borderRadius: 8, padding: 12, marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <strong>Medicine {index + 1}</strong>
                  {index > 0 && (
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => removeEntry(entry.key)}>
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <label style={labelStyle}>
                    Medicine type *
                    <select style={inputStyle} value={entry.type} onChange={(e) => setEntryField(entry.key, 'type', e.target.value)}>
                      <option value="">Select type</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Injection">Injection</option>
                    </select>
                  </label>
                  <label style={labelStyle}>
                    Medicine name *
                    <input type="text" style={inputStyle} value={entry.name} onChange={(e) => setEntryField(entry.key, 'name', e.target.value)} />
                  </label>
                  <label style={labelStyle}>
                    Dosage (for example 500 mg or 5 ml)
                    <input type="text" style={inputStyle} value={entry.dosage} onChange={(e) => setEntryField(entry.key, 'dosage', e.target.value)} />
                  </label>
                  <label style={labelStyle}>
                    Frequency or times (for example Morning, Night)
                    <input type="text" style={inputStyle} value={entry.frequency} onChange={(e) => setEntryField(entry.key, 'frequency', e.target.value)} />
                  </label>
                  <label style={labelStyle}>
                    Start date *
                    <input type="date" style={inputStyle} value={entry.startDate} onChange={(e) => setEntryField(entry.key, 'startDate', e.target.value)} />
                  </label>
                  <label style={labelStyle}>
                    End date
                    <input type="date" style={inputStyle} value={entry.endDate} onChange={(e) => setEntryField(entry.key, 'endDate', e.target.value)} />
                  </label>
                  <label style={labelStyle}>
                    Prescribed by
                    <input type="text" style={inputStyle} value={entry.prescribedBy} onChange={(e) => setEntryField(entry.key, 'prescribedBy', e.target.value)} />
                  </label>
                  <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                    Instructions or notes
                    <textarea rows={3} style={inputStyle} value={entry.notes} onChange={(e) => setEntryField(entry.key, 'notes', e.target.value)} />
                  </label>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addEntry}>
                Add another medicine
              </button>
            </div>

            {formError && <p style={{ color: 'var(--color-danger, #e5484d)', marginTop: 12 }}>{formError}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="submit" className="btn btn-sm">
                Save medicine
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={closeAddForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Added medicines: entries saved from the form this session, shown as a list */}
      {addedMedicines.length > 0 && (
        <Card title="Added medicines">
          <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {addedMedicines.map((item) => (
              <li key={item.id} className="row row--between">
                <div>
                  <strong>
                    {item.type} · {item.name}
                  </strong>
                  {(item.dosage || item.frequency) && (
                    <p className="section-header__subtitle">
                      {[item.dosage, item.frequency].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="section-header__subtitle">
                    Starts {item.startDate}
                    {item.endDate ? ` · Ends ${item.endDate}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Requested from Chitti: live medicine requests raised by the elder */}
      <Card title="Requested from Chitti">
        {medicineRequests.length === 0 && <p className="section-header__subtitle">No requests from Chitti yet.</p>}
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {medicineRequests.map((item) => (
            <li key={item.id} className="row row--between">
              <div>
                <strong>{item.medicine}</strong>
                <p className="section-header__subtitle">Requested by {item.elderName} via Chitti</p>
                <p className="section-header__subtitle">{new Date(item.triggeredAt).toLocaleString()}</p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => clearMedicineRequest(item.id)}>
                Mark done
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Medicines needed: mock requests and refills for the family member view */}
      <Card title="Medicines needed">
        <div
          style={{
            border: '1px solid #e0a84a',
            background: '#2e2d24',
            color: '#e0a84a',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
          }}
        >
          Savitramma needs fever tablet (Chitti)
        </div>
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {NEEDED_MEDICINES.map((item) => (
            <li key={item.name} className="row row--between">
              <div>
                <strong>{item.name}</strong>
                <p className="section-header__subtitle">{item.note}</p>
              </div>
              <span className="section-header__subtitle">{item.status}</span>
            </li>
          ))}
        </ul>
      </Card>


      {/* Daily reminders: one row per fixed slot with a taken toggle */}
      <Card title={t('pages.medicines.remindersTitle')}>
        <p className="section-header__subtitle">{t('pages.medicines.remindersSubtitle')}</p>
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {DAILY_MEDICINE_SLOTS.map((slot) => {
            const taken = Boolean(takenSlots[slot.id]);
            const keys = SLOT_TEXT_KEYS[slot.id];
            // Names of the medicines scheduled into this slot, shown under the slot label.
            const names = medicines.filter((item) => item.schedule === slot.id).map((item) => `${item.name} ${item.dosage}`);
            return (
              <li key={slot.id} className="row row--between">
                <div>
                  <strong>{t(keys.label)}</strong> <span className="section-header__subtitle">{t(keys.time)}</span>
                  {names.length > 0 && <p className="section-header__subtitle">{names.join(', ')}</p>}
                </div>
                {/* Toggle: aria-pressed reflects whether this slot has been taken */}
                <button
                  type="button"
                  className={`btn btn-sm ${taken ? 'btn-primary' : 'btn-secondary'}`}
                  aria-pressed={taken}
                  onClick={() => toggleSlot(slot.id)}
                >
                  {taken ? t('pages.medicines.taken') : t('pages.medicines.notTaken')}
                </button>
              </li>
            );
          })}
        </ul>
        {allTaken && <Badge tone="success">{t('pages.medicines.allTaken')}</Badge>}
      </Card>

      {/* Schedule view: medicines grouped by slot tab, each with stock and refill info */}
      <Card title={t('pages.medicines.medicinesTitle')}>
        <Tabs tabs={tabs} activeId={activeSlot} onChange={setActiveSlot} />

        {visibleMedicines.length === 0 && <EmptyState title={t('pages.medicines.slotEmpty')} />}

        <div className="grid grid--2">
          {visibleMedicines.map((item) => {
            // Low stock when the remaining days drop below the threshold.
            const low = item.stockDaysLeft < LOW_STOCK_DAYS;
            // Share of a full month still in stock, used for the progress bar.
            const percent = (item.stockDaysLeft / FULL_STOCK_DAYS) * 100;
            return (
              <Card
                key={item.id}
                title={`${item.name} · ${item.dosage}`}
                action={low ? <Badge tone="danger">{t('pages.medicines.lowStock')}</Badge> : null}
              >
                <div className="stack">
                  <p>
                    <strong>{t('pages.medicines.timing')}:</strong> {item.timing}
                  </p>
                  <p>
                    <strong>{t('pages.medicines.instructions')}:</strong> {item.instructions}
                  </p>
                  <ProgressBar
                    value={percent}
                    tone={low ? 'danger' : 'success'}
                    label={`${t('pages.medicines.stockLabel')}: ${item.stockDaysLeft} ${t('pages.medicines.daysLeft')}`}
                  />
                  <p className="section-header__subtitle">
                    {t('pages.medicines.refillBy')}: {item.refillBy} · {t('pages.medicines.refilledBy')}: {item.refilledBy}
                  </p>
                  <div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRefill(item.id)}>
                      {t('pages.medicines.markRefilled')}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
