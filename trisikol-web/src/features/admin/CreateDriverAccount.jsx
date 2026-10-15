import { useState } from 'react';
import { api } from '../../services/api';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';

export default function CreateDriverAccount({ onCreated, onBusyChange }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); onBusyChange?.(true); setMessage('');
    try {
      const driver = await api('/admin/drivers', { method: 'POST', body: {
        name, mobile: mobile.replace(/[\s-]/g, '').replace(/^\+63/, '0'), password,
      } });
      setMessage(`Account created for ${driver.name}. They can now sign in as a driver.`);
      setName(''); setMobile(''); setPassword('');
      onCreated?.(driver);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <section className="admin-create-driver">
    <p>Create the login, then register the driver's vehicle in the roster below before they join the queue.</p>
    <form onSubmit={submit}>
      <InputField label="Driver name" type="text" required maxLength={100} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      <InputField label="Mobile number" type="tel" required autoComplete="off" value={mobile} onChange={(e) => setMobile(e.target.value)} />
      <InputField label="Password (12+ characters)" type="password" required minLength={12} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {message && <p role="status">{message}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create driver account'}</Button>
    </form>
  </section>;
}
