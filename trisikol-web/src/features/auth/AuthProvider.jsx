import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api('/auth/me').then((account) => { if (active) { setUser(account); setError(''); } })
      .catch((failure) => { if (active) { setUser(null); setError(failure.status === 401 ? '' : failure.message); } })
      .finally(() => { if (active) setLoading(false); });
    const expired = () => setUser(null);
    window.addEventListener('auth-expired', expired);
    return () => { active = false; window.removeEventListener('auth-expired', expired); };
  }, [retry]);
  const signIn = async (mobile, password) => {
    await api('/auth/login', { method: 'POST', form: true, body: { mobile, password } });
    const account = await api('/auth/me');
    setUser(account); setError('');
    return account;
  };
  const signOut = async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  };
  const updateProfile = async (name) => {
    const account = await api('/auth/profile', { method: 'PUT', body: { name } });
    setUser(account); return account;
  };
  return <AuthContext.Provider value={{ user, loading, error, signIn, signOut, updateProfile,
    retry: () => { setLoading(true); setRetry((value) => value + 1); } }}>{children}</AuthContext.Provider>;
}
