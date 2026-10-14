import { useState } from 'react';
import usePolling from '../rides/usePolling';
import { api } from '../../services/api';

export default function useNotifications() {
  const result = usePolling(['/notifications'], 5000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function mark(id) {
    if (busy) return;
    setBusy(true); setError('');
    try { await api(id ? `/notifications/${id}/read` : '/notifications/read-all', { method: 'POST' }); result.refresh(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return { ...result, inbox: result.data?.['/notifications'], error: error || result.error, busy, mark };
}
