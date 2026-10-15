import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimation, useDragControls, useReducedMotion } from 'framer-motion';
import { useAuth } from '../features/auth/AuthContext';
import useLogout from '../features/auth/useLogout';
import { api } from '../services/api';
import Button from '../components/common/Button';
import usePolling from '../features/rides/usePolling';
import useFareQuote from '../features/rides/useFareQuote';
import { TripMap, Category, QuoteStatus, RideCard } from '../features/rides/TripUi';
import { isActive, money } from '../features/rides/format';
import '../features/rides/trips.css';
import './passenger.css';
import ProfileEditor from '../features/auth/ProfileEditor';
import useNotifications from '../features/notifications/useNotifications';
import NotificationInbox from '../features/notifications/NotificationInbox';
import TerminalSuggestions from '../features/rides/TerminalSuggestions.jsx';

function Icon({ name }) {
  const paths = {
    'menu-2': 'M4 6h16M4 12h16M4 18h16',
    user: 'M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2',
    x: 'M6 6l12 12M6 18L18 6',
    'arrow-left': 'M20 12H4M10 6l-6 6l6 6',
    'map-pin': 'M12 22s8-7 8-13a8 8 0 1 0-16 0c0 6 8 13 8 13M9 9a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    flag: 'M5 22V3M5 4c5-4 9 4 15 0v11c-6 4-10-4-15 0',
    'hand-click': 'M9 13V5a2 2 0 0 1 4 0v7l3-1l4 3v5l-3 3h-6l-6-7a2 2 0 0 1 3-2l1 1M3 5l2 1M6 1l1 2M18 3l-2 2',
    history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2',
    wallet: 'M20 7V4H6a3 3 0 0 0 0 6h15v11H6a3 3 0 0 1-3-3V7M21 13h-5v5h5M18 15h.01',
    cash: 'M3 5h18v14H3zM9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0M6 12h.01M18 12h.01',
    logout: 'M9 3H4v18h5M10 12h11M17 8l4 4l-4 4',
    bell: 'M6 17h12l-2-3V8a4 4 0 0 0-8 0v6l-2 3M10 21h4',
  };
  return <i className="passenger-icon" aria-hidden="true"><svg width="1em" height="1em" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg></i>;
}

function PassengerOverlay({ title, onClose, drawer = false, children }) {
  const panel = useRef(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const previous = document.activeElement;
    const element = panel.current;
    element.querySelector('button')?.focus();
    function keyboard(event) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const items = [...element.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]')];
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    element.addEventListener('keydown', keyboard);
    return () => { element.removeEventListener('keydown', keyboard); if (previous?.isConnected) previous.focus(); };
  }, [onClose]);
  return <>
    {drawer && <motion.button className="passenger-scrim" aria-label="Close menu" tabIndex={-1}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />}
    <motion.section ref={panel} role="dialog" aria-modal="true" aria-label={title}
      className={drawer ? 'passenger-drawer' : 'passenger-page'}
      initial={{ x: reducedMotion ? 0 : drawer ? '-100%' : '100%' }} animate={{ x: 0 }}
      exit={{ x: reducedMotion ? 0 : drawer ? '-100%' : '100%' }} transition={{ duration: reducedMotion ? 0 : .25 }}>
      <header className="passenger-page-header"><button className="passenger-icon-button" onClick={onClose}
        aria-label={drawer ? 'Close menu' : 'Back to map'}><Icon name={drawer ? 'x' : 'arrow-left'} /></button><h2>{title}</h2></header>
      <div className="passenger-page-content">{children}</div>
    </motion.section>
  </>;
}

function BookingSheet({ title, subtitle, expanded, setExpanded, onInset, children }) {
  const panel = useRef(null);
  const controls = useAnimation();
  const dragControls = useDragControls();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const element = panel.current;
    function resize() {
      const height = element.offsetHeight;
      onInset(expanded ? height : 104);
      controls.start({ y: expanded ? 0 : Math.max(0, height - 104),
        transition: reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 38 } });
    }
    const observer = new ResizeObserver(resize);
    observer.observe(element); resize();
    return () => observer.disconnect();
  }, [controls, expanded, onInset, reducedMotion]);
  return <motion.section ref={panel} className="passenger-sheet" aria-label="Trip booking"
    animate={controls} drag="y" dragListener={false} dragControls={dragControls}
    dragConstraints={{ top: 0, bottom: 0 }} dragElastic={.08}
    onDragEnd={(_, info) => {
      const next = info.offset.y > 40 ? false : info.offset.y < -40 ? true : expanded;
      setExpanded(next);
      controls.start({ y: next ? 0 : Math.max(0, panel.current.offsetHeight - 104) });
    }}>
    <button className="passenger-sheet-handle" aria-label={expanded ? 'Collapse booking sheet' : 'Expand booking sheet'}
      aria-expanded={expanded} aria-controls="passenger-booking-content"
      onPointerDown={(event) => dragControls.start(event)} onClick={() => setExpanded(!expanded)}><span /></button>
    <div className="passenger-sheet-heading"><h2>{title}</h2><p>{subtitle}</p></div>
    <div id="passenger-booking-content" className="passenger-sheet-content" inert={!expanded}>{children}</div>
  </motion.section>;
}

export default function PassengerHome() {
  const { user } = useAuth();
  const logout = useLogout();
  const notifications = useNotifications();
  const [tab, setTab] = useState('Book');
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [bottomInset, setBottomInset] = useState(0);
  const closePage = useCallback(() => setTab('Book'), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [pickup, setPickup] = useState({ lat: 15.21608, lng: 120.549433 });
  const [dropoff, setDropoff] = useState(null);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState('REGULAR');
  const [terminalId, setTerminalId] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const result = usePolling(['/passenger/rides', '/terminals']);
  const terminals = result.data?.['/terminals'] || [];
  const terminal = terminals.find((item) => item.id === terminalId);
  const rides = result.data?.['/passenger/rides'] || [];
  const active = rides.find(isActive);
  const quote = useFareQuote(active ? null : pickup, dropoff, category, false, rides[0]?.id || 0, terminalId);
  function changeTerminal(id) {
    const next = terminals.find((item) => item.id === Number(id));
    if (!next) return;
    // A TODA owns the queue and fare policy; it is not the passenger's pickup location.
    // useFareQuote invalidates the previous quote when terminalId changes.
    setTerminalId(next.id); setSelected(null); setError('');
  }
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
  function openPage(name) { setMenuOpen(false); setTab(name); }
  return <div className="workspace-shell passenger-shell">
    <main className="passenger-map-layer" aria-label="Pickup and drop-off map" inert={menuOpen || tab !== 'Book'}>
        <TripMap presentation="fullscreen" bottomInset={bottomInset} pickup={active ? active.fare.pickup : pickup} dropoff={active ? active.fare.dropoff : dropoff}
          positions={fare?.positions} selected={active ? null : selected} onSelect={active || busy ? undefined : setSelected}
          setPickup={(point) => { setPickup(point); setSelected(null); }} setDropoff={(point) => { setDropoff(point); setSelected(null); }} />
    </main>
    <header className="passenger-topbar" inert={menuOpen || tab !== 'Book'}>
      <button className="passenger-floating-button" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Icon name="menu-2" /></button>
      <h1>TrisiKol</h1>
      <button className="passenger-floating-button" aria-label="Open profile" onClick={() => openPage('Profile')}><Icon name="user" /></button>
    </header>
    {tab === 'Book' && !menuOpen && notifications.inbox?.unreadCount > 0 && <button
      className="passenger-notification-alert" onClick={() => openPage('Notifications')}>
      <Icon name="bell" /><span aria-live="polite">{notifications.inbox.unreadCount} unread notifications</span>
    </button>}
    <div inert={menuOpen || tab !== 'Book'}>
      <BookingSheet expanded={expanded} setExpanded={setExpanded} onInset={setBottomInset}
        title={active ? 'Your current trip' : 'Where to, Commuter?'}
        subtitle={active ? 'Live trip updates · cash payment' : terminal?.name || 'Choose your pickup and destination'}>
          {(error || result.error) && <div className="workspace-alert" role="alert">{error || result.error} <button onClick={result.refresh}>Refresh</button></div>}
          {!result.data && !result.error && <p role="status">Loading your trips…</p>}
          {active ? <><RideCard ride={active} busy={busy || !!result.error}
            actions={active.status === 'IN_PROGRESS' ? [] : ['cancel']} onAction={cancel} /><p>Status updates automatically. Pay the displayed cash fare at completion.</p></>
            : <><details className="passenger-options"><summary>TODA · {terminal?.name || 'Choose terminal'}</summary>
              <label className="field">Booking terminal<select value={terminalId} onChange={(event) => changeTerminal(event.target.value)} disabled={busy || !result.data || !!result.error}>
                {terminals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select><small>Changing TODA keeps your pickup and destination pins and requests a fresh fare quote. Service areas are not verified.</small></label>
              <TerminalSuggestions pickup={pickup} terminals={terminals} selectedId={terminalId} onSelect={changeTerminal} disabled={busy || !result.data || !!result.error} />
            </details><div className="passenger-location-fields">
              <label><Icon name="map-pin" /><span>Pick-up Location<input readOnly aria-label="Pick-up Location" value={`${pickup.lat.toFixed(5)}, ${pickup.lng.toFixed(5)}`} /></span></label>
              <label><Icon name="flag" /><span>Drop-off Location<input readOnly aria-label="Drop-off Location" placeholder="Tap map to set destination…" value={dropoff ? `${dropoff.lat.toFixed(5)}, ${dropoff.lng.toFixed(5)}` : ''} /></span></label>
            </div>
              <p className="passenger-map-hint"><Icon name="hand-click" /> Tap the map to set a pickup or drop-off pin.</p>
              <div className="passenger-fare-preview" aria-live="polite"><span>Est. cash fare</span><strong>{quote.status === 'ready' ? money(quote.quote.totalFare) : '—'}</strong></div>
              <Button disabled={busy || !result.data || !!result.error || quote.status !== 'ready'} onClick={book}>{busy ? 'Sending booking…' : 'Book from terminal queue'}</Button>
              <details className="passenger-options"><summary>Passenger category · {({ REGULAR: 'Regular', STUDENT: 'Student', SENIOR: 'Senior citizen', PWD: 'PWD' })[category]}</summary><Category value={category} onChange={setCategory} disabled={busy} /></details>
              <details className="passenger-options" open={['loading', 'error', 'expired'].includes(quote.status)}><summary>Fare details & routing</summary><QuoteStatus result={quote} /></details>
              <p className="passenger-policy-note"><small>Cash only. Drivers are assigned in terminal queue order, not by nearest vehicle. Electronic payments are not supported.</small></p></>}
      </BookingSheet>
    </div>
    <AnimatePresence>
      {menuOpen && <PassengerOverlay key="menu" title="Menu" onClose={closeMenu} drawer>
        <div className="passenger-menu-account"><strong>{user.name}</strong><span>{user.mobile}</span></div>
        <nav aria-label="Passenger navigation"><button onClick={() => openPage('History')}><Icon name="history" /> Ride History</button>
          <button onClick={() => openPage('Notifications')}><Icon name="bell" /> Notifications ({notifications.inbox?.unreadCount || 0})</button>
          <button onClick={() => openPage('Payments')}><Icon name="wallet" /> Payments</button>
          <button onClick={() => openPage('Profile')}><Icon name="user" /> My Profile</button></nav>
        <button className="passenger-logout" onClick={logout}><Icon name="logout" /> Log Out</button>
      </PassengerOverlay>}
      {tab === 'History' && <PassengerOverlay key="history" title="Ride History" onClose={closePage}>
        {result.error && <div className="workspace-alert" role="alert">{result.error} <button onClick={result.refresh}>Refresh</button></div>}
        {rides.length === 0 && <p>No saved trips yet.</p>}{rides.map((ride) => <RideCard key={ride.id} ride={ride} />)}
      </PassengerOverlay>}
      {tab === 'Profile' && <PassengerOverlay key="profile" title="My Profile" onClose={closePage}>
        <div className="passenger-profile-intro"><div className="passenger-avatar"><Icon name="user" /></div><h3>{user.name}</h3><p>{user.mobile}</p></div>
        <ProfileEditor /><p>Completed trips in recent history: {rides.filter((ride) => ride.status === 'COMPLETED').length} · Payment method: cash.</p>
      </PassengerOverlay>}
      {tab === 'Payments' && <PassengerOverlay key="payments" title="Payment Methods" onClose={closePage}>
        <h3 className="passenger-eyebrow">Selected method</h3><div className="passenger-cash-method"><Icon name="cash" /><strong>Cash</strong><span>Selected</span></div>
        <p>Pay the displayed cash fare to your driver at completion. Electronic payments and e-wallet linking are not available.</p>
      </PassengerOverlay>}
      {tab === 'Notifications' && <PassengerOverlay key="notifications" title="Notifications" onClose={closePage}>
        <NotificationInbox result={notifications} />
      </PassengerOverlay>}
    </AnimatePresence>
  </div>;
}
