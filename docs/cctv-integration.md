# Integrasi CCTV Publik yang Sah

Sistem ini tidak menyertakan dan tidak mengarang endpoint CCTV Palembang. Konfigurasi bawaan menunjuk ke video lokal `vision/samples/traffic.mp4` dan seluruh kamera seed diberi label **DEMO**.

## Syarat akses

Tambahkan stream hanya jika URL memang ditampilkan untuk akses publik atau organisasi Anda memberikan izin tertulis. Jangan mencoba menebak credential, membuka endpoint internal, melewati login, mengubah token, atau menyalin stream yang syarat penggunaannya melarang pemrosesan otomatis.

## Menemukan format pada halaman publik yang diizinkan

1. Buka halaman CCTV resmi di browser.
2. Buka Developer Tools lalu tab **Network**.
3. Muat ulang halaman dan periksa filter **Media**, **Fetch/XHR**, serta nama berakhiran `.m3u8`.
4. Pastikan request dapat diakses tanpa mengubah autentikasi dan penggunaan ulangnya diizinkan.
5. Catat format yang sah:
   - HLS: URL HTTPS berakhiran `.m3u8`.
   - RTSP: `rtsp://...` dari penyedia yang memberi izin.
   - MJPEG: response multipart image.
   - WebRTC: membutuhkan adapter signaling tersendiri dan bukan bagian MVP.
6. Uji URL secara read-only:

   ```bash
   .venv/bin/python scripts/check_stream.py "<public-stream-url>"
   ```

Script hanya meminta FFprobe/OpenCV membaca stream. Tidak ada bypass atau pengambilan credential.

## Menambahkan konfigurasi

Gunakan dashboard **CCTV → Tambah CCTV** atau REST API:

```bash
curl -X POST http://localhost:8000/api/cameras \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Nama resmi kamera",
    "road_name": "Nama ruas jalan",
    "latitude": -2.99,
    "longitude": 104.76,
    "stream_type": "hls",
    "stream_url": "<authorized-public-url>",
    "is_demo": false,
    "low_threshold": 20,
    "medium_threshold": 45,
    "high_threshold": 75
  }'
```

Threshold harus dikalibrasi per kamera/ruas. Jangan menyimpulkan satu nilai universal untuk semua jalan.

Untuk menjalankan worker, `CAMERA_SOURCE` dan `CAMERA_STREAM_URL` dapat menimpa nilai kamera di database:

```bash
export CAMERA_SOURCE=hls
export CAMERA_STREAM_URL='<authorized-public-url>'
PYTHONPATH=backend:. .venv/bin/python -m vision.traffic_worker.worker --camera-id 1
```

Worker melakukan reconnect dengan exponential backoff sampai 60 detik. Putusnya satu sumber tidak menghentikan API atau kamera lain yang dijalankan sebagai proses terpisah.

## Demo lokal

Taruh video jalan yang Anda berhak gunakan di:

```text
vision/samples/traffic.mp4
```

Kemudian gunakan `CAMERA_SOURCE=local`. Model YOLO dapat mengunduh bobot publik pada run pertama; siapkan bobot secara lokal jika lingkungan tidak memiliki internet.
