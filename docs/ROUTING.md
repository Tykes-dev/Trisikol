# Passenger road routing

Passenger and driver maps share MapTiles, using https://tile.openstreetmap.org/{z}/{x}/{y}.png with visible attribution above the bottom panels. This replaces CARTO tiles that returned API-key-required images. Standard OSM tiles require no API key for this interactive preview; honor browser caching and do not add bulk/offline downloads. Service availability is best-effort; select an appropriate provider for deployment. Policy: https://operations.osmfoundation.org/policies/tiles/ .

Leaflet/react-leaflet still render the map. OSRM supplies a recommended driving route, distance in meters, and GeoJSON geometry. PassengerHome uses that route distance for its existing demo fare bands and displays the route as a polyline. Driver walk-in calculations remain unchanged.

The public default is https://router.project-osrm.org. Set VITE_ROUTING_BASE_URL to another OSRM-compatible server origin if needed. Restart Vite after changing environment values. Do not put private API keys in frontend environment variables.

Selected pickup/drop-off coordinates are sent to the routing provider. Requests are debounced for 1.1 seconds and time out after 15 seconds. Changed pins cancel earlier requests and immediately hide their quote/route. A failed request provides a retry and disables booking; no straight-line fallback is used. Pins must snap within 100 meters of a routable road. Identical locations or zero-distance routes are rejected.

This is a car routing profile, not a verified Philippine tricycle profile. The public endpoints tested do not support the motorway-exclusion option. Routes may include roads prohibited for tricycles; this demo does not enforce TODA boundaries or local vehicle restrictions. Road routing returns the recommended/fastest route rather than necessarily the shortest distance; it is not live traffic or a fare authorization.

Retained demo rules: PHP 40 for the first 1.5 km, PHP 10 per additional started km, and PHP 1 per started km for the platform fee. The matrix row now shows the pre-discount amount so the displayed discount reconciles with the total.

For deployment, select a provider or self-hosted service appropriate to the usage and implement authoritative routing/fare quotes on the backend. Review public service terms: https://routing.openstreetmap.de/about.html and OSRM documentation: https://project-osrm.org/docs/v5.24.0/api/ .

## Checks

Run `node --test src/services/routing.test.js` from trisikol-web. In the passenger screen, pin two road locations, wait for the route and fare, then change one pin and confirm the old quote disappears. Try identical pins, pins away from roads, and an offline connection; no fare or booking action should remain available. Switch discount category and verify matrix minus discount plus fee equals total.
