# EzoOffice ERP - Full Stack Setup Guide

## 🚀 Hızlı Başlangıç

### 1. Backend Kurulumu

```bash
cd server
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Backend `http://localhost:3001` adresinde çalışacak.

### 2. Frontend Kurulumu

```bash
# Ana dizinde
npm install
npm run dev
```

Frontend `http://localhost:3050` adresinde çalışacak.

## 📁 Proje Yapısı

```
app/
├── server/              # Backend (Node.js + Express + Prisma)
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth middleware
│   │   └── index.ts     # Server entry
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── uploads/         # Yüklenen dosyalar
│
└── src/                 # Frontend (React + TypeScript)
    ├── components/
    ├── services/        # API service layer
    └── App.tsx
```

## 🔐 Authentication

- **Login:** `POST /api/auth/login` - `{ email, password }`
- **Register:** `POST /api/auth/register` - `{ name, email, password, roleId }`
- Tüm diğer endpoint'ler JWT token gerektirir (Header: `Authorization: Bearer <token>`)

## 📊 Veritabanı

- **PostgreSQL** - Production-ready veritabanı
- Local development için Docker kullanabilirsiniz:
  ```bash
  docker run --name ezooffice-db \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=ezooffice \
    -p 5432:5432 \
    -d postgres:15
  ```
- Cloud seçenekleri: Supabase, Neon, Railway, AWS RDS

## 🔧 Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ezooffice?schema=public"
JWT_SECRET="your-secret-key"
PORT=3001
```

**PostgreSQL Connection String Format:**
- Local: `postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME?schema=public`
- Docker: `postgresql://postgres:postgres@localhost:5432/ezooffice?schema=public`
- Cloud: Provider'ın verdiği connection string'i kullanın

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

## 📝 API Endpoints

- **Auth:** `/api/auth/login`, `/api/auth/register`
- **Users:** `/api/users` (GET, POST, PUT, DELETE)
- **Roles:** `/api/roles` (GET, POST, PUT, DELETE)
- **Companies:** `/api/companies` (GET, POST, PUT, DELETE)
- **Entities:** `/api/entities` (GET, POST, PUT, DELETE)
- **Projects:** `/api/projects` (GET, POST, PUT, DELETE)
- **Contracts:** `/api/contracts` (GET, POST, PUT, DELETE)
- **Transactions:** `/api/transactions` (GET, POST, PUT, DELETE)
- **Documents:** `/api/documents` (GET, POST, DELETE)

## 🎯 Özellikler

✅ JWT Authentication
✅ Role-Based Access Control (RBAC)
✅ RESTful API
✅ File Upload (Multer)
✅ Type-Safe Database (Prisma)
✅ CORS Enabled
✅ Error Handling

## 🚢 Production Deployment

Sunucuya kurulum için `install.sh` scriptini kullanın:

### Environment Variables ile (Önerilen)

```bash
# Environment variable'ları ayarlayın
export DB_VM_IP="10.226.0.3"
export DB_PASSWORD="your-secure-password"
export JWT_SECRET="$(openssl rand -hex 32)"  # Güvenli bir secret oluştur
export APP_DOMAIN="office.ezoenerji.com"
export APP_IP="34.51.217.25"  # Opsiyonel, otomatik tespit edilir

# Script'i çalıştırın
chmod +x install.sh
sudo ./install.sh
```

### İnteraktif Mod

Environment variable'lar ayarlanmazsa, script size soracaktır:

```bash
chmod +x install.sh
sudo ./install.sh
```

Script otomatik olarak:
- Tüm bağımlılıkları kurar
- Backend ve frontend'i build eder
- PM2 ile backend'i başlatır
- Nginx yapılandırmasını yapar
- Tüm izinleri ayarlar
- Google Drive credentials'ı manuel eklemeniz gerekir (GOOGLE_DRIVE_SETUP.md'ye bakın)

### Güvenlik Notları

⚠️ **ÖNEMLİ:** 
- `install.sh` dosyasında artık hardcoded şifreler yok
- Tüm gizli bilgiler environment variable'lardan veya kullanıcı girişinden alınır
- Google Drive credentials'ı sunucuda `/opt/ezooffice/server/.env` dosyasına manuel olarak eklemeniz gerekir
- JWT_SECRET için güvenli bir değer kullanın: `openssl rand -hex 32`
