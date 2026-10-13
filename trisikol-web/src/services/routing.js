// Public demo service. Use a managed/self-hosted OSRM endpoint for deployment.
const DEFAULT_BASE_URL = 'https://router.project-osrm.org';

export async function getRoadRoute(pickup, dropoff, { signal, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {}) {
  const valid = (point) => Array.isArray(point) && point.length === 2 &&
    point.every(Number.isFinite) && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180;
  if (!valid(pickup) || !valid(dropoff)) throw new Error('Choose valid pickup and drop-off locations.');
  if (pickup.every((value, i) => value === dropoff[i])) throw new Error('Choose different pickup and drop-off locations.');
  const coordinates = [pickup, dropoff].map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `${baseUrl.replace(/\/$/, '')}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&alternatives=false&steps=false&radiuses=100;100`;
  const response = await fetchImpl(url, { signal });
  const data = await response.json();
  if (data.code === 'NoRoute' || data.code === 'NoSegment') {
    throw new Error('No road route found. Move both pins closer to accessible roads.');
  }
  if (!response.ok || data.code !== 'Ok') throw new Error('Routing is unavailable. Please try again.');
  const route = data.routes?.[0];
  if (!Number.isFinite(route?.distance) || route.distance <= 0 ||
      route.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates) ||
      route.geometry.coordinates.length < 2 ||
      !route.geometry.coordinates.every((point) => Array.isArray(point) && valid([point[1], point[0]]))) {
    throw new Error('No usable road route returned. Choose different locations.');
  }
  return {
    distanceKm: route.distance / 1000,
    positions: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}
