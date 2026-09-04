# Manual Pothole Worker

Modul ini terpisah dari CCTV. Inputnya adalah video jalan yang direkam manual dan file GPX bertimestamp.

## Mode model terlatih

```bash
export POTHOLE_MODEL_PATH=vision/models/pothole/best.pt
export POTHOLE_CONFIDENCE_THRESHOLD=0.40
PYTHONPATH=backend:. .venv/bin/python pothole_worker.py \
  --video road.mp4 \
  --gps road.gpx
```

Severity default adalah `unknown`. Gunakan `--severity low|medium|high` hanya jika nilai tersebut berasal dari inspeksi atau metode lain yang dapat dipertanggungjawabkan. Confidence dan ukuran bounding box tidak dipakai sebagai ukuran kedalaman/keparahan.

## Mode demo eksplisit

```bash
PYTHONPATH=backend:. .venv/bin/python pothole_worker.py \
  --video road.mp4 \
  --gps vision/samples/road.gpx \
  --demo
```

Mode ini menciptakan event sintetis setiap beberapa detik dan mencatat peringatan `DEMO`; hasilnya bukan prediksi model dan tidak boleh digunakan sebagai penilaian akurasi.

## Sinkronisasi GPS

- Timestamp video dihitung dari nomor frame dan FPS.
- Awal video diasosiasikan dengan timestamp GPX pertama.
- Posisi di antara dua track point dihitung dengan interpolasi linear waktu.
- Posisi sebelum/sesudah rentang GPX memakai titik tepi terdekat.
- Akurasi dibatasi oleh timestamp kamera/GPX, frekuensi sampling GPS, multipath/sinyal buruk, dan fakta bahwa posisi kamera saat melihat pothole tidak selalu sama dengan posisi fisik pothole.
- Sinkronkan jam perangkat dan awal rekaman; offset yang salah akan menggeser semua koordinat.
- Temporal matching menekan box serupa selama `POTHOLE_TEMPORAL_WINDOW_SECONDS` sebelum spatial matching database.
- Deteksi dalam radius `POTHOLE_DUPLICATE_RADIUS_METERS` (default 10 m) digabungkan.

Potongan gambar bukti disimpan di `vision/evidence/` dan frame video penuh tidak disimpan ke database.
