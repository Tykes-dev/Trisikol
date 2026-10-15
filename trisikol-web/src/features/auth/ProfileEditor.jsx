import { useState } from 'react';
import { useAuth } from './AuthContext';
import Button from '../../components/common/Button';

export default function ProfileEditor() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try { await updateProfile(name); setMessage('Profile saved.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <section className="workspace-card"><h2>My profile</h2><p>{user.mobile} · {user.role.toLowerCase()}</p>
    <form onSubmit={submit}><label className="field">Name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
      {message && <p role="status">{message}</p>}<Button type="submit" disabled={busy}>Save name</Button>
    </form><p><small>Phone verification and SMS delivery are not connected. The sign-in screen shows whether demo password recovery is available.</small></p>
  </section>;
}
