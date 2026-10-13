import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import useLogout from '../features/auth/useLogout';
import { api } from '../services/api';
import Button from '../components/common/Button';
import usePolling from '../features/rides/usePolling';
import useFareQuote from '../features/rides/useFareQuote';
import { TripMap, Category, QuoteStatus, RideCard } from '../features/rides/TripUi';
import { isActive } from '../features/rides/format';
import '../features/rides/trips.css';
import ProfileEditor from '../features/auth/ProfileEditor';

export default function PassengerHome() {
  const { user } = useAuth();
  const logout = useLogout();
  const [tab, setTab] = useState('Book');
  const [pickup, setPickup] = useState({ lat: 15.21608, lng: 120.549433 });
  const [dropoff, setDropoff] = useState(null);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState('REGULAR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const result = usePolling(['/passenger/rides', '/terminals/current']);
  const rides = result.data?.['/passenger/rides'] || [];
  const active = rides.find(isActive);
  const quote = useFareQuote(active ? null : pickup, dropoff, category, false, rides[0]?.id || 0);
  async function book() {
    if (busy || quote.status !== 'ready') return;
    setBusy(true); setError('');
    try {
      await api('/passenger/rides', { method: 'POST', body: { quoteId: quote.quote.quoteId } });
      result.refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function cancel(id) {
    if (!window.confirm('Cancel this trip?')) return;
    setBusy(true); setError('');
    try { await api('/passenger/rides/' + id + '/cancel', { method: 'POST' }); result.refresh(); quote.retry(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const fare = active?.fare || quote.quote;
  return <div className="workspace-shell">
    <header className="workspace-header"><div><h1>TrisiKol</h1><small>Hello, {user.name} · {result.data?.['/terminals/current']?.name || 'Passenger'}</small></div><button onClick={logout}>Log out</button></header>
    <nav className="workspace-tabs" aria-label="Passenger navigation">{['Book', 'History', 'Profile'].map((name) => <button key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}>{name}</button>)}</nav>
    <main className="workspace-main">
      {(error || result.error) && <div className="workspace-alert" role="alert">{error || result.error} <button onClick={result.refresh}>Refresh</button></div>}
      {!result.data && !result.error && <p>Loading your trips…</p>}
      {tab === 'Book' && <div className="trip-layout">
        <TripMap pickup={active ? active.fare.pickup : pickup} dropoff={active ? active.fare.dropoff : dropoff}
          positions={fare?.positions} selected={active ? null : selected} onSelect={active || busy ? undefined : setSelected}
          setPickup={(point) => { setPickup(point); setSelected(null); }} setDropoff={(point) => { setDropoff(point); setSelected(null); }} />
        <section className="trip-panel">
          {active ? <><h2>Your current trip</h2><RideCard ride={active} busy={busy || !!result.error}
            actions={active.status === 'IN_PROGRESS' ? [] : ['cancel']} onAction={cancel} /><p>Status updates automatically. Pay the displayed cash fare at completion.</p></>
            : <><h2>Where are you going?</h2><p>Tap the map, then choose whether the pin is your pickup or drop-off.</p>
              <Category value={category} onChange={setCategory} disabled={busy} /><QuoteStatus result={quote} />
              <Button disabled={busy || !result.data || !!result.error || quote.status !== 'ready'} onClick={book}>{busy ? 'Sending booking…' : 'Book from terminal queue'}</Button>
              <p><small>Cash only. Drivers are assigned in terminal queue order; this demo does not select the nearest vehicle or support electronic payments.</small></p></>}
        </section>
      </div>}
      {tab === 'History' && <><h2>Your trips</h2>{rides.length === 0 && <p>No saved trips yet.</p>}{rides.map((ride) => <RideCard key={ride.id} ride={ride} />)}</>}
      {tab === 'Profile' && <><ProfileEditor /><p>Completed trips in recent history: {rides.filter((ride) => ride.status === 'COMPLETED').length} · Payment method: cash.</p></>}
    </main>
  </div>;
}
