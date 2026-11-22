// Elder Parent dashboard: daily medicine check-ins, medicine prompts, upcoming visits, caretaker, emergency help and today's activity.
import { useState, useEffect } from 'react';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { ProgressBar } from '../../components/ProgressBar.jsx';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { Modal } from '../../components/Modal.jsx';
import { useToast } from '../../components/ToastProvider.jsx';
import { useEmergencyAlert } from '../../context/EmergencyAlertContext.jsx';
import { useCareRequests } from '../../context/CareRequestContext.jsx';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { listDemoAppointments } from '../../api/appointments.js';
import { useMyProfile, isFreshAccount, FreshAccountView } from '../../components/FreshAccountView.jsx';
import {
  ELDERLY_PEOPLE,
  MEDICINES,
  DAILY_MEDICINE_SLOTS,
  FAMILY_MEMBERS,
  CARETAKERS,
  ACTIVITY_LOG,
} from '../../data/mockData.js';

// Real backend appointment -> the shape this card already renders.
function fromApiAppointment(appointment) {
  const when = new Date(appointment.scheduledAt);
  return {
    id: appointment.id,
    title: appointment.title,
    doctor: appointment.doctor,
    place: appointment.place,
    date: when.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
    time: when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
    status: appointment.status,
    cabBooked: appointment.cabBooked,
    past: appointment.past,
  };
}

// Maps each slot id to its key stem in the medicineTiming translations (e.g. post-breakfast -> postBreakfast).
const SLOT_TRANSLATION_KEYS = {
  morning: 'morning',
  'post-breakfast': 'postBreakfast',
  afternoon: 'afternoon',
  evening: 'evening',
};

// Total number of daily medicine slots, used for the "x of 4 taken" progress.
const TOTAL_SLOTS = DAILY_MEDICINE_SLOTS.length;

// Responsive grid: columns wrap automatically, so phones show a single column.
const AUTO_GRID = {
  display: 'grid',
  gap: '1.25rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
};

// Flex row for buttons that should wrap on small screens.
const BUTTON_ROW = { display: 'flex', flexWrap: 'wrap', gap: '0.75rem' };

// Plain list with no bullets or default indentation.
const LIST_RESET = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' };

// Convert a display phone number such as "+91 98480 11223" into a tel: URL.
function toTelHref(phone) {
  return `tel:${phone.replace(/\s+/g, '')}`;
}

// Elder Parent dashboard view; the logged-in elder is the first ELDERLY_PEOPLE entry.
export function ElderDashboard() {
  // Translation helper and active language (used for the date format).
  const { t, language } = useTranslation();
  // Toast helper for confirmations and alerts.
  const { show } = useToast();
  // Shared alert state so the family/caretaker dashboards can show this the moment it's sent.
  const { triggerAlert } = useEmergencyAlert();
  // Nearby care requests a volunteer has responded to (e.g. "available to bring sugar tablets").
  const { requests: careRequests } = useCareRequests();
  const volunteerUpdates = careRequests.filter((request) => request.status === 'responded');
  // Signed-in profile from GET /me: a brand-new elder account gets an empty dashboard instead of the demo data.
  const { loading, profile } = useMyProfile();

  // The logged-in elder for this demo.
  const elder = ELDERLY_PEOPLE[0];
  // The first caretaker assigned to this elder.
  const caretaker = CARETAKERS.find((c) => c.assignedElderIds.includes(elder.id));
  // Family members linked to this elder, used as emergency contacts.
  const contacts = FAMILY_MEMBERS.filter((m) => m.elderId === elder.id);

  // Appointments: fetched from the same real, shared demo-elder data the
  // Appointments page reads/writes, so adding or deleting one there shows up
  // here too, instead of each screen keeping its own disconnected mock copy.
  const [appointments, setAppointments] = useState([]);
  useEffect(() => {
    let cancelled = false;
    listDemoAppointments()
      .then(({ appointments: fetched }) => {
        if (!cancelled) setAppointments(fetched.map(fromApiAppointment));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  // Only appointments that have not happened yet.
  const upcoming = appointments.filter((a) => !a.past);

  // Taken state per slot id; every slot starts as not taken.
  const [takenSlots, setTakenSlots] = useState(() =>
    Object.fromEntries(DAILY_MEDICINE_SLOTS.map((slot) => [slot.id, false])),
  );
  // Slots where the elder answered "Not yet" in the check panel, which hides that prompt.
  const [dismissedSlots, setDismissedSlots] = useState({});
  // Whether the emergency confirmation modal is open.
  const [alertOpen, setAlertOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#emergency');

  // Number of slots marked as taken today.
  const takenCount = DAILY_MEDICINE_SLOTS.filter((slot) => takenSlots[slot.id]).length;
  // Progress percentage for the daily medicine bar.
  const progressPercent = Math.round((takenCount / TOTAL_SLOTS) * 100);
  // Slots still waiting for a yes/no answer in the check panel.
  const pendingPrompts = DAILY_MEDICINE_SLOTS.filter((slot) => !takenSlots[slot.id] && !dismissedSlots[slot.id]);

  // Today's date, formatted in the active language.
  const todayText = new Date().toLocaleDateString(language === 'te' ? 'te-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Toggle a slot between taken and not taken when its card button is pressed.
  function toggleSlot(slotId) {
    const next = !takenSlots[slotId];
    setTakenSlots((previous) => ({ ...previous, [slotId]: next }));
    // Bringing a slot back to "not taken" lets its check prompt appear again.
    setDismissedSlots((previous) => ({ ...previous, [slotId]: false }));
    show(next ? t('elder.toastTaken') : t('elder.toastUntaken'), next ? 'success' : 'info');
  }

  // Handle "Yes" in the check panel: the slot is marked as taken.
  function answerYes(slotId) {
    setTakenSlots((previous) => ({ ...previous, [slotId]: true }));
    show(t('elder.toastTaken'), 'success');
  }

  // Handle "Not yet" in the check panel: hide this prompt and remind later.
  function answerNotYet(slotId) {
    setDismissedSlots((previous) => ({ ...previous, [slotId]: true }));
    show(t('elder.toastNotYet'), 'info');
  }

  // Close the emergency modal, confirm the alert was sent, and raise it for family/caretaker to see.
  function sendEmergencyAlert() {
    setAlertOpen(false);
    show(t('elder.toastAlert'), 'danger');
    triggerAlert({
      elderName: elder.displayName,
      severity: 'urgent',
      title: t('family.emergencyBannerTitle'),
      message: `${elder.displayName} ${t('family.emergencyBannerBody')}`,
    });
  }

  // Open emergency confirmation modal when hash changes to #emergency
  useEffect(() => {
    function onHashChange() {
      if (window.location.hash === '#emergency') {
        setAlertOpen(true);
      }
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Still loading the signed-in profile: show a short message instead of any dashboard data.
  if (loading) {
    return (
      <div className="senior-mode" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  // New Elder account with no family links yet: an empty dashboard with no demo data.
  if (isFreshAccount(profile, 'elder')) {
    return <FreshAccountView name={profile.user?.name || profile.user?.email} role="elder" />;
  }

  return (
    <div className="senior-mode" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Greeting header: elder's avatar, name and today's date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Avatar name={elder.displayName} tone="teal" size="lg" />
        <SectionHeader
          title={`${t('dashboard.greeting')}, ${elder.displayName}`}
          subtitle={`${todayText} · ${t('elder.pageSubtitle')}`}
        />
      </div>

      {/* Volunteer response banner: shown as soon as a nearby volunteer responds to a care request. */}
      {volunteerUpdates.map((request) => (
        <div key={request.id} className="care-request-banner" role="status">
          <span className="emergency-banner__icon" aria-hidden="true">
            {request.response === 'available' ? '🙋' : 'ℹ️'}
          </span>
          <div className="emergency-banner__text">
            <strong>{request.response === 'available' ? 'Volunteer available' : 'Volunteer update'}</strong>
            <p>
              {request.response === 'available'
                ? `${request.volunteerName} is available to ${request.actionText}.`
                : `${request.volunteerName} is not available to ${request.actionText} right now.`}
            </p>
          </div>
        </div>
      ))}

      {/* Emergency assistance: large red button that opens the confirmation modal */}
      <Card id="emergency">
        <button
          type="button"
          className="btn btn-danger btn-lg"
          style={{ width: '100%', minHeight: '5rem', fontSize: '1.4rem' }}
          onClick={() => setAlertOpen(true)}
        >
          {t('elder.emergencyButton')}
        </button>
        <p style={{ marginTop: '0.75rem' }}>{t('elder.emergencyHint')}</p>
      </Card>

      {/* Daily medicine section: progress, check prompts and the four slot cards */}
      <Card title={t('elder.medicinesTitle')}>
        <p>{t('elder.medicinesSubtitle')}</p>
        <div style={{ margin: '1rem 0' }}>
          <ProgressBar
            value={progressPercent}
            tone="success"
            label={`${takenCount} ${t('elder.progressOf')} ${TOTAL_SLOTS} ${t('elder.progressTaken')}`}
          />
        </div>

        {/* "Did you take your medicine?" prompts for slots not yet marked */}
        {pendingPrompts.length > 0 && (
          <div style={{ ...LIST_RESET, marginBottom: '1.25rem' }}>
            <h3>{t('elder.checkTitle')}</h3>
            {pendingPrompts.map((slot) => (
              <div key={slot.id} className="card" style={{ padding: '1rem' }}>
                <p>
                  <strong>{t(`medicineTiming.${SLOT_TRANSLATION_KEYS[slot.id]}`)}</strong>
                  {' — '}
                  {t('notifications.medicineTakenQuestion')}
                </p>
                <div style={{ ...BUTTON_ROW, marginTop: '0.75rem' }}>
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => answerYes(slot.id)}>
                    {t('notifications.yes')}
                  </button>
                  <button type="button" className="btn btn-secondary btn-lg" onClick={() => answerNotYet(slot.id)}>
                    {t('elder.notYet')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {pendingPrompts.length === 0 && takenCount === TOTAL_SLOTS && <p>{t('elder.allTakenToday')}</p>}

        {/* One card per daily slot with its time window, medicines and Taken toggle */}
        <div style={AUTO_GRID}>
          {DAILY_MEDICINE_SLOTS.map((slot) => {
            const stem = SLOT_TRANSLATION_KEYS[slot.id];
            const isTaken = Boolean(takenSlots[slot.id]);
            // Medicines scheduled for this slot, taken from the prescription data.
            const slotMedicines = MEDICINES.filter((medicine) => medicine.schedule === slot.id);
            return (
              <Card key={slot.id} title={t(`medicineTiming.${stem}`)}>
                <p>
                  <Badge tone="info">{t(`medicineTiming.${stem}Time`)}</Badge>
                </p>
                {slotMedicines.length > 0 ? (
                  <ul style={{ ...LIST_RESET, marginTop: '0.75rem' }}>
                    {slotMedicines.map((medicine) => (
                      <li key={medicine.id}>
                        <strong>{medicine.name}</strong> — {medicine.dosage}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t('elder.noMedicinesForSlot')}</p>
                )}
                <button
                  type="button"
                  className={`btn btn-lg ${isTaken ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ width: '100%', marginTop: '1rem' }}
                  aria-pressed={isTaken}
                  onClick={() => toggleSlot(slot.id)}
                >
                  {isTaken ? t('elder.takenDone') : t('elder.taken')}
                </button>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Upcoming appointments and caretaker details */}
      <div style={AUTO_GRID}>
        <Card title={t('elder.appointmentsTitle')}>
          {upcoming.length === 0 ? (
            <p>{t('elder.noAppointments')}</p>
          ) : (
            <ul style={LIST_RESET}>
              {upcoming.map((appointment) => (
                <li key={appointment.id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
                  <strong>{appointment.title}</strong>
                  <p>
                    {appointment.doctor} · {appointment.place}
                  </p>
                  <p>
                    {appointment.date} · {appointment.time}
                  </p>
                  <div style={{ ...BUTTON_ROW, marginTop: '0.5rem' }}>
                    <Badge tone={appointment.status === 'booked' ? 'success' : 'warning'}>
                      {appointment.status === 'booked' ? t('status.booked') : t('status.notBookedYet')}
                    </Badge>
                    <Badge tone={appointment.cabBooked ? 'success' : 'neutral'}>
                      {t('elder.cab')}: {appointment.cabBooked ? t('elder.cabBooked') : t('elder.cabNotBooked')}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('elder.caretakerTitle')}>
          {caretaker ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Avatar name={caretaker.name} tone="blue" size="md" />
                <strong>{caretaker.name}</strong>
              </div>
              <p>
                {t('elder.phone')}: <a href={toTelHref(caretaker.phone)}>{caretaker.phone}</a>
              </p>
              <p>
                {t('elder.shift')}: {caretaker.shift.days.join(', ')}, {caretaker.shift.start} – {caretaker.shift.end}
              </p>
              <a className="btn btn-primary btn-lg" href={toTelHref(caretaker.phone)}>
                {t('elder.callCaretaker')}
              </a>
            </div>
          ) : (
            <p>{t('elder.noCaretaker')}</p>
          )}
        </Card>
      </div>

      {/* Emergency contacts from family members linked to this elder, and today's activity */}
      <div style={AUTO_GRID}>
        <Card title={t('elder.emergencyContactsTitle')}>
          {contacts.length === 0 ? (
            <p>{t('elder.noContacts')}</p>
          ) : (
            <ul style={LIST_RESET}>
              {contacts.map((member) => (
                <li
                  key={member.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}
                >
                  <span>
                    <strong>{member.name}</strong> ({member.relation})
                    <br />
                    <a href={toTelHref(member.phone)}>{member.phone}</a>
                  </span>
                  <a className="btn btn-ghost" href={toTelHref(member.phone)}>
                    {t('common.call')}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Today's activity from the activity log */}
        <Card title={t('elder.activityTitle')}>
          {ACTIVITY_LOG.length === 0 ? (
            <p>{t('elder.noActivity')}</p>
          ) : (
            <ul style={LIST_RESET}>
              {ACTIVITY_LOG.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.time}</strong> — {entry.text}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Emergency confirmation: asks before sending the alert */}
      <Modal
        open={alertOpen}
        title={t('elder.emergencyModalTitle')}
        onClose={() => setAlertOpen(false)}
        footer={
          <div style={BUTTON_ROW}>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => setAlertOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-danger btn-lg" onClick={sendEmergencyAlert}>
              {t('elder.sendAlert')}
            </button>
          </div>
        }
      >
        <p>{t('elder.emergencyQuestion')}</p>
      </Modal>
    </div>
  );
}
