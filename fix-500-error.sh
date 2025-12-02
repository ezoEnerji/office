#!/bin/bash

# EzoOffice - 500 Error Düzeltme Scripti
# Nginx 500 hatası için hızlı çözüm

set -e

echo "🔧 500 Internal Server Error Düzeltiliyor..."
echo ""

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Backend kontrolü
echo "1️⃣ Backend kontrol ediliyor..."
if pm2 list | grep -q "ezooffice-backend.*online"; then
    echo -e "${GREEN}✅ Backend çalışıyor${NC}"
else
    echo -e "${RED}❌ Backend çalışmıyor!${NC}"
    echo "Backend başlatılıyor..."
    cd /opt/ezooffice/server
    pm2 start dist/index.js --name ezooffice-backend || {
        echo "Backend build ediliyor..."
        npm run build
        pm2 start dist/index.js --name ezooffice-backend
    }
    pm2 save
fi

# 2. Backend health check
echo ""
echo "2️⃣ Backend health check..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend API erişilebilir${NC}"
else
    echo -e "${RED}❌ Backend API erişilemiyor!${NC}"
    echo "Backend logları:"
    pm2 logs ezooffice-backend --lines 20 --nostream
    exit 1
fi

# 3. Frontend build kontrolü
echo ""
echo "3️⃣ Frontend build kontrol ediliyor..."
if [ -d "/opt/ezooffice/dist" ] && [ -f "/opt/ezooffice/dist/index.html" ]; then
    echo -e "${GREEN}✅ Frontend build mevcut${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend build bulunamadı, build ediliyor...${NC}"
    cd /opt/ezooffice
    npm run build
fi

# 4. İzinleri düzelt
echo ""
echo "4️⃣ İzinler düzeltiliyor..."
# www-data kullanıcısının erişebilmesi için izinleri düzelt
sudo chown -R $USER:$USER /opt/ezooffice
sudo chmod -R 755 /opt/ezooffice
# dist klasörüne www-data'nın erişebilmesi için özel izin
sudo chmod -R 755 /opt/ezooffice/dist
# Tüm parent klasörlere de okuma izni ver (www-data için gerekli)
sudo chmod 755 /opt
sudo chmod 755 /opt/ezooffice
# www-data kullanıcısının okuyabilmesi için
sudo setfacl -R -m u:www-data:rx /opt/ezooffice/dist 2>/dev/null || {
    # ACL yoksa, klasörü www-data grubuna ekle
    sudo chgrp -R www-data /opt/ezooffice/dist 2>/dev/null || true
    sudo chmod -R g+rX /opt/ezooffice/dist
}
echo -e "${GREEN}✅ İzinler düzeltildi${NC}"

# 5. Nginx config kontrolü
echo ""
echo "5️⃣ Nginx config kontrol ediliyor..."
if [ -f "/etc/nginx/sites-available/ezooffice" ]; then
    echo -e "${GREEN}✅ Nginx config mevcut${NC}"
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo -e "${GREEN}✅ Nginx config geçerli${NC}"
    else
        echo -e "${RED}❌ Nginx config hatası!${NC}"
        sudo nginx -t
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Nginx config bulunamadı, oluşturuluyor...${NC}"
    # Nginx config oluştur
    APP_IP=$(curl -s ifconfig.me 2>/dev/null || echo "34.51.217.25")
    APP_DOMAIN="office.ezoenerji.com"
    
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
    
    # Frontend routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/ezooffice /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx config oluşturuldu${NC}"
fi

# 6. Nginx restart
echo ""
echo "6️⃣ Nginx yeniden başlatılıyor..."
sudo systemctl restart nginx
echo -e "${GREEN}✅ Nginx yeniden başlatıldı${NC}"

# 7. Son kontrol
echo ""
echo "7️⃣ Son kontrol yapılıyor..."
sleep 2

if curl -s http://localhost/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API erişilebilir${NC}"
else
    echo -e "${YELLOW}⚠️  API henüz hazır değil, birkaç saniye bekleyin...${NC}"
fi

if [ -f "/opt/ezooffice/dist/index.html" ]; then
    echo -e "${GREEN}✅ Frontend dosyası mevcut${NC}"
else
    echo -e "${RED}❌ Frontend dosyası bulunamadı!${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Düzeltme tamamlandı!${NC}"
echo "=========================================="
echo ""
echo "📋 Kontrol komutları:"
echo "  pm2 logs ezooffice-backend --lines 50"
echo "  sudo tail -f /var/log/nginx/error.log"
echo "  curl http://localhost:3001/api/health"
echo "  curl http://localhost/api/health"
echo ""

