# n8n remote dan WhatsApp

Draft workflow sudah dibuat pada n8n remote dengan nama **Smart Road - Commute Briefing (WhatsApp Ready)**. Salinan yang siap diimpor tersedia di `n8n/workflows/commute-briefing-whatsapp.json`.

## Perilaku workflow

1. `Every Minute` menjalankan pemeriksaan setiap menit.
2. `Get Active Routes` mengambil daftar rute dari FastAPI.
3. `Filter Routes Due Now` memilih rute aktif berdasarkan `notification_time`. Jika kosong, jadwal fallback adalah 06:45 untuk `commute_to_work` dan 16:45 untuk `commute_home` dalam zona waktu Asia/Jakarta.
4. `Get Deterministic Briefing` mengambil status dan pesan yang sudah dihitung oleh backend.
5. `WhatsApp Outbox — Connect Provider Here` membentuk payload WhatsApp, tetapi tidak mengirim apa pun.

Outbox sengaja menghasilkan `recipient_phone` kosong, `delivery_status=pending_provider_configuration`, dan `ready_to_send=false`. Workflow tetap draft sampai provider WhatsApp, nomor tujuan, dan credential selesai dikonfigurasi.

## Konfigurasi sekarang

Atur environment pada server n8n remote:

```dotenv
BACKEND_API_URL=https://api.example.com
GENERIC_TIMEZONE=Asia/Jakarta
TZ=Asia/Jakarta
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

`BACKEND_API_URL` harus dapat dijangkau dari server n8n. `localhost:8000` pada server remote tidak menunjuk ke backend yang berjalan di laptop ini.

## Menyambungkan WhatsApp nanti

1. Pilih provider, misalnya WhatsApp Business Cloud API atau Twilio WhatsApp.
2. Tambahkan penyimpanan nomor WhatsApp pada profil pengguna atau layanan pemetaan `recipient_user_id` ke nomor E.164.
3. Tambahkan node provider setelah `WhatsApp Outbox — Connect Provider Here`.
4. Petakan nomor tujuan dari `recipient_phone` dan isi pesan dari `message`.
5. Simpan token/API key di credential store n8n, bukan di workflow JSON.
6. Uji dengan nomor sandbox/test, baru ubah status kesiapan dan publish workflow.

Status kemacetan tetap dihitung secara deterministik oleh FastAPI; n8n hanya menjadwalkan, mengambil briefing, dan menyiapkan payload pengiriman.
