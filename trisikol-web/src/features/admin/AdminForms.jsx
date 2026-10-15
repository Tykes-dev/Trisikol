import { useState } from 'react';
import { api } from '../../services/api';
import { AdminButton } from './AdminUi';

export function VehicleEditor({ driver, terminals, onSaved, onBusyChange }) {
  const [form, setForm] = useState(driver.vehicle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); onBusyChange(true); setError('');
    try {
      await api(`/admin/drivers/${driver.account.id}/vehicle`, { method: 'PUT', body: {
        enabled: form.enabled, bodyNumber: form.bodyNumber, plateNumber: form.plateNumber,
        vehicleModel: form.vehicleModel, terminalId: Number(form.terminalId),
      } });
      onSaved();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); onBusyChange(false); }
  }
  return <form onSubmit={submit} className="admin-form">
    <p className="admin-form-intro">{driver.account.name} · {driver.account.mobile}</p>
    <label className="field">Assigned TODA<select value={form.terminalId} onChange={(event) => setForm({ ...form, terminalId: event.target.value })}>{terminals.map((terminal) => <option key={terminal.id} value={terminal.id}>{terminal.name}</option>)}</select><small>Leave the queue and finish active trips before reassignment. Active trips also prevent suspension.</small></label>
    {[['bodyNumber', 'Body number'], ['plateNumber', 'Plate number'], ['vehicleModel', 'Vehicle model']].map(([key, label]) => <label className="field" key={key}>{label}<input required maxLength={key === 'vehicleModel' ? 100 : 30} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
    <label className="admin-checkbox"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /><span>Driver enabled<small>Suspended drivers cannot join the queue or receive new trips.</small></span></label>
    {error && <p className="admin-notice admin-notice--error" role="alert">{error}</p>}
    <AdminButton type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save vehicle & eligibility'}</AdminButton>
  </form>;
}

export function FareEditor({ current, onSaved, onBusyChange }) {
  const [form, setForm] = useState(current);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); onBusyChange(true); setError('');
    try {
      await api('/admin/fare-policies', { method: 'POST', body: {
        baseFare: Number(form.baseFare), baseDistanceKm: Number(form.baseDistanceKm),
        extraFarePerKm: Number(form.extraFarePerKm), appServiceFeePerKm: Number(form.appServiceFeePerKm),
        changeReason: reason, terminalId: current.terminalId,
      } });
      setReason(''); onSaved();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); onBusyChange(false); }
  }
  return <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Fare matrix</h2><p>Current policy #{current.policyId}</p></div><span className="admin-badge admin-badge--warning">Demo policy</span></div>
    <p className="admin-notice">These are placeholder prices, not an LGU-approved fare schedule. Confirm the applicable schedule and fee rules before real operation. Existing quotes keep their prices until expiry.</p>
    <form onSubmit={submit} className="admin-form"><div className="admin-form-grid">
      {[['baseFare', 'Base fare (PHP)'], ['baseDistanceKm', 'Included distance (km)'], ['extraFarePerKm', 'Additional fare per started km (PHP)'], ['appServiceFeePerKm', 'App fee per started km (PHP)']].map(([key, label]) => <label className="field" key={key}>{label}<input required type="number" min={key === 'baseDistanceKm' ? '0.001' : '0'} max={key === 'baseDistanceKm' ? '1000' : '10000'} step={key === 'baseDistanceKm' ? '0.001' : '0.01'} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
    </div><p className="admin-muted">App bookings add the service fee to the passenger’s fare. Walk-ins have no app service fee.</p>
      <label className="field">Reason for change<textarea required minLength={10} maxLength={500} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the fare revision for the audit record" /><small>10–500 characters. Each save creates a new revision; previous revisions are retained.</small></label>
      {error && <p className="admin-notice admin-notice--error" role="alert">{error}</p>}
      <AdminButton type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new fare revision'}</AdminButton>
    </form>
  </section>;
}

export function TerminalEditor({ current, onSaved, onBusyChange, creating = false }) {
  const [form, setForm] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); onBusyChange(true); setError('');
    try {
      const saved = await api(creating ? '/admin/terminals' : `/admin/terminals/${current.id}`, { method: creating ? 'POST' : 'PUT', body: {
        name: form.name, latitude: Number(form.latitude), longitude: Number(form.longitude),
      } });
      onSaved(saved);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); onBusyChange(false); }
  }
  return <form onSubmit={submit} className="admin-form">
    <p className="admin-notice">{creating ? 'Initial placeholder prices are copied from terminal 1. Review this TODA’s fare policy before use.' : 'Terminal location changes require an empty queue and no active trips in this TODA.'}</p>
    <label className="field">Terminal name<input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
    <div className="admin-form-grid">{['latitude', 'longitude'].map((key) => <label className="field" key={key}>{key === 'latitude' ? 'Latitude' : 'Longitude'}<input required type="number" step="0.0000001" min={key === 'latitude' ? '-90' : '-180'} max={key === 'latitude' ? '90' : '180'} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}</div>
    {error && <p className="admin-notice admin-notice--error" role="alert">{error}</p>}
    <AdminButton type="submit" disabled={busy}>{busy ? 'Saving…' : creating ? 'Create terminal' : 'Save terminal'}</AdminButton>
  </form>;
}
