# EzoOffice - Tek Komutla Kurulum Rehberi

## 🚀 Hızlı Başlangıç

### 1. Local'den Sunucuya Dosyaları Yükle

**Yöntem A: WinSCP/FileZilla (Windows için önerilen)**
- Tüm proje dosyalarını sunucunun **home dizinine** (`~`) yükleyin
- `install.sh` scriptini de yükleyin

**Yöntem B: SCP ile**
```bash
# Local'den sunucuya
scp -r ./src ./server *.json *.ts *.js *.html install.sh user@34.51.217.25:~/
```

**Yöntem C: Git ile**
```bash
# Sunucuda
cd ~
git clone [REPO_URL] ezooffice-temp
mv ezooffice-temp/* .
mv ezooffice-temp/.git* . 2>/dev/null || true
rm -rf ezooffice-temp
```

### 2. Sunucuda Tek Komut Çalıştır

```bash
chmod +x install.sh
./install.sh
```

**Bu kadar!** Script her şeyi yapar:
- ✅ Dosyaları `/opt/ezooffice`'e kopyalar
- ✅ Tüm izinleri ayarlar
- ✅ Mevcut kurulumu temizler
- ✅ Backend ve Frontend kurulumu
- ✅ Veritabanı şeması oluşturur
- ✅ Nginx yapılandırır
- ✅ PM2 ile backend başlatır
- ✅ Her şeyi kontrol eder

## 📋 Yüklenecek Dosyalar

### Home Dizinine Yüklenecekler

```
~/
├── package.json              ✅
├── vite.config.ts            ✅
├── tsconfig.json             ✅
├── index.html                ✅
├── tailwind.config.js        ✅
├── postcss.config.js          ✅
├── install.sh                 ✅ (Kurulum scripti)
├── src/                       ✅ (Tüm klasör)
│   ├── index.tsx
│   ├── index.css
│   ├── App.tsx
│   ├── components/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── data/
└── server/                    ✅ (Tüm klasör)
    ├── package.json
    ├── tsconfig.json
    ├── src/
    └── prisma/
```

### ❌ Yüklenmeyecekler

```
node_modules/          ❌ (Script otomatik yükler)
dist/                  ❌ (Script otomatik build eder)
.env                   ❌ (Script otomatik oluşturur)
```

## ⚙️ Script Ayarları

Script'in başında şu değişkenler var (gerekirse düzenleyin):

```bash
DB_VM_IP="10.226.0.3"
DB_PASSWORD="Ezo2025!+"
JWT_SECRET="..."
APP_DOMAIN="office.ezoenerji.com"
```

## 🔧 Script Özellikleri

- **Otomatik Dosya Kontrolü**: Gerekli dosyaların varlığını kontrol eder
- **Otomatik İzin Yönetimi**: Tüm izinleri otomatik ayarlar
- **Yedekleme**: Mevcut dosyaları yedekler
- **Hata Kontrolü**: Her adımda hata kontrolü yapar
- **Renkli Çıktı**: Adımlar renkli gösterilir
- **Detaylı Log**: Her adım açıklanır

## 📝 Kurulum Sonrası

### Test Komutları

```bash
# Backend kontrolü
pm2 list
curl http://localhost:3001/api/health

# Frontend kontrolü
curl http://localhost/

# Nginx kontrolü
sudo nginx -t
```

### Log Kontrolü

```bash
# Backend logları
pm2 logs ezooffice-backend

# Nginx logları
sudo tail -f /var/log/nginx/error.log
```

## 🔒 SSL Kurulumu (Opsiyonel)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d office.ezoenerji.com
```

## 🐛 Sorun Giderme

### Script Çalışmıyor

```bash
# İzinleri kontrol et
chmod +x install.sh
ls -la install.sh

# Dosyaları kontrol et
ls -la ~/package.json
ls -la ~/src/
ls -la ~/server/
```

### Backend Başlamıyor

```bash
cd /opt/ezooffice/server
pm2 logs ezooffice-backend
npm run build
```

### Frontend Görünmüyor

```bash
cd /opt/ezooffice
npm run build
sudo chmod -R 755 /opt/ezooffice/dist
sudo systemctl restart nginx
```

## 📞 Destek

Sorun yaşarsanız:
1. `pm2 logs ezooffice-backend` - Backend logları
2. `sudo tail -f /var/log/nginx/error.log` - Nginx hataları
3. `pm2 status` - Process durumu

