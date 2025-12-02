# EzoOffice - 500 Hatası Sorun Giderme

## Hızlı Kontrol Listesi

### 1. Backend Durumu Kontrolü

```bash
# PM2'de backend çalışıyor mu?
pm2 list

# Backend loglarını kontrol et
pm2 logs ezooffice-backend --lines 50

# Backend manuel test
curl http://localhost:3001/api/health
```

### 2. Frontend Build Kontrolü

```bash
# dist klasörü var mı?
ls -la /opt/ezooffice/dist

# Yoksa build et
cd /opt/ezooffice
chmod +x node_modules/.bin/*
npm run build
```

### 3. Nginx Log Kontrolü

```bash
# Error log
sudo tail -f /var/log/nginx/error.log

# Access log
sudo tail -f /var/log/nginx/access.log
```

### 4. Nginx Config Kontrolü

```bash
# Config test
sudo nginx -t

# Config dosyasını kontrol et
sudo cat /etc/nginx/sites-available/ezooffice

# Nginx restart
sudo systemctl restart nginx
```

### 5. Port Kontrolü

```bash
# Port 3001 dinleniyor mu?
sudo netstat -tlnp | grep 3001
# veya
sudo ss -tlnp | grep 3001
```

## Yaygın Sorunlar ve Çözümleri

### Sorun 1: Backend çalışmıyor
```bash
cd /opt/ezooffice/server
pm2 restart ezooffice-backend
pm2 logs ezooffice-backend
```

### Sorun 2: Frontend build edilmemiş
```bash
cd /opt/ezooffice
npm run build
sudo systemctl restart nginx
```

### Sorun 3: Nginx config hatası
```bash
sudo nginx -t
# Hata varsa düzelt, sonra:
sudo systemctl restart nginx
```

### Sorun 4: İzin sorunları
```bash
sudo chown -R $USER:$USER /opt/ezooffice
sudo chmod -R u+w /opt/ezooffice
```

### Sorun 5: Backend .env eksik veya hatalı
```bash
cd /opt/ezooffice/server
cat .env
# DATABASE_URL, JWT_SECRET kontrol et
```

## Hızlı Düzeltme (Tüm Adımlar)

```bash
# 1. Backend'i kontrol et ve restart et
cd /opt/ezooffice/server
pm2 restart ezooffice-backend
pm2 logs ezooffice-backend --lines 20

# 2. Frontend build et
cd /opt/ezooffice
npm run build

# 3. Nginx restart
sudo systemctl restart nginx

# 4. Test
curl http://localhost:3001/api/health
curl http://localhost/
```

