#!/bin/bash

# ==========================================
# EzoOffice - Sunucu Güncelleme Scripti
# ==========================================

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "  EzoOffice - Sunucu Güncelleme"
echo "==========================================${NC}"

# Kurulum dizini kontrolü
if [ ! -d "/opt/ezooffice" ]; then
    echo -e "${RED}❌ /opt/ezooffice dizini bulunamadı!${NC}"
    echo -e "${YELLOW}İlk kurulum için install.sh scriptini çalıştırın.${NC}"
    exit 1
fi

# Mevcut dizine geç
cd /opt/ezooffice

echo -e "${GREEN}✅ Kurulum dizini bulundu: /opt/ezooffice${NC}"

# ===========================================
# BÖLÜM 1: YEDEKLEME
# ===========================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 1: Yedekleme"
echo "==========================================${NC}"

BACKUP_DIR="/opt/ezooffice-backup-$(date +%Y%m%d-%H%M%S)"
echo "1.1 Yedekleme dizini oluşturuluyor: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

echo "1.2 Backend yedekleniyor..."
cp -r server "$BACKUP_DIR/" 2>/dev/null || true

echo "1.3 Frontend build yedekleniyor..."
cp -r dist "$BACKUP_DIR/" 2>/dev/null || true

echo "1.4 .env dosyaları yedekleniyor..."
cp server/.env "$BACKUP_DIR/server.env" 2>/dev/null || true
cp .env "$BACKUP_DIR/frontend.env" 2>/dev/null || true

echo -e "${GREEN}✅ Yedekleme tamamlandı: $BACKUP_DIR${NC}"

# ===========================================
# BÖLÜM 2: DOSYA GÜNCELLEME
# ===========================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 2: Dosya Güncelleme"
echo "==========================================${NC}"

# Home dizinini kontrol et (sudo ile çalıştırıldığında doğru home dizinini bulmak için)
if [ -n "$SUDO_USER" ]; then
    REAL_USER="$SUDO_USER"
    HOME_DIR=$(eval echo ~$REAL_USER)
else
    REAL_USER="$USER"
    HOME_DIR="$HOME"
fi

SOURCE_DIR="$HOME_DIR"

echo "2.1 Kaynak dizin kontrol ediliyor: $SOURCE_DIR"

# Gerekli dosyaların varlığını kontrol et
REQUIRED_FILES=(
    "package.json"
    "vite.config.ts"
    "tsconfig.json"
    "index.html"
    "src"
    "server"
    "tailwind.config.js"
    "postcss.config.js"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -e "$SOURCE_DIR/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}❌ Eksik dosyalar bulundu:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    echo -e "${YELLOW}⚠️  Lütfen tüm proje dosyalarını $SOURCE_DIR dizinine yükleyin!${NC}"
    exit 1
fi

echo "2.2 Dosyalar kopyalanıyor..."
cp -r "$SOURCE_DIR/src" /opt/ezooffice/ 2>/dev/null || true
cp -r "$SOURCE_DIR/server" /opt/ezooffice/ 2>/dev/null || true
cp "$SOURCE_DIR/package.json" /opt/ezooffice/ 2>/dev/null || true
cp "$SOURCE_DIR/vite.config.ts" /opt/ezooffice/ 2>/dev/null || true
cp "$SOURCE_DIR/tsconfig.json" /opt/ezooffice/ 2>/dev/null || true
cp "$SOURCE_DIR/index.html" /opt/ezooffice/ 2>/dev/null || true
cp "$SOURCE_DIR/tailwind.config.js" /opt/ezooffice/ 2>/dev/null || true
cp "$SOURCE_DIR/postcss.config.js" /opt/ezooffice/ 2>/dev/null || true

# İzinleri düzelt
chown -R $REAL_USER:$REAL_USER /opt/ezooffice
chmod -R u+w /opt/ezooffice

echo -e "${GREEN}✅ Dosyalar güncellendi${NC}"

# ===========================================
# BÖLÜM 3: BACKEND GÜNCELLEME
# ===========================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 3: Backend Güncelleme"
echo "==========================================${NC}"

cd /opt/ezooffice/server

echo "3.1 Backend bağımlılıkları kontrol ediliyor..."
npm install

echo "3.2 Prisma schema güncelleniyor..."
npx prisma generate

echo "3.3 Veritabanı şeması güncelleniyor..."
npx prisma db push --accept-data-loss || {
    echo -e "${YELLOW}⚠️  Prisma db push hatası, migration deneniyor...${NC}"
    npx prisma migrate deploy || {
        echo -e "${YELLOW}⚠️  Migration dosyası yok, db push tekrar deneniyor...${NC}"
        npx prisma db push --accept-data-loss
    }
}

echo "3.4 Backend build ediliyor..."
npm run build

echo -e "${GREEN}✅ Backend güncellendi${NC}"

# ===========================================
# BÖLÜM 4: FRONTEND GÜNCELLEME
# ===========================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 4: Frontend Güncelleme"
echo "==========================================${NC}"

cd /opt/ezooffice

echo "4.1 Frontend bağımlılıkları kontrol ediliyor..."
npm install

echo "4.2 Frontend build ediliyor..."
npm run build

echo -e "${GREEN}✅ Frontend güncellendi${NC}"

# ===========================================
# BÖLÜM 5: SERVİSLERİ YENİDEN BAŞLATMA
# ===========================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 5: Servisleri Yeniden Başlatma"
echo "==========================================${NC}"

echo "5.1 PM2 backend restart ediliyor..."
pm2 restart ezooffice-backend || pm2 start /opt/ezooffice/server/dist/index.js --name ezooffice-backend
pm2 save

echo "5.2 Nginx restart ediliyor..."
systemctl restart nginx

echo -e "${GREEN}✅ Servisler yeniden başlatıldı${NC}"

# ===========================================
# BÖLÜM 6: İZİNLER VE KONTROLLER
# ===========================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 6: İzinler ve Kontroller"
echo "==========================================${NC}"

echo "6.1 İzinler düzeltiliyor..."
chown -R $REAL_USER:$REAL_USER /opt/ezooffice
chmod -R 755 /opt/ezooffice
chmod -R 755 /opt/ezooffice/dist
chmod +x /opt/ezooffice/server/dist/index.js
chmod +x /opt/ezooffice/node_modules/.bin/* 2>/dev/null || true
chmod +x /opt/ezooffice/server/node_modules/.bin/* 2>/dev/null || true

# Uploads klasörü izinleri
mkdir -p /opt/ezooffice/server/uploads/avatars
chmod -R 755 /opt/ezooffice/server/uploads

echo "6.2 Backend health check..."
sleep 2
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend çalışıyor${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check başarısız, logları kontrol edin: pm2 logs ezooffice-backend${NC}"
fi

echo "6.3 Frontend dosyası kontrol ediliyor..."
if [ -f "/opt/ezooffice/dist/index.html" ]; then
    echo -e "${GREEN}✅ Frontend build mevcut${NC}"
else
    echo -e "${RED}❌ Frontend build bulunamadı!${NC}"
fi

echo "6.4 Nginx config kontrol ediliyor..."
if nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx config geçerli${NC}"
else
    echo -e "${RED}❌ Nginx config hatası!${NC}"
    nginx -t
fi

# ===========================================
# ÖZET
# ===========================================
echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ Güncelleme Tamamlandı!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}📋 Yapılan İşlemler:${NC}"
echo "  ✅ Dosyalar güncellendi"
echo "  ✅ Backend bağımlılıkları yüklendi"
echo "  ✅ Prisma schema güncellendi"
echo "  ✅ Veritabanı şeması güncellendi"
echo "  ✅ Backend build edildi"
echo "  ✅ Frontend bağımlılıkları yüklendi"
echo "  ✅ Frontend build edildi"
echo "  ✅ PM2 restart edildi"
echo "  ✅ Nginx restart edildi"
echo "  ✅ İzinler düzeltildi"
echo ""
echo -e "${BLUE}📦 Yedekleme:${NC}"
echo "  📁 $BACKUP_DIR"
echo ""
echo -e "${BLUE}🔍 Kontrol Komutları:${NC}"
echo "  pm2 logs ezooffice-backend --lines 50"
echo "  sudo tail -f /var/log/nginx/error.log"
echo "  curl http://localhost:3001/api/health"
echo "  curl http://localhost/api/health"
echo ""
echo -e "${YELLOW}⚠️  Not: Eğer sorun yaşarsanız, yedekleme dizininden geri yükleyebilirsiniz.${NC}"
echo ""

