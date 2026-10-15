import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import useLogout from '../features/auth/useLogout';
import { api } from '../services/api';
import usePolling from '../features/rides/usePolling';
import useFareQuote from '../features/rides/useFareQuote';
import { TripMap, Category, QuoteStatus, RideCard, FareBreakdown } from '../features/rides/TripUi';
import { money, statusText } from '../features/rides/format';
import ProfileEditor from '../features/auth/ProfileEditor';
import useNotifications from '../features/notifications/useNotifications';
import NotificationInbox from '../features/notifications/NotificationInbox';
import Modal from '../components/common/Modal';
import { driverActions, filterDriverTrips } from '../features/drivers/driverView';
import logo from '../assets/trisikol-logo.png';
import '../features/rides/trips.css';
import './driver.css';

const navigation = [['Terminal', 'terminal'], ['History', 'history'], ['Earnings', 'earnings'], ['Vehicle', 'vehicle']];
function DriverIcon({ name }) {
  const paths = {
    terminal: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
    history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2',
    earnings: 'M3 5h18v14H3ZM9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0M6 12h.01M18 12h.01',
    vehicle: 'M4 17H2V9h13l5 5h2v3h-3M7 17h7M6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM17 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM4 5h9v4',
    bell: 'M6 17h12l-2-3V8a4 4 0 0 0-8 0v6l-2 3M10 21h4',
    profile: 'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
  };
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
const labels = { Terminal: 'Your terminal', History: 'Ride history', Earnings: 'Cash earnings', Vehicle: 'Your vehicle', Profile: 'My profile', Notifications: 'Notifications' };
const actionLabels = { accept: 'Accept trip', decline: 'Decline offer', start: 'Start trip', cancel: 'Cancel trip', complete: 'Confirm cash & complete' };
function DriverButton({ children, secondary = false, ...props }) {
  return <button type="button" className={`driver-button ${secondary ? 'driver-button--secondary' : ''}`} {...props}>{children}</button>;
}
function Metric({ label, value }) { return <article className="driver-metric"><span>{label}</span><strong>{value}</strong></article>; }

export default function DriverTerminal() {
  const { user } = useAuth();
  const logout = useLogout();
  const notifications = useNotifications();
  const [tab, setTab] = useState('Terminal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [walkIn, setWalkIn] = useState(false);
  const [dropoff, setDropoff] = useState(null);
  const [category, setCategory] = useState('REGULAR');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const result = usePolling(['/driver/state', '/driver/rides', '/terminals/current']);
  const state = result.data?.['/driver/state'];
  const terminal = result.data?.['/terminals/current'];
  const rides = result.data?.['/driver/rides'] || [];
  const active = state?.activeRide;
  const canWalk = state?.position === 1 && state.vehicle.enabled && !active;
  const pickup = terminal ? { lat: Number(terminal.latitude), lng: Number(terminal.longitude) } : null;
  const quote = useFareQuote(walkIn && canWalk ? pickup : null, dropoff, category, true, rides[0]?.id || 0, terminal?.id || 1);
  const fare = active?.fare || quote.quote;
  const actions = driverActions(active?.status);
  const unavailable = busy || !state || !!result.error;
  const shownRides = filterDriverTrips(rides, search, status);
  const unread = notifications.inbox?.unreadCount || 0;

  function navigate(name) { setTab(name); setDialog(null); window.scrollTo(0, 0); }
  async function perform(path, body) {
    if (busy) return false;
    setBusy(true); setError('');
    try {
      await api(path, { method: 'POST', body });
      if (path.endsWith('/leave') || path.endsWith('/complete') || path === '/driver/walk-ins') { setWalkIn(false); setDropoff(null); }
      result.refresh(); return true;
    } catch (failure) { setError(failure.message); return false; }
    finally { setBusy(false); }
  }
  async function join() {
    if (unavailable) return;
    setError('');
    if (!terminal?.locationRequired) return perform('/driver/queue/join', {});
    setBusy(true);
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }));
      await api('/driver/queue/join', { method: 'POST', body: { latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() } });
      result.refresh();
    } catch (failure) { setError(failure.message || 'Unable to read your location.'); }
    finally { setBusy(false); }
  }
  function action(name) {
    if (['cancel', 'complete'].includes(name)) { setError(''); setDialog({ type: 'confirm', action: name, ride: active }); }
    else perform(`/driver/rides/${active.id}/${name}`);
  }
  async function confirmAction() {
    if (await perform(`/driver/rides/${dialog.ride.id}/${dialog.action}`)) setDialog(null);
  }
  return <div className="workspace-shell driver-shell">
    <a className="driver-skip" href="#driver-main">Skip to content</a>
    <header className="driver-header"><div className="driver-brand"><img src={logo} alt="" /><div><strong>TrisiKol <span>Driver</span></strong><small>{user.name}</small></div></div><div className="driver-header-actions"><button type="button" aria-label={`Notifications, ${unread} unread`} disabled={busy} onClick={() => navigate('Notifications')}><DriverIcon name="bell" />{unread > 0 && <span className="driver-unread">{unread > 99 ? '99+' : unread}</span>}</button><button type="button" aria-label="My profile" disabled={busy} onClick={() => navigate('Profile')}><DriverIcon name="profile" /></button></div></header>
    <main id="driver-main" className="driver-main" tabIndex={-1}>
      <div className="driver-page-heading"><div><p className="driver-eyebrow">{terminal?.name || 'TODA TERMINAL'}</p><h1>{labels[tab]}</h1></div>{state && <span className={`driver-status ${!state.vehicle.enabled ? 'driver-status--warning' : ''}`}>{!state.vehicle.enabled ? 'Suspended' : active ? 'On a trip' : state.position ? 'In queue' : 'Outside queue'}</span>}</div>
      {(error || result.error) && <div className="driver-alert" role="alert">{error || result.error}<DriverButton secondary onClick={result.refresh} disabled={busy}>Refresh state</DriverButton></div>}
      {!state && !result.error && <p role="status">Loading saved driver state…</p>}
      {tab === 'Terminal' && state && <>
        <div className="driver-terminal-layout"><section className="driver-card driver-operation-card">
          {active ? <>
            <div className="section-title"><h2>Trip #{active.id}</h2><span className="driver-status">{statusText(active.status)}</span></div>
            <p className="driver-route">{active.fare.pickupLabel} → {active.fare.dropoffLabel}</p><p className="driver-muted">{active.passenger?.name || 'Walk-in passenger'} · {active.fare.source === 'WALK_IN' ? 'Walk-in' : 'App booking'}</p>
            <div className="driver-cash-total"><span>Cash to collect</span><strong>{money(active.fare.totalFare)}</strong></div>
            {active.status === 'OFFERED' && active.offerExpiresAt && <p className="driver-muted">Offer expires at {new Date(active.offerExpiresAt).toLocaleTimeString()}. The server confirms availability when you accept.</p>}
            <div className="driver-action-grid">{actions.map((name) => <DriverButton key={name} secondary={['cancel', 'decline'].includes(name)} disabled={unavailable} onClick={() => action(name)}>{busy ? 'Updating…' : actionLabels[name]}</DriverButton>)}</div>
            <details className="driver-details"><summary>Fare details & trip information</summary><FareBreakdown fare={active.fare} /><p className="driver-muted">Created {new Date(active.createdAt).toLocaleString()}</p></details>
          </> : <>
            <p className="driver-muted">TERMINAL QUEUE</p><div className="driver-queue-number">{state.position ? `#${state.position}` : 'Ready when you are'}</div><p>{state.position === 1 ? 'You are next in line for this TODA.' : state.position ? 'Waiting in the terminal’s first-in, first-out queue.' : 'Join the queue when you are available at your assigned terminal.'}</p>
            {!state.vehicle.enabled && <p className="driver-alert">Your account is suspended. Contact your administrator before joining.</p>}
            {state.vehicle.enabled && (!state.vehicle.bodyNumber || !state.vehicle.plateNumber || !state.vehicle.vehicleModel) && <p className="driver-note">Your vehicle needs registration by the administrator before you can join.</p>}
            <div className="driver-action-grid"><DriverButton disabled={unavailable || !state.vehicle.enabled || (!state.position && (!state.vehicle.bodyNumber || !state.vehicle.plateNumber || !state.vehicle.vehicleModel))} onClick={state.position ? () => perform('/driver/queue/leave') : join}>{busy ? 'Updating…' : state.position ? 'Leave queue' : 'Join terminal queue'}</DriverButton>
              {canWalk && <DriverButton secondary disabled={unavailable} onClick={() => setWalkIn(!walkIn)}>{walkIn ? 'Close walk-in form' : 'Record a walk-in'}</DriverButton>}
            </div><p className="driver-muted">After a trip, decline, or expired offer, join again when available. Queue order and eligibility are confirmed by the server.</p>
            {terminal && !terminal.locationRequired && <p className="driver-note">Local demo mode: physical presence at the terminal is not verified.</p>}
            {walkIn && canWalk && <div className="driver-walk-in"><h3>Walk-in trip</h3><p>Tap the map to set the destination. The pickup is your terminal; no app service fee is charged.</p><Category value={category} onChange={setCategory} disabled={busy} /><QuoteStatus result={quote} /><DriverButton disabled={unavailable || quote.status !== 'ready'} onClick={() => perform('/driver/walk-ins', { quoteId: quote.quote.quoteId })}>Confirm walk-in trip</DriverButton></div>}
          </>}
        </section><section className="driver-map-card" aria-label="Terminal and trip map"><TripMap pickup={active ? active.fare.pickup : pickup} dropoff={active ? active.fare.dropoff : dropoff} positions={fare?.positions} onSelect={walkIn && canWalk && !busy ? setDropoff : undefined} /><p>{walkIn && canWalk ? 'Tap the map to choose the walk-in destination.' : active ? 'Saved route for your current trip. This is not live driver tracking.' : 'Your assigned terminal location.'}</p></section></div>
        <div className="driver-metrics"><Metric label="Cash collected · all time" value={money(state.cashCollected)} /><Metric label="Driver net · all time" value={money(state.netEarnings)} /><Metric label="Platform fees due" value={money(state.platformDue)} /></div>
      </>}
      {tab === 'History' && state && <><section className="driver-card"><h2>Recent trips</h2><p className="driver-muted">Latest 100 saved trips · {shownRides.length} shown</p><div className="driver-filters"><label>Search trips<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Trip number, passenger or location" /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option>{['OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((value) => <option key={value} value={value}>{statusText(value)}</option>)}</select></label></div></section>{!shownRides.length && <div className="driver-card driver-empty"><h2>{rides.length ? 'No matching trips' : 'No trips yet'}</h2><p>{rides.length ? 'Try another search or filter.' : 'Your assigned and completed trips will appear here.'}</p></div>}{shownRides.map((ride) => <RideCard key={ride.id} ride={ride} />)}</>}
      {tab === 'Earnings' && state && <><div className="driver-metrics"><Metric label="Cash collected · all time" value={money(state.cashCollected)} /><Metric label="Driver net · all time" value={money(state.netEarnings)} /><Metric label="Platform fees due" value={money(state.platformDue)} /></div><p className="driver-note">Cash collected equals driver net plus platform fees due. This is a cash ledger, not an e-wallet or recorded remittance. Walk-ins have no app service fee.</p><section className="driver-card"><h2>Recent cash entries</h2><p className="driver-muted">Latest 50 entries · totals above cover all completed cash trips.</p>{!state.ledger.length && <p>No completed cash trips yet.</p>}{state.ledger.map((entry) => <article className="driver-ledger-entry" key={entry.rideId}><div className="section-title"><strong>Trip #{entry.rideId}</strong><span>{new Date(entry.recordedAt).toLocaleString()}</span></div><dl><div><dt>Cash</dt><dd>{money(entry.cashCollected)}</dd></div><div><dt>Driver net</dt><dd>{money(entry.driverNet)}</dd></div><div><dt>Fees due</dt><dd>{money(entry.platformDue)}</dd></div></dl></article>)}</section></>}
      {tab === 'Vehicle' && state && <section className="driver-card"><h2>Registered vehicle</h2><span className="driver-status">{state.vehicle.enabled ? 'Enabled' : 'Suspended'}</span><dl className="driver-vehicle-details">{[['Assigned TODA', terminal?.name], ['Body number', state.vehicle.bodyNumber], ['Plate number', state.vehicle.plateNumber], ['Vehicle model', state.vehicle.vehicleModel]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not registered'}</dd></div>)}</dl><p className="driver-note">Contact your administrator to update vehicle details, TODA assignment, or eligibility.</p></section>}
      {tab === 'Profile' && <ProfileEditor />}
      {tab === 'Notifications' && <NotificationInbox result={notifications} />}
    </main>
    <nav className="driver-navigation" aria-label="Driver navigation">{navigation.map(([name, icon]) => <button type="button" key={name} aria-current={tab === name ? 'page' : undefined} disabled={busy} onClick={() => navigate(name)}><DriverIcon name={icon} /><span>{name === 'History' ? 'Trips' : name}</span></button>)}<button type="button" aria-haspopup="dialog" aria-expanded={dialog?.type === 'more'} aria-current={['Profile', 'Notifications'].includes(tab) ? 'page' : undefined} disabled={busy} onClick={() => setDialog({ type: 'more' })}><DriverIcon name="more" /><span>More</span></button></nav>
    {dialog && <Modal title={dialog.type === 'more' ? 'Driver menu' : dialog.action === 'complete' ? 'Confirm cash received' : 'Cancel this trip?'} busy={busy} onClose={() => setDialog(null)}>
      {dialog.type === 'more' ? <div className="driver-more-menu"><p>{user.name}<br /><small>{terminal?.name}</small></p><DriverButton secondary onClick={() => navigate('Profile')}>My profile</DriverButton><DriverButton secondary onClick={() => navigate('Notifications')}>Notifications ({unread} unread)</DriverButton><DriverButton secondary onClick={logout}>Log out</DriverButton></div>
        : <><p>Trip #{dialog.ride.id} · {dialog.ride.fare.pickupLabel} → {dialog.ride.fare.dropoffLabel}</p>{dialog.action === 'complete' ? <><p className="driver-confirm-amount">{money(dialog.ride.fare.totalFare)}</p><p>Confirm only after the trip is finished and you have received this cash fare. This records cash received; it does not transfer money.</p></> : <p>This cancels your accepted trip. It does not automatically place you back in the terminal queue.</p>}{error && <p role="alert">{error}</p>}<div className="app-modal-actions"><button type="button" disabled={busy} onClick={() => setDialog(null)}>Go back</button><button type="button" className="primary" disabled={busy || !!result.error || active?.id !== dialog.ride.id || active?.status !== dialog.ride.status} onClick={confirmAction}>{busy ? 'Saving…' : dialog.action === 'complete' ? 'Cash received — complete trip' : 'Confirm cancellation'}</button></div></>}
    </Modal>}
  </div>;
}
