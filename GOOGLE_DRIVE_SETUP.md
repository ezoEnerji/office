# Google Drive Entegrasyonu Kurulum Rehberi

## 1. Google Cloud Console'da Proje Oluşturma

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni bir proje oluşturun veya mevcut bir projeyi seçin
3. **APIs & Services > Library** bölümüne gidin
4. **Google Drive API**'yi arayın ve etkinleştirin

## 2. Service Account Oluşturma

1. **APIs & Services > Credentials** bölümüne gidin
2. **Create Credentials > Service Account** seçin
3. Service account adı verin (örn: `ezooffice-drive`)
4. **Create and Continue** tıklayın
5. Role olarak **Editor** veya **Owner** seçin (veya özel bir role)
6. **Done** tıklayın

## 3. Service Account Key Oluşturma

1. Oluşturduğunuz service account'a tıklayın
2. **Keys** sekmesine gidin
3. **Add Key > Create new key** seçin
4. Format olarak **JSON** seçin
5. **Create** tıklayın - JSON dosyası indirilecek

## 4. Google Drive'da Klasör Paylaşımı

1. Google Drive'ınızda bir klasör oluşturun (örn: `EzoOffice`)
2. Klasöre sağ tıklayın > **Share**
3. Service account'un email adresini (JSON dosyasındaki `client_email`) ekleyin
4. **Editor** yetkisi verin
5. **Send** tıklayın

## 5. Backend Yapılandırması

1. İndirdiğiniz JSON dosyasını `server/` klasörüne kopyalayın (güvenlik için `.gitignore`'a ekleyin)
2. `server/.env` dosyasına şu satırları ekleyin:

```env
# Google Drive Configuration
GOOGLE_DRIVE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
GOOGLE_DRIVE_ROOT_FOLDER=EzoOffice
```

**ÖNEMLİ:** JSON içeriğini tek satır halinde, tırnak içinde ve escape edilmiş şekilde yazın. Örnek:

```bash
# JSON dosyasını okuyup tek satıra çevirmek için:
cat service-account-key.json | jq -c
```

3. Backend'i yeniden başlatın:
```bash
cd /opt/ezooffice/server
npm install googleapis
npm run build
pm2 restart ezooffice-backend
```

## 6. Klasör Yapısı

Sistem otomatik olarak şu klasör yapısını oluşturur:

```
EzoOffice/
├── Projeler/
│   └── PRJ-2024-001_Proje_Adı/
│       └── Finansal İşlemler/
│           └── [dosyalar]
├── Sözleşmeler/
│   └── CNT-2024-001_Sözleşme_Adı/
│       └── [dosyalar]
├── Dökümanlar/
│   └── [kategori]/
│       └── [dosyalar]
└── Genel/
    └── [dosyalar]
```

## 7. Test

1. Uygulamaya giriş yapın
2. Bir proje seçin ve finansal işlem ekleyin
3. Belge yükleyin
4. Google Drive'da klasör yapısının oluştuğunu kontrol edin

## Sorun Giderme

### "Google Drive yapılandırması bulunamadı" hatası
- `.env` dosyasında `GOOGLE_DRIVE_CREDENTIALS` değişkeninin doğru formatta olduğundan emin olun
- JSON içeriğinin escape edilmiş olduğundan emin olun

### "Permission denied" hatası
- Service account'un Google Drive klasörüne erişim yetkisi olduğundan emin olun
- Service account email'ini klasöre eklediğinizden emin olun

### "Klasör oluşturulamadı" hatası
- Service account'un Google Drive API'sine erişim yetkisi olduğundan emin olun
- API'nin etkinleştirildiğinden emin olun

