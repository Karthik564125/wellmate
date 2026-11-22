// Appointments page: upcoming and past doctor visits with cab booking, reschedule, add and delete.
// Demo mode (no real signed-in account) and a real signed-in account both
// read/write real MongoDB documents now - demo mode just talks to the
// unauthenticated /appointments/demo/* routes, scoped server-side to one
// reserved shared "demo elder", instead of /elders/:elderId/appointments.
// That's what lets different demo-mode profile views (family, elder, ...)
// all see the same live appointment list instead of separate local copies.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { Modal } from '../components/Modal.jsx';
import { Badge } from '../components/Badge.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { api, ApiError } from '../api/client.js';
import {
  createAppointment,
  createDemoAppointment,
  deleteAppointment,
  deleteDemoAppointment,
  listAppointments,
  listDemoAppointments,
  updateAppointment,
  updateDemoAppointment,
} from '../api/appointments.js';

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

// Combine a yyyy-mm-dd date input and an hh:mm time input into one ISO
// datetime string, the shape the real backend's scheduledAt field expects.
function toIsoDateTime(isoDate, hhmm) {
  return new Date(`${isoDate}T${hhmm}:00`).toISOString();
}

// yyyy-mm-dd, local calendar date - matches what a date input's value/min/max expect.
function toIsoDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Appointments can only be booked from today through 3 months out - not in
// the past, not further ahead than that. Recomputed per render instead of
// once at module load, so it stays correct if the page is left open overnight.
function getBookableDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setMonth(max.getMonth() + 3);
  return { min: toIsoDateOnly(today), max: toIsoDateOnly(max) };
}

// yyyy-mm-dd strings compare correctly as plain strings (ISO date order).
function isDateWithinBookableRange(isoDate, range) {
  return isoDate >= range.min && isoDate <= range.max;
}

// Real-account appointments carry a single scheduledAt; derive the same
// split date/time display strings the demo's mock data already uses.
function splitScheduledAt(scheduledAt) {
  const when = new Date(scheduledAt);
  return {
    date: when.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
    time: when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
  };
}

// Maps a real backend appointment to the same shape the rest of this page
// already renders (from the demo's mock data).
function fromApiAppointment(appointment) {
  return {
    id: appointment.id,
    title: appointment.title,
    doctor: appointment.doctor,
    place: appointment.place,
    ...splitScheduledAt(appointment.scheduledAt),
    scheduledAt: appointment.scheduledAt,
    status: appointment.status,
    bookedBy: appointment.bookedBy,
    cabBooked: appointment.cabBooked,
    past: appointment.past,
  };
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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // No real signed-in account: manage the list purely in local state, same
  // as every other demo-mode screen in this app.
  const demoMode = !authLoading && !user;

  // Today through 3 months out - used both to bound the date pickers and to
  // validate what gets submitted (typing a date bypasses the picker's own min/max).
  const bookableRange = getBookableDateRange();

  const [elderId, setElderId] = useState(null);
  const [resolvingElder, setResolvingElder] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Only family/admin accounts are allowed to create an elder (see backend's
  // ELDER_CREATOR_ROLES) - used to show the "Add elder" button only to them.
  const [userRole, setUserRole] = useState(null);

  // Appointment list; fetched from the backend either way (see the two effects below).
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  // Which tab is showing: upcoming or past.
  const [activeTab, setActiveTab] = useState('upcoming');

  // Reschedule dialog state: the id of the visit being changed (null when closed) and its new date and time.
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');

  // Delete confirmation dialog state: the id of the visit pending deletion (null when closed).
  const [deleteId, setDeleteId] = useState(null);

  // Add-appointment form values and the validation messages for each field.
  const [form, setForm] = useState({ doctor: '', place: '', date: '', time: '' });
  const [formErrors, setFormErrors] = useState({});

  // Demo mode: fetch the shared demo elder's real appointments from Mongo.
  useEffect(() => {
    if (!demoMode) return;
    let cancelled = false;
    listDemoAppointments()
      .then(({ appointments: fetched }) => {
        if (!cancelled) setAppointments(fetched.map(fromApiAppointment));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingAppointments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  // Resolve which elder this screen is about, same as ChittiPage: the
  // signed-in user's own Elder record if they are one, otherwise the first
  // elder they're linked to. Demo mode skips this entirely.
  useEffect(() => {
    if (demoMode || authLoading) return;
    if (!user) {
      setResolvingElder(false);
      return;
    }
    let cancelled = false;
    api
      .get('/me')
      .then((me) => {
        if (cancelled) return;
        setElderId(me.ownElderId ?? me.carelinks?.[0]?.elderId ?? null);
        setUserRole(me.user?.role ?? null);
      })
      .catch(() => {
        if (!cancelled) setElderId(null);
      })
      .finally(() => {
        if (!cancelled) setResolvingElder(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode, authLoading, user]);

  // Once the elder is known, load their real appointments.
  useEffect(() => {
    if (demoMode || !elderId) return;
    let cancelled = false;
    listAppointments(elderId)
      .then(({ appointments: fetched }) => {
        if (!cancelled) setAppointments(fetched.map(fromApiAppointment));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingAppointments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode, elderId]);

  // Tab definitions for the Tabs component.
  const tabs = [
    { id: 'upcoming', label: t('pages.appointments.tabUpcoming') },
    { id: 'past', label: t('pages.appointments.tabPast') },
  ];

  // Only the appointments belonging to the active tab are listed.
  const visible = appointments.filter((item) => (activeTab === 'upcoming' ? !item.past : item.past));

  // Demo mode hits the unauthenticated /appointments/demo/* routes (real
  // MongoDB, shared demo elder); a real account hits the normal ones.
  const updateFn = demoMode ? updateDemoAppointment : updateAppointment;
  const deleteFn = demoMode ? deleteDemoAppointment : deleteAppointment;
  const createFn = demoMode
    ? (_elderId, data) => createDemoAppointment(data)
    : createAppointment;

  // Mark a visit as having a cab booked and confirm with a toast.
  function handleBookCab(id) {
    setAppointments((previous) => previous.map((item) => (item.id === id ? { ...item, cabBooked: true } : item)));
    show(t('pages.appointments.toastCabBooked'), 'success');
    updateFn(id, { cabBooked: true }).catch((err) => {
      setAppointments((previous) => previous.map((item) => (item.id === id ? { ...item, cabBooked: false } : item)));
      show(err instanceof ApiError ? err.message : t('pages.appointments.loadError'), 'danger');
    });
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

  // Validate the new date and time, save them, then close the dialog with a toast.
  function saveReschedule(event) {
    event.preventDefault();
    if (!rescheduleDate) {
      setRescheduleError(t('pages.appointments.errDate'));
      return;
    }
    if (!isDateWithinBookableRange(rescheduleDate, bookableRange)) {
      setRescheduleError(t('pages.appointments.errDateRange'));
      return;
    }
    if (!rescheduleTime) {
      setRescheduleError(t('pages.appointments.errTime'));
      return;
    }
    const date = formatDisplayDate(rescheduleDate);
    const time = formatDisplayTime(rescheduleTime);
    const scheduledAt = toIsoDateTime(rescheduleDate, rescheduleTime);

    setAppointments((previous) =>
      previous.map((item) => (item.id === rescheduleId ? { ...item, date, time, scheduledAt } : item)),
    );
    show(t('pages.appointments.toastRescheduled'), 'success');
    const idBeingRescheduled = rescheduleId;
    closeReschedule();

    updateFn(idBeingRescheduled, { scheduledAt }).catch((err) => {
      show(err instanceof ApiError ? err.message : t('pages.appointments.loadError'), 'danger');
    });
  }

  // Ask for confirmation before removing a visit.
  function openDelete(id) {
    setDeleteId(id);
  }

  function closeDelete() {
    setDeleteId(null);
  }

  // Remove the visit from the list, confirm with a toast, and delete it on the backend.
  function confirmDelete() {
    const id = deleteId;
    setAppointments((previous) => previous.filter((item) => item.id !== id));
    show(t('pages.appointments.toastDeleted'), 'success');
    closeDelete();

    deleteFn(id).catch((err) => {
      show(err instanceof ApiError ? err.message : t('pages.appointments.loadError'), 'danger');
    });
  }

  // Update one field of the add-appointment form and clear its error as the user types.
  function handleFormChange(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  // Validate the add form; on success append the visit, switch to Upcoming and confirm with a toast.
  function handleAddAppointment(event) {
    event.preventDefault();
    const errors = {};
    if (!form.doctor.trim()) errors.doctor = t('pages.appointments.errDoctor');
    if (!form.place.trim()) errors.place = t('pages.appointments.errPlace');
    if (!form.date) {
      errors.date = t('pages.appointments.errDate');
    } else if (!isDateWithinBookableRange(form.date, bookableRange)) {
      errors.date = t('pages.appointments.errDateRange');
    }
    if (!form.time) errors.time = t('pages.appointments.errTime');
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const doctor = form.doctor.trim();
    const place = form.place.trim();
    const scheduledAt = toIsoDateTime(form.date, form.time);

    setActiveTab('upcoming');
    setForm({ doctor: '', place: '', date: '', time: '' });
    setFormErrors({});

    createFn(elderId, { doctor, place, scheduledAt })
      .then(({ appointment }) => {
        setAppointments((previous) => [...previous, fromApiAppointment(appointment)]);
        show(t('pages.appointments.toastAdded'), 'success');
      })
      .catch((err) => {
        show(err instanceof ApiError ? err.message : t('pages.appointments.loadError'), 'danger');
      });
  }

  // ---- Gating: still loading, or (real accounts only) no elder resolved yet ----

  if (authLoading || (!demoMode && resolvingElder)) {
    return (
      <div className="stack">
        <SectionHeader title={t('nav.appointments')} subtitle={t('pages.appointments.subtitle')} />
        <Card>
          <p>{t('pages.appointments.loading')}</p>
        </Card>
      </div>
    );
  }

  if (!demoMode && !elderId) {
    return (
      <div className="stack">
        <SectionHeader title={t('nav.appointments')} subtitle={t('pages.appointments.subtitle')} />
        <Card>
          <p>{t('chitti.noElderLinked')}</p>
          {(userRole === 'family' || userRole === 'admin') && (
            <button type="button" className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/connect-elder')}>
              {t('pages.connectElder.title')}
            </button>
          )}
        </Card>
      </div>
    );
  }

  if (loadingAppointments) {
    return (
      <div className="stack">
        <SectionHeader title={t('nav.appointments')} subtitle={t('pages.appointments.subtitle')} />
        <Card>
          <p>{t('pages.appointments.loading')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack">
      {/* Page header with the translated section name and a short description */}
      <SectionHeader title={t('nav.appointments')} subtitle={t('pages.appointments.subtitle')} />

      {loadError && (
        <Card>
          <p className="field__error" role="alert">
            {t('pages.appointments.loadError')}
          </p>
        </Card>
      )}

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
                  {/* Delete button opens a confirmation dialog */}
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => openDelete(item.id)}>
                    {t('pages.appointments.delete')}
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
                min={bookableRange.min}
                max={bookableRange.max}
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
              min={bookableRange.min}
              max={bookableRange.max}
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

      {/* Delete confirmation dialog */}
      <Modal
        open={deleteId !== null}
        title={t('pages.appointments.deleteTitle')}
        onClose={closeDelete}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={closeDelete}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              {t('pages.appointments.delete')}
            </button>
          </>
        }
      >
        <p>{t('pages.appointments.deleteHint')}</p>
      </Modal>
    </div>
  );
}
