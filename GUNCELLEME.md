# EzoOffice - Sunucu Güncelleme Kılavuzu

## Güncelleme Scripti Kullanımı

### Ön Hazırlık

1. **Güncel dosyaları sunucuya yükleyin:**
   - Tüm proje dosyalarını sunucunun home dizinine (`~`) yükleyin
   - Önemli: `src/`, `server/`, `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `tailwind.config.js`, `postcss.config.js` dosyaları olmalı

2. **SSH ile sunucuya bağlanın:**
   ```bash
   ssh kullanici@sunucu-ip
   ```

### Güncelleme Adımları

1. **Güncelleme scriptini çalıştırın:**
   ```bash
   cd ~
   chmod +x update.sh
   sudo ./update.sh
   ```

2. **Script otomatik olarak:**
   - Mevcut kurulumu yedekler
   - Yeni dosyaları kopyalar
   - Backend bağımlılıklarını günceller
   - Prisma schema'yı günceller
   - Veritabanı şemasını günceller
   - Backend'i build eder
   - Frontend bağımlılıklarını günceller (recharts, date-fns)
   - Frontend'i build eder
   - PM2'yi restart eder
   - Nginx'i restart eder
   - İzinleri düzeltir

### Yeni Özellikler (Bu Güncelleme)

- ✅ KDV dahil/hariç ayrımı (Transaction ve Contract)
- ✅ Gelişmiş KDV analizi (Finansal Yönetim ve Raporlama)
- ✅ Kapsamlı raporlama modülü (Recharts grafikleri)
- ✅ Tarih aralığı filtreleme (date-fns)
- ✅ Kullanıcı yönetiminde şifre ve resim yükleme
- ✅ Döküman yönetiminde tüm dosyaları görüntüleme
- ✅ Seed script'i sadece boş tablolarda çalışıyor

### Veritabanı Değişiklikleri

**Yeni Alanlar:**
- `Transaction.isVatIncluded` (Boolean, default: false)
- `Contract.isVatIncluded` (Boolean, default: false)

**Not:** Script otomatik olarak `prisma db push` ile şemayı güncelleyecektir.

### Yeni Bağımlılıklar

**Frontend:**
- `recharts` (Grafik kütüphanesi)
- `date-fns` (Tarih işlemleri)

**Backend:**
- Değişiklik yok

### Sorun Giderme

#### Backend çalışmıyor
```bash
pm2 logs ezooffice-backend --lines 50
pm2 restart ezooffice-backend
```

#### Frontend görünmüyor
```bash
sudo tail -f /var/log/nginx/error.log
sudo systemctl restart nginx
```

#### Veritabanı hatası
```bash
cd /opt/ezooffice/server
npx prisma db push --accept-data-loss
npx prisma generate
npm run build
pm2 restart ezooffice-backend
```

#### İzin hatası
```bash
sudo chown -R $USER:$USER /opt/ezooffice
sudo chmod -R 755 /opt/ezooffice
sudo chmod -R 755 /opt/ezooffice/dist
```

### Yedekleme

Script otomatik olarak yedekleme oluşturur:
- Konum: `/opt/ezooffice-backup-YYYYMMDD-HHMMSS`
- İçerik: server/, dist/, .env dosyaları

### Geri Yükleme (Gerekirse)

```bash
# Yedekleme dizinini bulun
ls -la /opt/ezooffice-backup-*

# Geri yükleyin
sudo cp -r /opt/ezooffice-backup-YYYYMMDD-HHMMSS/server /opt/ezooffice/
sudo cp -r /opt/ezooffice-backup-YYYYMMDD-HHMMSS/dist /opt/ezooffice/
pm2 restart ezooffice-backend
sudo systemctl restart nginx
```

### Kontrol Komutları

```bash
# Backend durumu
pm2 status
pm2 logs ezooffice-backend --lines 20

# API kontrolü
curl http://localhost:3001/api/health
curl http://localhost/api/health

# Nginx logları
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Frontend dosyası
ls -la /opt/ezooffice/dist/index.html
```

### Önemli Notlar

1. **İlk Kurulum:** Eğer `/opt/ezooffice` dizini yoksa, önce `install.sh` scriptini çalıştırın.

2. **Veritabanı:** `prisma db push` mevcut verileri korur, sadece yeni alanları ekler.

3. **Bağımlılıklar:** Script otomatik olarak `npm install` çalıştırır, yeni paketleri yükler.

4. **Build:** Her iki taraf (frontend/backend) otomatik olarak rebuild edilir.

5. **Servisler:** PM2 ve Nginx otomatik olarak restart edilir.

### Güncelleme Sonrası Kontrol Listesi

- [ ] Backend çalışıyor mu? (`pm2 status`)
- [ ] Frontend erişilebilir mi? (Tarayıcıdan kontrol)
- [ ] API çalışıyor mu? (`curl http://localhost/api/health`)
- [ ] KDV dahil/hariç seçeneği görünüyor mu?
- [ ] Raporlama modülü çalışıyor mu?
- [ ] Grafikler görünüyor mu?

### Destek

Sorun yaşarsanız:
1. Yedekleme dizininden geri yükleyin
2. Logları kontrol edin
3. İzinleri kontrol edin
4. Veritabanı bağlantısını kontrol edin

