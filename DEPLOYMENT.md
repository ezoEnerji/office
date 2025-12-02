# EzoOffice - Google Cloud VM Deployment Rehberi

Bu rehber, EzoOffice ERP sistemini Google Cloud'da iki ayrı VM'de (PostgreSQL ve Uygulama) kurmak için adım adım talimatlar içerir.

## 📋 Gereksinimler

- Google Cloud hesabı
- 2 adet VM instance (PostgreSQL için bir, Uygulama için bir)
- SSH erişimi
- Domain adı (opsiyonel, IP ile de çalışır)

---

## 🗄️ VM 1: PostgreSQL Veritabanı Sunucusu

### 1. VM Oluşturma

```bash
# Google Cloud Console'dan veya gcloud CLI ile
gcloud compute instances create ezooffice-db \
  --zone=us-central1-a \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --tags=postgresql-server
```

### 2. Firewall Kuralları

```bash
# Sadece uygulama VM'inden PostgreSQL portuna erişim izni
gcloud compute firewall-rules create allow-postgres-from-app \
  --allow tcp:5432 \
  --source-tags=ezooffice-app \
  --target-tags=postgresql-server \
  --description="Allow PostgreSQL from app server"
```

### 3. PostgreSQL Kurulumu

VM'e SSH ile bağlanın:
```bash
gcloud compute ssh ezooffice-db --zone=us-central1-a
```

VM içinde:
```bash
# Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# PostgreSQL kurulumu
sudo apt install postgresql postgresql-contrib -y

# PostgreSQL versiyonunu kontrol et
sudo -u postgres psql -c "SELECT version();"
```

### 4. PostgreSQL Yapılandırması

```bash
# PostgreSQL config dosyasını düzenle
sudo nano /etc/postgresql/14/main/postgresql.conf

# Şu satırları bulun ve değiştirin:
# listen_addresses = 'localhost'  →  listen_addresses = '*'
# max_connections = 100  →  max_connections = 200

# pg_hba.conf dosyasını düzenle (uzaktan bağlantı için)
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Dosyanın sonuna ekleyin:
# host    all             all             10.0.0.0/8              md5
# (10.0.0.0/8 yerine uygulama VM'inin IP subnet'ini kullanın)

# PostgreSQL'i yeniden başlat
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### 5. Veritabanı ve Kullanıcı Oluşturma

```bash
# PostgreSQL'e bağlan
sudo -u postgres psql

# Veritabanı ve kullanıcı oluştur
CREATE DATABASE ezooffice;
CREATE USER ezooffice_user WITH ENCRYPTED PASSWORD 'güçlü_şifre_buraya';
GRANT ALL PRIVILEGES ON DATABASE ezooffice TO ezooffice_user;
ALTER DATABASE ezooffice OWNER TO ezooffice_user;

# Schema izinleri
\c ezooffice
GRANT ALL ON SCHEMA public TO ezooffice_user;
ALTER SCHEMA public OWNER TO ezooffice_user;

# Çıkış
\q
```

### 6. Güvenlik (Opsiyonel ama Önerilir)

```bash
# UFW firewall kurulumu
sudo apt install ufw -y
sudo ufw allow 22/tcp  # SSH
sudo ufw allow from 10.0.0.0/8 to any port 5432  # Sadece uygulama VM'inden
sudo ufw enable
```

### 7. Connection String

Uygulama VM'inden bağlanmak için connection string:
```
postgresql://ezooffice_user:güçlü_şifre_buraya@[DB_VM_INTERNAL_IP]:5432/ezooffice?schema=public
```

**Not:** Internal IP kullanın (10.x.x.x), external IP değil.

---

## 🚀 VM 2: Uygulama Sunucusu (Backend + Frontend)

### 1. VM Oluşturma

```bash
gcloud compute instances create ezooffice-app \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --tags=ezooffice-app
```

### 2. Firewall Kuralları

```bash
# HTTP ve HTTPS erişimi
gcloud compute firewall-rules create allow-http-https \
  --allow tcp:80,tcp:443,tcp:3001 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=ezooffice-app \
  --description="Allow HTTP, HTTPS and API"
```

### 3. Node.js ve NPM Kurulumu

VM'e SSH ile bağlanın:
```bash
gcloud compute ssh ezooffice-app --zone=us-central1-a
```

VM içinde:
```bash
# Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# Node.js 20.x kurulumu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Versiyon kontrolü
node --version
npm --version

# PM2 kurulumu (process manager)
sudo npm install -g pm2
```

### 4. Uygulama Dosyalarını Yükleme

**Seçenek 1: Git ile (Önerilen)**
```bash
# Git kurulumu
sudo apt install git -y

# Projeyi klonla
cd /opt
sudo git clone [YOUR_REPO_URL] ezooffice
sudo chown -R $USER:$USER ezooffice
cd ezooffice
```

**Seçenek 2: Manuel Yükleme**
```bash
# SCP ile dosyaları yükle (local makineden)
# scp -r ./app user@VM_IP:/opt/ezooffice
```

### 5. Backend Kurulumu

```bash
cd /opt/ezooffice/server

# Dependencies kurulumu
npm install

# .env dosyası oluştur
nano .env
```

`.env` dosyası içeriği:
```env
DATABASE_URL="postgresql://ezooffice_user:güçlü_şifre_buraya@[DB_VM_INTERNAL_IP]:5432/ezooffice?schema=public"
JWT_SECRET="çok_güçlü_jwt_secret_key_buraya_minimum_32_karakter"
PORT=3001
NODE_ENV=production
```

**Önemli:** `[DB_VM_INTERNAL_IP]` yerine PostgreSQL VM'inin internal IP'sini yazın.

```bash
# Prisma setup
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Build
npm run build
```

### 6. Backend'i PM2 ile Çalıştırma

```bash
# PM2 ile başlat
cd /opt/ezooffice/server
pm2 start dist/index.js --name ezooffice-backend

# PM2 ayarları
pm2 save
pm2 startup  # Sistem açılışında otomatik başlatma için

# Log kontrolü
pm2 logs ezooffice-backend
```

### 7. Frontend Build ve Nginx Kurulumu

```bash
cd /opt/ezooffice

# Frontend dependencies
npm install

# .env dosyası oluştur
nano .env
```

`.env` dosyası içeriği:
```env
VITE_API_URL=http://[APP_VM_EXTERNAL_IP]:3001/api
```

```bash
# Frontend build
npm run build

# Nginx kurulumu
sudo apt install nginx -y

# Nginx config
sudo nano /etc/nginx/sites-available/ezooffice
```

Nginx config içeriği:
```nginx
server {
    listen 80;
    server_name [YOUR_DOMAIN] [APP_VM_EXTERNAL_IP];

    root /opt/ezooffice/dist;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Nginx config'i aktif et
sudo ln -s /etc/nginx/sites-available/ezooffice /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Nginx test ve restart
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 8. SSL Sertifikası (Let's Encrypt) - Opsiyonel

```bash
# Certbot kurulumu
sudo apt install certbot python3-certbot-nginx -y

# SSL sertifikası al
sudo certbot --nginx -d [YOUR_DOMAIN]

# Otomatik yenileme test
sudo certbot renew --dry-run
```

### 9. Dosya Yükleme Klasörü

```bash
# Uploads klasörü oluştur
mkdir -p /opt/ezooffice/server/uploads
chmod 755 /opt/ezooffice/server/uploads

# Nginx'ten erişilebilir yap
sudo ln -s /opt/ezooffice/server/uploads /opt/ezooffice/dist/uploads
```

---

## 🔧 Yapılandırma ve Test

### 1. PostgreSQL Bağlantı Testi

Uygulama VM'inden:
```bash
# PostgreSQL client kurulumu
sudo apt install postgresql-client -y

# Bağlantı testi
psql -h [DB_VM_INTERNAL_IP] -U ezooffice_user -d ezooffice
```

### 2. Backend Test

```bash
# Backend log kontrolü
pm2 logs ezooffice-backend

# API test
curl http://localhost:3001/api/health
```

### 3. Frontend Test

Tarayıcıdan: `http://[APP_VM_EXTERNAL_IP]`

---

## 🔄 Güncelleme İşlemleri

### Backend Güncelleme

```bash
cd /opt/ezooffice
git pull  # veya yeni dosyaları yükle

cd server
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build

pm2 restart ezooffice-backend
```

### Frontend Güncelleme

```bash
cd /opt/ezooffice
npm install
npm run build

sudo systemctl reload nginx
```

---

## 📊 Monitoring ve Loglar

### PM2 Monitoring

```bash
pm2 monit
pm2 list
pm2 logs
```

### Nginx Loglar

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### PostgreSQL Loglar

```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## 🛡️ Güvenlik Önerileri

1. **Firewall:** Sadece gerekli portları açın
2. **SSH:** Key-based authentication kullanın
3. **PostgreSQL:** Güçlü şifreler kullanın
4. **JWT Secret:** En az 32 karakter, rastgele string
5. **SSL:** Production'da mutlaka HTTPS kullanın
6. **Backup:** Düzenli veritabanı yedekleri alın

---

## 💾 Veritabanı Yedekleme

```bash
# PostgreSQL VM'inde
sudo -u postgres pg_dump ezooffice > /backup/ezooffice_$(date +%Y%m%d).sql

# Otomatik yedekleme scripti oluştur
sudo nano /usr/local/bin/backup-db.sh
```

Backup script:
```bash
#!/bin/bash
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
sudo -u postgres pg_dump ezooffice | gzip > $BACKUP_DIR/ezooffice_$DATE.sql.gz
find $BACKUP_DIR -name "ezooffice_*.sql.gz" -mtime +7 -delete
```

```bash
chmod +x /usr/local/bin/backup-db.sh

# Crontab ile günlük yedekleme
sudo crontab -e
# Şu satırı ekleyin:
# 0 2 * * * /usr/local/bin/backup-db.sh
```

---

## 🆘 Sorun Giderme

### Backend çalışmıyor
```bash
pm2 logs ezooffice-backend
pm2 restart ezooffice-backend
```

### PostgreSQL bağlantı hatası
- Firewall kurallarını kontrol edin
- PostgreSQL'in dinlediği IP'yi kontrol edin
- pg_hba.conf dosyasını kontrol edin

### Nginx 502 hatası
- Backend'in çalıştığını kontrol edin: `pm2 list`
- Nginx error log'larını kontrol edin
- Port 3001'in açık olduğunu kontrol edin

---

## 📝 Özet Checklist

- [ ] PostgreSQL VM oluşturuldu
- [ ] PostgreSQL kuruldu ve yapılandırıldı
- [ ] Veritabanı ve kullanıcı oluşturuldu
- [ ] Uygulama VM oluşturuldu
- [ ] Node.js ve PM2 kuruldu
- [ ] Backend kuruldu ve çalışıyor
- [ ] Frontend build edildi
- [ ] Nginx yapılandırıldı
- [ ] Firewall kuralları ayarlandı
- [ ] SSL sertifikası alındı (opsiyonel)
- [ ] Yedekleme sistemi kuruldu

---

**Not:** Tüm IP adreslerini ve domain'leri kendi ortamınıza göre değiştirmeyi unutmayın!

