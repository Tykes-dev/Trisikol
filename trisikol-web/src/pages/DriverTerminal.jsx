import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import useLogout from '../features/auth/useLogout';
import { api } from '../services/api';
import Button from '../components/common/Button';
import usePolling from '../features/rides/usePolling';
import useFareQuote from '../features/rides/useFareQuote';
import { TripMap, Category, QuoteStatus, RideCard } from '../features/rides/TripUi';
import { money } from '../features/rides/format';
import '../features/rides/trips.css';
import ProfileEditor from '../features/auth/ProfileEditor';

export default function DriverTerminal() {
  const { user } = useAuth(); const logout = useLogout();
  const [tab, setTab] = useState('Terminal');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [walkIn, setWalkIn] = useState(false); const [dropoff, setDropoff] = useState(null);
  const [category, setCategory] = useState('REGULAR');
  const result = usePolling(['/driver/state', '/driver/rides', '/terminals/current']);
  const state = result.data?.['/driver/state']; const terminal = result.data?.['/terminals/current'];
  const pickup = terminal ? { lat: Number(terminal.latitude), lng: Number(terminal.longitude) } : null;
  const quote = useFareQuote(walkIn && !state?.activeRide ? pickup : null, dropoff, category, true,
    result.data?.['/driver/rides']?.[0]?.id || 0);
  async function perform(path, body) {
    if (busy) return;
    setBusy(true); setError('');
    try { await api(path, { method: 'POST', body }); result.refresh(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function join() {
    setError('');
    if (!terminal?.locationRequired) return perform('/driver/queue/join', {});
    setBusy(true);
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }));
      await api('/driver/queue/join', { method: 'POST', body: {
        latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString(),
      } }); result.refresh();
    } catch (failure) { setError(failure.message || 'Unable to read your location.'); }
    finally { setBusy(false); }
  }
  function action(id, action) {
    if (['cancel', 'complete'].includes(action) && !window.confirm(action === 'complete'
      ? 'Confirm you received the displayed cash fare and completed the trip?' : 'Cancel this trip?')) return;
    return perform('/driver/rides/' + id + '/' + action);
  }
  const active = state?.activeRide; const fare = active?.fare || quote.quote;
  const actions = !active ? [] : active.status === 'OFFERED' ? ['accept', 'decline']
    : active.status === 'ACCEPTED' ? ['start', 'cancel'] : ['complete'];
  return <div className="workspace-shell">
    <header className="workspace-header"><div><h1>TrisiKol Driver</h1><small>{user.name} · {terminal?.name || 'Terminal'}</small></div><button onClick={logout}>Log out</button></header>
    <nav className="workspace-tabs" aria-label="Driver navigation">{['Terminal', 'History', 'Earnings', 'Vehicle', 'Profile'].map((name) => <button key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}>{name}</button>)}</nav>
    <main className="workspace-main">
      {(error || result.error) && <div className="workspace-alert" role="alert">{error || result.error} <button onClick={result.refresh}>Refresh</button></div>}
      {!state && !result.error && <p>Loading driver state…</p>}
      {tab === 'Terminal' && <div className="trip-layout">
        <TripMap pickup={active ? active.fare.pickup : pickup} dropoff={active ? active.fare.dropoff : dropoff} positions={fare?.positions}
          onSelect={walkIn && !busy && !active ? setDropoff : undefined} />
        <section className="trip-panel">
          {active ? <><h2>Your assigned trip</h2><RideCard ride={active} actions={actions} busy={busy || !!result.error} onAction={action} /></>
            : <><h2>{state?.position ? 'Queue position #' + state.position : 'You are outside the queue'}</h2>
              <p>FIFO dispatch. After a trip, decline, or expired offer, join again when available.</p>
              {terminal && !terminal.locationRequired && <p><small>Local demo mode: joining does not verify physical presence at the terminal.</small></p>}
              <Button disabled={busy || !state || !!result.error} onClick={state?.position ? () => perform('/driver/queue/leave') : join}>{state?.position ? 'Leave queue' : 'Join terminal queue'}</Button>
              {state?.position === 1 && <Button disabled={busy || !!result.error} onClick={() => setWalkIn(!walkIn)}>{walkIn ? 'Close walk-in form' : 'Record a walk-in'}</Button>}
              {walkIn && state?.position === 1 && <><p>Tap the map for the walk-in drop-off. No app service fee is charged.</p><Category value={category} onChange={setCategory} disabled={busy} /><QuoteStatus result={quote} />
                <Button disabled={busy || !!result.error || quote.status !== 'ready'} onClick={() => perform('/driver/walk-ins', { quoteId: quote.quote.quoteId })}>Confirm walk-in trip</Button></>}
            </>}
        </section>
      </div>}
      {tab === 'History' && <><h2>Your trips</h2>{result.data?.['/driver/rides']?.length === 0 && <p>No saved trips yet.</p>}{result.data?.['/driver/rides']?.map((ride) => <RideCard key={ride.id} ride={ride} />)}</>}
      {tab === 'Earnings' && state && <><div className="workspace-grid">{[['Cash collected', state.cashCollected], ['Net earnings', state.netEarnings], ['Platform fees due', state.platformDue]].map(([label, value]) => <section className="workspace-card" key={label}><small>{label}</small><strong className="metric">{money(value)}</strong></section>)}</div>
        <p>App passengers pay matrix fare plus the app fee. Your net is the matrix fare; the fee is recorded as payable to the platform. This is a cash ledger, not a prepaid wallet or a recorded settlement.</p>
        {state.ledger.map((entry) => <section className="workspace-card" key={entry.rideId}>Trip #{entry.rideId} · {new Date(entry.recordedAt).toLocaleString()}<p>Cash {money(entry.cashCollected)} · Net {money(entry.driverNet)} · Platform due {money(entry.platformDue)}</p></section>)}</>}
      {tab === 'Vehicle' && state && <section className="workspace-card"><h2>Your vehicle</h2><p>{state.vehicle.enabled ? 'Enabled' : 'Suspended'}</p><p>Body: {state.vehicle.bodyNumber || 'Not registered'}</p><p>Plate: {state.vehicle.plateNumber || 'Not registered'}</p><p>Model: {state.vehicle.vehicleModel || 'Not registered'}</p><small>Contact your administrator to update these details.</small></section>}
      {tab === 'Profile' && <ProfileEditor />}
    </main>
  </div>;
}
