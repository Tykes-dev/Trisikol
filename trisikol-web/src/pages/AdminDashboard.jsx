import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import useLogout from '../features/auth/useLogout';
import CreateDriverAccount from '../features/admin/CreateDriverAccount';
import usePolling from '../features/rides/usePolling';
import { api } from '../services/api';
import Button from '../components/common/Button';
import { RideCard } from '../features/rides/TripUi';
import { money } from '../features/rides/format';
import '../features/rides/trips.css';
import ProfileEditor from '../features/auth/ProfileEditor';
import useNotifications from '../features/notifications/useNotifications';
import NotificationInbox from '../features/notifications/NotificationInbox';

function VehicleEditor({ driver, onSaved, onClose }) {
  const [form, setForm] = useState(driver.vehicle);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api('/admin/drivers/' + driver.account.id + '/vehicle', { method: 'PUT', body: {
        enabled: form.enabled, bodyNumber: form.bodyNumber, plateNumber: form.plateNumber, vehicleModel: form.vehicleModel,
      } }); onSaved(); onClose();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="workspace-card"><h2>Vehicle: {driver.account.name}</h2><form onSubmit={submit}>
    {[['bodyNumber', 'Body number'], ['plateNumber', 'Plate number'], ['vehicleModel', 'Vehicle model']].map(([key, label]) => <label className="field" key={key}>{label}<input required maxLength={key === 'vehicleModel' ? 100 : 30} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
    <label><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Driver enabled</label>
    {error && <p role="alert">{error}</p>}<div className="action-row"><Button type="submit" disabled={busy}>Save vehicle</Button><Button disabled={busy} onClick={onClose}>Close</Button></div>
  </form></section>;
}
function FareEditor({ current, onSaved }) {
  const [form, setForm] = useState(current);
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await api('/admin/fare-policies', { method: 'POST', body: {
        baseFare: Number(form.baseFare), baseDistanceKm: Number(form.baseDistanceKm),
        extraFarePerKm: Number(form.extraFarePerKm), appServiceFeePerKm: Number(form.appServiceFeePerKm), changeReason: reason,
      } }); setMessage('Fare revision saved.'); setReason(''); onSaved();
    } catch (failure) { setMessage(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="workspace-card"><h2>Fare policy #{current.policyId}</h2><p>Demo prices. Enter the applicable approved fare schedule before any real operation. Existing quotes retain their original prices until expiry.</p><form onSubmit={submit}>
    {[['baseFare', 'Base fare (PHP)'], ['baseDistanceKm', 'Included distance (km)'], ['extraFarePerKm', 'Additional fare per started km (PHP)'], ['appServiceFeePerKm', 'App fee per started km (PHP)']].map(([key, label]) => <label className="field" key={key}>{label}<input required type="number" min={key === 'baseDistanceKm' ? '0.001' : '0'} max={key === 'baseDistanceKm' ? '1000' : '10000'} step={key === 'baseDistanceKm' ? '0.001' : '0.01'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
    <label className="field">Reason for change<textarea required minLength={10} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
    {message && <p role="status">{message}</p>}<Button type="submit" disabled={busy}>Save new fare revision</Button>
  </form></section>;
}
function TerminalEditor({ current, onSaved }) {
  const [form, setForm] = useState(current); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await api('/admin/terminal', { method: 'PUT', body: {
        name: form.name, latitude: Number(form.latitude), longitude: Number(form.longitude),
      } }); setMessage('Terminal saved.'); onSaved();
    } catch (failure) { setMessage(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="workspace-card"><h2>Terminal</h2><p>One terminal in this portfolio version. Its location can change when the queue and active trips are empty.</p>
    <form onSubmit={submit}><label className="field">Name<input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      {['latitude', 'longitude'].map((key) => <label className="field" key={key}>{key}<input required type="number" step="0.0000001" min={key === 'latitude' ? '-90' : '-180'} max={key === 'latitude' ? '90' : '180'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
      {message && <p role="status">{message}</p>}<Button type="submit" disabled={busy}>Save terminal</Button>
    </form>
  </section>;
}
export default function AdminDashboard() {
  const { user } = useAuth(); const logout = useLogout();
  const notifications = useNotifications();
  const [tab, setTab] = useState('Overview'); const [editing, setEditing] = useState(null);
  const [audit, setAudit] = useState(null); const [error, setError] = useState('');
  const result = usePolling(['/admin/summary', '/admin/drivers', '/admin/queue', '/admin/rides',
    '/fares/current', '/admin/fare-policies', '/terminals/current'], 6000);
  const summary = result.data?.['/admin/summary']; const drivers = result.data?.['/admin/drivers'] || [];
  const rides = result.data?.['/admin/rides'] || []; const terminal = result.data?.['/terminals/current'];
  async function showAudit(id) {
    setError('');
    try { setAudit({ id, events: await api('/admin/rides/' + id + '/events') }); }
    catch (failure) { setError(failure.message); }
  }
  return <div className="workspace-shell">
    <header className="workspace-header"><div><h1>TrisiKol Admin</h1><small>{user.name} · {terminal?.name || 'Administration'}</small></div><button onClick={logout}>Log out</button></header>
    <nav className="workspace-tabs" aria-label="Administrator navigation">{['Overview', 'Drivers', 'Queue', 'Trips', 'Settings', 'Profile', 'Notifications'].map((name) => <button key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}>{name}{name === 'Notifications' && ` (${notifications.inbox?.unreadCount || 0})`}</button>)}</nav>
    <main className="workspace-main">
      {(result.error || error) && <div className="workspace-alert" role="alert">{result.error || error} <button onClick={result.refresh}>Refresh</button></div>}
      {!result.data && !result.error && <p>Loading saved records…</p>}
      {tab === 'Overview' && summary && <><h2>Saved operational totals</h2><div className="workspace-grid">
        {[['Trips', summary.rides], ['Completed', summary.completed], ['Queued drivers', summary.queuedDrivers], ['Cash collected', money(summary.cashCollected)], ['Driver net earnings', money(summary.driverNet)], ['Platform fees due', money(summary.platformDue)]].map(([label, value]) => <section className="workspace-card" key={label}><small>{label}</small><strong className="metric">{value}</strong></section>)}
      </div><p>Totals come from completed cash trips. Platform fees are recorded as due; remittance and electronic payments are not recorded here.</p></>}
      {tab === 'Drivers' && <><CreateDriverAccount onCreated={result.refresh} />
        {editing && <VehicleEditor key={editing.account.id} driver={editing} onSaved={result.refresh} onClose={() => setEditing(null)} />}
        {drivers.length === 0 && <p>No registered drivers yet.</p>}
        {drivers.map((driver) => <section className="workspace-card" key={driver.account.id}><div className="section-title"><h2>{driver.account.name}</h2><span className="status-badge">{driver.vehicle.enabled ? 'Enabled' : 'Suspended'}</span></div><p>{driver.account.mobile} · Body {driver.vehicle.bodyNumber || 'unregistered'} · Plate {driver.vehicle.plateNumber || 'unregistered'}</p><p>{driver.vehicle.vehicleModel || 'Register a vehicle before this driver can join the queue.'}</p><Button disabled={!!result.error} onClick={() => setEditing(driver)}>Edit vehicle & eligibility</Button></section>)}
      </>}
      {tab === 'Queue' && <><h2>Terminal queue</h2>{result.data?.['/admin/queue']?.length === 0 && <p>No drivers waiting.</p>}{result.data?.['/admin/queue']?.map((entry) => <section className="workspace-card" key={entry.driverId}><h2>#{entry.position} · {entry.name}</h2><p>Body {entry.bodyNumber} · Joined {new Date(entry.joinedAt).toLocaleString()}</p></section>)}</>}
      {tab === 'Trips' && <><h2>Recent trips</h2>{audit && <section className="workspace-card"><h2>Trip #{audit.id} history</h2>{audit.events.map((event) => <p key={event.id}>{event.status} · {event.actor} · {new Date(event.occurredAt).toLocaleString()}</p>)}<button onClick={() => setAudit(null)}>Close history</button></section>}{rides.length === 0 && <p>No trips yet.</p>}{rides.map((ride) => <section key={ride.id}><RideCard ride={ride} /><button onClick={() => showAudit(ride.id)}>View trip #{ride.id} events</button></section>)}</>}
      {tab === 'Settings' && result.data && <><FareEditor key={result.data['/fares/current'].policyId} current={result.data['/fares/current']} onSaved={result.refresh} />
        <TerminalEditor key={JSON.stringify(terminal)} current={terminal} onSaved={result.refresh} />
        <section className="workspace-card"><h2>Fare revision history</h2>{result.data['/admin/fare-policies'].map((policy) => <article key={policy.id}><h3>Revision #{policy.id}</h3><p>{new Date(policy.createdAt).toLocaleString()} · {policy.createdBy}</p><p>Base {money(policy.baseFare)} / {policy.baseDistanceKm} km · Extra {money(policy.extraFarePerKm)}/km · App fee {money(policy.appServiceFeePerKm)}/km</p><p>{policy.changeReason}</p></article>)}</section></>}
      {tab === 'Profile' && <ProfileEditor />}
      {tab === 'Notifications' && <NotificationInbox result={notifications} />}
    </main>
  </div>;
}
