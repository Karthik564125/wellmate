// Care team page: caretaker cards with availability switches, per-elder caretaker assignment and linked family members.
import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { CARETAKERS, FAMILY_MEMBERS, ELDERLY_PEOPLE } from '../data/mockData.js';

// Build the starting elder-to-caretaker map from each caretaker's assigned elder ids in the data.
function buildInitialAssignments() {
  const map = {};
  CARETAKERS.forEach((caretaker) => {
    caretaker.assignedElderIds.forEach((elderId) => {
      map[elderId] = caretaker.id;
    });
  });
  return map;
}

// Turn the availability field (either a text description or a list of days) into one display string.
function formatAvailability(availability) {
  return Array.isArray(availability) ? availability.join(', ') : availability;
}

// Look up an elder's display name from the mock elders list by id.
function elderNameFor(elderId) {
  return ELDERLY_PEOPLE.find((elder) => elder.id === elderId)?.name ?? '';
}

// Care team page: caretakers with availability and shift details, assignment selects per elder and family contacts.
export function CareTeamPage() {
  // Translation helper and toast trigger.
  const { t } = useTranslation();
  const { show } = useToast();

  // Availability switch state per caretaker id; every caretaker starts available.
  const [availableMap, setAvailableMap] = useState(() =>
    Object.fromEntries(CARETAKERS.map((caretaker) => [caretaker.id, true])),
  );
  // Which caretaker looks after each elder, keyed by elder id (null means nobody is assigned).
  const [elderCaretaker, setElderCaretaker] = useState(buildInitialAssignments);

  // Flip a caretaker's availability and confirm with a toast.
  function toggleAvailability(caretakerId) {
    setAvailableMap((previous) => ({ ...previous, [caretakerId]: !previous[caretakerId] }));
    show(t('pages.careTeam.toastAvailability'), 'info');
  }

  // Save the caretaker chosen for one elder ('' clears the assignment) and confirm with a toast.
  function handleAssign(elderId, caretakerId) {
    setElderCaretaker((previous) => ({ ...previous, [elderId]: caretakerId || null }));
    show(t('pages.careTeam.toastAssigned'), 'success');
  }

  return (
    <div className="stack">
      {/* Page header with the translated section name and a short description */}
      <SectionHeader title={t('nav.careTeam')} subtitle={t('pages.careTeam.subtitle')} />

      {/* Caretaker cards: availability switch, specialty, shift and the elders each one looks after */}
      <section className="stack" aria-label={t('pages.careTeam.caretakersTitle')}>
        <h3 className="section-header__title">{t('pages.careTeam.caretakersTitle')}</h3>
        {CARETAKERS.length === 0 && <EmptyState title={t('pages.careTeam.noCaretakers')} />}
        <div className="grid grid--2">
          {CARETAKERS.map((caretaker) => {
            const available = Boolean(availableMap[caretaker.id]);
            // Elders currently assigned to this caretaker, derived from the assignment map in state.
            const assignedNames = ELDERLY_PEOPLE.filter((elder) => elderCaretaker[elder.id] === caretaker.id).map(
              (elder) => elder.name,
            );
            return (
              <Card
                key={caretaker.id}
                title={caretaker.name}
                action={
                  /* Availability switch: aria-checked reflects the current state */
                  <button
                    type="button"
                    role="switch"
                    aria-checked={available}
                    className={`btn btn-sm ${available ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => toggleAvailability(caretaker.id)}
                  >
                    {available ? t('pages.careTeam.available') : t('pages.careTeam.unavailable')}
                  </button>
                }
              >
                <div className="stack">
                  <div className="row">
                    <Avatar name={caretaker.name} tone="teal" />
                    <div>
                      <p>{caretaker.specialty}</p>
                      <p className="section-header__subtitle">{formatAvailability(caretaker.availability)}</p>
                    </div>
                  </div>
                  <p>
                    <strong>{t('pages.careTeam.shift')}:</strong> {caretaker.shift.days.join(', ')} · {caretaker.shift.start}–
                    {caretaker.shift.end}
                  </p>
                  <p>
                    <strong>{t('pages.careTeam.phone')}:</strong> {caretaker.phone}
                  </p>
                  <p>
                    <strong>{t('pages.careTeam.assignedElders')}:</strong>{' '}
                    {assignedNames.length > 0 ? assignedNames.join(', ') : t('pages.careTeam.noAssignedElders')}
                  </p>
                  <div>
                    {/* Call link: opens the phone dialler on devices that support tel: links */}
                    <a className="btn btn-ghost btn-sm" href={`tel:${caretaker.phone.replace(/\s/g, '')}`}>
                      {t('common.call')}
                    </a>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Assignment: one select per elder to choose the caretaker looking after them */}
      <Card title={t('pages.careTeam.assignTitle')}>
        <div className="stack">
          <p className="section-header__subtitle">{t('pages.careTeam.assignHint')}</p>
          <div className="grid grid--2">
            {ELDERLY_PEOPLE.map((elder) => (
              <div key={elder.id} className="field">
                <label className="field__label" htmlFor={`assign-${elder.id}`}>
                  {t('pages.careTeam.assignLabel')} · {elder.name}
                </label>
                <select
                  id={`assign-${elder.id}`}
                  className="select"
                  value={elderCaretaker[elder.id] ?? ''}
                  onChange={(event) => handleAssign(elder.id, event.target.value)}
                >
                  <option value="">{t('pages.careTeam.notAssigned')}</option>
                  {CARETAKERS.map((caretaker) => (
                    <option key={caretaker.id} value={caretaker.id}>
                      {caretaker.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
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
                      <strong>{t('pages.careTeam.linkedElder')}:</strong> {elderNameFor(member.linkedElderId)}
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
    </div>
  );
}
