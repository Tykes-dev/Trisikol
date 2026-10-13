import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';

export default function usePolling(paths, interval = 4000) {
  const key = JSON.stringify(paths);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let timer;
    async function load() {
      try {
        const endpoints = JSON.parse(key);
        const values = await Promise.all(endpoints.map((path) => api(path)));
        if (active) setResult({ key, data: Object.fromEntries(endpoints.map((path, index) => [path, values[index]])), error: '' });
      } catch (error) {
        if (active) setResult((previous) => ({ key, data: previous?.key === key ? previous.data : null, error: error.message }));
      } finally {
        if (active) timer = setTimeout(load, interval);
      }
    }
    load();
    return () => { active = false; clearTimeout(timer); };
  }, [key, interval, attempt]);
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);
  return { data: result?.key === key ? result.data : null,
    error: result?.key === key ? result.error : '', refresh };
}
