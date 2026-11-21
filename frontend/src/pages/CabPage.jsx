// Cab transport page: smart driver auto-assignment for pending rides, driver availability cards and rides grouped by status.
import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { Tabs } from '../components/Tabs.jsx';
import { Badge } from '../components/Badge.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { CAB_RIDES, DRIVERS } from '../data/mockData.js';

// Tab definitions for the rides grouped by status.
const RIDE_TABS = [
  { id: 'assigned', labelKey: 'pages.cab.tabAssigned', status: 'assigned', emptyKey: 'pages.cab.noAssigned' },
  { id: 'pending', labelKey: 'pages.cab.tabPending', status: 'pending', emptyKey: 'pages.cab.noPending' },
  { id: 'completed', labelKey: 'pages.cab.tabCompleted', status: 'completed', emptyKey: 'pages.cab.noCompleted' },
];

// Find a driver's phone from the rides list; returns null when not found.
function driverPhoneFor(driverName) {
  return CAB_RIDES.find((r) => r.driverName === driverName && r.driverPhone)?.driverPhone ?? null;
}

// Status badge mapped to ride state.
function renderStatus(status, t) {
  if (status === 'assigned') return <Badge tone="info">{t('status.assigned')}</Badge>;
  if (status === 'pending') return <Badge tone="warning">{t('status.pending')}</Badge>;
  return <Badge tone="success">{t('status.completed')}</Badge>;
}

// Generate avatar initials from a driver name (up to 2 chars).
function avatarFor(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

// Cab / Transport page — assignment panel, driver cards and rides board.
export function CabPage() {
  const { t } = useTranslation();
  const { show } = useToast();

  // Rides and drivers cloned into state so local mutations persist across re-renders.
  const [rides, setRides] = useState(() => CAB_RIDES.map((r) => ({ ...r })));
  const [drivers, setDrivers] = useState(() => DRIVERS.map((d) => ({ ...d })));
  const [selectedRideId, setSelectedRideId] = useState('');
  const [activeTab, setActiveTab] = useState('assigned');

  // Pending rides available for auto-assignment.
  const pendingRides = rides.filter((r) => r.status === 'pending');

  // Keep the chosen ride valid; fall back to the first pending one.
  const effectiveRideId = pendingRides.some((r) => r.id === selectedRideId)
    ? selectedRideId
    : pendingRides[0]?.id ?? '';

  const tabs = RIDE_TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey) }));

  // Auto-assign: pick the nearest free driver and attach them to the selected pending ride.
  function handleAutoAssign() {
    const ride = pendingRides.find((r) => r.id === effectiveRideId);
    if (!ride) return;
    const nearest = drivers.filter((d) => d.available).sort((a, b) => a.distanceKm - b.distanceKm)[0];
    if (!nearest) { show(t('pages.cab.noFreeDriver'), 'danger'); return; }
    setDrivers((prev) => prev.map((d) => d.id === nearest.id ? { ...d, available: false } : d));
    setRides((prev) => prev.map((r) =>
      r.id === ride.id
        ? { ...r, driverName: nearest.name, vehicle: nearest.vehicle, driverPhone: driverPhoneFor(nearest.name) ?? '', status: 'assigned' }
        : r
    ));
    show(t('pages.cab.toastAssigned'), 'success');
  }

  // Mark an assigned ride as completed and free its driver.
  function handleComplete(ride) {
    setRides((prev) => prev.map((r) => r.id === ride.id ? { ...r, status: 'completed' } : r));
    setDrivers((prev) => prev.map((d) => d.name === ride.driverName ? { ...d, available: true } : d));
    show(t('pages.cab.toastCompleted'), 'success');
  }

  // Toggle a driver's on-duty availability switch.
  function toggleDriver(driverId) {
    setDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, available: !d.available } : d));
    show(t('pages.cab.toastDriver'), 'info');
  }

  const currentTab = RIDE_TABS.find((tab) => tab.id === activeTab);
  const visibleRides = rides.filter((r) => r.status === currentTab.status);

  return (
    <div className="stack">
      {/* Page heading */}
      <SectionHeader title={t('nav.cabTransport')} subtitle={t('pages.cab.subtitle')} />

      {/* ── Smart assignment panel ── */}
      <Card>
        <div className="cab-assign-panel">
          {/* Panel left: headline and ride selector */}
          <div className="cab-assign-info">
            <p className="cab-panel-label">🚗 Smart Auto-Assign</p>
            <h3 className="cab-panel-title">{t('pages.cab.smartTitle')}</h3>
            <p className="cab-panel-sub">{t('pages.cab.smartSubtitle')}</p>
            {pendingRides.length === 0 ? (
              <EmptyState title={t('pages.cab.noPendingRides')} />
            ) : (
              <div className="field" style={{ marginTop: 14 }}>
                <label className="field__label" htmlFor="cab-pending-ride">
                  {t('pages.cab.pendingRide')}
                </label>
                <select
                  id="cab-pending-ride"
                  className="select"
                  value={effectiveRideId}
                  onChange={(e) => setSelectedRideId(e.target.value)}
                >
                  {pendingRides.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.elderlyPerson} · {r.appointmentDate}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {/* Panel right: assign CTA */}
          <div className="cab-assign-cta">
            <button
              type="button"
              className="btn btn-primary cab-assign-btn"
              disabled={!effectiveRideId}
              onClick={handleAutoAssign}
            >
              {t('pages.cab.autoAssign')}
            </button>
            <p className="cab-assign-hint">Nearest available driver gets assigned</p>
          </div>
        </div>
      </Card>

      {/* ── Driver availability cards ── */}
      <section>
        <h3 className="section-header__title" style={{ marginBottom: 14 }}>{t('pages.cab.driversTitle')}</h3>
        <div className="grid grid--2">
          {drivers.map((driver) => (
            /* Individual driver card: avatar, details, availability badge and toggle button */
            <div key={driver.id} className="driver-card">
              <div className="driver-card__top">
                <div className="driver-avatar" style={{ background: driver.available ? '#1d5c73' : '#5f737b' }}>
                  {avatarFor(driver.name)}
                </div>
                <div className="driver-info">
                  <strong className="driver-name">{driver.name}</strong>
                  <span className="driver-vehicle">{driver.vehicle}</span>
                </div>
                <Badge tone={driver.available ? 'success' : 'neutral'}>
                  {driver.available ? t('pages.cab.driverAvailable') : t('pages.cab.driverBusy')}
                </Badge>
              </div>
              <div className="driver-card__meta">
                {/* Distance chip */}
                <span className="driver-chip">📍 {driver.distanceKm} km away</span>
                {/* Star rating chip */}
                <span className="driver-chip">⭐ {driver.rating}</span>
              </div>
              <div className="driver-card__footer">
                <button
                  type="button"
                  className={`btn btn-sm ${driver.available ? 'btn-secondary' : 'btn'}`}
                  onClick={() => toggleDriver(driver.id)}
                >
                  {driver.available ? 'Mark Off-duty' : 'Mark On-duty'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Rides board: Assigned / Pending / Completed ── */}
      <Card title={t('pages.cab.ridesTitle')}>
        <div className="stack">
          <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

          {visibleRides.length === 0 && <EmptyState title={t(currentTab.emptyKey)} />}

          <div className="grid grid--2">
            {visibleRides.map((ride) => (
              /* Ride card: route indicator, driver box, date chip and status pill */
              <div key={ride.id} className="ride-card">
                {/* Card header: patient name + status badge */}
                <div className="ride-card__header">
                  <span className="ride-patient">{ride.elderlyPerson}</span>
                  {renderStatus(ride.status, t)}
                </div>

                {/* Route indicator: pickup → destination */}
                <div className="ride-route">
                  <div className="ride-route__stop">
                    <span className="ride-route__dot ride-route__dot--pickup" />
                    <div>
                      <p className="ride-route__label">Pickup</p>
                      <p className="ride-route__place">{ride.pickup}</p>
                    </div>
                  </div>
                  <div className="ride-route__line" />
                  <div className="ride-route__stop">
                    <span className="ride-route__dot ride-route__dot--dest" />
                    <div>
                      <p className="ride-route__label">Destination</p>
                      <p className="ride-route__place">{ride.destination}</p>
                    </div>
                  </div>
                </div>

                {/* Ride meta: date chip and driver info */}
                <div className="ride-card__meta">
                  <span className="driver-chip">🗓 {ride.appointmentDate}</span>
                  {ride.status !== 'pending' && ride.driverName && (
                    <span className="driver-chip">🧑‍✈️ {ride.driverName}</span>
                  )}
                  {ride.status === 'pending' && (
                    <span className="driver-chip" style={{ color: 'var(--warn)' }}>Driver TBD</span>
                  )}
                </div>

                {/* Vehicle + phone row for assigned rides */}
                {ride.status !== 'pending' && (
                  <div className="ride-driver-box">
                    <span className="ride-driver-info">🚗 {ride.vehicle}</span>
                    {ride.driverPhone && (
                      <a className="btn btn-ghost btn-sm" href={`tel:${ride.driverPhone.replace(/\s/g, '')}`}>
                        Call driver
                      </a>
                    )}
                  </div>
                )}

                {/* Mark completed CTA for assigned rides */}
                {ride.status === 'assigned' && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleComplete(ride)}
                    >
                      {t('pages.cab.markCompleted')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
