// Volunteer dashboard: lists every registered elder, shows incoming help requests to accept or decline,
// tracks assigned and completed work in tabs, and keeps a notification feed. All data is mock state for now.
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../../components/Card.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import { Badge } from '../../components/Badge.jsx';
import { Avatar } from '../../components/Avatar.jsx';
import { StatCard } from '../../components/StatCard.jsx';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { useToast } from '../../components/ToastProvider.jsx';
import { ELDERLY_PEOPLE, VOLUNTEERS, HELP_REQUESTS } from '../../data/mockData.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

// The logged-in volunteer is the first entry in the mock volunteers list.
const CURRENT_VOLUNTEER = VOLUNTEERS[0];

// Responsive grid: columns wrap to a single column on narrow (mobile) screens.
const responsiveGrid = (minWidth) => ({
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}), 1fr))`,
});

// Plain vertical list used for the elder, request and notification lists.
const listReset = { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' };

// Header row for a list item: name on the left, badges on the right, wrapping on small screens.
const rowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
};

// Action row at the bottom of a request card; buttons wrap on mobile.
const actionRowStyle = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' };

// Small label above a value, used for city, address, conditions and similar details.
function Detail({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

// One help request shown as an alert card. The caller passes the action buttons so the
// open-request and assigned-request cards share the same layout.
function RequestCard({ request, actions, showNewBadge = false }) {
  // Translation helper for the card labels.
  const { t } = useTranslation();
  return (
    <li className="card" style={{ listStyle: 'none', padding: '1rem' }}>
      <div style={rowStyle}>
        <strong>{request.elderlyPerson}</strong>
        {showNewBadge && <Badge tone="warning">{t('volunteer.newBadge')}</Badge>}
      </div>
      <p style={{ margin: '0.5rem 0' }}>{request.summary}</p>
      <div style={responsiveGrid('180px')}>
        {request.medicines.length > 0 && (
          <Detail label={t('volunteer.medicinesNeeded')}>{request.medicines.join(', ')}</Detail>
        )}
        {request.groceries.length > 0 && (
          <Detail label={t('volunteer.groceriesNeeded')}>{request.groceries.join(', ')}</Detail>
        )}
        <Detail label={t('volunteer.address')}>{request.address}</Detail>
        <Detail label={t('volunteer.requestedBy')}>{request.requestedBy}</Detail>
      </div>
      {actions && <div style={actionRowStyle}>{actions}</div>}
    </li>
  );
}

// Volunteer dashboard root: owns all request, tab, search and notification state.
export function VolunteerDashboard() {
  // Translation helper for every label on the page.
  const { t } = useTranslation();
  // Toast helper for confirming accept, decline and complete actions.
  const { show } = useToast();
  // The current route decides which section(s) this page shows: overview, requests or elders.
  const { pathname } = useLocation();
  const showRequests = pathname.endsWith('/requests');
  const showElders = pathname.endsWith('/elders');
  const showOverview = !showRequests && !showElders;

  // Help requests with live status (open, accepted, declined, completed), seeded from mock data.
  const [requests, setRequests] = useState(() => HELP_REQUESTS.map((request) => ({ ...request })));
  // Notification feed, seeded with one entry for each request that is still open.
  const [notifications, setNotifications] = useState(() =>
    HELP_REQUESTS.filter((request) => request.status === 'open').map((request) => ({
      id: `notif-${request.id}`,
      requestId: request.id,
      elderlyPerson: request.elderlyPerson,
      summary: request.summary,
    })),
  );
  // Which tab of the assigned / completed panel is showing.
  const [activeTab, setActiveTab] = useState('assigned');
  // Search text used to filter the registered elders list.
  const [query, setQuery] = useState('');

  // Requests still waiting for this volunteer's decision; declined ones are hidden.
  const openRequests = requests.filter((request) => request.status === 'open');
  // Requests this volunteer has accepted and not yet finished.
  const assignedRequests = requests.filter((request) => request.status === 'accepted');
  // Requests this volunteer has finished.
  const completedRequests = requests.filter((request) => request.status === 'completed');
  // Number of elders flagged as needing assistance right now.
  const needsHelpCount = ELDERLY_PEOPLE.filter((elder) => elder.status === 'needs-assistance').length;

  // Elders whose name, area, address or any condition contains the search text (case-insensitive).
  const needle = query.trim().toLowerCase();
  const visibleElders = needle
    ? ELDERLY_PEOPLE.filter((elder) =>
        [elder.displayName, elder.area, elder.address, ...elder.conditions.map((c) => c.name)].some(
          (field) => field.toLowerCase().includes(needle),
        ),
      )
    : ELDERLY_PEOPLE;

  // Update one request's status in state.
  function setRequestStatus(requestId, status) {
    setRequests((previous) =>
      previous.map((request) => (request.id === requestId ? { ...request, status } : request)),
    );
  }

  // Remove the notification that belongs to a request, once it has been acted on.
  function clearNotificationFor(requestId) {
    setNotifications((previous) => previous.filter((item) => item.requestId !== requestId));
  }

  // Accept an open request: it moves to the assigned list and the feed entry is cleared.
  function handleAccept(request) {
    setRequestStatus(request.id, 'accepted');
    clearNotificationFor(request.id);
    show(t('volunteer.toastAccepted'), 'success');
  }

  // Decline an open request: it is hidden from the open list and the feed entry is cleared.
  function handleDecline(request) {
    setRequestStatus(request.id, 'declined');
    clearNotificationFor(request.id);
    show(t('volunteer.toastDeclined'), 'info');
  }

  // Mark an assigned request as completed; it moves to the Completed tab.
  function handleComplete(request) {
    setRequestStatus(request.id, 'completed');
    show(t('volunteer.toastCompleted'), 'success');
  }

  // Remove a single entry from the notification feed.
  function dismissNotification(notificationId) {
    setNotifications((previous) => previous.filter((item) => item.id !== notificationId));
  }

  // Handle smooth scroll when navigating to anchor hashes (#requests or #elders)
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  // Summary tiles across the top of the page.
  const stats = [
    { value: ELDERLY_PEOPLE.length, label: t('volunteer.statRegistered'), tone: 'info' },
    { value: needsHelpCount, label: t('volunteer.statNeedsHelp'), tone: 'warning' },
    { value: assignedRequests.length, label: t('volunteer.statAssigned'), tone: 'info' },
    { value: completedRequests.length, label: t('volunteer.statCompleted'), tone: 'success' },
  ];

  // Tab definitions for the assigned / completed panel.
  const trackingTabs = [
    { id: 'assigned', label: t('volunteer.tabAssigned') },
    { id: 'completed', label: t('volunteer.tabCompleted') },
  ];

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Header: volunteer identity and area (overview only) */}
      {showOverview && (
      <Card>
        <div style={{ ...rowStyle, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Avatar name={CURRENT_VOLUNTEER.name} tone="teal" size="lg" />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{CURRENT_VOLUNTEER.name}</h1>
              <div style={{ opacity: 0.8 }}>{t('roles.volunteer')}</div>
            </div>
          </div>
          <Detail label={t('volunteer.myArea')}>
            <Badge tone="info">{CURRENT_VOLUNTEER.area}</Badge>
          </Detail>
        </div>
        <p style={{ margin: '0.75rem 0 0' }}>{t('volunteer.pageSubtitle')}</p>
      </Card>
      )}

      {/* Summary stat cards (overview only) */}
      {showOverview && (
      <div style={responsiveGrid('200px')}>
        {stats.map((stat) => (
          <StatCard key={stat.label} value={stat.value} label={stat.label} tone={stat.tone} />
        ))}
      </div>
      )}

      {/* New help requests and the notification feed (requests only) */}
      {showRequests && (<>
      <div style={responsiveGrid('320px')}>
        <Card id="requests" title={t('volunteer.requestsTitle')}>
          <p style={{ marginTop: 0, opacity: 0.8 }}>{t('volunteer.requestsSubtitle')}</p>
          {openRequests.length === 0 ? (
            <EmptyState title={t('volunteer.noOpenRequests')} />
          ) : (
            <ul style={listReset}>
              {openRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  showNewBadge
                  actions={
                    <>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAccept(request)}>
                        {t('common.accept')}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDecline(request)}>
                        {t('common.decline')}
                      </button>
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('volunteer.notificationsTitle')}>
          <p style={{ marginTop: 0, opacity: 0.8 }}>{t('volunteer.notificationsSubtitle')}</p>
          {notifications.length === 0 ? (
            <EmptyState title={t('volunteer.noNotifications')} />
          ) : (
            <ul style={listReset}>
              {notifications.map((item) => (
                <li key={item.id} className="card" style={{ listStyle: 'none', padding: '0.75rem 1rem' }}>
                  <div style={rowStyle}>
                    <div>
                      <Badge tone="warning">{t('volunteer.notifNewRequest')}</Badge>
                      <div style={{ marginTop: '0.4rem' }}>
                        <strong>{item.elderlyPerson}</strong>: {item.summary}
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => dismissNotification(item.id)}>
                      {t('volunteer.dismiss')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Assigned and completed tracking, switched by tabs */}
      <Card title={t('volunteer.trackingTitle')}>
        <p style={{ marginTop: 0, opacity: 0.8 }}>{t('volunteer.trackingSubtitle')}</p>
        <Tabs tabs={trackingTabs} activeId={activeTab} onChange={setActiveTab} />
        <div style={{ marginTop: '1rem' }}>
          {activeTab === 'assigned' ? (
            assignedRequests.length === 0 ? (
              <EmptyState title={t('volunteer.noAssigned')} />
            ) : (
              <ul style={listReset}>
                {assignedRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    actions={
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleComplete(request)}>
                        {t('volunteer.markCompleted')}
                      </button>
                    }
                  />
                ))}
              </ul>
            )
          ) : completedRequests.length === 0 ? (
            <EmptyState title={t('volunteer.noCompleted')} />
          ) : (
            <ul style={listReset}>
              {completedRequests.map((request) => (
                <RequestCard key={request.id} request={request} actions={<Badge tone="success">{t('status.completed')}</Badge>} />
              ))}
            </ul>
          )}
        </div>
      </Card>
      </>)}

      {/* Registered elders with search and a needs-assistance flag (elders only) */}
      {showElders && (
      <Card id="elders" action={<Badge tone="info">{visibleElders.length}</Badge>}>
        <SectionHeader title={t('volunteer.eldersTitle')} subtitle={t('volunteer.eldersSubtitle')} />
        <label style={{ display: 'grid', gap: '0.35rem', margin: '0.5rem 0 1rem' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{t('volunteer.searchLabel')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('volunteer.searchPlaceholder')}
            style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', font: 'inherit', width: '100%' }}
          />
        </label>

        {visibleElders.length === 0 ? (
          <EmptyState title={t('volunteer.noEldersMatch')} />
        ) : (
          <ul style={listReset}>
            {visibleElders.map((elder) => (
              <li key={elder.id} className="card" style={{ listStyle: 'none', padding: '1rem' }}>
                <div style={rowStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Avatar name={elder.displayName} tone="teal" size="md" />
                    <div>
                      <strong>{elder.displayName}</strong>
                      <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                        {elder.age} {t('volunteer.yearsOld')}
                      </div>
                    </div>
                  </div>
                  {elder.status === 'needs-assistance' ? (
                    <Badge tone="warning">{t('volunteer.needsAssistance')}</Badge>
                  ) : (
                    <Badge tone="success">{t('volunteer.stable')}</Badge>
                  )}
                </div>
                <div style={{ ...responsiveGrid('180px'), marginTop: '0.75rem' }}>
                  <Detail label={t('volunteer.city')}>{elder.area}</Detail>
                  <Detail label={t('volunteer.address')}>{elder.address}</Detail>
                  <Detail label={t('volunteer.conditions')}>
                    {elder.conditions.map((condition) => condition.name).join(', ')}
                  </Detail>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      )}
    </div>
  );
}
