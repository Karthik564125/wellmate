// Care team page: caretaker CRUD backed by the API, per-elder caretaker assignment (many per elder) and linked family members.
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Badge } from '../components/Badge.jsx';
import { Modal } from '../components/Modal.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { api, ApiError } from '../api/client.js';
import {
  assignCaretaker,
  createCaretaker,
  deleteCaretaker,
  listCaretakers,
  unassignCaretaker,
  updateCaretaker,
} from '../api/caretakers.js';
import { ELDERLY_PEOPLE, FAMILY_MEMBERS } from '../data/mockData.js';

// Shift day options, in display order; labelKey points at the translated day name.
const SHIFT_DAYS = [
  { id: 'mon', labelKey: 'pages.careTeam.dayMon' },
  { id: 'tue', labelKey: 'pages.careTeam.dayTue' },
  { id: 'wed', labelKey: 'pages.careTeam.dayWed' },
  { id: 'thu', labelKey: 'pages.careTeam.dayThu' },
  { id: 'fri', labelKey: 'pages.careTeam.dayFri' },
  { id: 'sat', labelKey: 'pages.careTeam.daySat' },
  { id: 'sun', labelKey: 'pages.careTeam.daySun' },
];

// Caretaker status options with the translated label and the badge tone used to show them.
const CARETAKER_STATUSES = [
  { id: 'available', labelKey: 'pages.careTeam.statusAvailable', tone: 'success' },
  { id: 'busy', labelKey: 'pages.careTeam.statusBusy', tone: 'warning' },
  { id: 'off-duty', labelKey: 'pages.careTeam.statusOffDuty', tone: 'neutral' },
];

// 24-hour HH:MM, the same format the backend accepts.
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const EMPTY_FORM = {
  name: '',
  specialty: '',
  status: 'available',
  shiftDays: [],
  shiftStart: '',
  shiftEnd: '',
  phone: '',
};

// Look up a status option by id, falling back to the first one.
function statusOption(id) {
  return CARETAKER_STATUSES.find((option) => option.id === id) ?? CARETAKER_STATUSES[0];
}

// Elders this signed-in user can see: their own Elder profile plus every active CareLink. Names come from each elder's profile.
async function loadLinkedElders() {
  const me = await api.get('/me');
  const ids = [...new Set([me.ownElderId, ...(me.carelinks ?? []).map((link) => link.elderId)].filter(Boolean))];
  const results = await Promise.allSettled(ids.map((id) => api.get(`/elders/${id}/profile`)));
  return results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => ({ id: result.value.elder.id, displayName: result.value.elder.displayName }));
}

// Look up an elder's display name from the mock family list by id.
function elderNameFor(elderId) {
  return ELDERLY_PEOPLE.find((elder) => elder.id === elderId)?.displayName ?? '';
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

// Care team page: caretaker add/edit/delete, per-elder caretaker assignment and family contacts.
export function CareTeamPage() {
  // Translation helper, toast trigger and the signed-in user (no user means demo mode).
  const { t } = useTranslation();
  const { show } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Caretaker list from the server, with its loading and error state.
  const [caretakers, setCaretakers] = useState([]);
  const [loadingCaretakers, setLoadingCaretakers] = useState(true);
  const [caretakerLoadError, setCaretakerLoadError] = useState(false);

  // Real elders this user is linked to, used by the assignment and "Assigned elders" sections.
  const [elders, setElders] = useState([]);

  // Add/edit caretaker dialog: editingId is null while adding a new caretaker.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation dialog: the id of the caretaker pending deletion (null when closed).
  const [deleteId, setDeleteId] = useState(null);

  // Load the caretaker list once the user is known.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingCaretakers(false);
      return;
    }
    let cancelled = false;
    listCaretakers()
      .then(({ caretakers: fetched }) => {
        if (!cancelled) setCaretakers(fetched);
      })
      .catch((err) => {
        if (cancelled) return;
        setCaretakerLoadError(true);
        show(err instanceof ApiError ? err.message : t('pages.careTeam.loadError'), 'danger');
      })
      .finally(() => {
        if (!cancelled) setLoadingCaretakers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // Load the elders this user can assign caretakers to.
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    loadLinkedElders()
      .then((list) => {
        if (!cancelled) setElders(list);
      })
      .catch(() => {
        if (!cancelled) show(t('pages.careTeam.loadError'), 'danger');
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // Re-fetch the caretaker list after a change so every section shows the saved state.
  function loadCaretakers() {
    return listCaretakers()
      .then(({ caretakers: fetched }) => {
        setCaretakers(fetched);
        setCaretakerLoadError(false);
      })
      .catch(() => {
        setCaretakerLoadError(true);
      });
  }

  // Open the add dialog with an empty form.
  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  }

  // Open the edit dialog pre-filled with one caretaker's current values.
  function openEditForm(caretaker) {
    setEditingId(caretaker.id);
    setForm({
      name: caretaker.name,
      specialty: caretaker.specialty ?? '',
      status: caretaker.status,
      shiftDays: [...caretaker.shiftDays],
      shiftStart: caretaker.shiftStart,
      shiftEnd: caretaker.shiftEnd,
      phone: caretaker.phone,
    });
    setFormErrors({});
    setFormOpen(true);
  }

  // Close the add/edit dialog without saving.
  function closeForm() {
    setFormOpen(false);
  }

  // Update one field of the caretaker form and clear its error as the user types.
  function handleFormChange(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  // Tick or untick one shift day.
  function toggleShiftDay(day) {
    setForm((previous) => ({
      ...previous,
      shiftDays: previous.shiftDays.includes(day)
        ? previous.shiftDays.filter((item) => item !== day)
        : [...previous.shiftDays, day],
    }));
    setFormErrors((previous) => ({ ...previous, shiftDays: undefined }));
  }

  // Check the caretaker form and return one message per invalid field.
  function validateForm(values) {
    const errors = {};
    if (!values.name.trim()) errors.name = t('pages.careTeam.errName');
    if (!values.phone.trim()) errors.phone = t('pages.careTeam.errPhone');
    if (values.shiftDays.length === 0) errors.shiftDays = t('pages.careTeam.errDays');
    if (!TIME_PATTERN.test(values.shiftStart)) errors.shiftStart = t('pages.careTeam.errTime');
    if (!TIME_PATTERN.test(values.shiftEnd)) {
      errors.shiftEnd = t('pages.careTeam.errTime');
    } else if (!errors.shiftStart && values.shiftEnd <= values.shiftStart) {
      errors.shiftEnd = t('pages.careTeam.errEndAfterStart');
    }
    return errors;
  }

  // Validate, then create or update the caretaker, close the dialog and refresh the list.
  function handleSaveCaretaker(event) {
    event.preventDefault();
    const errors = validateForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      name: form.name.trim(),
      specialty: form.specialty.trim(),
      status: form.status,
      shiftDays: form.shiftDays,
      shiftStart: form.shiftStart,
      shiftEnd: form.shiftEnd,
      phone: form.phone.trim(),
    };
    const isEditing = editingId !== null;
    const request = isEditing ? updateCaretaker(editingId, payload) : createCaretaker(payload);

    setSaving(true);
    request
      .then(() => {
        show(t(isEditing ? 'pages.careTeam.toastUpdated' : 'pages.careTeam.toastAdded'), 'success');
        closeForm();
        return loadCaretakers();
      })
      .catch((err) => {
        show(err instanceof ApiError ? err.message : t('pages.careTeam.saveError'), 'danger');
      })
      .finally(() => {
        setSaving(false);
      });
  }

  // Ask for confirmation before removing a caretaker.
  function openDelete(id) {
    setDeleteId(id);
  }

  function closeDelete() {
    setDeleteId(null);
  }

  // Delete the caretaker on the backend, confirm with a toast and refresh the list.
  function confirmDelete() {
    const id = deleteId;
    closeDelete();
    deleteCaretaker(id)
      .then(() => {
        show(t('pages.careTeam.toastDeleted'), 'success');
        return loadCaretakers();
      })
      .catch((err) => {
        show(err instanceof ApiError ? err.message : t('pages.careTeam.saveError'), 'danger');
      });
  }

  // Assign a caretaker to an elder (many caretakers per elder are allowed), then refresh.
  function handleAssign(elderId, caretakerId) {
    if (!caretakerId) return;
    assignCaretaker(elderId, caretakerId)
      .then(() => {
        show(t('pages.careTeam.toastAssigned'), 'success');
        return loadCaretakers();
      })
      .catch((err) => {
        show(err instanceof ApiError ? err.message : t('pages.careTeam.assignError'), 'danger');
      });
  }

  // Remove one caretaker from an elder, then refresh.
  function handleUnassign(elderId, caretakerId) {
    unassignCaretaker(elderId, caretakerId)
      .then(() => {
        show(t('pages.careTeam.toastUnassigned'), 'success');
        return loadCaretakers();
      })
      .catch((err) => {
        show(err instanceof ApiError ? err.message : t('pages.careTeam.assignError'), 'danger');
      });
  }

  return (
    <div className="stack">
      {/* Page header with the translated section name and a short description */}
      <SectionHeader title={t('nav.careTeam')} subtitle={t('pages.careTeam.subtitle')} />

      {/* Caretaker cards: status, specialty, shift, phone and the elders each one looks after, with edit and delete */}
      <section className="stack" aria-label={t('pages.careTeam.caretakersTitle')}>
        <div className="row">
          <h3 className="section-header__title">{t('pages.careTeam.caretakersTitle')}</h3>
          <button type="button" className="btn btn-primary btn-sm" onClick={openAddForm}>
            {t('pages.careTeam.addCaretaker')}
          </button>
        </div>
        {caretakerLoadError && (
          <p className="field__error" role="alert">
            {t('pages.careTeam.loadError')}
          </p>
        )}
        {loadingCaretakers && <p>{t('pages.careTeam.loading')}</p>}
        {!loadingCaretakers && caretakers.length === 0 && <EmptyState title={t('pages.careTeam.noCaretakers')} />}
        <div className="grid grid--2">
          {caretakers.map((caretaker) => {
            const status = statusOption(caretaker.status);
            // Shift days in Mon..Sun order, translated.
            const dayLabels = SHIFT_DAYS.filter((day) => caretaker.shiftDays.includes(day.id)).map((day) =>
              t(day.labelKey),
            );
            // Elders this caretaker is assigned to, from the server's assignment data.
            const assignedNames = elders
              .filter((elder) => caretaker.assignedElderIds.includes(elder.id))
              .map((elder) => elder.displayName);
            return (
              <Card
                key={caretaker.id}
                title={caretaker.name}
                action={<Badge tone={status.tone}>{t(status.labelKey)}</Badge>}
              >
                <div className="stack">
                  <div className="row">
                    <Avatar name={caretaker.name} tone="teal" />
                    <div>
                      <p>{caretaker.specialty}</p>
                    </div>
                  </div>
                  <p>
                    <strong>{t('pages.careTeam.shift')}:</strong> {dayLabels.join(', ')} · {caretaker.shiftStart}–
                    {caretaker.shiftEnd}
                  </p>
                  <p>
                    <strong>{t('pages.careTeam.phone')}:</strong> {caretaker.phone}
                  </p>
                  <p>
                    <strong>{t('pages.careTeam.assignedElders')}:</strong>{' '}
                    {assignedNames.length > 0 ? assignedNames.join(', ') : t('pages.careTeam.noAssignedElders')}
                  </p>
                  <div className="row">
                    {/* Call link: opens the phone dialler on devices that support tel: links */}
                    <a className="btn btn-ghost btn-sm" href={`tel:${caretaker.phone.replace(/\s/g, '')}`}>
                      {t('common.call')}
                    </a>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditForm(caretaker)}>
                      {t('pages.careTeam.edit')}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => openDelete(caretaker.id)}>
                      {t('pages.careTeam.delete')}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Assignment: per elder, the caretakers assigned to them, a remove button for each and a dropdown to add another */}
      <Card title={t('pages.careTeam.assignTitle')}>
        <div className="stack">
          <p className="section-header__subtitle">{t('pages.careTeam.assignHint')}</p>
          {elders.length === 0 && <EmptyState title={t('pages.careTeam.noElders')} />}
          <div className="grid grid--2">
            {elders.map((elder) => {
              const assigned = caretakers.filter((caretaker) => caretaker.assignedElderIds.includes(elder.id));
              const unassigned = caretakers.filter((caretaker) => !caretaker.assignedElderIds.includes(elder.id));
              return (
                <div key={elder.id} className="field">
                  <label className="field__label" htmlFor={`assign-${elder.id}`}>
                    {t('pages.careTeam.assignLabel')} · {elder.displayName}
                  </label>
                  {assigned.length === 0 && (
                    <p className="section-header__subtitle">{t('pages.careTeam.noAssignedCaretakers')}</p>
                  )}
                  {assigned.map((caretaker) => (
                    <div key={caretaker.id} className="row">
                      <span>{caretaker.name}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleUnassign(elder.id, caretaker.id)}
                      >
                        {t('pages.careTeam.remove')}
                      </button>
                    </div>
                  ))}
                  <select
                    id={`assign-${elder.id}`}
                    className="select"
                    value=""
                    disabled={unassigned.length === 0}
                    onChange={(event) => handleAssign(elder.id, event.target.value)}
                  >
                    <option value="">{t('pages.careTeam.chooseCaretaker')}</option>
                    {unassigned.map((caretaker) => (
                      <option key={caretaker.id} value={caretaker.id}>
                        {caretaker.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Family members: relation, contact and the elder they are linked to */}
      <section className="stack" aria-label={t('pages.careTeam.familyTitle')}>
        <h3 className="section-header__title">{t('pages.careTeam.familyTitle')}</h3>
        {FAMILY_MEMBERS.length === 0 && <EmptyState title={t('pages.careTeam.noFamily')} />}
        <div className="grid grid--2">
          {FAMILY_MEMBERS.map((member) => (
            <Card key={member.id} title={member.name}>
              <div className="stack">
                <div className="row">
                  <Avatar name={member.name} tone="coral" />
                  <div>
                    <p>
                      <strong>{t('pages.careTeam.relation')}:</strong> {member.relation}
                    </p>
                    <p>
                      <strong>{t('pages.careTeam.linkedElder')}:</strong> {elderNameFor(member.elderId)}
                    </p>
                  </div>
                </div>
                <p>
                  <strong>{t('pages.careTeam.phone')}:</strong> {member.phone}
                </p>
                <div>
                  <a className="btn btn-ghost btn-sm" href={`tel:${member.phone.replace(/\s/g, '')}`}>
                    {t('common.call')}
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Add/edit caretaker dialog: validated form saved to the backend */}
      <Modal
        open={formOpen}
        title={t(editingId !== null ? 'pages.careTeam.editTitle' : 'pages.careTeam.addTitle')}
        onClose={closeForm}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={closeForm}>
              {t('common.cancel')}
            </button>
            <button type="submit" form="caretaker-form" className="btn btn-primary" disabled={saving}>
              {t('common.save')}
            </button>
          </>
        }
      >
        <form id="caretaker-form" className="stack" onSubmit={handleSaveCaretaker} noValidate>
          <Field id="caretaker-name" label={t('pages.careTeam.name')} error={formErrors.name}>
            <input
              id="caretaker-name"
              className="input"
              type="text"
              value={form.name}
              aria-invalid={Boolean(formErrors.name)}
              onChange={(event) => handleFormChange('name', event.target.value)}
            />
          </Field>
          <Field id="caretaker-specialty" label={t('pages.careTeam.specialty')}>
            <input
              id="caretaker-specialty"
              className="input"
              type="text"
              value={form.specialty}
              onChange={(event) => handleFormChange('specialty', event.target.value)}
            />
          </Field>
          <Field id="caretaker-status" label={t('pages.careTeam.statusLabel')}>
            <select
              id="caretaker-status"
              className="select"
              value={form.status}
              onChange={(event) => handleFormChange('status', event.target.value)}
            >
              {CARETAKER_STATUSES.map((option) => (
                <option key={option.id} value={option.id}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </Field>
          <fieldset className="field">
            <legend className="field__label">{t('pages.careTeam.shiftDays')}</legend>
            <div className="row">
              {SHIFT_DAYS.map((day) => (
                <label key={day.id} className="row">
                  <input
                    type="checkbox"
                    checked={form.shiftDays.includes(day.id)}
                    onChange={() => toggleShiftDay(day.id)}
                  />
                  {t(day.labelKey)}
                </label>
              ))}
            </div>
            {formErrors.shiftDays && (
              <span className="field__error" role="alert">
                {formErrors.shiftDays}
              </span>
            )}
          </fieldset>
          <Field id="caretaker-start" label={t('pages.careTeam.shiftStart')} error={formErrors.shiftStart}>
            <input
              id="caretaker-start"
              className="input"
              type="time"
              value={form.shiftStart}
              aria-invalid={Boolean(formErrors.shiftStart)}
              onChange={(event) => handleFormChange('shiftStart', event.target.value)}
            />
          </Field>
          <Field id="caretaker-end" label={t('pages.careTeam.shiftEnd')} error={formErrors.shiftEnd}>
            <input
              id="caretaker-end"
              className="input"
              type="time"
              value={form.shiftEnd}
              aria-invalid={Boolean(formErrors.shiftEnd)}
              onChange={(event) => handleFormChange('shiftEnd', event.target.value)}
            />
          </Field>
          <Field id="caretaker-phone" label={t('pages.careTeam.phone')} error={formErrors.phone}>
            <input
              id="caretaker-phone"
              className="input"
              type="tel"
              value={form.phone}
              aria-invalid={Boolean(formErrors.phone)}
              onChange={(event) => handleFormChange('phone', event.target.value)}
            />
          </Field>
        </form>
      </Modal>

      {/* Delete confirmation dialog */}
      <Modal
        open={deleteId !== null}
        title={t('pages.careTeam.deleteTitle')}
        onClose={closeDelete}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={closeDelete}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              {t('pages.careTeam.delete')}
            </button>
          </>
        }
      >
        <p>{t('pages.careTeam.deleteHint')}</p>
      </Modal>
    </div>
  );
}
