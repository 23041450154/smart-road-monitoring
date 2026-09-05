# AntiGravity Prompt — Integrasi Peta Smart Road Monitoring

You are continuing an existing project:

**Smart Road Monitoring & Commuter Assistant**

The project already has backend, frontend, CCTV traffic monitoring, pothole detection, PostgreSQL/PostGIS, user routes, n8n, and Telegram integration.

The current problem is:

> **The map is not yet fully integrated into the application.**

Your task is to inspect the existing repository and complete the MAP INTEGRATION without rebuilding the application from scratch.

Do not only create a visual map.

The map must be fully connected to:

- CCTV locations
- traffic status
- pothole locations
- saved user routes
- route-based CCTV matching
- route-based pothole matching
- FastAPI
- PostgreSQL/PostGIS
- dashboard

---

# 1. MAIN OBJECTIVE

Implement this architecture:

```text
PostgreSQL/PostGIS
        |
        v
     FastAPI
        |
        v
 Next.js Frontend
        |
        v
 Leaflet Map
        |
        +-------------------------+
        |                         |
        v                         v
 CCTV Markers               Pothole Markers
        |                         |
        v                         v
Traffic Status              Severity / Detail
        |
        +------------+
                     |
                     v
                User Route
                     |
                     v
        CCTV + Potholes Near Route
```

The map must not use hardcoded dummy markers when real database data is available.

---

# 2. DO NOT REBUILD THE PROJECT

Before making changes:

1. Inspect the existing repository.
2. Find existing map components.
3. Find existing API endpoints.
4. Find route models.
5. Find camera models.
6. Find pothole models.
7. Find PostGIS geometry fields.
8. Find existing Leaflet/OpenStreetMap setup.

Preserve working code.

Only modify what is required for full map integration.

---

# 3. MAP TECHNOLOGY

Use:

```text
Leaflet
React Leaflet
OpenStreetMap
```

Do not introduce Google Maps or another paid map provider unless the existing project already depends on it.

Install only missing dependencies.

Typical dependencies may include:

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

Check whether they already exist before installing.

---

# 4. NEXT.JS SSR SAFETY

Leaflet must not break Next.js server-side rendering.

Use dynamic import if required.

Example concept:

```tsx
const Map = dynamic(() => import("@/components/map/Map"), {
  ssr: false,
});
```

Do not access:

```text
window
document
navigator
```

during server-side rendering.

Fix any existing hydration errors.

---

# 5. MAP PAGE

Create or complete:

```text
/map
```

The map page should display:

- all active CCTV cameras
- traffic status
- potholes
- saved routes
- user-selected route

Default map location:

```text
Palembang, Sumatera Selatan
```

Use a reasonable Palembang center coordinate only as map viewport initialization.

Do not treat the initial center as user GPS.

---

# 6. MAP COMPONENT STRUCTURE

Prefer a clean component structure such as:

```text
frontend/
  components/
    map/
      SmartRoadMap.tsx
      CameraMarker.tsx
      PotholeMarker.tsx
      RouteLayer.tsx
      MapLegend.tsx
      MapControls.tsx
```

Do not place all map logic into one huge file.

---

# 7. CAMERA DATA INTEGRATION

Use actual API data.

Expected endpoint:

```text
GET /api/cameras
```

Each camera should provide at least:

```json
{
  "id": 1,
  "name": "Simpang Polda",
  "road_name": "Jl. Jenderal Sudirman",
  "latitude": -2.0,
  "longitude": 104.0,
  "is_active": true
}
```

If current API does not return latitude/longitude, fix backend serialization.

Do not hardcode camera markers in frontend.

---

# 8. TRAFFIC STATUS ON CAMERA MARKERS

Each CCTV marker must show the latest traffic condition.

Possible endpoint:

```text
GET /api/cameras/{id}/traffic/current
```

or optimize through:

```text
GET /api/traffic/current
```

Preferred response:

```json
{
  "camera_id": 1,
  "traffic_status": "PADAT",
  "vehicles_per_minute": 42,
  "trend": "MENINGKAT",
  "updated_at": "..."
}
```

Map marker popup must display:

```text
Camera Name
Road Name
Traffic Status
Vehicles / Minute
Traffic Trend
Last Update
```

---

# 9. CAMERA MARKER STATUS

Use distinguishable marker UI for:

```text
LANCAR
SEDANG
PADAT
MACET
OFFLINE
```

Do not rely only on color.

Also include text or icon differences for accessibility.

Example popup:

```text
Simpang Polda

Jl. Jenderal Sudirman

Status: PADAT
Traffic: 42 kendaraan/menit
Trend: MENINGKAT

Update: 16:42 WIB
```

---

# 10. POTHOLE DATA INTEGRATION

Use actual pothole data.

Expected endpoint:

```text
GET /api/potholes
```

Response should contain:

```json
{
  "id": 12,
  "latitude": -2.0,
  "longitude": 104.0,
  "road_name": "Jl. Example",
  "confidence": 0.91,
  "severity": "unknown",
  "status": "active",
  "detected_at": "..."
}
```

Do not show potholes without valid coordinates.

---

# 11. POTHOLE MARKER POPUP

Popup should display:

```text
Pothole ID
Road
Confidence
Severity
Status
Detected At
Image Evidence
```

If image evidence exists, show thumbnail.

If image does not exist, do not show broken image element.

---

# 12. MAP LEGEND

Add a visible map legend.

Example:

```text
Traffic:
✓ LANCAR
~ SEDANG
! PADAT
!! MACET

Road Condition:
● CCTV
▲ Pothole
— Saved Route
```

Legend must work on desktop and mobile.

---

# 13. USER ROUTE INTEGRATION

User routes are a critical part of this system.

Expected route data includes:

```text
id
user_id
name
route_type
start_latitude
start_longitude
destination_latitude
destination_longitude
geometry
```

Route types:

```text
commute_to_work
commute_home
custom
```

Display saved routes as map polylines.

---

# 14. ROUTE GEOMETRY FORMAT

Inspect how geometry is currently returned by FastAPI.

If necessary, implement GeoJSON response.

Preferred:

```json
{
  "type": "LineString",
  "coordinates": [
    [104.7, -2.9],
    [104.8, -2.95]
  ]
}
```

IMPORTANT:

GeoJSON coordinate order is:

```text
longitude, latitude
```

Leaflet usually expects:

```text
latitude, longitude
```

Convert correctly.

Do not accidentally reverse coordinates.

---

# 15. ROUTE API

Ensure these work:

```text
GET /api/routes
GET /api/routes/{id}
POST /api/routes
PUT /api/routes/{id}
DELETE /api/routes/{id}
```

If the current route API uses WKT only, keep database storage as PostGIS but return GeoJSON-friendly output to frontend.

---

# 16. CREATE ROUTE ON MAP

Implement route creation UI.

User should be able to:

1. Open map.
2. Choose start point.
3. Choose destination.
4. Add intermediate points if required.
5. Preview route polyline.
6. Name route.
7. Choose type:
   - Rute Berangkat
   - Rute Pulang
   - Custom
8. Save route.

For MVP, manual polyline drawing is acceptable.

Do not require paid routing API.

---

# 17. ROUTE DRAWING

If existing project already uses Leaflet Draw or another route drawing method, complete it.

Otherwise use a simple implementation.

Possible optional library:

```text
leaflet-draw
react-leaflet-draw
```

But only add if necessary.

Avoid unnecessary dependencies.

---

# 18. START AND DESTINATION MARKERS

Display clearly:

```text
🏠 Start
🏢 Destination
```

Do not confuse these with CCTV or pothole markers.

---

# 19. POSTGIS ROUTE STORAGE

Backend should convert route coordinates to a PostGIS LineString.

Example conceptual SQL:

```text
LINESTRING(
  longitude latitude,
  longitude latitude,
  longitude latitude
)
```

Use SRID:

```text
4326
```

Verify current geometry setup before changing schema.

---

# 20. FIND CCTV NEAR ROUTE

Implement or validate endpoint:

```text
GET /api/routes/{id}/traffic
```

Backend should use PostGIS spatial queries.

Concept:

```text
Route LineString
      ↓
buffer / distance query
      ↓
CCTV near route
```

Use configurable value:

```text
CAMERA_ROUTE_BUFFER_METERS=500
```

Do not calculate spatial distance using naive degree subtraction.

Use PostGIS geography or appropriate metric conversion.

---

# 21. FIND POTHOLES NEAR ROUTE

Implement or validate:

```text
GET /api/routes/{id}/potholes
```

Use:

```text
POTHOLE_ROUTE_BUFFER_METERS=100
```

Return:

```text
pothole
distance_from_route
```

Do not match potholes that are far from the route.

---

# 22. ROUTE DETAIL PAGE

Create or complete:

```text
/routes/[id]
```

Display:

```text
Route Name
Route Type
Map
Traffic Cameras Near Route
Potholes Near Route
Overall Traffic Status
Commute Briefing
```

Example layout:

```text
Rute Pulang

[ MAP ]

Traffic:
- Simpang Polda: PADAT
- Simpang Charitas: MACET

Potholes:
- PH-001: 32 m dari rute
- PH-002: 71 m dari rute
```

---

# 23. DASHBOARD MAP PREVIEW

Dashboard should include a smaller map preview.

Suggested section:

```text
Current Road Conditions
```

Show:

- selected commute route
- current CCTV statuses
- potholes near route

Click:

```text
View Full Map
```

to navigate to:

```text
/map
```

---

# 24. CCTV DETAIL PAGE MAP

On:

```text
/cctv/[id]
```

show a small map containing:

- selected camera
- camera name
- road
- current traffic status

Do not load all map data unnecessarily on camera detail page.

---

# 25. POTHOLE DETAIL MAP

If pothole detail page exists, display exact recorded map point.

Do not imply GPS precision beyond the source data.

---

# 26. MAP FILTERS

Add map filters.

At minimum:

```text
[✓] CCTV
[✓] Potholes
[✓] Routes
```

Traffic filter:

```text
All
Lancar
Sedang
Padat
Macet
```

Pothole filter:

```text
Active
Repaired
Unverified
```

---

# 27. ROUTE SELECTION

Add:

```text
Selected Route
```

Dropdown:

```text
Rute Berangkat
Rute Pulang
Custom Route
```

When selected:

- highlight the route
- show CCTV cameras near route
- show potholes near route
- optionally dim unrelated markers

---

# 28. USER LOCATION

Do not require location access.

Optional button:

```text
Gunakan Lokasi Saya
```

Only request browser geolocation after explicit user interaction.

Handle denied permission gracefully.

Do not store precise live location unless the project explicitly requires it.

---

# 29. MAP API CLIENT

Centralize API calls.

Example:

```text
frontend/lib/api/map.ts
```

Functions:

```text
getCameras()
getCurrentTraffic()
getPotholes()
getRoutes()
getRoute(id)
getRouteTraffic(id)
getRoutePotholes(id)
```

Do not scatter raw fetch calls across many components.

---

# 30. DATA TYPES

Create proper TypeScript types.

Example:

```text
Camera
TrafficStatus
Pothole
Route
RouteTraffic
GeoJSONLineString
```

Avoid excessive `any`.

---

# 31. LOADING STATE

Map should handle API loading.

Show:

```text
Memuat data peta...
```

Do not display an empty map with no indication that data is loading.

---

# 32. ERROR STATE

If API fails:

```text
Gagal memuat data CCTV.
Coba lagi.
```

Do not crash the page.

Allow map itself to still render when one data source fails.

Example:

- cameras fail
- potholes still load

Do not make all map layers depend on one request.

---

# 33. EMPTY STATE

If no CCTV data:

```text
Belum ada CCTV aktif.
```

If no potholes:

```text
Belum ada data jalan berlubang.
```

If no saved route:

```text
Belum ada rute tersimpan.
```

---

# 34. AUTO REFRESH TRAFFIC

Traffic data changes frequently.

Implement polling for traffic status.

Suggested configurable interval:

```text
MAP_TRAFFIC_REFRESH_SECONDS=30
```

Do not reload the entire page.

Only refresh traffic data.

Do not refresh static potholes every few seconds.

---

# 35. CAMERA ONLINE STATUS

If backend provides stream health, show:

```text
ONLINE
OFFLINE
RECONNECTING
```

Do not show stale traffic values as current when camera is offline.

---

# 36. TIMESTAMP HANDLING

Use:

```text
Asia/Jakarta
```

for displayed commute times.

Backend can remain UTC internally if already designed that way.

Frontend should display human-readable local time.

Example:

```text
Terakhir diperbarui 16:42 WIB
```

---

# 37. PERFORMANCE

Do not render thousands of markers inefficiently.

For current capstone scale, normal markers are fine.

But structure code so marker clustering can later be added.

If marker count becomes large, consider:

```text
Leaflet.markercluster
```

Do not add it unless needed.

---

# 38. RESPONSIVE DESIGN

Map must work on:

```text
desktop
tablet
mobile
```

Minimum practical map height:

```text
desktop: approximately 600px
mobile: approximately 450px
```

Use responsive CSS/Tailwind.

---

# 39. MAP CONTROLS

Add useful controls:

```text
Zoom In
Zoom Out
Fit Selected Route
Reset to Palembang
Layer Filters
```

Implement:

```text
Fit Route
```

using Leaflet bounds.

---

# 40. SELECT CAMERA FROM MAP

When user clicks camera marker:

show popup.

Optional action:

```text
Lihat CCTV
```

Navigate to:

```text
/cctv/{id}
```

---

# 41. SELECT POTHOLE FROM MAP

Popup action:

```text
Lihat Detail
```

Navigate to pothole detail if page exists.

Otherwise show full details inside popup.

---

# 42. ROUTE BRIEFING MAP INTEGRATION

When a saved route is selected, call:

```text
GET /api/routes/{id}/briefing
```

Display briefing beside the map.

Example:

```text
Rute pulang sedang PADAT.

Jl. Sudirman terpantau padat dan volume kendaraan meningkat.

1 pothole aktif ditemukan di sekitar rute.
```

Do not let frontend invent briefing data.

---

# 43. N8N RELATION

Map does not directly call n8n.

Correct architecture:

```text
Map / User Route
        ↓
FastAPI + PostGIS
        ↓
Structured Route Data
        ↓
n8n
        ↓
Telegram
```

Do not connect browser directly to n8n credentials.

---

# 44. CCTV / ROUTE RELATION

Important:

A CCTV marker represents the camera's physical location.

Its traffic data represents the monitored road/area.

Do not claim the CCTV knows traffic conditions for an entire long road unless backend metadata explicitly defines its coverage.

Prefer:

```text
Jl. Sudirman — area Simpang Polda
```

rather than:

```text
Entire Jl. Sudirman is congested
```

---

# 45. POTHOLE / ROUTE RELATION

Pothole coordinates come from manual road recording + GPS.

Do not infer pothole coordinates from CCTV.

Show GPS uncertainty if available.

---

# 46. BACKEND GEOJSON ENDPOINT OPTIONAL

If it makes the frontend significantly cleaner, create:

```text
GET /api/map/features
```

Possible GeoJSON FeatureCollection:

```json
{
  "type": "FeatureCollection",
  "features": []
}
```

Feature types:

```text
camera
pothole
route
```

However:

Do not duplicate existing APIs unnecessarily.

If current APIs work cleanly, use them.

---

# 47. TESTS

Add backend tests for:

- camera coordinates
- pothole coordinates
- route GeoJSON serialization
- route PostGIS storage
- cameras near route
- potholes near route
- invalid coordinates

Add frontend tests where practical for:

- data conversion
- route coordinate conversion
- map helper functions

Run:

```bash
pytest
npm run lint
npm run typecheck
npm run build
```

Use actual project commands if different.

---

# 48. IMPORTANT COORDINATE TEST

Explicitly test coordinate orientation.

GeoJSON:

```text
[lng, lat]
```

Leaflet:

```text
[lat, lng]
```

Create helper function.

Example:

```text
geoJsonToLeafletLatLng()
```

This must have a unit test.

---

# 49. DO NOT FAKE MAP DATA

Do not create fake CCTV or pothole data and silently present it as real.

If demo data is used:

show label:

```text
DEMO
```

---

# 50. DEMO MODE

Map must support demo mode.

When:

```text
DEMO_MODE=true
```

it may show seeded demo:

- cameras
- traffic
- potholes
- route

Clearly identify them as demo.

When real data exists, use real database records.

---

# 51. END-TO-END MAP TEST

Perform this scenario.

## Scenario 1

Open:

```text
/map
```

Expected:

```text
Palembang map visible
CCTV markers visible
Pothole markers visible
```

## Scenario 2

Select:

```text
Rute Pulang
```

Expected:

```text
route polyline appears
nearby CCTV highlighted
nearby potholes highlighted
```

## Scenario 3

Click CCTV.

Expected popup:

```text
name
road
traffic
trend
last update
```

## Scenario 4

Click pothole.

Expected popup:

```text
confidence
severity
status
date
```

## Scenario 5

Open route detail.

Expected:

```text
map
route
traffic cameras
potholes
briefing
```

---

# 52. DOCUMENTATION

Create:

```text
docs/MAP_INTEGRATION.md
```

Document:

- architecture
- Leaflet setup
- API endpoints
- coordinate formats
- PostGIS queries
- route matching
- map filters
- refresh behavior
- demo mode
- limitations

Update README with map instructions.

---

# 53. FINAL SUCCESS CRITERIA

The map integration is complete only when:

- `/map` works
- OpenStreetMap loads
- CCTV data comes from API/database
- pothole data comes from API/database
- route data comes from API/database
- traffic status appears on CCTV markers
- CCTV popup works
- pothole popup works
- saved routes appear as polylines
- user can create/save route
- CCTV near route can be queried
- potholes near route can be queried
- route briefing appears
- traffic data refreshes
- errors are handled
- frontend build passes
- backend tests pass

Do not report completion before these are tested.

---

# 54. EXECUTION ORDER

Execute in this exact order:

1. Inspect existing map/frontend code.
2. Inspect backend map-related endpoints.
3. Inspect PostGIS models.
4. Create `docs/MAP_INTEGRATION.md`.
5. Fix/install Leaflet dependencies if needed.
6. Create/fix map components.
7. Connect camera API.
8. Connect traffic API.
9. Connect pothole API.
10. Connect route API.
11. Fix GeoJSON serialization if needed.
12. Add route polyline.
13. Add camera markers.
14. Add pothole markers.
15. Add popups.
16. Add legend.
17. Add layer filters.
18. Add route selection.
19. Add route creation/editing.
20. Save route to backend.
21. Implement/verify PostGIS camera-near-route query.
22. Implement/verify pothole-near-route query.
23. Integrate route briefing.
24. Add dashboard map preview.
25. Add CCTV detail mini-map.
26. Add loading/error/empty states.
27. Add traffic polling.
28. Test coordinate conversion.
29. Run backend tests.
30. Run frontend lint/typecheck/build.
31. Fix all errors.
32. Perform full end-to-end map test.
33. Update README.
34. Produce final report.

Do not stop after creating visual markers.

The map must be connected end-to-end.

---

# 55. FINAL REPORT FORMAT

At the end report:

## Map

```text
/map: WORKING / NOT WORKING
```

## CCTV Markers

```text
API connected:
Traffic connected:
Popup:
Online/offline state:
```

## Potholes

```text
API connected:
Markers:
Popup:
Evidence image:
```

## Routes

```text
Route creation:
Route saving:
Route loading:
Polyline:
PostGIS:
```

## Spatial Queries

```text
CCTV near route:
Potholes near route:
```

## Briefing

```text
Route briefing integrated:
```

## Frontend

Report:

```text
lint
typecheck
build
```

## Backend Tests

Report exact test command and result.

## Fixed Issues

List actual issues fixed.

## Remaining Issues

Only genuine unresolved issues.

## Files Modified

List the important files modified.

## Start Command

Give exact commands to run the application.

---

# 56. START NOW

Start by inspecting the existing repository.

Do not ask me to explain the project again.

Do not rebuild working backend/frontend modules.

Do not stop after producing a plan.

Continue directly into implementation and testing.

Begin now.
