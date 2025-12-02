#!/bin/bash

# SSL Sonrası Nginx Yapılandırması Düzeltme Scripti

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "  SSL Sonrası Nginx Yapılandırması"
echo "==========================================${NC}"

# Domain ve IP bilgilerini al
APP_DOMAIN="office.ezoenerji.com"
APP_IP=$(curl -s ifconfig.me 2>/dev/null || echo "34.51.217.25")

echo -e "${BLUE}📋 Ayarlar:${NC}"
echo "   Domain: $APP_DOMAIN"
echo "   IP: $APP_IP"
echo ""

# SSL sertifika yollarını kontrol et
SSL_CERT_PATH="/etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem"
SSL_KEY_PATH="/etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem"
HAS_SSL=false

if [ -f "$SSL_CERT_PATH" ] && [ -f "$SSL_KEY_PATH" ]; then
    HAS_SSL=true
    echo -e "${GREEN}✅ SSL sertifikaları bulundu${NC}"
    echo "   Cert: $SSL_CERT_PATH"
    echo "   Key: $SSL_KEY_PATH"
else
    echo -e "${YELLOW}⚠️  SSL sertifikaları bulunamadı${NC}"
    echo "   Beklenen: $SSL_CERT_PATH"
    echo "   Beklenen: $SSL_KEY_PATH"
    read -p "Yine de devam etmek istiyor musunuz? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Nginx config oluşturuluyor..."

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
    echo -e "${GREEN}✅ SSL ile Nginx config oluşturuldu${NC}"
else
    # HTTP Nginx Config
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
    echo -e "${GREEN}✅ HTTP Nginx config oluşturuldu${NC}"
fi

# Nginx config'i test et
echo ""
echo "Nginx config test ediliyor..."
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx config geçerli${NC}"
else
    echo -e "${RED}❌ Nginx config hatası!${NC}"
    exit 1
fi

# Nginx'i restart et
echo ""
echo "Nginx yeniden başlatılıyor..."
sudo systemctl restart nginx
echo -e "${GREEN}✅ Nginx yeniden başlatıldı${NC}"

# Backend kontrolü
echo ""
echo "Backend kontrol ediliyor..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend çalışıyor${NC}"
else
    echo -e "${YELLOW}⚠️  Backend çalışmıyor!${NC}"
    echo "Backend'i başlatmak için:"
    echo "  cd /opt/ezooffice/server"
    echo "  pm2 start dist/index.js --name ezooffice-backend"
    echo "  pm2 save"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ Tamamlandı!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}📋 Kontrol Komutları:${NC}"
echo "  sudo nginx -t              # Nginx config test"
echo "  sudo systemctl status nginx # Nginx durumu"
echo "  pm2 list                   # Backend durumu"
echo "  curl https://${APP_DOMAIN}/api/health  # API test"
echo ""

