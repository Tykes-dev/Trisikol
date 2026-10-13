import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export default function useFareQuote(pickup, dropoff, category, walkIn = false, generation = 0) {
  const key = pickup && dropoff ? JSON.stringify({ input: { pickup, dropoff, category }, generation, walkIn }) : null;
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!key) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const quote = await api(walkIn ? '/driver/walk-in-quotes' : '/passenger/quotes', {
          method: 'POST', body: JSON.parse(key).input,
        });
        if (active) setResult({ key, attempt, status: 'ready', quote });
      } catch (error) {
        if (active) setResult({ key, attempt, status: 'error', error: error.message });
      }
    }, 1100);
    return () => { active = false; clearTimeout(timer); };
  }, [key, attempt, walkIn]);
  const current = !key ? { status: 'idle' }
    : result?.key === key && result.attempt === attempt ? result : { status: 'loading' };
  const expired = current.quote && new Date(current.quote.expiresAt).getTime() <= now;
  return { ...current, status: expired ? 'expired' : current.status,
    retry: () => setAttempt((value) => value + 1) };
}
