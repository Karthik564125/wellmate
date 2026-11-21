// Admin dashboard: platform stats, user management, caretaker assignments,
// monitoring of help requests / appointments / rides, and statistics.
import { useState, useMemo } from 'react';
import {
  ADMIN_STATS,
  ELDERLY_PEOPLE,
  FAMILY_MEMBERS,
  CARETAKERS,
  VOLUNTEERS,
  HELP_REQUESTS,
  APPOINTMENTS,
  CAB_RIDES,
  ACTIVITY_LOG,
  INSURANCE_POLICIES,
} from '../../data/mockData.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { useToast } from '../../components/ToastProvider.jsx';
import { Card } from '../../components/Card.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import { Badge } from '../../components/Badge.jsx';
import { StatCard } from '../../components/StatCard.jsx';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { Modal } from '../../components/Modal.jsx';
import { ProgressBar } from '../../components/ProgressBar.jsx';

// Maps a raw status string from mock data to its translation key suffix.
const STATUS_KEYS = {
  open: 'statusOpen',
  accepted: 'statusAccepted',
  completed: 'statusCompleted',
  scheduled: 'statusScheduled',
  active: 'statusActive',
  assigned: 'statusAssigned',
  pending: 'statusPending',
};

// Returns the status label for a raw status string, falling back to the raw value.
function statusKey(status) {
  return STATUS_KEYS[String(status || '').toLowerCase()] || null;
}

// Normalises the four user lists into one shape: {id, name, role, phone, status}.
function buildUsers() {
  // Shared mapper so every source list produces the same fields.
  const map = (list, role) =>
    list.map((u, i) => ({
      id: `${role}-${u.id ?? i}`,
      name: u.name ?? '',
      role,
      phone: u.phone ?? '',
      status: u.status ?? 'active',
    }));
  return [
    ...map(ELDERLY_PEOPLE, 'elder'),
    ...map(FAMILY_MEMBERS, 'family'),
    ...map(CARETAKERS, 'caretaker'),
    ...map(VOLUNTEERS, 'volunteer'),
  ];
}

// Maps each ADMIN_STATS field to its translation key, in tile order.
const ADMIN_STAT_FIELDS = [
  { field: 'elders', key: 'statElders', tone: 'info', sublabel: 'Registered seniors' },
  { field: 'familyMembers', key: 'statFamily', tone: 'info', sublabel: 'Active family' },
  { field: 'caretakers', key: 'statCaretakers', tone: 'success', sublabel: 'Assigned on-duty' },
  { field: 'volunteers', key: 'statVolunteers', tone: 'info', sublabel: 'Community network' },
  { field: 'openRequests', key: 'statOpenRequests', tone: 'warning', sublabel: 'Requires pickup' },
  { field: 'upcomingAppointments', key: 'statAppointments', tone: 'info', sublabel: 'Upcoming clinic visits' },
  { field: 'activeRides', key: 'statActiveRides', tone: 'info', sublabel: 'Transit assigned' },
  { field: 'monthlyPremiumCollected', key: 'statPremium', tone: 'success', sublabel: 'Collected this cycle' },
];

// Builds the eight {field, key, value} stat tiles from the ADMIN_STATS object.
const ADMIN_STAT_ITEMS = ADMIN_STAT_FIELDS.map((s) => ({ ...s, value: ADMIN_STATS[s.field] ?? 0 }));

// Groups insurance payment history into a chronological list of {month, total}, keyed by YYYY-MM.
function monthlyPremiums() {
  // Sum every payment into its YYYY-MM bucket, using the real parsed date.
  const totals = {};
  INSURANCE_POLICIES.forEach((policy) => {
    (policy.paymentHistory || []).forEach((p) => {
      const date = new Date(p.date);
      if (Number.isNaN(date.getTime())) return;
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      totals[month] = (totals[month] || 0) + (Number(p.amount) || 0);
    });
  });
  return Object.keys(totals)
    .sort()
    .map((month) => ({ month, total: totals[month] }));
}

// Counts cab rides grouped by their status for the rides chart.
function ridesByStatus() {
  // Tally each ride status.
  const counts = {};
  CAB_RIDES.forEach((r) => {
    const s = String(r.status || 'unknown').toLowerCase();
    counts[s] = (counts[s] || 0) + 1;
  });
  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

// Main admin dashboard component.
export default function AdminDashboard() {
  // Translation and toast hooks.
  const { t } = useTranslation();
  const { show } = useToast();

  // Active tab id: users | assignments | monitoring | statistics.
  const [tab, setTab] = useState('users');

  // User list state (editable) and filters.
  const [users, setUsers] = useState(() => buildUsers());
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ name: '', phone: '', status: '' });

  // Caretaker -> elder assignment map and family -> elder links.
  const [assignments, setAssignments] = useState(() =>
    Object.fromEntries(CARETAKERS.map((c, i) => [c.id ?? i, ELDERLY_PEOPLE[i % ELDERLY_PEOPLE.length]?.id ?? null])),
  );

  // Help request reassignment map: requestId -> volunteer/caretaker id.
  const [reassigned, setReassigned] = useState({});

  // Filtered user list derived from role and search.
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === 'all' || u.role === roleFilter) &&
        (!q || u.name.toLowerCase().includes(q) || u.phone.includes(q)),
    );
  }, [users, roleFilter, search]);

  // Opens the edit modal and copies the user into the draft.
  const openEdit = (user) => {
    setEditing(user);
    setDraft({ name: user.name, phone: user.phone, status: user.status });
  };

  // Writes the draft back into the user list and shows a toast.
  const saveUser = () => {
    if (!editing) return;
    setUsers((prev) => prev.map((u) => (u.id === editing.id ? { ...u, ...draft } : u)));
    show(t('admin.toastUserSaved'), 'success');
    setEditing(null);
  };

  // Changes which elder a caretaker is assigned to and toasts.
  const changeAssignment = (caretakerId, elderId) => {
    setAssignments((prev) => ({ ...prev, [caretakerId]: elderId }));
    show(t('admin.toastReassigned'), 'success');
  };

  // Changes the handler for a help request and toasts.
  const changeReassign = (requestId, handlerId) => {
    setReassigned((prev) => ({ ...prev, [requestId]: handlerId }));
    show(t('admin.toastRequestReassigned'), 'success');
  };

  // Resolves an elder id to a display name for family links.
  const elderName = (id) => ELDERLY_PEOPLE.find((e) => e.id === id)?.displayName ?? '—';

  // Labelled status badge helper; uses the translated label when one exists.
  const statusBadge = (status) => {
    const key = statusKey(status);
    return <Badge>{key ? t(`admin.${key}`) : String(status ?? '')}</Badge>;
  };

  // Chart data, computed once per mount since mock data is static.
  const premiums = useMemo(() => monthlyPremiums(), []);
  const rides = useMemo(() => ridesByStatus(), []);
  const maxPremium = Math.max(1, ...premiums.map((p) => p.total));
  const maxRides = Math.max(1, ...rides.map((r) => r.count));
  // Count-based stats for the progress bars; premium money is shown only on its tile and chart.
  const countStats = ADMIN_STAT_ITEMS.filter((s) => s.field !== 'monthlyPremiumCollected');
  const maxCount = Math.max(1, ...countStats.map((s) => s.value));

  // Tab definitions passed to the Tabs control.
  const tabs = [
    { id: 'users', label: t('admin.tabUsers') },
    { id: 'assignments', label: t('admin.tabAssignments') },
    { id: 'monitoring', label: t('admin.tabMonitoring') },
    { id: 'statistics', label: t('admin.tabStatistics') },
  ];

  return (
    <div className="page">
      {/* Hero header matching family-care-hub.html */}
      <div className="hero">
        <h1>{t('admin.pageTitle')}</h1>
        <p>{t('admin.pageSubtitle')}</p>
      </div>

      {/* Eight platform stat cards from mock data in 4-column grid */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        {ADMIN_STAT_ITEMS.map((s) => (
          <StatCard
            key={s.field}
            label={t(`admin.${s.key}`)}
            value={s.field === 'monthlyPremiumCollected' ? `₹${s.value}` : s.value}
            tone={s.tone}
            sublabel={s.sublabel}
          />
        ))}
      </div>

      {/* Section tabs */}
      <Tabs tabs={tabs} activeId={tab} onChange={setTab} />

      {/* Users tab: filter, search and table */}
      {tab === 'users' && (
        <Card>
          <div className="grid--2">
            <label>
              {t('admin.roleFilter')}
              <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">{t('admin.allRoles')}</option>
                <option value="elder">Elder</option>
                <option value="family">Family</option>
                <option value="caretaker">Caretaker</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </label>
            <label>
              {t('admin.searchUsers')}
              <input
                className="input"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.searchUsers')}
              />
            </label>
          </div>

          {/* User table with edit action per row */}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('admin.colName')}</th>
                  <th>{t('admin.colRole')}</th>
                  <th>{t('admin.colPhone')}</th>
                  <th>{t('admin.colStatus')}</th>
                  <th>{t('admin.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5}>{t('admin.noRows')}</td>
                  </tr>
                )}
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.role}</td>
                    <td>{u.phone}</td>
                    <td>{statusBadge(u.status)}</td>
                    <td>
                      <button type="button" className="btn" onClick={() => openEdit(u)}>
                        {t('admin.edit')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit user modal */}
      <Modal open={Boolean(editing)} title={t('admin.editUser')} onClose={() => setEditing(null)}>
        <label>
          {t('admin.fieldName')}
          <input
            className="input"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          {t('admin.fieldPhone')}
          <input
            className="input"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
        </label>
        <label>
          {t('admin.fieldStatus')}
          <input
            className="input"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          />
        </label>
        <div>
          <button type="button" className="btn" onClick={() => setEditing(null)}>
            {t('admin.cancel')}
          </button>
          <button type="button" className="btn" onClick={saveUser}>
            {t('admin.save')}
          </button>
        </div>
      </Modal>

      {/* Assignments tab: caretaker -> elder selects and family links */}
      {tab === 'assignments' && (
        <div className="grid--2">
          <Card title={t('admin.assignTitle')}>
            <p>{t('admin.assignSubtitle')}</p>
            {CARETAKERS.map((c, i) => {
              const cid = c.id ?? i;
              return (
                <label key={cid}>
                  {c.name}
                  <select
                    className="select"
                    value={assignments[cid] ?? ''}
                    onChange={(e) => changeAssignment(cid, e.target.value)}
                  >
                    <option value="">{t('admin.assignCaretaker')}</option>
                    {ELDERLY_PEOPLE.map((e, j) => (
                      <option key={e.id ?? j} value={e.id ?? j}>
                        {e.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </Card>

          <Card title={t('admin.familyLinks')}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('admin.colName')}</th>
                    <th>{t('admin.colElder')}</th>
                  </tr>
                </thead>
                <tbody>
                  {FAMILY_MEMBERS.map((f, i) => (
                    <tr key={f.id ?? i}>
                      <td>{f.name}</td>
                      <td>{elderName(f.elderId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Monitoring tab: help requests, appointments, rides, activity */}
      {tab === 'monitoring' && (
        <>
          <Card title={t('admin.helpTitle')}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('admin.colRequest')}</th>
                    <th>{t('admin.colElder')}</th>
                    <th>{t('admin.colStatus')}</th>
                    <th>{t('admin.colReassign')}</th>
                  </tr>
                </thead>
                <tbody>
                  {HELP_REQUESTS.map((r, i) => {
                    const rid = r.id ?? i;
                    return (
                      <tr key={rid}>
                        <td>{r.summary ?? rid}</td>
                        <td>{r.elderlyPerson ?? '—'}</td>
                        <td>{statusBadge(r.status)}</td>
                        <td>
                          <select
                            className="select"
                            value={reassigned[rid] ?? ''}
                            onChange={(e) => changeReassign(rid, e.target.value)}
                          >
                            <option value="">{t('admin.reassignTo')}</option>
                            {VOLUNTEERS.map((v, j) => (
                              <option key={v.id ?? j} value={v.id ?? j}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid--2">
            <Card title={t('admin.appointmentsTitle')}>
              {APPOINTMENTS.map((a, i) => (
                <div key={a.id ?? i} className="row">
                  <span>{a.title ?? a.type ?? ''}</span>
                  {statusBadge(a.status)}
                </div>
              ))}
            </Card>

            <Card title={t('admin.ridesTitle')}>
              {CAB_RIDES.map((r, i) => (
                <div key={r.id ?? i} className="row">
                  <span>{r.destination ?? r.title ?? ''}</span>
                  {statusBadge(r.status)}
                </div>
              ))}
            </Card>
          </div>

          {/* Activity feed */}
          <Card title={t('admin.activityTitle')}>
            <ul className="list">
              {ACTIVITY_LOG.map((a, i) => (
                <li key={a.id ?? i}>{a.text ?? a.message ?? ''}</li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {/* Statistics tab: progress bars and CSS premium / rides charts */}
      {tab === 'statistics' && (
        <>
          <SectionHeader title={t('admin.statsTitle')} subtitle={t('admin.statsSubtitle')} />

          <Card>
            {countStats.map((s) => (
              <div key={s.field} className="stat-row">
                <span>{t(`admin.${s.key}`)}</span>
                <ProgressBar value={Math.round((s.value / maxCount) * 100)} />
              </div>
            ))}
          </Card>

          <div className="grid--2">
            {/* Monthly premium bars built from insurance payment history */}
            <Card title={t('admin.premiumChart')}>
              <div className="bar-chart">
                {premiums.map((p) => (
                  <div key={p.month} className="bar-chart__col">
                    <div
                      className="bar-chart__bar"
                      style={{ height: `${Math.round((p.total / maxPremium) * 100)}%` }}
                      title={`${p.month}: ${p.total}`}
                    />
                    <span>{p.month}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Rides grouped by status as CSS bars */}
            <Card title={t('admin.ridesChart')}>
              <div className="bar-chart">
                {rides.map((r) => (
                  <div key={r.status} className="bar-chart__col">
                    <div
                      className="bar-chart__bar"
                      style={{ height: `${Math.round((r.count / maxRides) * 100)}%` }}
                      title={`${r.status}: ${r.count}`}
                    />
                    <span>{r.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
