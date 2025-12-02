# EzoOffice ERP - Backend API

## Kurulum

```bash
cd server
npm install
```

## Veritabanı Kurulumu

### PostgreSQL Kurulumu

**Local PostgreSQL:**
```bash
# PostgreSQL kurulumu (Windows)
# https://www.postgresql.org/download/windows/ adresinden indirin

# PostgreSQL kurulumu (macOS)
brew install postgresql
brew services start postgresql

# PostgreSQL kurulumu (Linux)
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Veritabanı Oluşturma:**
```bash
# PostgreSQL'e bağlan
psql -U postgres

# Veritabanı oluştur
CREATE DATABASE ezooffice;
\q
```

**Docker ile PostgreSQL (Önerilen):**
```bash
docker run --name ezooffice-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ezooffice \
  -p 5432:5432 \
  -d postgres:15
```

### Prisma Migration

```bash
# .env dosyasını oluşturun ve DATABASE_URL'i ayarlayın
# Örnek: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ezooffice?schema=public"

# Prisma Client oluştur
npm run prisma:generate

# Veritabanı migration'ları çalıştır
npm run prisma:migrate

# İlk verileri yükle
npm run prisma:seed

# (Opsiyonel) Veritabanı görsel editörü
npm run prisma:studio
```

## Çalıştırma

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

- `POST /api/auth/login` - Giriş
- `POST /api/auth/register` - Kayıt
- `GET /api/users` - Kullanıcı listesi
- `GET /api/projects` - Proje listesi
- `GET /api/contracts` - Sözleşme listesi
- `GET /api/transactions` - İşlem listesi
- `POST /api/documents` - Dosya yükleme

Tüm endpoint'ler JWT token gerektirir (auth hariç).

## Environment Variables

`.env` dosyası oluşturun ve `.env.example` dosyasındaki değişkenleri doldurun.

