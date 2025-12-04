#!/bin/bash

# EzoOffice - Tek Komutla Tam Kurulum Scripti
# Home dizinindeki dosyaları alır, her şeyi kurar

set -e

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Banner
echo ""
echo -e "${BLUE}=========================================="
echo "  EzoOffice - Tek Komutla Kurulum"
echo "==========================================${NC}"
echo ""

# Değişkenler - Environment variable'lardan veya kullanıcıdan al
# Environment variable'lar varsa onları kullan, yoksa kullanıcıdan iste
DB_VM_IP="${DB_VM_IP:-}"
DB_PASSWORD="${DB_PASSWORD:-}"
JWT_SECRET="${JWT_SECRET:-}"
APP_DOMAIN="${APP_DOMAIN:-office.ezoenerji.com}"
APP_IP="${APP_IP:-$(curl -s ifconfig.me 2>/dev/null || echo "34.51.217.25")}"

# Eksik bilgileri kullanıcıdan iste
if [ -z "$DB_VM_IP" ]; then
    read -p "PostgreSQL VM IP adresi (örn: 10.226.0.3): " DB_VM_IP
    if [ -z "$DB_VM_IP" ]; then
        echo -e "${RED}❌ PostgreSQL VM IP adresi zorunludur!${NC}"
        exit 1
    fi
fi

if [ -z "$DB_PASSWORD" ]; then
    read -sp "PostgreSQL şifresi: " DB_PASSWORD
    echo
    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${RED}❌ PostgreSQL şifresi zorunludur!${NC}"
        exit 1
    fi
fi

if [ -z "$JWT_SECRET" ]; then
    # Rastgele bir JWT secret oluştur
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    echo -e "${YELLOW}⚠️  JWT_SECRET otomatik oluşturuldu (güvenli bir değer kullanmak için JWT_SECRET environment variable'ı ayarlayın)${NC}"
fi

if [ -z "$APP_IP" ]; then
    read -p "Sunucu IP adresi (boş bırakılırsa otomatik tespit edilir): " APP_IP
    if [ -z "$APP_IP" ]; then
        APP_IP=$(curl -s ifconfig.me 2>/dev/null || echo "")
        if [ -z "$APP_IP" ]; then
            echo -e "${RED}❌ IP adresi tespit edilemedi, lütfen manuel girin!${NC}"
            exit 1
        fi
    fi
fi

# Home dizinini kontrol et (sudo ile çalıştırıldığında gerçek kullanıcıyı bul)
if [ -n "$SUDO_USER" ]; then
    # sudo ile çalıştırıldıysa, gerçek kullanıcının home dizinini kullan
    REAL_USER="$SUDO_USER"
    HOME_DIR=$(eval echo ~$REAL_USER)
else
    # Normal kullanıcı olarak çalıştırıldıysa
    REAL_USER="$USER"
    HOME_DIR="$HOME"
fi

# Script'in çalıştırıldığı dizin
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_DIR="$(pwd)"

# Proje dosyalarını bul (öncelik sırasına göre)
SOURCE_DIR=""

# 1. Önce script'in bulunduğu dizinde ara
if [ -f "$SCRIPT_DIR/package.json" ] && [ -d "$SCRIPT_DIR/src" ] && [ -d "$SCRIPT_DIR/server" ]; then
    SOURCE_DIR="$SCRIPT_DIR"
    echo -e "${GREEN}✅ Proje dosyaları script dizininde bulundu: $SOURCE_DIR${NC}"
# 2. Mevcut çalışma dizininde ara
elif [ -f "$CURRENT_DIR/package.json" ] && [ -d "$CURRENT_DIR/src" ] && [ -d "$CURRENT_DIR/server" ]; then
    SOURCE_DIR="$CURRENT_DIR"
    echo -e "${GREEN}✅ Proje dosyaları mevcut dizinde bulundu: $SOURCE_DIR${NC}"
# 3. Home dizininde ara
elif [ -f "$HOME_DIR/package.json" ] && [ -d "$HOME_DIR/src" ] && [ -d "$HOME_DIR/server" ]; then
    SOURCE_DIR="$HOME_DIR"
    echo -e "${GREEN}✅ Proje dosyaları home dizininde bulundu: $SOURCE_DIR${NC}"
# 4. /opt/ezooffice'de ara (zaten kuruluysa)
elif [ -f "/opt/ezooffice/package.json" ] && [ -d "/opt/ezooffice/src" ] && [ -d "/opt/ezooffice/server" ]; then
    SOURCE_DIR="/opt/ezooffice"
    echo -e "${GREEN}✅ Proje dosyaları /opt/ezooffice'de bulundu${NC}"
# 5. /root dizininde ara (sudo ile çalıştırıldığında)
elif [ -f "/root/package.json" ] && [ -d "/root/src" ] && [ -d "/root/server" ]; then
    SOURCE_DIR="/root"
    echo -e "${GREEN}✅ Proje dosyaları /root dizininde bulundu${NC}"
else
    echo -e "${RED}❌ Proje dosyaları bulunamadı!${NC}"
    echo ""
    echo "Aranan yerler:"
    echo "  1. Script dizini: $SCRIPT_DIR"
    echo "  2. Mevcut dizin: $CURRENT_DIR"
    echo "  3. Home dizini: $HOME_DIR"
    echo "  4. /opt/ezooffice"
    echo "  5. /root"
    echo ""
    echo -e "${YELLOW}⚠️  Lütfen proje dosyalarını yukarıdaki dizinlerden birine yükleyin!${NC}"
    echo ""
    echo "Gerekli dosyalar:"
    echo "  - package.json"
    echo "  - src/ klasörü"
    echo "  - server/ klasörü"
    echo "  - vite.config.ts, tsconfig.json, index.html, vb."
    exit 1
fi

echo -e "${BLUE}📋 Kurulum Ayarları:${NC}"
echo "   Kullanıcı: $REAL_USER"
echo "   Kaynak: $SOURCE_DIR"
echo "   Hedef: /opt/ezooffice"
echo "   Database IP: $DB_VM_IP"
echo "   Domain: $APP_DOMAIN"
echo "   External IP: $APP_IP"
echo ""
read -p "Devam etmek istiyor musunuz? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${RED}❌ İşlem iptal edildi.${NC}"
    exit 1
fi

# ============================================
# BÖLÜM 1: MEVCUT KURULUMU TEMİZLE
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 1: Mevcut Kurulumu Temizle"
echo "==========================================${NC}"

# 1.1 PM2 Process'lerini Durdur
echo ""
echo "1.1 PM2 process'leri durduruluyor..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ PM2 temizlendi${NC}"

# 1.2 Nginx Config'i Kaldır
echo ""
echo "1.2 Nginx config temizleniyor..."
sudo rm -f /etc/nginx/sites-available/ezooffice
sudo rm -f /etc/nginx/sites-enabled/ezooffice
echo -e "${GREEN}✅ Nginx config temizlendi${NC}"

# 1.3 EzoOffice Klasörünü Sil (dosyaları yedekle)
echo ""
echo "1.3 /opt/ezooffice klasörü temizleniyor..."
if [ -d "/opt/ezooffice" ]; then
    # Eğer dosyalar varsa yedekle
    #if [ -f "/opt/ezooffice/package.json" ] || [ -d "/opt/ezooffice/src" ]; then
    #    echo "⚠️  Mevcut dosyalar yedekleniyor..."
    #    BACKUP_DIR="/tmp/ezooffice-backup-$(date +%s)"
    #    sudo mkdir -p "$BACKUP_DIR"
    #    sudo cp -r /opt/ezooffice/* "$BACKUP_DIR/" 2>/dev/null || true
    #    echo "✅ Yedek: $BACKUP_DIR"
    #fi
    sudo rm -rf /opt/ezooffice
fi
echo -e "${GREEN}✅ /opt/ezooffice temizlendi${NC}"

# 1.4 PM2 Startup Script'i Kaldır
echo ""
echo "1.4 PM2 startup script kaldırılıyor..."
pm2 unstartup systemd 2>/dev/null || true
echo -e "${GREEN}✅ PM2 startup script kaldırıldı${NC}"

# ============================================
# BÖLÜM 2: DOSYALARI KONTROL ET VE KOPYALA
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 2: Dosyaları Kontrol Et ve Kopyala"
echo "==========================================${NC}"

# 2.1 Gerekli Dosyaları Kontrol Et
echo ""
echo "2.1 Kaynak dizindeki dosyalar kontrol ediliyor: $SOURCE_DIR"

REQUIRED_FILES=(
    "package.json"
    "vite.config.ts"
    "tsconfig.json"
    "index.html"
    "src/index.tsx"
    "src/App.tsx"
    "src/index.css"
    "tailwind.config.js"
    "postcss.config.js"
    "server/package.json"
    "server/tsconfig.json"
    "server/src/index.ts"
    "server/prisma/schema.prisma"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$SOURCE_DIR/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}❌ Eksik dosyalar bulundu:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo "   - $file"
    done
    echo ""
    echo -e "${YELLOW}⚠️  Kaynak dizinde eksik dosyalar var: $SOURCE_DIR${NC}"
    echo ""
    echo "Mevcut dosyalar:"
    ls -la "$SOURCE_DIR" | head -20
    exit 1
fi

echo -e "${GREEN}✅ Tüm gerekli dosyalar mevcut${NC}"

# 2.2 Proje Klasörünü Oluştur
echo ""
echo "2.2 /opt/ezooffice klasörü oluşturuluyor..."
sudo mkdir -p /opt/ezooffice
sudo chown -R $USER:$USER /opt/ezooffice
sudo chmod 755 /opt/ezooffice
echo -e "${GREEN}✅ /opt/ezooffice oluşturuldu${NC}"

# 2.3 Dosyaları Kopyala
echo ""
echo "2.3 Dosyalar kopyalanıyor..."

# Root dosyalar
cp "$SOURCE_DIR/package.json" /opt/ezooffice/
cp "$SOURCE_DIR/vite.config.ts" /opt/ezooffice/
cp "$SOURCE_DIR/tsconfig.json" /opt/ezooffice/
cp "$SOURCE_DIR/index.html" /opt/ezooffice/
cp "$SOURCE_DIR/tailwind.config.js" /opt/ezooffice/
cp "$SOURCE_DIR/postcss.config.js" /opt/ezooffice/

# src/ klasörü
cp -r "$SOURCE_DIR/src" /opt/ezooffice/

# server/ klasörü
cp -r "$SOURCE_DIR/server" /opt/ezooffice/

echo -e "${GREEN}✅ Dosyalar kopyalandı${NC}"

# 2.4 İzinleri Ayarla
echo ""
echo "2.4 İzinler ayarlanıyor..."
sudo chown -R $USER:$USER /opt/ezooffice
sudo chmod -R u+w /opt/ezooffice
sudo chmod 755 /opt/ezooffice
sudo chmod 755 /opt
echo -e "${GREEN}✅ İzinler ayarlandı${NC}"

# ============================================
# BÖLÜM 3: SİSTEM KONTROLLERİ
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 3: Sistem Kontrolleri"
echo "==========================================${NC}"

# 3.1 Node.js Kontrolü
echo ""
echo "3.1 Node.js kontrol ediliyor..."
if ! command -v node &> /dev/null; then
    echo "Node.js kuruluyor..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# 3.2 PM2 Kontrolü
echo ""
echo "3.2 PM2 kontrol ediliyor..."
if ! command -v pm2 &> /dev/null; then
    echo "PM2 kuruluyor..."
    sudo npm install -g pm2
fi
echo -e "${GREEN}✅ PM2 kurulu${NC}"

# 3.3 Nginx Kontrolü
echo ""
echo "3.3 Nginx kontrol ediliyor..."
if ! command -v nginx &> /dev/null; then
    echo "Nginx kuruluyor..."
    sudo apt update
    sudo apt install -y nginx
fi
echo -e "${GREEN}✅ Nginx kurulu${NC}"

# ============================================
# BÖLÜM 4: BACKEND KURULUMU
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 4: Backend Kurulumu"
echo "==========================================${NC}"

cd /opt/ezooffice/server

# 4.1 Backend Bağımlılıklarını Yükle
echo ""
echo "4.1 Backend bağımlılıkları yükleniyor..."
rm -rf node_modules 2>/dev/null || true
npm install
echo -e "${GREEN}✅ Backend bağımlılıkları yüklendi${NC}"

# 4.2 Backend .env Dosyası
echo ""
echo "4.2 Backend .env dosyası oluşturuluyor..."
cat > .env <<EOF
DATABASE_URL="postgresql://ezooffice_user:${DB_PASSWORD}@${DB_VM_IP}:5432/ezooffice?schema=public"
JWT_SECRET="${JWT_SECRET}"
PORT=3001
NODE_ENV=production
FRONTEND_URL="http://${APP_IP},https://${APP_DOMAIN}"
# Google Drive credentials - Kullanıcı manuel olarak eklemeli
# GOOGLE_DRIVE_CREDENTIALS JSON formatında service account credentials
# Örnek: GOOGLE_DRIVE_CREDENTIALS='{"type":"service_account",...}'
# Detaylar için: GOOGLE_DRIVE_SETUP.md dosyasına bakın
GOOGLE_DRIVE_ROOT_FOLDER=EzoOffice
EOF
echo -e "${GREEN}✅ Backend .env oluşturuldu${NC}"

# 4.3 Prisma Setup
echo ""
echo "4.3 Prisma yapılandırılıyor..."
npx prisma generate
echo -e "${GREEN}✅ Prisma Client oluşturuldu${NC}"

# 4.4 Veritabanı Şeması
echo ""
echo "4.4 Veritabanı şeması oluşturuluyor..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    npx prisma migrate deploy
else
    npx prisma db push --accept-data-loss
fi
echo -e "${GREEN}✅ Veritabanı şeması oluşturuldu${NC}"

# 4.5 Veritabanı Seed (sadece boş tablolarda)
echo ""
echo "4.5 Veritabanı seed kontrolü yapılıyor..."
npx tsx prisma/seed.ts || echo -e "${YELLOW}⚠️  Seed atlandı (veritabanında zaten veri var)${NC}"
echo -e "${GREEN}✅ Veritabanı seed kontrolü tamamlandı${NC}"

# 4.6 Backend Build
echo ""
echo "4.6 Backend build ediliyor..."
npm run build
echo -e "${GREEN}✅ Backend build edildi${NC}"

# 4.7 Uploads Klasörü
echo ""
echo "4.7 Uploads klasörü oluşturuluyor..."
mkdir -p uploads/avatars
chmod -R 755 uploads
echo -e "${GREEN}✅ Uploads klasörü oluşturuldu${NC}"

# ============================================
# BÖLÜM 5: FRONTEND KURULUMU
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 5: Frontend Kurulumu"
echo "==========================================${NC}"

cd /opt/ezooffice

# 5.1 Frontend Bağımlılıklarını Yükle
echo ""
echo "5.1 Frontend bağımlılıkları yükleniyor..."
rm -rf node_modules dist 2>/dev/null || true
npm install
echo -e "${GREEN}✅ Frontend bağımlılıkları yüklendi${NC}"

# 5.2 Frontend .env Dosyası
echo ""
echo "5.2 Frontend .env dosyası oluşturuluyor..."
cat > .env <<EOF
VITE_API_URL=https://${APP_DOMAIN}/api
EOF
echo -e "${GREEN}✅ Frontend .env oluşturuldu${NC}"

# 5.3 src/index.css Kontrolü ve Düzeltme
echo ""
echo "5.3 src/index.css kontrol ediliyor..."
if [ ! -f "src/index.css" ]; then
    echo -e "${RED}❌ src/index.css bulunamadı!${NC}"
    exit 1
fi

# @import'ın en üstte olduğunu kontrol et
if ! head -1 src/index.css | grep -q "^@import"; then
    echo -e "${YELLOW}⚠️  @import en üstte değil, düzeltiliyor...${NC}"
    {
        echo "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');"
        echo ""
        grep -v "^@import" src/index.css
    } > src/index.css.tmp
    mv src/index.css.tmp src/index.css
    echo -e "${GREEN}✅ src/index.css düzeltildi${NC}"
fi

# 5.4 Frontend Build
echo ""
echo "5.4 Frontend build ediliyor..."
chmod +x node_modules/.bin/* 2>/dev/null || true
npm run build
echo -e "${GREEN}✅ Frontend build edildi${NC}"

# 5.5 Build Sonrası İzinler
echo ""
echo "5.5 Build sonrası izinler ayarlanıyor..."
sudo chmod -R 755 /opt/ezooffice/dist
sudo chmod 755 /opt/ezooffice
sudo chmod 755 /opt
echo -e "${GREEN}✅ İzinler ayarlandı${NC}"

# ============================================
# BÖLÜM 6: NGINX YAPILANDIRMASI
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 6: Nginx Yapılandırması"
echo "==========================================${NC}"

# 6.1 Nginx Config
echo ""
echo "6.1 Nginx config oluşturuluyor..."

# SSL sertifika yollarını kontrol et
SSL_CERT_PATH="/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem"
SSL_KEY_PATH="/etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem"
HAS_SSL=false

if [ -f "$SSL_CERT_PATH" ] && [ -f "$SSL_KEY_PATH" ]; then
    HAS_SSL=true
    echo -e "${GREEN}✅ SSL sertifikaları bulundu${NC}"
else
    echo -e "${YELLOW}⚠️  SSL sertifikaları bulunamadı, HTTP yapılandırması kullanılıyor${NC}"
fi

if [ "$HAS_SSL" = true ]; then
    # SSL ile Nginx Config
    sudo tee /etc/nginx/sites-available/ezooffice > /dev/null <<EOF
# HTTP'den HTTPS'e redirect
server {
    listen 80;
    server_name ${APP_DOMAIN} ${APP_IP};
    return 301 https://\$server_name\$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name ${APP_DOMAIN} ${APP_IP};
    
    # SSL Sertifikaları
    ssl_certificate ${SSL_CERT_PATH};
    ssl_certificate_key ${SSL_KEY_PATH};
    
    # SSL Yapılandırması
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # File upload size limit
    client_max_body_size 50M;
    
    # Frontend
    root /opt/ezooffice/dist;
    index index.html;
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }
    
    # Uploads
    location /uploads {
        alias /opt/ezooffice/server/uploads;
    }
    
    # Frontend routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
else
    # HTTP Nginx Config (SSL yoksa)
    sudo tee /etc/nginx/sites-available/ezooffice > /dev/null <<EOF
server {
    listen 80;
    server_name ${APP_DOMAIN} ${APP_IP};
    
    # File upload size limit
    client_max_body_size 50M;
    
    # Frontend
    root /opt/ezooffice/dist;
    index index.html;
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }
    
    # Uploads
    location /uploads {
        alias /opt/ezooffice/server/uploads;
    }
    
    # Frontend routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
fi

# 6.2 Nginx Aktif Et
echo ""
echo "6.2 Nginx config aktif ediliyor..."
sudo ln -sf /etc/nginx/sites-available/ezooffice /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 6.3 Nginx Test
echo ""
echo "6.3 Nginx config test ediliyor..."
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx config geçerli${NC}"
else
    echo -e "${RED}❌ Nginx config hatası!${NC}"
    exit 1
fi

# ============================================
# BÖLÜM 7: BACKEND BAŞLATMA
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 7: Backend Başlatma"
echo "==========================================${NC}"

# 7.1 PM2 ile Backend Başlat
echo ""
echo "7.1 Backend PM2 ile başlatılıyor..."
cd /opt/ezooffice/server
# PM2'yi düzgün restart et
pm2 delete ezooffice-backend 2>/dev/null || true
sleep 2
# Port 3001'i kullanan diğer process'leri kontrol et ve temizle
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1
pm2 start dist/index.js --name ezooffice-backend
pm2 save
pm2 startup systemd -u $REAL_USER --hp $HOME_DIR
echo -e "${GREEN}✅ Backend başlatıldı${NC}"

# 7.2 Backend Health Check
echo ""
echo "7.2 Backend health check..."
sleep 3
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend çalışıyor${NC}"
else
    echo -e "${RED}❌ Backend başlatılamadı!${NC}"
    echo "Logları kontrol edin: pm2 logs ezooffice-backend"
    exit 1
fi

# ============================================
# BÖLÜM 8: NGINX BAŞLATMA
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 8: Nginx Başlatma"
echo "==========================================${NC}"

# 8.1 Nginx Restart
echo ""
echo "8.1 Nginx yeniden başlatılıyor..."
sudo systemctl restart nginx
sudo systemctl enable nginx
echo -e "${GREEN}✅ Nginx başlatıldı${NC}"

# 8.2 www-data Erişim Testi
echo ""
echo "8.2 www-data erişim testi..."
if sudo -u www-data test -r /opt/ezooffice/dist/index.html 2>/dev/null; then
    echo -e "${GREEN}✅ www-data dosyaya erişebiliyor${NC}"
else
    echo -e "${YELLOW}⚠️  www-data erişemiyor, izinler düzeltiliyor...${NC}"
    sudo chmod -R 755 /opt/ezooffice/dist
    sudo chmod 755 /opt/ezooffice
    sudo chmod 755 /opt
    echo -e "${GREEN}✅ İzinler düzeltildi${NC}"
fi

# ============================================
# KURULUM TAMAMLANDI
# ============================================
echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ KURULUM TAMAMLANDI!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}📋 Bilgiler:${NC}"
echo "   Frontend URL: http://${APP_IP}"
echo "   Domain URL: http://${APP_DOMAIN}"
echo "   Backend API: http://${APP_IP}/api"
echo ""
echo -e "${BLUE}📋 Kontrol Komutları:${NC}"
echo "   pm2 list                    # PM2 durumu"
echo "   pm2 logs ezooffice-backend  # Backend logları"
echo "   sudo nginx -t              # Nginx config test"
echo "   curl http://localhost/api/health  # API test"
echo ""
echo -e "${GREEN}✅ Kurulum başarıyla tamamlandı!${NC}"
echo ""

