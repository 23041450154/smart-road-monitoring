#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " [LAJU SMART ROAD] Setup UpCloud VPS (Backend & Vision)   "
echo "=========================================================="

# 1. Pastikan dieksekusi sebagai root
if [ "$EUID" -ne 0 ]; then
  echo "[-] Harap jalankan script ini sebagai root (atau gunakan sudo bash $0)"
  exit 1
fi

# 2. Setup Swap 2GB jika belum ada (Mencegah RDP + Docker kehabisan RAM)
if [ ! -f /swapfile ]; then
  echo "[+] Membuat Swapfile 2GB untuk stabilitas RAM (Desktop RDP + Docker)..."
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "[+] Swapfile 2GB berhasil diaktifkan."
else
  echo "[*] Swapfile sudah ada."
fi

# 3. Setup OpenSSH & Firewall (UFW)
echo "[+] Mengonfigurasi OpenSSH & UFW Firewall..."
apt-get update -y
apt-get install -y openssh-server ufw curl git docker.io docker-compose-v2

# Pastikan port penting dibuka
ufw allow 22/tcp comment 'SSH'
ufw allow 3389/tcp comment 'RDP'
ufw allow 8000/tcp comment 'Capstone Backend API'
ufw --force enable

systemctl enable --now ssh
systemctl enable --now docker

# Setup SSH Authorized Keys
mkdir -p /root/.ssh
chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

KEY_1="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICrr7FevwC5vkX+f4ZlVa7SAHd6G+TUWS03QIwXvYrG1 upcloud-server"
KEY_2="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEvJ+qT7S60vnINnnmg5zMlZiRvPXrowuoUX8uAsYYHH naufal@vps"

grep -qxF "$KEY_1" /root/.ssh/authorized_keys || echo "$KEY_1" >> /root/.ssh/authorized_keys
grep -qxF "$KEY_2" /root/.ssh/authorized_keys || echo "$KEY_2" >> /root/.ssh/authorized_keys

echo "[+] SSH dan Firewall berhasil disiapkan."

# 4. Clone atau Update Repository Capstone
TARGET_DIR="/root/capstone"
echo "[+] Menyiapkan repository di $TARGET_DIR..."

if [ -d "$TARGET_DIR/.git" ]; then
  echo "[*] Repository sudah ada, melakukan git pull..."
  cd "$TARGET_DIR"
  git fetch origin main
  git reset --hard origin/main
else
  echo "[*] Melakukan git clone..."
  rm -rf "$TARGET_DIR"
  git clone https://github.com/23041450154/smart-road-monitoring.git "$TARGET_DIR"
  cd "$TARGET_DIR"
fi

# 5. Konfigurasi File .env Produksi
echo "[+] Menyiapkan file .env..."
cat << 'ENVEOF' > "$TARGET_DIR/.env"
APP_ENV=production
APP_NAME=Smart Road Monitoring API
DEMO_MODE=false
DATABASE_URL=postgresql+psycopg://postgres.yqdpsrgbjyzufkozzhno:Garena123%40%23%23@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
BACKEND_PORT=8000
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://95.111.196.118:8000
NEXT_PUBLIC_DEMO_MODE=false
CORS_ORIGINS=https://lajusmart.app,https://www.lajusmart.app,http://localhost:3000,http://95.111.196.118:3000
CAMERA_SOURCE=live
CAMERA_STREAM_URL=vision/samples/traffic.mp4
CAMERA_RECONNECT_SECONDS=2
YOLO_MODEL=yolo11n.pt
YOLO_CONFIDENCE=0.35
YOLO_DEVICE=cpu
TRAFFIC_SNAPSHOT_SECONDS=60
POTHOLE_MODEL_PATH=vision/models/pothole/best.pt
POTHOLE_CONFIDENCE_THRESHOLD=0.40
POTHOLE_DEMO_MODE=true
POTHOLE_DUPLICATE_RADIUS_METERS=10
POTHOLE_TEMPORAL_WINDOW_SECONDS=2.0
POTHOLE_TEMPORAL_IOU_THRESHOLD=0.2
POTHOLE_TEMPORAL_CENTER_THRESHOLD=0.12
CAMERA_ROUTE_BUFFER_METERS=500
POTHOLE_ROUTE_BUFFER_METERS=100
BRIEFING_MODE=template
OMP_NUM_THREADS=1
OPENVINO_NUM_THREADS=1
MKL_NUM_THREADS=1
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=re_xxxxxxxxxxxxxxxxxxxx
SMTP_FROM_NAME=Smart Road Palembang (LAJU)
SMTP_FROM_EMAIL=no-reply@naufal.me
SMTP_USE_TLS=true
ENVEOF

# 6. Unduh Model YOLO11n agar Docker Mount tidak error (tidak jadi folder kosong)
if [ ! -f "$TARGET_DIR/yolo11n.pt" ]; then
  echo "[+] Mengunduh model YOLO11n..."
  curl -L -o "$TARGET_DIR/yolo11n.pt" https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt
fi

mkdir -p "$TARGET_DIR/yolo11n_openvino_model"

# 7. Build & Jalankan Docker Container Produksi
echo "[+] Menjalankan Docker Compose Produksi..."
cd "$TARGET_DIR"
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up --build -d --remove-orphans

# 8. Cek Kesehatan Container
echo "[+] Menunggu inisialisasi kontainer backend (15 detik)..."
sleep 15
docker compose -f docker-compose.prod.yml ps

echo "=========================================================="
echo "[✓] SETUP SELESAI!"
echo "Backend API & Stream: http://95.111.196.118:8000"
echo "Healthcheck:          http://95.111.196.118:8000/health"
echo "=========================================================="
