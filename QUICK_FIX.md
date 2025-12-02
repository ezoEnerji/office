# EzoOffice - Hızlı Düzeltme Komutları

## İzin Sorunlarını Düzelt

```bash
# Tüm izinleri düzelt
sudo chown -R $USER:$USER /opt/ezooffice
sudo chmod -R u+w /opt/ezooffice

# dist klasörüne erişim
ls -la /opt/ezooffice/dist
```

## Backend Durumu

Backend çalışıyor (health check başarılı) ama PM2'de görünmüyor. 
Muhtemelen root kullanıcısı olarak çalışıyor.

```bash
# Root PM2'yi kontrol et
sudo pm2 list

# Eğer root'ta çalışıyorsa, normal kullanıcıya taşı
sudo pm2 save
sudo pm2 kill
pm2 resurrect
```

## Frontend Build

```bash
cd /opt/ezooffice
chmod +x node_modules/.bin/*
npm run build

# Build sonrası kontrol
ls -la dist/
```

## Nginx Restart

```bash
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

