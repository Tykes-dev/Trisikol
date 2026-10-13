import { useEffect, useState } from 'react';
import { getRoadRoute } from '../services/routing';

export default function useRoadRoute(pickup, dropoff) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const key = pickup && dropoff ? JSON.stringify([pickup, dropoff]) : null;

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    let active = true;
    let timeout;
    // Debounce pin changes and limit requests to the public demo service.
    const debounce = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const [from, to] = JSON.parse(key);
        const route = await getRoadRoute(from, to, {
          signal: controller.signal,
          baseUrl: import.meta.env.VITE_ROUTING_BASE_URL || undefined,
        });
        if (active) setResult({ key, attempt, status: 'ready', route });
      } catch (error) {
        if (active) setResult({ key, attempt, status: 'error', error: error.name === 'AbortError'
          ? 'Routing timed out. Please try again.'
          : error instanceof TypeError ? 'Cannot reach routing service. Check your connection and retry.' : error.message });
      } finally {
        clearTimeout(timeout);
      }
    }, 1100);
    return () => {
      active = false;
      clearTimeout(debounce);
      clearTimeout(timeout);
      controller.abort();
    };
  }, [key, attempt]);

  // Never expose a previous route/fare for newly selected pins or a retry.
  const current = !key ? { status: 'idle' }
    : result?.key === key && result.attempt === attempt ? result : { status: 'loading' };
  return { ...current, retry: () => setAttempt((value) => value + 1) };
}
