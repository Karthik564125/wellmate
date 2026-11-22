// Medicines page: daily reminder checklist, medicines grouped by timing slot, stock levels and refill tracking.
import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { Badge } from '../components/Badge.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
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

// Medicines page with the taken checklist, slot tabs, stock progress and a mark-refilled action.
export function MedicinesPage() {
  // Translation helper and toast trigger.
  const { t } = useTranslation();
  const { show } = useToast();

  // Medicine list kept in state so refills update the stock figures.
  const [medicines, setMedicines] = useState(() => MEDICINES.map((item) => ({ ...item })));
  // Taken state for each daily reminder slot, keyed by slot id.
  const [takenSlots, setTakenSlots] = useState({});
  // Slot tab currently selected in the schedule view.
  const [activeSlot, setActiveSlot] = useState('morning');

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

  // Medicines that belong to the selected schedule tab.
  const visibleMedicines = medicines.filter((item) => item.schedule === activeSlot);

  // Tab definitions built with the current language.
  const tabs = SCHEDULE_TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey) }));

  return (
    <div className="stack">
      {/* Page header with the translated section name and a short description */}
      <SectionHeader title={t('nav.medicines')} subtitle={t('pages.medicines.subtitle')} />

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
