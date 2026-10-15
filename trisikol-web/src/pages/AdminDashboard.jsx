import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import useLogout from '../features/auth/useLogout';
import CreateDriverAccount from '../features/admin/CreateDriverAccount';
import { FareEditor, TerminalEditor, VehicleEditor } from '../features/admin/AdminForms';
import { AdminButton, AdminDialog, AdminEmpty, AdminIcon, AdminMetric } from '../features/admin/AdminUi';
import { filterDrivers, filterRides, terminalName } from '../features/admin/adminView';
import usePolling from '../features/rides/usePolling';
import { api } from '../services/api';
import { RideCard } from '../features/rides/TripUi';
import { money, statusText } from '../features/rides/format';
import ProfileEditor from '../features/auth/ProfileEditor';
import useNotifications from '../features/notifications/useNotifications';
import NotificationInbox from '../features/notifications/NotificationInbox';
import logo from '../assets/trisikol-logo.png';
import '../features/rides/trips.css';
import './admin.css';

const pages = [
  { id: 'Drivers', label: 'Driver roster', short: 'Roster', icon: 'drivers', description: 'Manage driver accounts, vehicles, and queue eligibility.' },
  { id: 'Queue', label: 'Live queue', short: 'Queue', icon: 'queue', description: 'See the waiting order at the selected TODA.' },
  { id: 'Trips', label: 'Ride logs', short: 'Logs', icon: 'trips', description: 'Review the latest 100 trips across all TODAs.' },
  { id: 'Settings', label: 'TODA settings', short: 'Settings', icon: 'settings', description: 'Manage terminal details and traceable fare revisions.' },
  { id: 'Overview', label: 'Overview', icon: 'overview', description: 'Saved operational totals across all TODAs.' },
  { id: 'Notifications', label: 'Notifications', icon: 'bell', description: 'Your saved in-app updates and alerts.' },
  { id: 'Profile', label: 'My profile', icon: 'profile', description: 'Manage your administrator profile.' },
];
const date = (value) => new Date(value).toLocaleString();
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
function Eligibility({ enabled }) {
  return <span className={`admin-badge ${enabled ? 'admin-badge--success' : 'admin-badge--danger'}`}>{enabled ? 'Enabled' : 'Suspended'}</span>;
}
function TripStatus({ status }) {
  return <span className={`admin-badge ${status === 'COMPLETED' ? 'admin-badge--success' : status === 'CANCELLED' ? 'admin-badge--danger' : 'admin-badge--warning'}`}>{statusText(status)}</span>;
}
function SearchFilter({ search, setSearch, status, setStatus, kind }) {
  return <div className="admin-filters"><label className="admin-search"><AdminIcon name="search" /><span className="admin-sr-only">Search {kind}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={kind === 'drivers' ? 'Search name, phone, body, plate or TODA' : 'Search trip, person, location or TODA'} /></label>
    <label className="admin-filter"><span className="admin-sr-only">{kind === 'drivers' ? 'Driver eligibility' : 'Trip status'}</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{kind === 'drivers' ? 'All drivers' : 'All statuses'}</option>{kind === 'drivers' ? <><option value="enabled">Enabled</option><option value="suspended">Suspended</option></> : <><option value="active">Active</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></>}</select></label>
  </div>;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const logout = useLogout();
  const notifications = useNotifications();
  const [tab, setTab] = useState('Drivers');
  const [settingsTab, setSettingsTab] = useState('Fare matrix');
  const [dialog, setDialog] = useState(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState('');
  const [terminalId, setTerminalId] = useState(1);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatus, setDriverStatus] = useState('all');
  const [rideSearch, setRideSearch] = useState('');
  const [rideStatus, setRideStatus] = useState('all');
  const queuePath = `/admin/queue?terminalId=${terminalId}`;
  const farePath = `/fares/current?terminalId=${terminalId}`;
  const historyPath = `/admin/fare-policies?terminalId=${terminalId}`;
  const result = usePolling(['/admin/summary', '/admin/drivers', queuePath, '/admin/rides', farePath, historyPath, '/terminals'], 6000);
  const summary = result.data?.['/admin/summary'];
  const drivers = result.data?.['/admin/drivers'] || [];
  const rides = result.data?.['/admin/rides'] || [];
  const terminals = result.data?.['/terminals'] || [];
  const queue = result.data?.[queuePath] || [];
  const terminal = terminals.find((item) => item.id === terminalId);
  const page = pages.find((item) => item.id === tab);
  const unread = notifications.inbox?.unreadCount || 0;
  const shownDrivers = filterDrivers(drivers, terminals, driverSearch, driverStatus);
  const shownRides = filterRides(rides, rideSearch, rideStatus);
  const canWrite = !!result.data && !result.error && !mutationBusy;
  const moreActive = pages.slice(4).some((item) => item.id === tab);

  function navigate(id) { setTab(id); setDialog(null); setNotice(''); window.scrollTo(0, 0); }
  function saved(message) { setNotice(message); result.refresh(); }
  async function showTrip(ride) {
    setDetail({ ride, events: null, error: '' }); setDialog({ type: 'trip' });
    try {
      const events = await api(`/admin/rides/${ride.id}/events`);
      setDetail((current) => current?.ride.id === ride.id ? { ...current, events } : current);
    } catch (failure) {
      setDetail((current) => current?.ride.id === ride.id ? { ...current, error: failure.message } : current);
    }
  }
  function navItem(item, compact = false) {
    return <button type="button" key={item.id} aria-current={tab === item.id ? 'page' : undefined} disabled={mutationBusy} onClick={() => navigate(item.id)}><AdminIcon name={item.icon} /><span>{compact ? item.short : item.label}</span>{item.id === 'Notifications' && unread > 0 && <span className="admin-nav-count">{unread > 99 ? '99+' : unread}<span className="admin-sr-only"> unread</span></span>}</button>;
  }
  function editButton(driver) {
    return <AdminButton icon="edit" variant="secondary" disabled={!canWrite} onClick={() => setDialog({ type: 'vehicle', driver })} aria-label={`Edit vehicle and eligibility for ${driver.account.name}`}>Edit vehicle</AdminButton>;
  }

  return <div className="workspace-shell admin-shell">
    <a className="admin-skip" href="#admin-main">Skip to content</a>
    <aside className="admin-sidebar">
      <div className="admin-brand"><img src={logo} alt="" /><strong>TrisiKol Admin</strong><span>TODA management portal</span></div>
      <nav aria-label="Administrator navigation" className="admin-side-nav">{pages.map((item) => navItem(item))}</nav>
      <div className="admin-sidebar-footer"><div className="admin-account"><span className="admin-avatar">{initials(user.name)}</span><div><strong>{user.name}</strong><small>Administrator</small></div></div><button type="button" disabled={mutationBusy} onClick={logout}><AdminIcon name="logout" />Log out</button></div>
    </aside>
    <header className="admin-mobile-header"><div><img src={logo} alt="" /><strong>TrisiKol <span>Admin</span></strong></div><div><button className="admin-icon-button" aria-label={`Notifications, ${unread} unread`} onClick={() => navigate('Notifications')} disabled={mutationBusy}><AdminIcon name="bell" />{unread > 0 && <span className="admin-dot" />}</button><button className="admin-icon-button" aria-label="My profile" onClick={() => navigate('Profile')} disabled={mutationBusy}><AdminIcon name="profile" /></button></div></header>
    <main id="admin-main" className="admin-main" tabIndex={-1}>
      <header className="admin-page-heading"><div><p className="admin-eyebrow">TODA MANAGEMENT</p><h1>{page.label}</h1><p>{page.description}</p></div><span className="admin-live-label"><span />Updates every 6s</span></header>
      {['Queue', 'Settings'].includes(tab) && <section className="admin-scope" aria-label="TODA selection"><label htmlFor="admin-terminal"><AdminIcon name="location" /><span>Selected TODA</span></label><select id="admin-terminal" value={terminalId} disabled={mutationBusy || !terminals.length} onChange={(event) => { setTerminalId(Number(event.target.value)); setNotice(''); }}>
        {!terminals.length && <option value={terminalId}>Loading TODAs…</option>}{terminals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select><p>Queue and settings apply to this TODA. Roster, ride logs and overview cover all TODAs.</p></section>}
      {result.error && <div className="admin-notice admin-notice--error" role="alert">{result.error} <AdminButton variant="secondary" onClick={result.refresh}>Refresh records</AdminButton></div>}
      {notice && <div className="admin-notice admin-notice--success" role="status">{notice}</div>}
      {!result.data && !result.error && <p role="status">Loading saved records…</p>}

      {tab === 'Drivers' && result.data && <>
        <div className="admin-stats admin-stats--compact"><AdminMetric label="Total drivers" value={drivers.length} icon="drivers" /><AdminMetric label="Enabled" value={drivers.filter((driver) => driver.vehicle.enabled).length} icon="check" /><AdminMetric label="Suspended" value={drivers.filter((driver) => !driver.vehicle.enabled).length} icon="profile" /></div>
        <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Driver roster</h2><p>All TODAs · {shownDrivers.length} of {drivers.length} drivers</p></div><AdminButton variant="green" icon="plus" disabled={!canWrite} onClick={() => setDialog({ type: 'createDriver' })}>Add driver</AdminButton></div>
          <SearchFilter kind="drivers" search={driverSearch} setSearch={setDriverSearch} status={driverStatus} setStatus={setDriverStatus} />
          {shownDrivers.length === 0 ? <AdminEmpty title={drivers.length ? 'No matching drivers' : 'No drivers yet'}>{drivers.length ? 'Try another search or eligibility filter.' : 'Add a driver account, then register their vehicle to enable queue access.'}</AdminEmpty> : <>
            <div className="admin-table-view"><table className="admin-table"><caption className="admin-sr-only">Driver roster across all TODAs</caption><thead><tr><th>Body no.</th><th>Driver / TODA</th><th>Mobile</th><th>Plate</th><th>Eligibility</th><th>Actions</th></tr></thead><tbody>{shownDrivers.map((driver) => <tr key={driver.account.id}><td><strong>{driver.vehicle.bodyNumber || 'Not set'}</strong></td><td><strong>{driver.account.name}</strong><small>{terminalName(terminals, driver.vehicle.terminalId)}</small></td><td>{driver.account.mobile}</td><td>{driver.vehicle.plateNumber || 'Not set'}</td><td><Eligibility enabled={driver.vehicle.enabled} /></td><td>{editButton(driver)}</td></tr>)}</tbody></table></div>
            <div className="admin-card-view">{shownDrivers.map((driver) => <article className="admin-driver-card" key={driver.account.id}><div className="admin-driver-heading"><span className="admin-avatar">{initials(driver.account.name)}</span><div><h3>{driver.account.name}</h3><p>{driver.account.mobile}</p></div><Eligibility enabled={driver.vehicle.enabled} /></div><dl className="admin-driver-details"><div><dt>Body no.</dt><dd>{driver.vehicle.bodyNumber || 'Not registered'}</dd></div><div><dt>Plate</dt><dd>{driver.vehicle.plateNumber || 'Not registered'}</dd></div><div className="admin-detail-wide"><dt>TODA</dt><dd>{terminalName(terminals, driver.vehicle.terminalId)}</dd></div></dl><p className="admin-muted">{driver.vehicle.vehicleModel || 'Register a vehicle before this driver joins the queue.'}</p>{editButton(driver)}</article>)}</div>
          </>}
        </section>
      </>}

      {tab === 'Queue' && result.data && <>
        <div className="admin-stats admin-stats--two"><AdminMetric label="Drivers waiting" value={queue.length} icon="queue" /><AdminMetric label="Next body number" value={queue[0]?.bodyNumber || '—'} icon="drivers" /></div>
        <p className="admin-notice">Queue order is managed automatically as drivers join and trips are dispatched. This view is read-only.</p>
        <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Live terminal queue</h2><p>{terminal?.name}</p></div><span className="admin-badge">First in, first out</span></div>
          {!queue.length ? <AdminEmpty title="No drivers waiting">Drivers who join this TODA’s queue will appear here.</AdminEmpty> : <ol className="admin-queue">{queue.map((entry) => <li key={entry.driverId}><span className="admin-position">{entry.position}</span><div><h3>{entry.name}</h3><p>Body {entry.bodyNumber} · Joined {date(entry.joinedAt)}</p></div><span className="admin-badge admin-badge--success">{entry.position === 1 ? 'Next in line' : 'Waiting'}</span></li>)}</ol>}
        </section>
      </>}

      {tab === 'Trips' && result.data && <>
        <div className="admin-stats admin-stats--compact"><AdminMetric label="Recent trips" value={rides.length} icon="trips" /><AdminMetric label="Completed in this list" value={rides.filter((ride) => ride.status === 'COMPLETED').length} icon="check" /><AdminMetric label="Cancelled in this list" value={rides.filter((ride) => ride.status === 'CANCELLED').length} icon="close" /></div>
        <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Master ride logs</h2><p>Latest 100 across all TODAs · {shownRides.length} shown</p></div></div>
          <SearchFilter kind="trips" search={rideSearch} setSearch={setRideSearch} status={rideStatus} setStatus={setRideStatus} />
          {!shownRides.length ? <AdminEmpty title={rides.length ? 'No matching trips' : 'No trips yet'}>{rides.length ? 'Try another search or status filter.' : 'App bookings and walk-in trips will appear here.'}</AdminEmpty> : <>
            <div className="admin-table-view"><table className="admin-table"><caption className="admin-sr-only">Latest 100 trips across all TODAs</caption><thead><tr><th>Trip / date</th><th>Route / TODA</th><th>Driver</th><th>Cash fare</th><th>Status</th><th>Actions</th></tr></thead><tbody>{shownRides.map((ride) => <tr key={ride.id}><td><strong>#{ride.id}</strong><small>{date(ride.createdAt)}</small></td><td><strong>{ride.fare.pickupLabel} → {ride.fare.dropoffLabel}</strong><small>{ride.fare.terminalName} · {ride.fare.source === 'WALK_IN' ? 'Walk-in' : 'App booking'}</small></td><td>{ride.driver?.name || 'Unassigned'}</td><td>{money(ride.fare.totalFare)}</td><td><TripStatus status={ride.status} /></td><td><AdminButton variant="secondary" onClick={() => showTrip(ride)} aria-label={`View trip ${ride.id} details and history`}>Details</AdminButton></td></tr>)}</tbody></table></div>
            <div className="admin-card-view">{shownRides.map((ride) => <article className="admin-trip-card" key={ride.id}><div className="admin-panel-heading"><strong>Trip #{ride.id}</strong><TripStatus status={ride.status} /></div><h3>{ride.fare.pickupLabel} <span aria-label="to">→</span> {ride.fare.dropoffLabel}</h3><p className="admin-muted">{ride.fare.terminalName} · {ride.fare.source === 'WALK_IN' ? 'Walk-in' : 'App booking'}<br />{date(ride.createdAt)}</p><p>Driver: {ride.driver?.name || 'Unassigned'}</p><div className="admin-trip-footer"><strong>{money(ride.fare.totalFare)}</strong><AdminButton variant="secondary" onClick={() => showTrip(ride)} aria-label={`View trip ${ride.id} details and history`}>Details & history</AdminButton></div></article>)}</div>
          </>}
        </section>
      </>}

      {tab === 'Settings' && result.data?.[farePath] && terminal && <>
        <nav className="admin-settings-nav" aria-label="TODA settings sections">{['Fare matrix', 'Terminals', 'Revisions'].map((name) => <button type="button" key={name} aria-current={settingsTab === name ? 'page' : undefined} disabled={mutationBusy} onClick={() => setSettingsTab(name)}>{name}</button>)}</nav>
        <fieldset className="admin-form-fieldset" disabled={!canWrite}>
          {settingsTab === 'Fare matrix' && <FareEditor key={result.data[farePath].policyId} current={result.data[farePath]} onBusyChange={setMutationBusy} onSaved={() => saved('Fare revision saved. Previous revisions and existing trip prices are retained.')} />}
          {settingsTab === 'Terminals' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Terminal details</h2><p>{terminal.name}</p></div><AdminButton variant="secondary" icon="plus" disabled={!canWrite} onClick={() => setDialog({ type: 'terminal' })}>Add TODA</AdminButton></div><TerminalEditor key={JSON.stringify(terminal)} current={terminal} onBusyChange={setMutationBusy} onSaved={() => saved('Terminal details saved.')} /></section>}
        </fieldset>
        {settingsTab === 'Revisions' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Fare revision history</h2><p>{terminal.name} · Latest 50 revisions</p></div></div>{result.data[historyPath]?.map((policy) => <article className="admin-revision" key={policy.id}><div className="admin-panel-heading"><h3>Revision #{policy.id}</h3><span className="admin-badge">{policy.id === result.data[farePath].policyId ? 'Current' : 'Previous'}</span></div><p className="admin-muted">{date(policy.createdAt)} · {policy.createdBy}</p><dl className="admin-revision-values"><div><dt>Base fare</dt><dd>{money(policy.baseFare)} / {policy.baseDistanceKm} km</dd></div><div><dt>Additional / started km</dt><dd>{money(policy.extraFarePerKm)}</dd></div><div><dt>App fee / started km</dt><dd>{money(policy.appServiceFeePerKm)}</dd></div></dl><p>{policy.changeReason}</p></article>)}</section>}
      </>}

      {tab === 'Overview' && summary && <><div className="admin-stats">
        {[['Trips', summary.rides, 'trips'], ['Completed', summary.completed, 'check'], ['Queued drivers', summary.queuedDrivers, 'queue'], ['Cash collected', money(summary.cashCollected), 'cash'], ['Driver net earnings', money(summary.driverNet), 'drivers'], ['Platform fees due', money(summary.platformDue), 'cash']].map(([label, value, icon]) => <AdminMetric key={label} label={label} value={value} icon={icon} />)}
      </div><p className="admin-notice">Cash amounts come from completed trips. Platform fees are recorded as due, not remitted. Electronic payments and settlement are not connected.</p></>}
      {tab === 'Profile' && <div className="admin-profile"><ProfileEditor /></div>}
      {tab === 'Notifications' && <div className="admin-panel admin-notifications"><NotificationInbox result={notifications} /></div>}
    </main>
    <nav className="admin-bottom-nav" aria-label="Mobile administrator navigation">{pages.slice(0, 4).map((item) => navItem(item, true))}<button type="button" aria-haspopup="dialog" aria-expanded={dialog?.type === 'more'} aria-current={moreActive ? 'page' : undefined} onClick={() => setDialog({ type: 'more' })} disabled={mutationBusy}><AdminIcon name="more" /><span>More</span></button></nav>

    {dialog && <AdminDialog title={dialog.type === 'more' ? 'More options' : dialog.type === 'createDriver' ? 'Add driver' : dialog.type === 'vehicle' ? 'Edit vehicle & eligibility' : dialog.type === 'terminal' ? 'Add TODA / terminal' : `Trip #${detail?.ride.id} details`} busy={mutationBusy} onClose={() => setDialog(null)}>
      {dialog.type === 'more' && <><div className="admin-account admin-more-account"><span className="admin-avatar">{initials(user.name)}</span><div><strong>{user.name}</strong><small>Administrator</small></div></div><nav className="admin-more-nav" aria-label="More administrator options">{pages.slice(4).map((item) => navItem(item))}<button type="button" onClick={logout}><AdminIcon name="logout" /><span>Log out</span></button></nav></>}
      {dialog.type === 'createDriver' && <CreateDriverAccount onBusyChange={setMutationBusy} onCreated={(driver) => { setDialog(null); saved(`Account created for ${driver.name}. Register their vehicle before queue access.`); }} />}
      {dialog.type === 'vehicle' && <VehicleEditor driver={dialog.driver} terminals={terminals} onBusyChange={setMutationBusy} onSaved={() => { setDialog(null); saved('Driver vehicle and eligibility saved.'); }} />}
      {dialog.type === 'terminal' && <TerminalEditor creating current={{ name: '', latitude: terminal.latitude, longitude: terminal.longitude }} onBusyChange={setMutationBusy} onSaved={(created) => { setTerminalId(created.id); setDialog(null); saved('TODA created. Review its placeholder fare policy before use.'); }} />}
      {dialog.type === 'trip' && detail && <><RideCard ride={detail.ride} /><section className="admin-audit"><h3>Trip event history</h3>{detail.error && <p role="alert">{detail.error}<AdminButton variant="secondary" onClick={() => showTrip(detail.ride)}>Retry history</AdminButton></p>}{!detail.events && !detail.error && <p role="status">Loading trip events…</p>}{detail.events && !detail.events.length && <p>No saved events.</p>}{detail.events?.map((event) => <article key={event.id}><strong>{statusText(event.status)}</strong><p>{event.actor} · {date(event.occurredAt)}</p></article>)}</section></>}
    </AdminDialog>}
  </div>;
}
