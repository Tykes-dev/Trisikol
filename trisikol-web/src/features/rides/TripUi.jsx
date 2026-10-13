import { MapContainer, CircleMarker, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import MapTiles from '../../components/common/MapTiles';
import Button from '../../components/common/Button';
import 'leaflet/dist/leaflet.css';
import { money, statusText } from './format';

function MapEvents({ onSelect }) {
  useMapEvents({ click: (event) => onSelect?.({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}
function Camera({ positions, bottomInset = 0 }) {
  const map = useMap();
  useEffect(() => {
    if (positions?.length > 1) {
      const height = map.getSize().y;
      const topPadding = bottomInset ? Math.min(110, Math.max(35, height - bottomInset - 80)) : 35;
      map.fitBounds(positions, { paddingTopLeft: [35, topPadding],
        paddingBottomRight: [35, Math.min(bottomInset + 35, height - topPadding - 40)], maxZoom: 16 });
    }
  }, [map, positions, bottomInset]);
  return null;
}
function SelectedPin({ selected, setPickup, setDropoff }) {
  const marker = useRef(null);
  useEffect(() => { marker.current?.openPopup(); }, [selected]);
  return <CircleMarker ref={marker} center={[selected.lat, selected.lng]} radius={10}
    bubblingMouseEvents={false} pathOptions={{ color: '#8B663F' }}>
    <Popup><div className="pin-actions" onClick={(event) => event.stopPropagation()}>
      {setPickup && <button type="button" onClick={() => setPickup(selected)}>Set pickup</button>}
      <button type="button" onClick={() => setDropoff(selected)}>Set drop-off</button>
    </div></Popup>
  </CircleMarker>;
}
export function TripMap({ pickup, dropoff, positions, onSelect, selected, setPickup, setDropoff, presentation = 'standard', bottomInset = 0 }) {
  return <MapContainer center={[15.2155, 120.5487]} zoom={14} className="trip-map" zoomControl={presentation !== 'fullscreen'} attributionControl={false}>
    <MapTiles /><MapEvents onSelect={onSelect} /><Camera positions={positions} bottomInset={bottomInset} />
    {positions?.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#5C1A1A', weight: 5 }} />}
    {pickup && <CircleMarker center={[pickup.lat, pickup.lng]} radius={8} pathOptions={{ color: '#381414' }}><Popup>Pickup</Popup></CircleMarker>}
    {dropoff && <CircleMarker center={[dropoff.lat, dropoff.lng]} radius={8} pathOptions={{ color: '#A84444' }}><Popup>Drop-off</Popup></CircleMarker>}
    {selected && <SelectedPin selected={selected} setPickup={setPickup} setDropoff={setDropoff} />}
  </MapContainer>;
}
export function Category({ value, onChange, disabled }) {
  return <label className="field">Passenger category
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      <option value="REGULAR">Regular</option><option value="STUDENT">Student</option>
      <option value="SENIOR">Senior citizen</option><option value="PWD">PWD</option>
    </select>
    <small>Demo policy: eligible categories receive 20% off the matrix fare. Identity verification and applicable local rules still need validation.</small>
  </label>;
}
export function FareBreakdown({ fare }) {
  return <div className="fare-breakdown">
    <div><span>Road distance</span><strong>{Number(fare.distanceKm).toFixed(3)} km</strong></div>
    <div><span>Matrix fare</span><strong>{money(fare.rawFare)}</strong></div>
    {Number(fare.discountAmount) > 0 && <div><span>Demo discount</span><strong>−{money(fare.discountAmount)}</strong></div>}
    <div><span>{fare.source === 'WALK_IN' ? 'Walk-in app fee' : 'Passenger-paid app fee'}</span><strong>{money(fare.serviceFee)}</strong></div>
    <div className="fare-total"><span>Cash fare</span><strong>{money(fare.totalFare)}</strong></div>
    <small>Policy #{fare.policyId} · additional distance and app fees use started-km increments.</small>
  </div>;
}
export function QuoteStatus({ result }) {
  return <div aria-live="polite">
    {result.status === 'idle' && <p>Tap the map to choose pickup and drop-off.</p>}
    {result.status === 'loading' && <p>Finding a road route and calculating your fare…</p>}
    {['error', 'expired'].includes(result.status) && <p role="alert">{result.error || 'This quote expired.'} <button onClick={result.retry}>Retry quote</button></p>}
    {result.status === 'ready' && <FareBreakdown fare={result.quote} />}
    <small>Road routing uses OSRM/OpenStreetMap. Pins are sent to the routing provider; tricycle road restrictions still need verification.</small>
  </div>;
}
export function RideCard({ ride, actions = [], busy, onAction }) {
  return <article className="ride-card">
    <div className="section-title"><strong>Trip #{ride.id}</strong><span className="status-badge">{statusText(ride.status)}</span></div>
    <p>{ride.fare.pickupLabel} → {ride.fare.dropoffLabel}</p>
    <small>{new Date(ride.createdAt).toLocaleString()} · {ride.fare.source === 'WALK_IN' ? 'Walk-in' : 'App booking'}</small>
    <p>{ride.driver ? `Driver: ${ride.driver.name}` : 'No driver assigned yet'}{ride.passenger && ` · Passenger: ${ride.passenger.name}`}</p>
    {ride.offerExpiresAt && <small>Offer expires at {new Date(ride.offerExpiresAt).toLocaleTimeString()}</small>}
    <FareBreakdown fare={ride.fare} />
    {actions.length > 0 && <div className="action-row">{actions.map((action) => <Button key={action}
      disabled={busy} onClick={() => onAction(ride.id, action)}>{({ accept: 'Accept', decline: 'Decline', start: 'Start trip', complete: 'Confirm cash received & complete', cancel: 'Cancel trip' })[action]}</Button>)}</div>}
  </article>;
}
