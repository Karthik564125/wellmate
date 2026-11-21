// Family Member dashboard: overview stats, parent health and activity, medicine adherence, appointments and records, caretakers and cab rides, insurance, help requests and family tasks. All state is local to this page and starts from mock data.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { ProgressBar } from '../../components/ProgressBar.jsx';
import { StatCard } from '../../components/StatCard.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import { Timeline } from '../../components/Timeline.jsx';
import { Modal } from '../../components/Modal.jsx';
import { useToast } from '../../components/ToastProvider.jsx';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import {
  ELDERLY_PEOPLE,
  FAMILY_MEMBERS,
  MEDICINES,
  APPOINTMENTS,
  TASKS,
  INSURANCE_POLICIES,
  CAB_RIDES,
  HELP_REQUESTS,
  VOLUNTEERS,
  CARETAKERS,
  MISSED_DOSE_ALERTS,
  ACTIVITY_LOG,
  TIMELINE_EVENTS,
} from '../../data/mockData.js';

// Sample adherence percentage per medicine id. Display-only: mockData has no dose-level history.
const SAMPLE_ADHERENCE = {
  'med-vitd3': 92,
  'med-metformin': 78,
  'med-amlodipine': 85,
  'med-calcium': 96,
  'med-pantoprazole': 88,
};

// Timeline filter options; type is the event type each filter shows (null shows everything).
const TIMELINE_FILTERS = [
  { id: 'all', labelKey: 'family.filterAll', type: null },
  { id: 'appointments', labelKey: 'family.filterAppointments', type: 'appointment' },
  { id: 'prescriptions', labelKey: 'family.filterPrescriptions', type: 'prescription' },
  { id: 'reports', labelKey: 'family.filterReports', type: 'report' },
];

// Translation key for each status value used in mock data.
const STATUS_KEYS = {
  booked: 'status.booked',
  'not-booked-yet': 'status.notBookedYet',
  completed: 'status.completed',
  pending: 'status.pending',
  assigned: 'status.assigned',
  active: 'status.active',
  open: 'family.statusOpen',
  accepted: 'family.statusAccepted',
};

// Badge colour for each status value used in mock data.
const STATUS_TONES = {
  booked: 'success',
  'not-booked-yet': 'warning',
  completed: 'success',
  pending: 'warning',
  assigned: 'info',
  active: 'success',
  open: 'warning',
  accepted: 'info',
};

// Responsive grid: columns wrap automatically, so phones show a single column.
const AUTO_GRID = {
  display: 'grid',
  gap: '1.25rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
};

// Flex row for buttons and badges that should wrap on small screens.
const BUTTON_ROW = { display: 'flex', flexWrap: 'wrap', gap: '0.75rem' };

// Plain list with no bullets or default indentation.
const LIST_RESET = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' };

// Rows inside a card are separated by a thin divider.
const ROW_DIVIDER = { borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' };

// Convert a display phone number such as "+91 98480 11223" into a tel: URL.
function toTelHref(phone) {
  return `tel:${phone.replace(/\s+/g, '')}`;
}

// Format an amount in rupees using Indian digit grouping.
function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

// Today's date as a short label in the active language, used for newly recorded payments.
function formatToday(language) {
  return new Date().toLocaleDateString(language === 'te' ? 'te-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Pick the progress bar colour from an adherence percentage.
function adherenceTone(percent) {
  if (percent >= 90) return 'success';
  if (percent >= 80) return 'info';
  return 'warning';
}

// Status pill that translates a mock status value and picks its colour.
function StatusBadge({ status }) {
  const { t } = useTranslation();
  const key = STATUS_KEYS[status];
  return <Badge tone={STATUS_TONES[status] ?? 'neutral'}>{key ? t(key) : status}</Badge>;
}

// Family Member dashboard view; the parent is the first ELDERLY_PEOPLE entry.
export function FamilyDashboard() {
  // Translation helper and active language (used for the payment date).
  const { t, language } = useTranslation();
  // Toast helper for confirmations.
  const { show } = useToast();

  // The parent this family member looks after.
  const elder = ELDERLY_PEOPLE[0];
  // The family member linked to this parent, used as the requester on new help requests.
  const familyMember = FAMILY_MEMBERS.find((m) => m.linkedElderId === elder.id);
  // Caretakers assigned to this parent.
  const assignedCaretakers = CARETAKERS.filter((c) => c.assignedElderIds.includes(elder.id));

  // Missed-dose alerts still waiting for a follow-up.
  const [missedAlerts, setMissedAlerts] = useState(MISSED_DOSE_ALERTS);
  // Appointments, copied into state so "Book cab" can flag a cab as booked.
  const [appointments, setAppointments] = useState(APPOINTMENTS);
  // Which appointment list is showing: upcoming or past.
  const [appointmentTab, setAppointmentTab] = useState('upcoming');
  // Which timeline filter is selected.
  const [timelineFilter, setTimelineFilter] = useState('all');
  // Availability flag per caretaker id; everyone starts as available.
  const [availability, setAvailability] = useState(() => Object.fromEntries(CARETAKERS.map((c) => [c.id, true])));
  // Cab rides for this parent, including newly requested ones.
  const [rides, setRides] = useState(() => CAB_RIDES.filter((r) => r.elderlyPerson === elder.name));
  // Whether the book-cab dialog is open, and which appointment it will book.
  const [cabModalOpen, setCabModalOpen] = useState(false);
  const [cabAppointmentId, setCabAppointmentId] = useState('');
  // Policy ids whose premium has been paid in this session.
  const [paidPolicies, setPaidPolicies] = useState({});
  // Payment history rows across all policies, newest payments first once added.
  const [payments, setPayments] = useState(() =>
    INSURANCE_POLICIES.flatMap((policy) =>
      policy.paymentHistory.map((entry, index) => ({
        id: `${policy.id}-${index}`,
        provider: policy.provider,
        date: entry.date,
        amount: entry.amount,
        status: entry.status,
      })),
    ),
  );
  // Help requests for this parent, including newly posted ones.
  const [helpRequests, setHelpRequests] = useState(() => HELP_REQUESTS.filter((h) => h.elderlyPerson === elder.name));
  // Whether the post-help-request dialog is open, and the text typed into it.
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [helpText, setHelpText] = useState('');
  // Family tasks with their done state.
  const [tasks, setTasks] = useState(() => TASKS.map((task) => ({ ...task })));

  // Appointments that have not happened yet, and those that have.
  const upcomingAppointments = appointments.filter((a) => !a.past);
  const pastAppointments = appointments.filter((a) => a.past);
  // Appointments shown in the list for the selected tab.
  const visibleAppointments = appointmentTab === 'upcoming' ? upcomingAppointments : pastAppointments;
  // Average adherence across all medicines, rounded to a whole percent.
  const adherencePercent = Math.round(
    MEDICINES.reduce((sum, medicine) => sum + (SAMPLE_ADHERENCE[medicine.id] ?? 0), 0) / MEDICINES.length,
  );
  // Help requests still waiting for a volunteer.
  const _openHelpCount = helpRequests.filter((h) => h.status === 'open').length;
  // Policies whose premium has not been paid yet in this session.
  const _premiumsDueCount = INSURANCE_POLICIES.filter((policy) => !paidPolicies[policy.id]).length;
  // The timeline filter currently selected, and the events it shows.
  const activeFilter = TIMELINE_FILTERS.find((f) => f.id === timelineFilter) ?? TIMELINE_FILTERS[0];
  const timelineItems = TIMELINE_EVENTS.filter((event) => !activeFilter.type || event.type === activeFilter.type);
  // Number of family tasks not yet done.
  const tasksRemaining = tasks.filter((task) => !task.done).length;

  // Tab definitions with translated labels.
  const appointmentTabs = [
    { id: 'upcoming', label: t('family.tabUpcoming') },
    { id: 'past', label: t('family.tabPast') },
  ];
  const timelineTabs = TIMELINE_FILTERS.map((filter) => ({ id: filter.id, label: t(filter.labelKey) }));

  // Open the book-cab dialog, pre-selecting the first upcoming appointment.
  function openCabModal() {
    setCabAppointmentId(upcomingAppointments[0]?.id ?? '');
    setCabModalOpen(true);
  }

  // Add a pending cab ride for the chosen appointment and flag that appointment as having a cab.
  function confirmCabBooking() {
    const appointment = upcomingAppointments.find((a) => a.id === cabAppointmentId);
    if (!appointment) return;
    const pendingRide = {
      id: `ride-${Date.now()}`,
      elderlyPerson: elder.name,
      driverName: t('family.driverTbd'),
      vehicle: t('family.driverTbd'),
      driverPhone: '',
      pickup: elder.address,
      destination: appointment.place,
      appointmentDate: `${appointment.date}, ${appointment.time}`,
      status: 'pending',
    };
    setRides((previous) => [pendingRide, ...previous]);
    setAppointments((previous) => previous.map((a) => (a.id === appointment.id ? { ...a, cabBooked: true } : a)));
    setCabModalOpen(false);
    show(t('family.toastCabBooked'), 'success');
  }

  // Flip one caretaker's availability and confirm the change.
  function toggleAvailability(caretakerId) {
    setAvailability((previous) => ({ ...previous, [caretakerId]: !previous[caretakerId] }));
    show(t('family.toastAvailability'), 'success');
  }

  // Remove a missed-dose alert from the list once a family member has followed it up.
  function markFollowedUp(alertId) {
    setMissedAlerts((previous) => previous.filter((alert) => alert.id !== alertId));
    show(t('family.toastFollowedUp'), 'success');
  }

  // Mark a policy's premium as paid and add a completed row to the payment history.
  function payPremium(policy) {
    if (paidPolicies[policy.id]) return;
    setPaidPolicies((previous) => ({ ...previous, [policy.id]: true }));
    setPayments((previous) => [
      {
        id: `${policy.id}-${Date.now()}`,
        provider: policy.provider,
        date: formatToday(language),
        amount: policy.annualPremium,
        status: 'completed',
      },
      ...previous,
    ]);
    show(t('family.toastPaid'), 'success');
  }

  // Post the typed help request as a new open request, if the text is not empty.
  function submitHelpRequest() {
    const summary = helpText.trim();
    if (!summary) return;
    const request = {
      id: `help-${Date.now()}`,
      elderlyPerson: elder.name,
      summary,
      medicines: [],
      groceries: [],
      address: elder.address,
      status: 'open',
      requestedBy: familyMember?.name ?? '',
    };
    setHelpRequests((previous) => [request, ...previous]);
    setHelpText('');
    setHelpModalOpen(false);
    show(t('family.toastHelpPosted'), 'success');
  }

  // Flip a family task between done and not done.
  function toggleTask(taskId) {
    setTasks((previous) => previous.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)));
  }

  return (
    <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero headline matching family-care-hub.html */}
      <div className="hero">
        <h1>
          One refill runs out <span>this week</span>, one task is overdue, and the next visit is <span>Tuesday</span>.
        </h1>
        <p>Updated today at 9:40 am by Meera. You are viewing as Family.</p>
      </div>

      {/* Overview: four summary stat cards in 4-column grid matching Image 2 */}
      <div className="grid g4" style={{ marginBottom: 6 }}>
        <StatCard value="1" label="Overdue task" tone="danger" sublabel="Cardiology booking" />
        <StatCard value="2" label="Refill due soon" tone="warning" sublabel="Metformin in 4 days" />
        <StatCard value={upcomingAppointments.length} label={t('family.statAppointments')} tone="info" sublabel="Next: Nov 24" />
        <StatCard value={tasks.filter((t) => t.done).length} label="Done this month" tone="success" sublabel={`of ${tasks.length} tasks`} />
      </div>

      {/* Two columns: Coming up and Needs attention matching family-care-hub.html */}
      <div className="grid g2" style={{ marginBottom: 12 }}>
        <Card
          title={
            <span style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              Coming up
              <Link to="/appointments" style={{ font: '600 13px Figtree', color: 'var(--brand)', textDecoration: 'none' }}>
                Full timeline
              </Link>
            </span>
          }
        >
          {upcomingAppointments.map((a) => (
            <div key={a.id} className="row">
              <div style={{ textAlign: 'center', minWidth: 48, background: 'var(--brand-s)', borderRadius: 8, padding: '4px 0' }}>
                <div className="serif" style={{ fontSize: 20, lineHeight: 1, color: 'var(--brand)' }}>
                  {a.date.split(' ')[1] || '24'}
                </div>
                <div className="mut" style={{ fontSize: 11 }}>
                  {a.date.split(' ')[0] || 'Nov'}
                </div>
              </div>
              <div className="grow">
                <b>{a.title}</b>
                <div className="mut">{a.place} · {a.time}</div>
              </div>
              {a.doctor ? (
                <span className="pill ok">{a.doctor.slice(0, 10)}</span>
              ) : (
                <span className="pill warn">Needs someone</span>
              )}
            </div>
          ))}
        </Card>

        <Card title="Needs attention">
          {tasks.slice(0, 1).map((task) => (
            <div key={task.id} className="row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  style={{ width: '1.25rem', height: '1.25rem' }}
                />
                <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</span>
              </label>
              <span className="pill bad">Overdue</span>
            </div>
          ))}
          <div className="row">
            <div className="grow">
              <b>Metformin 500 mg</b>
              <div className="mut">4 days left, refill by Nov 25</div>
            </div>
            <span className="pill bad">4 days</span>
          </div>
          <div className="row">
            <div className="grow">
              <b>Vitamin D3 60k IU</b>
              <div className="mut">3 days left, refill by Dec 14</div>
            </div>
            <span className="pill bad">3 days</span>
          </div>
          <div className="row">
            <div className="grow">
              <b>Cardiology visit has no slot</b>
              <div className="mut">Suggested by Dec 03</div>
            </div>
            <span className="pill warn">Unbooked</span>
          </div>
        </Card>
      </div>

      {/* Parent details and conditions */}
      <div style={AUTO_GRID}>
        <Card title={t('family.conditionsTitle')}>
          <ul style={LIST_RESET}>
            {elder.conditions.map((condition) => (
              <li key={condition}>
                <Badge tone="info">{condition}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t('family.vitalsTitle')}>
          <p>
            {t('family.bloodGroup')}: <strong>{elder.bloodGroup}</strong>
          </p>
          <p>
            {t('family.phone')}: <a href={toTelHref(elder.phone)}>{elder.phone}</a>
          </p>
          <p>
            {t('family.address')}: {elder.address}
          </p>
        </Card>

        <Card title={t('family.activityTitle')}>
          {ACTIVITY_LOG.length === 0 ? (
            <p>{t('family.noActivity')}</p>
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

      {/* Medicine adherence: one progress bar per medicine, plus missed-dose alerts */}
      <div style={AUTO_GRID}>
        <Card title={t('family.medicinesTitle')}>
          <p>{t('family.medicinesSubtitle')}</p>
          <div style={{ ...LIST_RESET, marginTop: '1rem' }}>
            <ProgressBar value={adherencePercent} tone={adherenceTone(adherencePercent)} label={t('family.overallLabel')} />
            {MEDICINES.map((medicine) => {
              const percent = SAMPLE_ADHERENCE[medicine.id] ?? 0;
              return (
                <div key={medicine.id}>
                  <ProgressBar value={percent} tone={adherenceTone(percent)} label={`${medicine.name} ${medicine.dose}`} />
                  <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    {t('family.refillBy')} {medicine.refillBy} · {t('family.refilledBy')} {medicine.refilledBy}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title={t('family.missedTitle')}>
          {missedAlerts.length === 0 ? (
            <p>{t('family.noMissed')}</p>
          ) : (
            <ul style={LIST_RESET}>
              {missedAlerts.map((alert) => (
                <li key={alert.id} style={ROW_DIVIDER}>
                  <strong>{alert.medicine}</strong>
                  <p>
                    {t('family.missedOn')} {alert.date} · {t('family.notifiedTo')}: {alert.notifiedTo}
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: '0.5rem' }}
                    onClick={() => markFollowedUp(alert.id)}
                  >
                    {t('family.markFollowedUp')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Appointments and records: upcoming/past tabs and a filterable records timeline */}
      <div style={AUTO_GRID}>
        <Card title={t('family.appointmentsTitle')}>
          <Tabs tabs={appointmentTabs} activeId={appointmentTab} onChange={setAppointmentTab} />
          {visibleAppointments.length === 0 ? (
            <p style={{ marginTop: '1rem' }}>
              {appointmentTab === 'upcoming' ? t('family.noUpcoming') : t('family.noPast')}
            </p>
          ) : (
            <ul style={{ ...LIST_RESET, marginTop: '1rem' }}>
              {visibleAppointments.map((appointment) => (
                <li key={appointment.id} style={ROW_DIVIDER}>
                  <strong>{appointment.title}</strong>
                  <p>
                    {appointment.doctor} · {appointment.place}
                  </p>
                  <p>
                    {appointment.date} · {appointment.time}
                  </p>
                  {appointment.bookedBy && (
                    <p>
                      {t('family.bookedBy')}: {appointment.bookedBy}
                    </p>
                  )}
                  <div style={{ ...BUTTON_ROW, marginTop: '0.5rem' }}>
                    <StatusBadge status={appointment.status} />
                    <Badge tone={appointment.cabBooked ? 'success' : 'neutral'}>
                      {t('family.cabStatus')}: {appointment.cabBooked ? t('status.booked') : t('status.notBookedYet')}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('family.timelineTitle')}>
          <Tabs tabs={timelineTabs} activeId={timelineFilter} onChange={setTimelineFilter} />
          <div style={{ marginTop: '1rem' }}>
            {timelineItems.length === 0 ? (
              <p>{t('family.noTimeline')}</p>
            ) : (
              <Timeline items={timelineItems} />
            )}
          </div>
        </Card>
      </div>

      {/* Caretakers and cab rides: availability toggles and ride status, with the book-cab dialog */}
      <div style={AUTO_GRID}>
        <Card title={t('family.caretakersTitle')}>
          {assignedCaretakers.length === 0 ? (
            <p>{t('family.noCaretakers')}</p>
          ) : (
            <ul style={LIST_RESET}>
              {assignedCaretakers.map((caretaker) => {
                const isAvailable = Boolean(availability[caretaker.id]);
                const availabilityText = Array.isArray(caretaker.availability)
                  ? caretaker.availability.join(', ')
                  : caretaker.availability;
                return (
                  <li key={caretaker.id} style={ROW_DIVIDER}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Avatar name={caretaker.name} tone="blue" size="md" />
                      <strong>{caretaker.name}</strong>
                    </div>
                    <p>
                      {t('family.specialty')}: {caretaker.specialty}
                    </p>
                    <p>
                      {t('family.phone')}: <a href={toTelHref(caretaker.phone)}>{caretaker.phone}</a>
                    </p>
                    <p>
                      {t('family.shift')}: {caretaker.shift.days.join(', ')}, {caretaker.shift.start} – {caretaker.shift.end}
                    </p>
                    <p>
                      {t('family.availability')}: {availabilityText}
                    </p>
                    <div style={{ ...BUTTON_ROW, marginTop: '0.5rem', alignItems: 'center' }}>
                      <Badge tone={isAvailable ? 'success' : 'danger'}>
                        {isAvailable ? t('family.availableNow') : t('family.unavailableNow')}
                      </Badge>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        aria-pressed={!isAvailable}
                        onClick={() => toggleAvailability(caretaker.id)}
                      >
                        {t('family.changeAvailability')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          title={t('family.transportTitle')}
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={openCabModal}>
              {t('family.bookCab')}
            </button>
          }
        >
          {rides.length === 0 ? (
            <p>{t('family.noRides')}</p>
          ) : (
            <ul style={LIST_RESET}>
              {rides.map((ride) => (
                <li key={ride.id} style={ROW_DIVIDER}>
                  <div style={{ ...BUTTON_ROW, alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>{ride.appointmentDate}</strong>
                    <StatusBadge status={ride.status} />
                  </div>
                  <p>
                    {t('family.driver')}: {ride.driverName}
                    {ride.driverPhone && (
                      <>
                        {' · '}
                        <a href={toTelHref(ride.driverPhone)}>{ride.driverPhone}</a>
                      </>
                    )}
                  </p>
                  <p>
                    {t('family.vehicle')}: {ride.vehicle}
                  </p>
                  <p>
                    {t('family.pickup')}: {ride.pickup}
                  </p>
                  <p>
                    {t('family.destination')}: {ride.destination}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Insurance: one card per policy with a pay-premium action, then the payment history table */}
      <Card title={t('family.insuranceTitle')}>
        <div style={AUTO_GRID}>
          {INSURANCE_POLICIES.map((policy) => {
            const isPaid = Boolean(paidPolicies[policy.id]);
            return (
              <div key={policy.id} className="card" style={{ padding: '1rem' }}>
                <strong>{policy.provider}</strong>
                <p>{policy.policyType}</p>
                <p>
                  {t('family.policyNumber')}: {policy.policyNumber}
                </p>
                <p>
                  {t('family.coverage')}: {formatRupees(policy.coverageAmount)}
                </p>
                <p>
                  {t('family.annualPremium')}: {formatRupees(policy.annualPremium)}
                </p>
                <p>
                  {t('family.renewal')}: {policy.renewalDate} · {t('family.premiumDue')}: {policy.premiumDueDate}
                </p>
                <div style={{ ...BUTTON_ROW, alignItems: 'center', marginTop: '0.5rem' }}>
                  <StatusBadge status={policy.status} />
                  <button
                    type="button"
                    className={`btn ${isPaid ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={isPaid}
                    onClick={() => payPremium(policy)}
                  >
                    {isPaid ? t('family.premiumPaid') : t('family.payPremium')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <h3 style={{ marginTop: '1.25rem' }}>{t('family.paymentHistoryTitle')}</h3>
        {payments.length === 0 ? (
          <p>{t('family.noPayments')}</p>
        ) : (
          <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{t('family.paymentDate')}</th>
                  <th scope="col">{t('family.paymentPolicy')}</th>
                  <th scope="col">{t('family.paymentAmount')}</th>
                  <th scope="col">{t('family.paymentStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.date}</td>
                    <td>{payment.provider}</td>
                    <td>{formatRupees(payment.amount)}</td>
                    <td>
                      <StatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Help requests and volunteers: open requests list and volunteer directory */}
      <div style={AUTO_GRID}>
        <Card
          title={t('family.helpTitle')}
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setHelpModalOpen(true)}>
              {t('family.postHelp')}
            </button>
          }
        >
          {helpRequests.length === 0 ? (
            <p>{t('family.noHelp')}</p>
          ) : (
            <ul style={LIST_RESET}>
              {helpRequests.map((request) => (
                <li key={request.id} style={ROW_DIVIDER}>
                  <div style={{ ...BUTTON_ROW, alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>{request.summary}</strong>
                    <StatusBadge status={request.status} />
                  </div>
                  {request.medicines.length > 0 && <p>{request.medicines.join(', ')}</p>}
                  {request.groceries.length > 0 && <p>{request.groceries.join(', ')}</p>}
                  <p>
                    {request.address}
                    {request.requestedBy && ` · ${t('family.requestedBy')}: ${request.requestedBy}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('family.volunteersTitle')}>
          {VOLUNTEERS.length === 0 ? (
            <p>{t('family.noVolunteers')}</p>
          ) : (
            <ul style={LIST_RESET}>
              {VOLUNTEERS.map((volunteer) => (
                <li key={volunteer.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', ...ROW_DIVIDER }}>
                  <Avatar name={volunteer.name} tone="indigo" size="sm" />
                  <span>
                    <strong>{volunteer.name}</strong>
                    <br />
                    {t('family.volunteerArea')}: {volunteer.area} · {volunteer.skills.join(', ')}
                    <br />
                    {t('family.completedTasks')}: {volunteer.completedCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Family tasks: checkbox list with overdue flags */}
      <Card title={`${t('family.tasksTitle')} · ${tasksRemaining} ${t('family.tasksRemaining')}`}>
        {tasks.length === 0 ? (
          <p>{t('family.noTasks')}</p>
        ) : (
          <ul style={LIST_RESET}>
            {tasks.map((task) => (
              <li key={task.id} style={{ ...BUTTON_ROW, alignItems: 'center', ...ROW_DIVIDER }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 16rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    style={{ width: '1.25rem', height: '1.25rem' }}
                  />
                  <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</span>
                </label>
                <span>
                  {t('family.taskDue')}: {task.due} · {t('family.taskAssignee')}: {task.assignee}
                </span>
                {task.overdue && !task.done && <Badge tone="danger">{t('status.overdue')}</Badge>}
                {task.done && <Badge tone="success">{t('family.taskDone')}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Book-cab dialog: choose an upcoming appointment, then confirm to add a pending ride */}
      <Modal
        open={cabModalOpen}
        title={t('family.bookCabTitle')}
        onClose={() => setCabModalOpen(false)}
        footer={
          <div style={BUTTON_ROW}>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => setCabModalOpen(false)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={!cabAppointmentId}
              onClick={confirmCabBooking}
            >
              {t('family.confirmBooking')}
            </button>
          </div>
        }
      >
        <p>{t('family.bookCabHint')}</p>
        {upcomingAppointments.length === 0 ? (
          <p>{t('family.noUpcomingForCab')}</p>
        ) : (
          <div className="field" style={{ marginTop: '1rem' }}>
            <label className="field__label" htmlFor="cab-appointment">
              {t('family.chooseAppointment')}
            </label>
            <select
              id="cab-appointment"
              className="select"
              value={cabAppointmentId}
              onChange={(event) => setCabAppointmentId(event.target.value)}
            >
              {upcomingAppointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.title} · {appointment.date} · {appointment.time}
                </option>
              ))}
            </select>
          </div>
        )}
      </Modal>

      {/* Post-help-request dialog: free-text request that is added to the open list */}
      <Modal
        open={helpModalOpen}
        title={t('family.helpModalTitle')}
        onClose={() => setHelpModalOpen(false)}
        footer={
          <div style={BUTTON_ROW}>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => setHelpModalOpen(false)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={!helpText.trim()}
              onClick={submitHelpRequest}
            >
              {t('family.submitHelp')}
            </button>
          </div>
        }
      >
        <p>{t('family.helpModalHint')}</p>
        <div className="field" style={{ marginTop: '1rem' }}>
          <label className="field__label" htmlFor="help-text">
            {t('family.helpTextLabel')}
          </label>
          <textarea
            id="help-text"
            className="textarea"
            placeholder={t('family.helpPlaceholder')}
            value={helpText}
            onChange={(event) => setHelpText(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
