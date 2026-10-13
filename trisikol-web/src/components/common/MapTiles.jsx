import { AttributionControl, TileLayer } from 'react-leaflet';

export default function MapTiles() {
  return (
    <>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {/* Keep attribution above the bottom booking/driver panels. */}
      <AttributionControl position="topright" />
    </>
  );
}
