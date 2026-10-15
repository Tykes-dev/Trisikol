import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { readTerminalSuggestions, terminalSuggestionKey, terminalSuggestionState } from './terminalSuggestionState';

export default function useTerminalSuggestions(pickup, terminals, disabled) {
  const key = disabled ? null : terminalSuggestionKey(pickup, terminals);
  const [request, setRequest] = useState(null);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!request || request.key !== key) return;
    let active = true;
    api('/passenger/terminal-suggestions', { method: 'POST', body: { pickup: JSON.parse(key).pickup } })
      .then((data) => {
        const items = readTerminalSuggestions(data);
        if (active) setResult({ request, status: 'ready', items });
      })
      .catch((error) => { if (active) setResult({ request, status: 'error', error: error.message }); });
    return () => { active = false; };
  }, [key, request]);
  return { ...terminalSuggestionState(key, request, result), find: () => { if (key) setRequest({ key }); } };
}
