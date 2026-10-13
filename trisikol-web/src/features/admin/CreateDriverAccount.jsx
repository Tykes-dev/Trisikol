import { useState } from 'react';
import { api } from '../../services/api';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';

export default function CreateDriverAccount({ onCreated }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const driver = await api('/admin/drivers', { method: 'POST', body: {
        name, mobile: mobile.replace(/[\s-]/g, '').replace(/^\+63/, '0'), password,
      } });
      setMessage(`Account created for ${driver.name}. They can now sign in as a driver.`);
      setName(''); setMobile(''); setPassword('');
      onCreated?.();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <section style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 24 }}>
    <h3>Create driver login</h3>
    <p>Create the login, then register the driver's vehicle in the roster below before they join the queue.</p>
    <form onSubmit={submit}>
      <InputField label="Driver name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
      <InputField label="Mobile number" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
      <InputField label="Password (12+ characters)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {message && <p role="status">{message}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create driver account'}</Button>
    </form>
  </section>;
}
