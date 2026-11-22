// Caretaker dashboard: assigned elders with care plans, today's medicine reminders and tasks, shared appointments and activity notes.
import { useState } from 'react';
import { Card } from '../../components/Card.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { ProgressBar } from '../../components/ProgressBar.jsx';
import { StatCard } from '../../components/StatCard.jsx';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { Modal } from '../../components/Modal.jsx';
import { useToast } from '../../components/ToastProvider.jsx';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { useMyProfile, isFreshAccount, FreshAccountView } from '../../components/FreshAccountView.jsx';
import {
  CARETAKERS,
  ELDERLY_PEOPLE,
  MEDICINES,
  DAILY_MEDICINE_SLOTS,
  APPOINTMENTS,
  TASKS,
} from '../../data/mockData.js';

// The caretaker shown on this dashboard is the first record in the sample data.
const caretaker = CARETAKERS[0];

// Only the elders listed in this caretaker's assignments are shown.
const assignedElders = ELDERLY_PEOPLE.filter((elder) => caretaker.assignedElderIds.includes(elder.id));

// Appointments that have not happened yet; they are shared, not tied to one elder.
const upcomingAppointments = APPOINTMENTS.filter((appointment) => !appointment.past);

// Map a slot id (for example 'post-breakfast') to its camelCase key under medicineTiming.
const SLOT_KEYS = {
  morning: 'morning',
  'post-breakfast': 'postBreakfast',
  afternoon: 'afternoon',
  evening: 'evening',
};

// Map an appointment status to the status label key in translations.
const APPOINTMENT_STATUS_KEYS = {
  booked: 'status.booked',
  'not-booked-yet': 'status.notBookedYet',
  completed: 'status.completed',
};

// Availability is a string for some caretakers and an array of days for others; always return display text.
function formatAvailability(value) {
  if (Array.isArray(value)) return value.join(', ');
  return value ?? '';
}

// Build a readable shift line such as "Mon, Tue, Wed · 08:00 – 16:00".
function formatShift(shift) {
  if (!shift) return '';
  return `${shift.days.join(', ')} · ${shift.start} – ${shift.end}`;
}

// Caretaker dashboard root: owns all state and renders the header, stats, tabs and the activity note form.
export function CaretakerDashboard() {
  // Translation helper for every label on this page.
  const { t } = useTranslation();
  // Toast helper used to confirm actions.
  const { show } = useToast();
  // Signed-in profile from GET /me: a brand-new caretaker account gets an empty dashboard instead of the demo data.
  const { loading, profile } = useMyProfile();

  // Which tab is currently visible: today, elders or appointments.
  const [activeTab, setActiveTab] = useState('today');
  // Medicine slots marked as given, keyed by "elderId:slotId".
  const [givenSlots, setGivenSlots] = useState({});
  // Task completion state keyed by task id, seeded from the sample data.
  const [doneTasks, setDoneTasks] = useState(() => Object.fromEntries(TASKS.map((task) => [task.id, task.done])));
  // Appointment ids the caretaker has confirmed they will assist with.
  const [confirmed, setConfirmed] = useState({});
  // Elder whose care plan modal is open, or null when closed.
  const [carePlanElderId, setCarePlanElderId] = useState(null);
  // Activity notes added during this session.
  const [notes, setNotes] = useState([]);
  // Form state for the activity note: selected elder, note text and validation message.
  const [noteElderId, setNoteElderId] = useState(assignedElders[0]?.id ?? '');
  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState('');

  // Totals used by the stat cards and the completion bar.
  const totalSlots = assignedElders.length * DAILY_MEDICINE_SLOTS.length;
  const givenCount = Object.values(givenSlots).filter(Boolean).length;
  const pendingReminders = Math.max(0, totalSlots - givenCount);
  const doneTaskCount = Object.values(doneTasks).filter(Boolean).length;
  const completionPercent = Math.round(((givenCount + doneTaskCount) / (totalSlots + TASKS.length)) * 100);

  // Tabs shown under the header.
  const tabs = [
    { id: 'today', label: t('caretaker.tabToday') },
    { id: 'elders', label: t('caretaker.tabElders') },
    { id: 'appointments', label: t('caretaker.tabAppointments') },
  ];

  // Mark one elder's medicine slot as given and confirm with a toast.
  function handleMarkGiven(elderId, slotId) {
    setGivenSlots((previous) => ({ ...previous, [`${elderId}:${slotId}`]: true }));
    show(t('caretaker.toastGiven'), 'success');
  }

  // Flip a task between done and not done.
  function handleToggleTask(taskId) {
    setDoneTasks((previous) => ({ ...previous, [taskId]: !previous[taskId] }));
  }

  // Flip the assistance confirmation for one appointment and tell the caretaker what changed.
  function handleToggleConfirm(appointmentId) {
    const nextValue = !confirmed[appointmentId];
    setConfirmed((previous) => ({ ...previous, [appointmentId]: nextValue }));
    show(t(nextValue ? 'caretaker.toastConfirmed' : 'caretaker.toastUnconfirmed'), nextValue ? 'success' : 'info');
  }

  // Validate the activity note; empty text shows an inline message, valid text is appended and toasted.
  function handleNoteSubmit(event) {
    event.preventDefault();
    const text = noteText.trim();
    if (!text) {
      setNoteError(t('caretaker.noteRequired'));
      return;
    }
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNotes((previous) => [...previous, { id: `note-${Date.now()}`, elderId: noteElderId, text, time }]);
    setNoteText('');
    setNoteError('');
    show(t('caretaker.toastNote'), 'success');
  }

  // The elder currently shown in the care plan modal, looked up from the assigned list.
  const carePlanElder = assignedElders.find((elder) => elder.id === carePlanElderId) ?? null;

  // Still loading the signed-in profile: show a short message instead of any dashboard data.
  if (loading) {
    return (
      <div className="caretaker-dashboard">
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  // New Caretaker account with no assignments yet: an empty dashboard with no demo data.
  if (isFreshAccount(profile, 'caretaker')) {
    return <FreshAccountView name={profile.user?.name || profile.user?.email} role="caretaker" />;
  }

  return (
    <div className="caretaker-dashboard">
      {/* Header: caretaker identity, specialty, shift and availability */}
      <Card>
        <div className="caretaker-profile">
          <Avatar name={caretaker.name} tone="teal" size="lg" />
          <div>
            <SectionHeader title={caretaker.name} subtitle={t('caretaker.pageSubtitle')} />
            <p>{caretaker.specialty}</p>
            <p>
              <Badge tone="info">{`${t('caretaker.shiftLabel')}: ${formatShift(caretaker.shift)}`}</Badge>{' '}
              <Badge tone="neutral">{`${t('caretaker.availabilityLabel')}: ${formatAvailability(caretaker.availability)}`}</Badge>
            </p>
          </div>
        </div>
      </Card>

      {/* Summary stats: elders, tasks done and pending medicine reminders */}
      <div className="grid--3">
        <StatCard value={assignedElders.length} label={t('caretaker.statAssigned')} tone="info" />
        <StatCard value={`${doneTaskCount}/${TASKS.length}`} label={t('caretaker.statTasksDone')} tone="success" />
        <StatCard value={pendingReminders} label={t('caretaker.statPendingMeds')} tone="warning" />
      </div>

      {/* Tab switcher for the three working views */}
      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      {/* Today tab: medicine reminders, task checklist, completion bar and activity notes */}
      {activeTab === 'today' && (
        <div role="tabpanel" aria-labelledby="tab-today" className="caretaker-panel">
          <Card>
            <ProgressBar value={completionPercent} tone="success" label={t('caretaker.progressLabel')} />
          </Card>

          <div className="grid--2">
            {/* Medicine reminders for each assigned elder, one row per daily slot */}
            <Card title={t('caretaker.medicinesTitle')}>
              <p>{t('caretaker.medicinesSubtitle')}</p>
              {assignedElders.map((elder) => (
                <div key={elder.id} className="caretaker-elder-slots">
                  <h3 className="card__title">{elder.displayName}</h3>
                  <div className="table-wrap">
                    <table className="table">
                      <tbody>
                        {DAILY_MEDICINE_SLOTS.map((slot) => {
                          const key = SLOT_KEYS[slot.id];
                          const isGiven = Boolean(givenSlots[`${elder.id}:${slot.id}`]);
                          // Medicines from the prescription that belong to this time slot.
                          const slotMedicines = MEDICINES.filter((medicine) => medicine.schedule === slot.id)
                            .map((medicine) => `${medicine.name} ${medicine.dosage}`)
                            .join(', ');
                          return (
                            <tr key={slot.id}>
                              <td>
                                <strong>{t(`medicineTiming.${key}`)}</strong>
                                <div>{t(`medicineTiming.${key}Time`)}</div>
                                {slotMedicines && <div>{slotMedicines}</div>}
                              </td>
                              <td>
                                {isGiven ? (
                                  <button type="button" className="btn" disabled>
                                    {t('caretaker.givenDone')}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn--primary"
                                    onClick={() => handleMarkGiven(elder.id, slot.id)}
                                  >
                                    {t('caretaker.markGiven')}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {pendingReminders === 0 && <p>{t('caretaker.allMedicinesGiven')}</p>}
            </Card>

            {/* Task checklist for today */}
            <Card title={t('caretaker.tasksTitle')}>
              <p>{t('caretaker.tasksSubtitle')}</p>
              {TASKS.length === 0 ? (
                <p>{t('caretaker.noTasks')}</p>
              ) : (
                <ul>
                  {TASKS.map((task) => (
                    <li key={task.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(doneTasks[task.id])}
                          onChange={() => handleToggleTask(task.id)}
                        />{' '}
                        {task.title}
                      </label>
                      <div>
                        {`${t('caretaker.taskDue')}: ${task.due}`} · {`${t('caretaker.taskAssignee')}: ${task.assignee}`}
                        {task.overdue && (
                          <>
                            {' '}
                            <Badge tone="danger">{t('caretaker.overdue')}</Badge>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {doneTaskCount === TASKS.length && <p>{t('caretaker.allTasksDone')}</p>}
            </Card>
          </div>

          {/* Activity note form and the notes added this session */}
          <Card title={t('caretaker.activityTitle')}>
            <p>{t('caretaker.activitySubtitle')}</p>
            <form onSubmit={handleNoteSubmit} noValidate>
              <div className="field">
                <label className="field__label" htmlFor="caretaker-note-elder">
                  {t('caretaker.selectElder')}
                </label>
                <select
                  id="caretaker-note-elder"
                  className="select"
                  value={noteElderId}
                  onChange={(event) => setNoteElderId(event.target.value)}
                >
                  {assignedElders.map((elder) => (
                    <option key={elder.id} value={elder.id}>
                      {elder.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="caretaker-note-text">
                  {t('caretaker.noteLabel')}
                </label>
                <textarea
                  id="caretaker-note-text"
                  className="input"
                  rows={3}
                  placeholder={t('caretaker.notePlaceholder')}
                  value={noteText}
                  aria-invalid={Boolean(noteError)}
                  aria-describedby={noteError ? 'caretaker-note-error' : undefined}
                  onChange={(event) => {
                    setNoteText(event.target.value);
                    if (noteError) setNoteError('');
                  }}
                />
                {noteError && (
                  <p id="caretaker-note-error" className="field__error" role="alert">
                    {noteError}
                  </p>
                )}
              </div>
              <button type="submit" className="btn btn--primary">
                {t('caretaker.addNote')}
              </button>
            </form>
            {notes.length === 0 ? (
              <p>{t('caretaker.noNotes')}</p>
            ) : (
              <ul>
                {notes.map((note) => {
                  const elder = ELDERLY_PEOPLE.find((person) => person.id === note.elderId);
                  return (
                    <li key={note.id}>
                      <strong>{elder?.displayName}</strong> · {note.time}
                      <div>{note.text}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* Elders tab: one card per assigned elder with a care plan button */}
      {activeTab === 'elders' && (
        <div role="tabpanel" aria-labelledby="tab-elders" className="caretaker-panel">
          <SectionHeader title={t('caretaker.eldersTitle')} subtitle={t('caretaker.eldersSubtitle')} />
          {assignedElders.length === 0 ? (
            <p>{t('caretaker.noElders')}</p>
          ) : (
            <div className="grid--2">
              {assignedElders.map((elder) => {
                const needsHelp = elder.status === 'needs-assistance';
                return (
                  <Card
                    key={elder.id}
                    title={elder.displayName}
                    action={
                      <Badge tone={needsHelp ? 'warning' : 'success'}>
                        {needsHelp ? t('caretaker.needsAssistance') : t('caretaker.stable')}
                      </Badge>
                    }
                  >
                    <div className="caretaker-elder">
                      <Avatar name={elder.displayName} tone="teal" />
                      <div>
                        <p>{`${elder.age} ${t('caretaker.yearsOld')}`}</p>
                        <p>
                          <strong>{t('caretaker.conditions')}:</strong>{' '}
                          {elder.conditions.map((condition) => condition.name).join(', ')}
                        </p>
                      </div>
                    </div>
                    <button type="button" className="btn btn--primary" onClick={() => setCarePlanElderId(elder.id)}>
                      {t('caretaker.viewCarePlan')}
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Appointments tab: upcoming visits with a toggle to confirm assistance */}
      {activeTab === 'appointments' && (
        <div role="tabpanel" aria-labelledby="tab-appointments" className="caretaker-panel">
          <Card title={t('caretaker.appointmentsTitle')}>
            <p>{t('caretaker.appointmentsSubtitle')}</p>
            <p>
              <Badge tone="neutral">{t('caretaker.sharedNote')}</Badge>
            </p>
            {upcomingAppointments.length === 0 ? (
              <p>{t('caretaker.noAppointments')}</p>
            ) : (
              <ul>
                {upcomingAppointments.map((appointment) => {
                  const isConfirmed = Boolean(confirmed[appointment.id]);
                  return (
                    <li key={appointment.id}>
                      <strong>{appointment.title}</strong> · {appointment.doctor}
                      <div>
                        {appointment.place} · {appointment.date} · {appointment.time}
                      </div>
                      <div>
                        <Badge tone={appointment.status === 'booked' ? 'success' : 'warning'}>
                          {t(APPOINTMENT_STATUS_KEYS[appointment.status] ?? 'status.pending')}
                        </Badge>{' '}
                        <button
                          type="button"
                          className={isConfirmed ? 'btn btn--primary' : 'btn'}
                          aria-pressed={isConfirmed}
                          onClick={() => handleToggleConfirm(appointment.id)}
                        >
                          {isConfirmed ? t('caretaker.assistanceConfirmed') : t('caretaker.confirmAssistance')}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* Care plan modal: lists the prescribed medicines for the selected elder */}
      <Modal
        open={Boolean(carePlanElder)}
        title={
          carePlanElder
            ? `${t('caretaker.carePlanTitle')}: ${carePlanElder.displayName}`
            : t('caretaker.carePlanTitle')
        }
        onClose={() => setCarePlanElderId(null)}
        footer={
          <button type="button" className="btn" onClick={() => setCarePlanElderId(null)}>
            {t('caretaker.close')}
          </button>
        }
      >
        <p>{t('caretaker.carePlanHint')}</p>
        {MEDICINES.length === 0 ? (
          <p>{t('caretaker.noCarePlan')}</p>
        ) : (
          <ul>
            {MEDICINES.map((medicine) => (
              <li key={medicine.id}>
                <strong>{medicine.name}</strong> · {`${t('caretaker.medicineDose')}: ${medicine.dosage}`}
                <div>{`${t('caretaker.medicineTiming')}: ${medicine.timing}`}</div>
                <div>{`${t('caretaker.refillBy')}: ${medicine.refillBy}`}</div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
