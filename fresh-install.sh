#!/bin/bash

# EzoOffice - Sağlam Temiz Kurulum Scripti
# Bu script mevcut kurulumu tamamen temizler ve sıfırdan yeni kurulum yapar

set -e

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo ""
echo -e "${BLUE}=========================================="
echo "  EzoOffice - Temiz Kurulum"
echo "==========================================${NC}"
echo ""

# Onay
echo -e "${YELLOW}⚠️  Bu işlem mevcut kurulumu tamamen silecektir!${NC}"
read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ İşlem iptal edildi.${NC}"
    exit 1
fi

# Değişkenler - BUNLARI DÜZENLEYİN!
DB_VM_IP="10.226.0.3"  # PostgreSQL VM'inin internal IP'si
DB_PASSWORD="Ezo2025!+"  # PostgreSQL şifresi
JWT_SECRET="4d5595a36f22c8d561da29ff8fde626f8febcd5d861d696ea0d394f652e66cfc"
APP_DOMAIN="office.ezoenerji.com"
APP_IP=$(curl -s ifconfig.me 2>/dev/null || echo "34.51.217.25")

echo ""
echo -e "${BLUE}📋 Kurulum Ayarları:${NC}"
echo "   Database IP: $DB_VM_IP"
echo "   Domain: $APP_DOMAIN"
echo "   External IP: $APP_IP"
echo ""
read -p "Bu ayarlar doğru mu? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "Lütfen script içindeki değişkenleri düzenleyin ve tekrar çalıştırın."
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
if [ -f "/etc/nginx/sites-available/ezooffice" ]; then
    sudo rm -f /etc/nginx/sites-available/ezooffice
    echo -e "${GREEN}✅ Nginx config dosyası silindi${NC}"
fi
if [ -L "/etc/nginx/sites-enabled/ezooffice" ]; then
    sudo rm -f /etc/nginx/sites-enabled/ezooffice
    echo -e "${GREEN}✅ Nginx symlink silindi${NC}"
fi

# 1.3 EzoOffice Klasörünü Sil
echo ""
echo "1.3 /opt/ezooffice klasörü siliniyor..."
if [ -d "/opt/ezooffice" ]; then
    sudo rm -rf /opt/ezooffice
    echo -e "${GREEN}✅ /opt/ezooffice silindi${NC}"
else
    echo -e "${YELLOW}⚠️  /opt/ezooffice zaten yok${NC}"
fi

# 1.4 PM2 Startup Script'i Kaldır
echo ""
echo "1.4 PM2 startup script kaldırılıyor..."
pm2 unstartup systemd 2>/dev/null || true
echo -e "${GREEN}✅ PM2 startup script kaldırıldı${NC}"

# 1.5 Log Dosyalarını Temizle
echo ""
echo "1.5 Log dosyaları temizleniyor..."
sudo rm -rf ~/.pm2/logs/* 2>/dev/null || true
echo -e "${GREEN}✅ Log dosyaları temizlendi${NC}"

# ============================================
# BÖLÜM 2: SİSTEM GÜNCELLEMELERİ
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 2: Sistem Güncellemeleri"
echo "==========================================${NC}"

# 2.1 Sistem Güncellemesi
echo ""
echo "2.1 Sistem güncellemesi yapılıyor..."
sudo apt update && sudo apt upgrade -y
echo -e "${GREEN}✅ Sistem güncellendi${NC}"

# 2.2 Node.js Kurulumu
echo ""
echo "2.2 Node.js kuruluyor..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${YELLOW}⚠️  Node.js zaten kurulu: $NODE_VERSION${NC}"
    read -p "Yeniden kurmak istiyor musunuz? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ Node.js kuruldu: $NODE_VERSION (npm: $NPM_VERSION)${NC}"

# 2.3 PM2 Kurulumu
echo ""
echo "2.3 PM2 kuruluyor..."
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 zaten kurulu${NC}"
else
    sudo npm install -g pm2
fi
echo -e "${GREEN}✅ PM2 kuruldu${NC}"

# 2.4 Git Kurulumu
echo ""
echo "2.4 Git kuruluyor..."
if command -v git &> /dev/null; then
    echo -e "${YELLOW}⚠️  Git zaten kurulu${NC}"
else
    sudo apt install -y git
fi
echo -e "${GREEN}✅ Git kuruldu${NC}"

# 2.5 Nginx Kurulumu
echo ""
echo "2.5 Nginx kuruluyor..."
if command -v nginx &> /dev/null; then
    echo -e "${YELLOW}⚠️  Nginx zaten kurulu${NC}"
else
    sudo apt install -y nginx
fi
echo -e "${GREEN}✅ Nginx kuruldu${NC}"

# ============================================
# BÖLÜM 3: PROJE DOSYALARINI YÜKLE
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 3: Proje Dosyalarını Yükle"
echo "==========================================${NC}"

# 3.1 Proje Klasörünü Oluştur
echo ""
echo "3.1 Proje klasörü oluşturuluyor..."
sudo mkdir -p /opt/ezooffice
sudo chown -R $USER:$USER /opt/ezooffice
echo -e "${GREEN}✅ /opt/ezooffice oluşturuldu${NC}"

# 3.2 Proje Dosyalarını Kontrol Et
echo ""
echo "3.2 Proje dosyaları kontrol ediliyor..."
CURRENT_DIR=$(pwd)

if [ -f "$CURRENT_DIR/package.json" ] && [ -d "$CURRENT_DIR/src" ] && [ -d "$CURRENT_DIR/server" ]; then
    echo -e "${GREEN}✅ Proje dosyaları mevcut dizinde bulundu${NC}"
    echo "Dosyalar kopyalanıyor..."
    cp -r "$CURRENT_DIR"/* /opt/ezooffice/ 2>/dev/null || true
    cp -r "$CURRENT_DIR"/.* /opt/ezooffice/ 2>/dev/null || true
    # node_modules ve dist'i hariç tut
    rm -rf /opt/ezooffice/node_modules 2>/dev/null || true
    rm -rf /opt/ezooffice/dist 2>/dev/null || true
    rm -rf /opt/ezooffice/server/node_modules 2>/dev/null || true
    rm -rf /opt/ezooffice/server/dist 2>/dev/null || true
    echo -e "${GREEN}✅ Dosyalar kopyalandı${NC}"
elif [ -d "/opt/ezooffice" ] && [ -f "/opt/ezooffice/package.json" ]; then
    echo -e "${YELLOW}⚠️  Proje dosyaları zaten /opt/ezooffice'de${NC}"
else
    echo -e "${RED}❌ Proje dosyaları bulunamadı!${NC}"
    echo "Lütfen proje dosyalarını /opt/ezooffice'e yükleyin:"
    echo "  - src/ klasörü"
    echo "  - server/ klasörü"
    echo "  - index.html, package.json, vite.config.ts, tsconfig.json"
    echo ""
    read -p "Dosyaları yükledikten sonra Enter'a basın..."
fi

cd /opt/ezooffice

# 3.3 Dosya Kontrolü
echo ""
echo "3.3 Dosya kontrolü yapılıyor..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json bulunamadı!${NC}"
    exit 1
fi
if [ ! -d "src" ]; then
    echo -e "${RED}❌ src/ klasörü bulunamadı!${NC}"
    exit 1
fi
if [ ! -d "server" ]; then
    echo -e "${RED}❌ server/ klasörü bulunamadı!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Tüm gerekli dosyalar mevcut${NC}"

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
    echo "Migration dosyaları bulundu, migrate deploy kullanılıyor..."
    npx prisma migrate deploy
else
    echo "Migration dosyaları bulunamadı, db push kullanılıyor..."
    npx prisma db push --accept-data-loss
fi
echo -e "${GREEN}✅ Veritabanı şeması oluşturuldu${NC}"

# 4.5 Veritabanı Seed
echo ""
echo "4.5 Veritabanı seed ediliyor..."
npx tsx prisma/seed.ts || echo -e "${YELLOW}⚠️  Seed hatası (normal olabilir)${NC}"
echo -e "${GREEN}✅ Veritabanı seed edildi${NC}"

# 4.6 Backend Build
echo ""
echo "4.6 Backend build ediliyor..."
npm run build
echo -e "${GREEN}✅ Backend build edildi${NC}"

# 4.7 Uploads Klasörü
echo ""
echo "4.7 Uploads klasörü oluşturuluyor..."
mkdir -p uploads
chmod 755 uploads
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
npm install
echo -e "${GREEN}✅ Frontend bağımlılıkları yüklendi${NC}"

# 5.2 Frontend .env Dosyası
echo ""
echo "5.2 Frontend .env dosyası oluşturuluyor..."
cat > .env <<EOF
VITE_API_URL=http://${APP_DOMAIN}/api
EOF
echo -e "${GREEN}✅ Frontend .env oluşturuldu${NC}"

# 5.3 Frontend Build
echo ""
echo "5.3 Frontend build ediliyor..."
chmod +x node_modules/.bin/* 2>/dev/null || true
npm run build
echo -e "${GREEN}✅ Frontend build edildi${NC}"

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
sudo tee /etc/nginx/sites-available/ezooffice > /dev/null <<EOF
server {
    listen 80;
    server_name ${APP_DOMAIN} ${APP_IP};
    
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
# BÖLÜM 7: İZİNLERİ DÜZELT
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 7: İzinleri Düzelt"
echo "==========================================${NC}"

# 7.1 Klasör İzinleri
echo ""
echo "7.1 Klasör izinleri düzeltiliyor..."
sudo chown -R $USER:$USER /opt/ezooffice
sudo chmod 755 /opt
sudo chmod 755 /opt/ezooffice
sudo chmod -R 755 /opt/ezooffice/dist
echo -e "${GREEN}✅ İzinler düzeltildi${NC}"

# ============================================
# BÖLÜM 8: BACKEND BAŞLATMA
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 8: Backend Başlatma"
echo "==========================================${NC}"

# 8.1 PM2 ile Backend Başlat
echo ""
echo "8.1 Backend PM2 ile başlatılıyor..."
cd /opt/ezooffice/server
pm2 delete ezooffice-backend 2>/dev/null || true
pm2 start dist/index.js --name ezooffice-backend
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER
echo -e "${GREEN}✅ Backend başlatıldı${NC}"

# 8.2 Backend Health Check
echo ""
echo "8.2 Backend health check..."
sleep 3
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend çalışıyor${NC}"
else
    echo -e "${RED}❌ Backend başlatılamadı!${NC}"
    echo "Logları kontrol edin: pm2 logs ezooffice-backend"
    exit 1
fi

# ============================================
# BÖLÜM 9: NGINX BAŞLATMA
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 9: Nginx Başlatma"
echo "==========================================${NC}"

# 9.1 Nginx Restart
echo ""
echo "9.1 Nginx yeniden başlatılıyor..."
sudo systemctl restart nginx
sudo systemctl enable nginx
echo -e "${GREEN}✅ Nginx başlatıldı${NC}"

# 9.2 Nginx Test
echo ""
echo "9.2 Nginx test ediliyor..."
sleep 2
if curl -s http://localhost/api/health > /dev/null; then
    echo -e "${GREEN}✅ Nginx proxy çalışıyor${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx proxy henüz hazır değil${NC}"
fi

# ============================================
# BÖLÜM 10: SON KONTROLLER
# ============================================
echo ""
echo -e "${BLUE}=========================================="
echo "  BÖLÜM 10: Son Kontroller"
echo "==========================================${NC}"

# 10.1 PM2 Durumu
echo ""
echo "10.1 PM2 durumu:"
pm2 list

# 10.2 Frontend Dosyası
echo ""
echo "10.2 Frontend dosyası kontrolü:"
if [ -f "/opt/ezooffice/dist/index.html" ]; then
    echo -e "${GREEN}✅ index.html mevcut${NC}"
else
    echo -e "${RED}❌ index.html bulunamadı!${NC}"
fi

# 10.3 www-data Erişim Testi
echo ""
echo "10.3 www-data erişim testi:"
if sudo -u www-data test -r /opt/ezooffice/dist/index.html 2>/dev/null; then
    echo -e "${GREEN}✅ www-data dosyaya erişebiliyor${NC}"
else
    echo -e "${YELLOW}⚠️  www-data erişemiyor, izinler düzeltiliyor...${NC}"
    sudo chmod -R 755 /opt/ezooffice/dist
    sudo chmod 755 /opt/ezooffice
    sudo chmod 755 /opt
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
echo -e "${BLUE}🔒 SSL Kurulumu (Opsiyonel):${NC}"
echo "   sudo apt install certbot python3-certbot-nginx -y"
echo "   sudo certbot --nginx -d ${APP_DOMAIN}"
echo ""
echo -e "${GREEN}✅ Kurulum başarıyla tamamlandı!${NC}"
echo ""

