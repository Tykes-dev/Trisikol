export function terminalSuggestionKey(pickup, terminals) {
  if (!pickup || !Number.isFinite(pickup.lat) || !Number.isFinite(pickup.lng)
    || Math.abs(pickup.lat) > 90 || Math.abs(pickup.lng) > 180) return null;
  return JSON.stringify({ pickup, catalog: terminals.map(({ id, name, latitude, longitude }) => [id, name, latitude, longitude]) });
}

export function terminalSuggestionState(key, request, result) {
  if (!key || request?.key !== key) return { status: 'idle' };
  return result?.request === request ? result : { status: 'loading' };
}

export function readTerminalSuggestions(data) {
  if (data?.distanceBasis !== 'STRAIGHT_LINE' || data.coverageVerified !== false || !Array.isArray(data.terminals)
    || !data.terminals.every((item) => Number.isSafeInteger(item.id) && item.id > 0 && typeof item.name === 'string'
      && Number.isFinite(item.straightLineDistanceKm) && item.straightLineDistanceKm >= 0)) {
    throw new Error('Nearby TODA suggestions are unavailable. Choose a terminal manually or retry.');
  }
  return data.terminals;
}
