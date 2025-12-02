# PostgreSQL Migration Guide

## SQLite'dan PostgreSQL'e Geçiş

Bu proje artık PostgreSQL kullanıyor. Aşağıdaki adımları takip edin:

### 1. PostgreSQL Kurulumu

**Docker ile (Önerilen):**
```bash
docker run --name ezooffice-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ezooffice \
  -p 5432:5432 \
  -d postgres:15
```

**Manuel Kurulum:**
- Windows: https://www.postgresql.org/download/windows/
- macOS: `brew install postgresql && brew services start postgresql`
- Linux: `sudo apt-get install postgresql postgresql-contrib`

### 2. Veritabanı Oluşturma

```bash
# PostgreSQL'e bağlan
psql -U postgres

# Veritabanı oluştur
CREATE DATABASE ezooffice;
\q
```

### 3. Environment Variables

`.env` dosyasını oluşturun:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ezooffice?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3001
```

### 4. Migration ve Seed

```bash
cd server
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5. Değişiklikler

- ✅ Prisma schema `postgresql` provider'a güncellendi
- ✅ JSON field'lar PostgreSQL'in native JSON desteğini kullanıyor
- ✅ Seed script JSON.stringify kullanmıyor (direkt array/object)
- ✅ Backend route'ları JSON field'ları direkt obje olarak işliyor

### 6. Cloud Deployment

**Supabase:**
1. Supabase projesi oluşturun
2. Connection string'i `.env` dosyasına ekleyin
3. Migration'ları çalıştırın

**Neon:**
1. Neon projesi oluşturun
2. Connection string'i kopyalayın
3. `.env` dosyasına ekleyin
4. Migration'ları çalıştırın

**Railway:**
1. Railway'de PostgreSQL servisi oluşturun
2. Connection string'i alın
3. `.env` dosyasına ekleyin
4. Migration'ları çalıştırın

### Notlar

- PostgreSQL JSON field'ları Prisma tarafından otomatik olarak parse edilir
- Frontend'de JSON.parse gerekmez, direkt obje olarak gelir
- Production'da connection pooling kullanmanız önerilir

