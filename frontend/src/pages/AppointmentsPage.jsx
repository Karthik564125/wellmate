// Appointments page: upcoming and past doctor visits with cab booking, a reschedule dialog and an add-appointment form.
import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { Modal } from '../components/Modal.jsx';
import { Badge } from '../components/Badge.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { APPOINTMENTS } from '../data/mockData.js';

// Convert a yyyy-mm-dd value from a date input into the short display form used by the data, e.g. "Dec 03".
function formatDisplayDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

// Convert an hh:mm value from a time input into the display form used by the data, e.g. "10:30 am".
function formatDisplayTime(hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

// Pick the translated label and tone for an appointment status.
function renderStatus(status, t) {
  if (status === 'booked') return <Badge tone="success">{t('status.booked')}</Badge>;
  if (status === 'not-booked-yet') return <Badge tone="warning">{t('status.notBookedYet')}</Badge>;
  return <Badge tone="neutral">{t('status.completed')}</Badge>;
}

// Small labelled input block used by the forms on this page; shows an inline error when one is set.
function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error && (
        <span className="field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// Appointments page with Upcoming / Past tabs, per-visit actions and a validated form for adding a visit.
export function AppointmentsPage() {
  // Translation helper and toast trigger.
  const { t } = useTranslation();
  const { show } = useToast();

  // Appointment list kept in state so cab bookings, reschedules and additions persist while the page is open.
  const [appointments, setAppointments] = useState(() => APPOINTMENTS.map((item) => ({ ...item })));
  // Which tab is showing: upcoming or past.
  const [activeTab, setActiveTab] = useState('upcoming');

  // Reschedule dialog state: the id of the visit being changed (null when closed) and its new date and time.
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');

  // Add-appointment form values and the validation messages for each field.
  const [form, setForm] = useState({ doctor: '', place: '', date: '', time: '' });
  const [formErrors, setFormErrors] = useState({});

  // Tab definitions for the Tabs component.
  const tabs = [
    { id: 'upcoming', label: t('pages.appointments.tabUpcoming') },
    { id: 'past', label: t('pages.appointments.tabPast') },
  ];

  // Only the appointments belonging to the active tab are listed.
  const visible = appointments.filter((item) => (activeTab === 'upcoming' ? !item.past : item.past));

  // Mark a visit as having a cab booked and confirm with a toast.
  function handleBookCab(id) {
    setAppointments((previous) => previous.map((item) => (item.id === id ? { ...item, cabBooked: true } : item)));
    show(t('pages.appointments.toastCabBooked'), 'success');
  }

  // Open the reschedule dialog for one visit with empty date and time fields.
  function openReschedule(id) {
    setRescheduleId(id);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleError('');
  }

  // Close the reschedule dialog without saving.
  function closeReschedule() {
    setRescheduleId(null);
    setRescheduleError('');
  }

  // Validate the new date and time, store them on the visit, then close the dialog with a toast.
  function saveReschedule(event) {
    event.preventDefault();
    if (!rescheduleDate) {
      setRescheduleError(t('pages.appointments.errDate'));
      return;
    }
    if (!rescheduleTime) {
      setRescheduleError(t('pages.appointments.errTime'));
      return;
    }
    const date = formatDisplayDate(rescheduleDate);
    const time = formatDisplayTime(rescheduleTime);
    setAppointments((previous) => previous.map((item) => (item.id === rescheduleId ? { ...item, date, time } : item)));
    show(t('pages.appointments.toastRescheduled'), 'success');
    closeReschedule();
  }

  // Update one field of the add-appointment form and clear its error as the user types.
  function handleFormChange(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  // Validate the add form; on success append the visit to state, switch to Upcoming and confirm with a toast.
  function handleAddAppointment(event) {
    event.preventDefault();
    const errors = {};
    if (!form.doctor.trim()) errors.doctor = t('pages.appointments.errDoctor');
    if (!form.place.trim()) errors.place = t('pages.appointments.errPlace');
    if (!form.date) errors.date = t('pages.appointments.errDate');
    if (!form.time) errors.time = t('pages.appointments.errTime');
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const newAppointment = {
      id: `appt-${Date.now()}`,
      title: '',
      doctor: form.doctor.trim(),
      place: form.place.trim(),
      date: formatDisplayDate(form.date),
      time: formatDisplayTime(form.time),
      status: 'booked',
      bookedBy: null,
      cabBooked: false,
      past: false,
    };
    setAppointments((previous) => [...previous, newAppointment]);
    setActiveTab('upcoming');
    setForm({ doctor: '', place: '', date: '', time: '' });
    setFormErrors({});
    show(t('pages.appointments.toastAdded'), 'success');
  }

  return (
    <div className="stack">
      {/* Page header with the translated section name and a short description */}
      <SectionHeader title={t('nav.appointments')} subtitle={t('pages.appointments.subtitle')} />

      <div className="grid grid--split">
        {/* Left column: tabbed appointment list */}
        <Card title={t('pages.appointments.listTitle')} className="stack">
          <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

          {visible.length === 0 && (
            <EmptyState
              title={activeTab === 'upcoming' ? t('pages.appointments.noUpcoming') : t('pages.appointments.noPast')}
            />
          )}

          {visible.map((item) => (
            <Card
              key={item.id}
              title={item.title || t('pages.appointments.newVisit')}
              action={renderStatus(item.status, t)}
            >
              <div className="stack">
                <p>
                  <strong>{item.doctor}</strong> · {item.place}
                </p>
                <p>
                  {item.date} · {item.time}
                </p>
                {item.bookedBy && (
                  <p className="section-header__subtitle">
                    {t('pages.appointments.bookedBy')}: {item.bookedBy}
                  </p>
                )}
                <div className="row">
                  {/* Cab booking button: disabled once a cab is booked for this visit */}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={item.cabBooked}
                    onClick={() => handleBookCab(item.id)}
                  >
                    {item.cabBooked ? t('pages.appointments.cabBooked') : t('pages.appointments.bookCab')}
                  </button>
                  {/* Reschedule button opens the dialog with date and time inputs */}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openReschedule(item.id)}>
                    {t('pages.appointments.reschedule')}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </Card>

        {/* Right column: form for adding a new appointment */}
        <Card title={t('pages.appointments.addTitle')}>
          <form className="stack" onSubmit={handleAddAppointment} noValidate>
            <p className="section-header__subtitle">{t('pages.appointments.addHint')}</p>
            <Field id="appt-doctor" label={t('pages.appointments.doctor')} error={formErrors.doctor}>
              <input
                id="appt-doctor"
                className="input"
                type="text"
                value={form.doctor}
                placeholder={t('pages.appointments.doctorPlaceholder')}
                aria-invalid={Boolean(formErrors.doctor)}
                onChange={(event) => handleFormChange('doctor', event.target.value)}
              />
            </Field>
            <Field id="appt-place" label={t('pages.appointments.place')} error={formErrors.place}>
              <input
                id="appt-place"
                className="input"
                type="text"
                value={form.place}
                placeholder={t('pages.appointments.placePlaceholder')}
                aria-invalid={Boolean(formErrors.place)}
                onChange={(event) => handleFormChange('place', event.target.value)}
              />
            </Field>
            <Field id="appt-date" label={t('pages.appointments.date')} error={formErrors.date}>
              <input
                id="appt-date"
                className="input"
                type="date"
                value={form.date}
                aria-invalid={Boolean(formErrors.date)}
                onChange={(event) => handleFormChange('date', event.target.value)}
              />
            </Field>
            <Field id="appt-time" label={t('pages.appointments.time')} error={formErrors.time}>
              <input
                id="appt-time"
                className="input"
                type="time"
                value={form.time}
                aria-invalid={Boolean(formErrors.time)}
                onChange={(event) => handleFormChange('time', event.target.value)}
              />
            </Field>
            <button type="submit" className="btn btn-primary">
              {t('pages.appointments.addAppointment')}
            </button>
          </form>
        </Card>
      </div>

      {/* Reschedule dialog: new date and time inputs, saved to state with a toast */}
      <Modal
        open={rescheduleId !== null}
        title={t('pages.appointments.rescheduleTitle')}
        onClose={closeReschedule}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={closeReschedule}>
              {t('common.cancel')}
            </button>
            <button type="submit" form="reschedule-form" className="btn btn-primary">
              {t('common.save')}
            </button>
          </>
        }
      >
        <form id="reschedule-form" className="stack" onSubmit={saveReschedule} noValidate>
          <p className="section-header__subtitle">{t('pages.appointments.rescheduleHint')}</p>
          <Field id="reschedule-date" label={t('pages.appointments.newDate')}>
            <input
              id="reschedule-date"
              className="input"
              type="date"
              value={rescheduleDate}
              onChange={(event) => {
                setRescheduleDate(event.target.value);
                setRescheduleError('');
              }}
            />
          </Field>
          <Field id="reschedule-time" label={t('pages.appointments.newTime')}>
            <input
              id="reschedule-time"
              className="input"
              type="time"
              value={rescheduleTime}
              onChange={(event) => {
                setRescheduleTime(event.target.value);
                setRescheduleError('');
              }}
            />
          </Field>
          {rescheduleError && (
            <p className="field__error" role="alert">
              {rescheduleError}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
