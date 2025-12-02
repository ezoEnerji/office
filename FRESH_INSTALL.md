# EzoOffice - Temiz Kurulum Rehberi

Bu rehber, uygulama sunucusunda **tamamen temiz** bir kurulum yapmak için adım adım talimatlar içerir.

## 🎯 Temiz Kurulum Adımları

### 1. Mevcut Kurulumu Temizle

```bash
# Temizleme scriptini indirin ve çalıştırın
chmod +x clean-install.sh
./clean-install.sh
```

VEYA manuel olarak:

```bash
# PM2 process'lerini durdur
pm2 delete all
pm2 kill

# Nginx config'i kaldır
sudo rm -f /etc/nginx/sites-available/ezooffice
sudo rm -f /etc/nginx/sites-enabled/ezooffice
sudo systemctl reload nginx

# EzoOffice klasörünü sil
sudo rm -rf /opt/ezooffice

# PM2 startup'ı kaldır
pm2 unstartup systemd
```

### 2. Proje Dosyalarını Yükle

#### Yöntem A: Git ile (Önerilen)

```bash
cd /opt
sudo git clone [YOUR_GIT_REPO_URL] ezooffice
sudo chown -R $USER:$USER ezooffice
cd ezooffice
```

#### Yöntem B: SCP ile

```bash
# Local makineden (Windows PowerShell veya WSL)
scp -r ./src ezo_ezoenerji_com@34.51.217.25:/opt/ezooffice/
scp -r ./server ezo_ezoenerji_com@34.51.217.25:/opt/ezooffice/
scp index.html package.json vite.config.ts tsconfig.json ezo_ezoenerji_com@34.51.217.25:/opt/ezooffice/
scp setup-app.sh clean-install.sh ezo_ezoenerji_com@34.51.217.25:~/
```

#### Yöntem C: ZIP/RAR ile

```bash
# Local'de ZIP oluştur (node_modules ve dist hariç)
# Sunucuda:
cd /opt
unzip ezooffice.zip -d ezooffice
sudo chown -R $USER:$USER ezooffice
cd ezooffice
```

### 3. Kurulum Scriptini Çalıştır

```bash
cd /opt/ezooffice
chmod +x setup-app.sh
./setup-app.sh
```

Script şunları yapacak:
- ✅ Node.js ve npm kontrolü
- ✅ PM2 kurulumu
- ✅ Backend bağımlılıklarını yükleme
- ✅ Prisma schema oluşturma
- ✅ Veritabanı seed etme
- ✅ Backend build
- ✅ Backend'i PM2 ile başlatma
- ✅ Frontend bağımlılıklarını yükleme
- ✅ Frontend build
- ✅ Nginx yapılandırması
- ✅ Nginx restart

### 4. Kurulumu Doğrula

```bash
# Backend kontrolü
curl http://localhost:3001/api/health

# PM2 durumu
pm2 list

# Nginx durumu
sudo systemctl status nginx

# Nginx config test
sudo nginx -t
```

### 5. Tarayıcıdan Test Et

```
http://34.51.217.25
VEYA
http://office.ezoenerji.com
```

## 📋 Yüklenecek Dosyalar

### ✅ Mutlaka Yüklenecekler

```
src/                    # Frontend kaynak kodları
server/                 # Backend kaynak kodları
index.html
package.json
vite.config.ts
tsconfig.json
setup-app.sh
clean-install.sh
```

### ❌ Yüklenmeyecekler

```
node_modules/          # npm install ile oluşur
dist/                  # npm run build ile oluşur
server/node_modules/   # npm install ile oluşur
server/dist/           # npm run build ile oluşur
.env                   # Script otomatik oluşturur
```

## 🔧 Kurulum Sonrası Kontroller

### Backend Kontrolü

```bash
# Backend logları
pm2 logs ezooffice-backend --lines 50

# Backend restart
pm2 restart ezooffice-backend

# Backend durumu
pm2 status
```

### Frontend Kontrolü

```bash
# Frontend build kontrolü
ls -la /opt/ezooffice/dist/

# Nginx error log
sudo tail -f /var/log/nginx/error.log

# Nginx access log
sudo tail -f /var/log/nginx/access.log
```

### Veritabanı Kontrolü

```bash
# PostgreSQL bağlantı testi
psql -h 10.226.0.3 -U ezooffice_user -d ezooffice -c "SELECT COUNT(*) FROM \"User\";"
```

## 🐛 Sorun Giderme

### Backend Başlamıyor

```bash
# Logları kontrol et
pm2 logs ezooffice-backend

# Manuel başlat
cd /opt/ezooffice/server
npm run build
node dist/index.js
```

### Frontend Görünmüyor

```bash
# Build kontrolü
cd /opt/ezooffice
npm run build

# İzinleri kontrol et
ls -la dist/
sudo chmod -R 755 /opt/ezooffice/dist

# Nginx restart
sudo systemctl restart nginx
```

### Nginx 502 Bad Gateway

```bash
# Backend çalışıyor mu?
pm2 list

# Backend port kontrolü
netstat -tlnp | grep 3001

# Nginx config kontrolü
sudo nginx -t
```

## 📝 Önemli Notlar

1. **PostgreSQL sunucusu ayrı VM'de** - Kurulum sırasında PostgreSQL IP'sini doğru girin
2. **Firewall kuralları** - 80, 443, 3001 portlarının açık olduğundan emin olun
3. **SSL sertifikası** - Production için Let's Encrypt kullanın
4. **Backup** - Düzenli backup alın

## 🚀 Hızlı Kurulum (Özet)

```bash
# 1. Temizle
./clean-install.sh

# 2. Dosyaları yükle (Git/SCP/ZIP)

# 3. Kur
cd /opt/ezooffice
./setup-app.sh

# 4. Test et
curl http://localhost:3001/api/health
```

## 📞 Destek

Sorun yaşarsanız:
1. `pm2 logs ezooffice-backend` - Backend logları
2. `sudo tail -f /var/log/nginx/error.log` - Nginx hataları
3. `pm2 status` - Process durumu

