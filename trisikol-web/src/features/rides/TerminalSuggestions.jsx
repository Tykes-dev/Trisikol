import useTerminalSuggestions from './useTerminalSuggestions';

export default function TerminalSuggestions({ pickup, terminals, selectedId, onSelect, disabled }) {
  const result = useTerminalSuggestions(pickup, terminals, disabled);
  const items = (result.items || []).filter((item) => terminals.some((terminal) => terminal.id === item.id));
  return <section className="terminal-suggestions" aria-label="Nearby TODA suggestions">
    <p>Find TODAs close to your pickup pin—not your device’s location. No GPS permission is requested.</p>
    <button type="button" className="terminal-find-button" disabled={disabled || result.status === 'loading'} onClick={result.find}>
      {result.status === 'loading' ? 'Finding nearby TODAs…' : result.status === 'ready' ? 'Refresh nearby TODAs' : 'Find nearby TODAs'}
    </button>
    <div aria-live="polite">
      {result.status === 'idle' && <p className="terminal-suggestions-hint">Set the pickup pin, then find nearby TODAs. Changing the pin clears old suggestions.</p>}
      {result.status === 'loading' && <p role="status">Comparing terminal locations…</p>}
      {result.status === 'error' && <p role="alert">{result.error} You can still choose a TODA manually.</p>}
      {result.status === 'ready' && <>
        {!items.length ? <p>No matching terminals are available in the loaded list. Refresh the page to update terminals, or choose manually.</p>
          : <><p className="terminal-suggestions-hint">Closest {Math.min(3, items.length)} of {items.length} TODAs by approximate straight-line distance.</p>
            <ol>{items.slice(0, 3).map((item) => <li key={item.id}>
              <div><strong>{item.name}</strong><span>≈ {item.straightLineDistanceKm.toFixed(2)} km from pickup</span></div>
              <button type="button" disabled={disabled || selectedId === item.id} aria-label={selectedId === item.id ? `${item.name} selected` : `Choose ${item.name}`} onClick={() => onSelect(item.id)}>{selectedId === item.id ? 'Selected' : 'Choose'}</button>
            </li>)}</ol></>}
      </>}
    </div>
    <p className="terminal-suggestions-warning">Proximity is not road distance, driver availability, or approved service coverage. Confirm this TODA serves your pickup. Fares still use the server’s road-route quote.</p>
  </section>;
}
