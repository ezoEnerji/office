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

Detaylı deployment rehberi için `DEPLOYMENT.md` dosyasına bakın.

**Hızlı Özet:**
1. Backend VM: Node.js + PM2 + PostgreSQL
2. Frontend VM: Nginx + React build
3. CORS yapılandırması gerekli
4. SSL sertifikası önerilir (Let's Encrypt)

**Google Cloud VM Deployment:**
- PostgreSQL VM: `DEPLOYMENT.md` dosyasındaki "VM 1: PostgreSQL Veritabanı Sunucusu" bölümüne bakın
- Uygulama VM: `DEPLOYMENT.md` dosyasındaki "VM 2: Uygulama Sunucusu" bölümüne bakın
