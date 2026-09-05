# Map Integration — Smart Road Monitoring & Commuter Assistant

Dokumentasi lengkap mengenai arsitektur, implementasi teknis, konvensi koordinat, query spasial, dan integrasi Leaflet / OpenStreetMap pada aplikasi Smart Road Monitoring & Commuter Assistant.

---

## 1. Arsitektur Integrasi Peta

Integrasi peta menghubungkan seluruh lapisan data dari database spasial hingga visualisasi interaktif di antarmuka web:

```text
PostgreSQL / PostGIS (atau SQLite fallback)
         │
         │  (Geometry WKT: POINT(lon lat), LINESTRING(lon lat, ...))
         ▼
      FastAPI
         │  • /api/cameras
         │  • /api/traffic/current
         │  • /api/potholes
         │  • /api/routes
         │  • /api/routes/{id}/traffic   (kamera dekat rute via ST_DWithin)
         │  • /api/routes/{id}/potholes  (lubang dekat rute via ST_DWithin)
         │  • /api/routes/{id}/briefing  (kondisi lalu lintas & ringkasan rute)
         │  • /evidence/{filename}       (static thumbnail bukti lubang jalan)
         ▼
  Next.js (App Router)
         │  • /map (Peta interaktif terpadu)
         │  • /dashboard (Preview kondisi jalan Palembang)
         │  • /cctv/[id] (Mini-map lokasi titik kamera)
         ▼
  SmartRoadMap (Leaflet / OpenStreetMap)
         ├── CameraMarker (Status pin: LANCAR, SEDANG, PADAT, MACET, OFFLINE)
         ├── PotholeMarker (Severity pin: LOW, MEDIUM, HIGH, UNKNOWN + thumbnail)
         ├── RouteLayer (Polyline rute tersimpan, start/destination pin, route draft)
         ├── MapControls (Reset ke Palembang, Fit Bounds rute, Geolocation GPS)
         └── MapLegend (Legenda visual status & layer filter)
```

---

## 2. Komponen Peta Frontend (`frontend/components/map/`)

Semua komponen peta dipisahkan secara modular untuk mempermudah pemeliharaan dan pengujian:

| Komponen | Jalur Berkas | Fungsi Utama |
|---|---|---|
| `SmartRoadMap` | `frontend/components/map/SmartRoadMap.tsx` | Kontainer utama `MapContainer` Leaflet. Merender tile OSM, marker kamera, marker pothole, layer rute, kontrol navigasi, dan menangani interaksi klik koordinat. |
| `CameraMarker` | `frontend/components/map/CameraMarker.tsx` | Render pin kustom menggunakan `L.divIcon` dengan warna dan lencana status lalu lintas (`✓`, `~`, `!`, `!!`). Membuka popup berisi metrik kendaraan/menit, skor kongesti, tren, status demo, dan tautan detail `/cctv/[id]`. |
| `PotholeMarker` | `frontend/components/map/PotholeMarker.tsx` | Render marker peringatan jalan berlubang dengan palet warna tingkat keparahan (*severity*). Popup menyajikan persentase keyakinan model (*confidence*), tanggal deteksi, nama jalan, dan pratinjau thumbnail bukti foto via `/evidence/`. |
| `RouteLayer` | `frontend/components/map/RouteLayer.tsx` | Render polyline rute pengguna aktif. Menampilkan pin awal (🏠) dan pin tujuan (🏢), mendukung penyorotan (*highlight*) rute terpilih serta peredupan (*dimming*) rute lain, dan menampilkan draf rute titik per titik saat pembuatan rute baru. |
| `MapControls` | `frontend/components/map/MapControls.tsx` | Tombol kontrol UI peta: tombol *Reset Center* ke pusat Kota Palembang (`[-2.981, 104.748]`), tombol *Fit Bounds* untuk otomatis memperbesar/memusatkan ke batas rute aktif, dan tombol *GPS Geolocation* dengan penanganan izin peramban yang aman. |
| `MapLegend` | `frontend/components/map/MapLegend.tsx` | Legenda mengambang (*floating*) yang dapat diciutkan (*collapsible*), menjelaskan kode warna status lalu lintas dan simbol objek jalan. |
| `MapPanel` | `frontend/components/map-panel.tsx` | Pembungkus aman SSR (*Server-Side Rendering*) menggunakan `next/dynamic` dengan opsi `ssr: false` agar Leaflet tidak memicu kesalahan `window is not defined`. |

---

## 3. Konvensi dan Transformasi Koordinat

Kesalahan umum dalam sistem GIS web adalah tertukarnya urutan Latitude dan Longitude. Sistem ini menerapkan aturan ketat:

### Standar Koordinat
1. **GeoJSON Standard:** `[longitude, latitude]`
2. **PostGIS WKT:** `POINT(longitude latitude)` dan `LINESTRING(lon lat, lon lat, ...)`
3. **Leaflet / UI Standard:** `[latitude, longitude]` atau `{ lat, lng }`
4. **Kota Palembang Default Center:** Latitude `-2.981`, Longitude `104.748`

### Fungsi Utilitas (`frontend/lib/map-utils.ts`)
- `geoJsonToLeafletLatLng([lng, lat]): [lat, lng]`
- `leafletToGeoJsonLatLng([lat, lng]): [lng, lat]`
- `calculateBounds(coords): LatLngBoundsExpression | null`

Unit test otomatis pada backend (`backend/tests/test_map_integration.py`) secara berkala memverifikasi kebenaran orientasi koordinat ini.

---

## 4. Query Spasial dan Pencocokan Rute

Backend menyediakan endpoint spasial deterministik yang mengidentifikasi kamera CCTV dan lubang jalan dalam radius tertentu di sekitar rute perjalanan komuter:

- **Kamera Dekat Rute:** `GET /api/routes/{route_id}/traffic`
  - Menggunakan fungsi PostGIS `ST_DWithin(route.geometry, camera.location, buffer_meters)`
  - Nilai *buffer* default: **150 meter** (dapat diatur lewat konfigurasi `CAMERA_ROUTE_BUFFER_METERS`).
- **Lubang Dekat Rute:** `GET /api/routes/{route_id}/potholes`
  - Menggunakan `ST_DWithin(route.geometry, pothole.location, buffer_meters)`
  - Nilai *buffer* default: **50 meter** (dapat diatur lewat `POTHOLE_ROUTE_BUFFER_METERS`).
- **Commute Briefing:** `GET /api/routes/{route_id}/briefing`
  - Merangkum status keseluruhan lalu lintas (`LANCAR`, `SEDANG`, `PADAT`, `MACET`), total kendaraan, tren pergerakan, dan daftar lubang jalan berbahaya di sepanjang rute.
- **SQLite Fallback:**
  - Saat dijalankan di lingkungan pengujian tanpa PostGIS, sistem menggunakan perhitungan jarak Haversine dan proyeksi titik ke segmen garis (*perpendicular distance*) untuk menjamin pengujian tetap 100% lulus.

---

## 5. Integrasi Halaman Web

Peta terintegrasi pada tiga halaman utama aplikasi:

1. **Halaman Peta Terpadu (`/map`):**
   - Layar penuh (*full viewport*) dengan panel kontrol layer: sakelar visibilitas CCTV, Potholes, dan Rute.
   - Filter status lalu lintas (Lancar, Sedang, Padat, Macet, Offline).
   - Pemilihan rute aktif dari menu dropdown dengan pemusatan otomatis (*auto-fit bounds*).
   - Panel ringkasan briefing komuter di sisi kanan.
   - Polling pembaruan lalu lintas berkala setiap 30 detik.
2. **Dashboard Utama (`/dashboard`):**
   - Komponen "Kondisi Jalan & Peta Terpadu" menampilkan pratinjau peta berukuran medium.
   - Terhubung langsung ke data CCTV aktif dan laporan lubang terbaru Kota Palembang.
3. **Detail CCTV (`/cctv/[id]`):**
   - Mini-map di panel samping menampilkan posisi akurat kamera di jaringan jalan Palembang dengan marker interaktif.

---

## 6. Penyajian Thumbnail Bukti Pothole

Bukti deteksi visual jalan berlubang disimpan oleh pipeline inferensi di folder `vision/evidence/`. FastAPI menyajikan berkas ini secara statis melalui:
- URL: `GET http://localhost:8000/evidence/{filename}`
- Penanganan di frontend: Jika `image_path` tersedia, komponen `PotholeMarker` merender gambar mini (thumbnail). Jika belum ada foto, antarmuka menampilkan placeholder penanda bukti belum tersedia tanpa merusak tampilan.

---

## 7. Verifikasi dan Pengujian

Pengujian end-to-end integrasi peta dapat dijalankan dengan perintah:

```bash
# 1. Backend tests (termasuk 5 pengujian integrasi peta & spasial)
.venv/bin/pytest backend/tests

# 2. Python lint check
.venv/bin/ruff check backend scripts training vision pothole_worker.py

# 3. Frontend lint dan TypeScript typecheck
cd frontend
npm run lint
npm run typecheck

# 4. Frontend production build
npm run build
```
