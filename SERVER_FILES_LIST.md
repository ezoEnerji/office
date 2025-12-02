# EzoOffice - Sunucuya Yüklenecek Dosyalar

## 📦 TAM LİSTE - Sunucuya Yüklenecek Dosyalar

### ✅ MUTLAKA YÜKLENMELİ

#### Root Dizin Dosyaları
```
/opt/ezooffice/
├── package.json              ✅ (Frontend dependencies)
├── package-lock.json         ✅ (Opsiyonel, npm install oluşturur)
├── vite.config.ts           ✅ (Vite configuration)
├── tsconfig.json            ✅ (TypeScript configuration)
├── index.html                ✅ (HTML entry point)
├── tailwind.config.js        ✅ (Tailwind CSS config)
├── postcss.config.js         ✅ (PostCSS config)
└── complete-install.sh       ✅ (Kurulum scripti)
```

#### src/ Klasörü (Frontend Kaynak Kodları)
```
/opt/ezooffice/src/
├── index.tsx                 ✅ (React entry point)
├── index.css                 ✅ (CSS ve Tailwind direktifleri)
├── App.tsx                   ✅ (Ana uygulama componenti)
├── components/               ✅ (Tüm React componentleri)
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Sidebar.tsx
│   ├── ProjectManagement.tsx
│   ├── ContractManagement.tsx
│   ├── CompanyManagement.tsx
│   ├── EntityManagement.tsx
│   ├── FinancialManagement.tsx
│   ├── RoleManagement.tsx
│   ├── DocumentManagement.tsx
│   ├── Reports.tsx
│   └── Unauthorized.tsx
├── services/                 ✅ (API servisleri)
│   ├── api.ts
│   └── API_INTEGRATION_GUIDE.md (Opsiyonel)
├── types/                    ✅ (TypeScript type tanımları)
│   └── index.ts
├── utils/                    ✅ (Utility fonksiyonlar)
│   └── helpers.ts
└── data/                     ✅ (Sabit veriler)
    └── constants.ts
```

#### server/ Klasörü (Backend Kaynak Kodları)
```
/opt/ezooffice/server/
├── package.json              ✅ (Backend dependencies)
├── package-lock.json         ✅ (Opsiyonel)
├── tsconfig.json             ✅ (TypeScript configuration)
├── src/                      ✅ (Backend kaynak kodları)
│   ├── index.ts              ✅ (Backend entry point)
│   ├── routes/               ✅ (API route'ları)
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── roles.ts
│   │   ├── companies.ts
│   │   ├── entities.ts
│   │   ├── projects.ts
│   │   ├── contracts.ts
│   │   ├── transactions.ts
│   │   └── documents.ts
│   └── middleware/           ✅ (Middleware'ler)
│       └── auth.ts
└── prisma/                   ✅ (Database schema)
    ├── schema.prisma         ✅ (Prisma schema)
    └── seed.ts               ✅ (Database seed scripti)
```

### ❌ YÜKLENMEMELİ (Otomatik Oluşacak)

```
node_modules/                 ❌ (npm install ile oluşur)
dist/                         ❌ (npm run build ile oluşur)
server/node_modules/          ❌ (npm install ile oluşur)
server/dist/                  ❌ (npm run build ile oluşur)
.env                          ❌ (Script otomatik oluşturur)
.env.local                    ❌
*.log                         ❌
.DS_Store                     ❌
.vscode/                      ❌
.idea/                        ❌
```

## 🚀 Yükleme Yöntemleri

### Yöntem 1: Git ile (Önerilen)

```bash
# Local'de
git init
git add .
git commit -m "Initial commit"
git remote add origin [YOUR_GIT_REPO_URL]
git push -u origin main

# Sunucuda
cd /opt
sudo git clone [YOUR_GIT_REPO_URL] ezooffice
sudo chown -R $USER:$USER ezooffice
cd ezooffice
chmod +x complete-install.sh
./complete-install.sh
```

### Yöntem 2: WinSCP/FileZilla ile (Windows için önerilen)

1. WinSCP veya FileZilla ile sunucuya bağlanın
2. Şu klasörleri yükleyin:
   - `src/` → `/opt/ezooffice/src/`
   - `server/` → `/opt/ezooffice/server/`
   - Root dosyalar → `/opt/ezooffice/`
   - `complete-install.sh` → `/opt/ezooffice/` veya `~/`

### Yöntem 3: SCP ile (Linux/Mac)

```bash
# Tüm projeyi yükle (node_modules hariç)
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.env' \
  ./ ezo_ezoenerji_com@34.51.217.25:/opt/ezooffice/
```

### Yöntem 4: ZIP/RAR ile

```bash
# Local'de ZIP oluştur (node_modules ve dist hariç)
# Sunucuda:
cd /opt
unzip ezooffice.zip -d ezooffice
sudo chown -R $USER:$USER ezooffice
cd ezooffice
chmod +x complete-install.sh
./complete-install.sh
```

## 📋 Minimum Gereken Dosyalar (Özet)

### Frontend
- ✅ `package.json`
- ✅ `vite.config.ts`
- ✅ `tsconfig.json`
- ✅ `index.html`
- ✅ `tailwind.config.js`
- ✅ `postcss.config.js`
- ✅ `src/index.tsx`
- ✅ `src/index.css` (ÖNEMLİ: @import en üstte olmalı!)
- ✅ `src/App.tsx`
- ✅ `src/components/` (tüm klasör)
- ✅ `src/services/api.ts`
- ✅ `src/types/index.ts`
- ✅ `src/utils/helpers.ts`
- ✅ `src/data/constants.ts`

### Backend
- ✅ `server/package.json`
- ✅ `server/tsconfig.json`
- ✅ `server/src/index.ts`
- ✅ `server/src/routes/` (tüm klasör)
- ✅ `server/src/middleware/` (tüm klasör)
- ✅ `server/prisma/schema.prisma`
- ✅ `server/prisma/seed.ts`

## ⚠️ ÖNEMLİ NOTLAR

1. **src/index.css** dosyasında `@import` satırı **MUTLAKA** en üstte olmalı:
   ```css
   @import url('...');  ← EN ÜSTTE
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

2. **node_modules yüklemeyin** - Script otomatik yükler

3. **dist klasörü yüklemeyin** - Script otomatik build eder

4. **.env dosyası yüklemeyin** - Script otomatik oluşturur

5. **İzinler** - Script otomatik düzeltir

## 🔧 Kurulum Sonrası

Dosyaları yükledikten sonra:

```bash
cd /opt/ezooffice
chmod +x complete-install.sh
./complete-install.sh
```

Script şunları yapacak:
- ✅ Tüm izinleri kontrol eder ve düzeltir
- ✅ Backend ve Frontend bağımlılıklarını yükler
- ✅ Veritabanı şemasını oluşturur
- ✅ Build eder
- ✅ Nginx yapılandırır
- ✅ PM2 ile backend başlatır
- ✅ Tüm kontrolleri yapar

