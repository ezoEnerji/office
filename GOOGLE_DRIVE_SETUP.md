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

## 4. Google Drive'da Klasör Paylaşımı (ÖNEMLİ!)

**Service Account'ların kendi storage'ı yok!** Bu yüzden normal bir Google hesabında klasör oluşturup service account'a paylaşmanız gerekiyor.

1. **Normal bir Google hesabınızda** (service account değil!) Google Drive'a gidin
2. Bir klasör oluşturun (örn: `EzoOffice`)
3. Klasöre sağ tıklayın > **Share** (Paylaş)
4. Service account'un email adresini (JSON dosyasındaki `client_email`, örn: `ezooffice-drive@mythic-fire-479207-m6.iam.gserviceaccount.com`) ekleyin
5. **Editor** yetkisi verin (dosya yükleme ve klasör oluşturma için gerekli)
6. **Send** tıklayın
7. **Klasör ID'sini alın:**
   - Klasörü açın
   - URL'den ID'yi kopyalayın: `https://drive.google.com/drive/folders/[BURASI_ID]`
   - Veya klasöre sağ tıklayın > **Get link** > URL'den ID'yi alın

## 5. Backend Yapılandırması

1. İndirdiğiniz JSON dosyasını `server/` klasörüne kopyalayın (güvenlik için `.gitignore`'a ekleyin)
2. `server/.env` dosyasına şu satırları ekleyin:

```env
# Google Drive Configuration
GOOGLE_DRIVE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
GOOGLE_DRIVE_ROOT_FOLDER=EzoOffice
GOOGLE_DRIVE_ROOT_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j  # Paylaşılan klasörün ID'si (ZORUNLU!)
# Shared Drive kullanıyorsanız (Google Workspace):
# GOOGLE_DRIVE_ID=0a1b2c3d4e5f6g7h8i9j  # Shared Drive ID'si (Opsiyonel)
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

