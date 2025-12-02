#!/bin/bash

# EzoOffice Uygulama VM Kurulum Scripti
# Google Cloud VM için hazırlanmıştır

set -e

echo "🚀 EzoOffice Uygulama Kurulumu Başlıyor..."

# Mevcut dizini kaydet
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ "$SCRIPT_DIR" = "/opt/ezooffice" ] || [ "$(pwd)" != "$HOME" ]; then
    CURRENT_DIR="$(pwd)"
else
    CURRENT_DIR="$HOME"
fi

# Değişkenler - BUNLARI DÜZENLEYİN!
DB_VM_IP="10.226.0.3"  # PostgreSQL VM'inin internal IP'si
DB_PASSWORD="Ezo2025!+"  # PostgreSQL şifresi
JWT_SECRET="4d5595a36f22c8d561da29ff8fde626f8febcd5d861d696ea0d394f652e66cfc"  # JWT secret
APP_DOMAIN="office.ezoenerji.com"  # Domain adınız (opsiyonel)
APP_IP=$(curl -s ifconfig.me)  # External IP (otomatik)

# Sistem güncellemesi
echo "📦 Sistem güncellemesi yapılıyor..."
sudo apt update && sudo apt upgrade -y

# Node.js kurulumu
echo "📦 Node.js kuruluyor..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 kurulumu
echo "📦 PM2 kuruluyor..."
sudo npm install -g pm2

# Git kurulumu
echo "📦 Git kuruluyor..."
sudo apt install git -y

# Projeyi /opt/ezooffice'e taşı veya kopyala
echo "📥 Proje yükleniyor..."
CURRENT_DIR=$(pwd)

if [ -d "/opt/ezooffice" ]; then
    echo "⚠️  /opt/ezooffice zaten var, güncelleniyor..."
    # İzinleri düzelt
    sudo chown -R $USER:$USER /opt/ezooffice
    cd /opt/ezooffice
    # Git repo ise pull yap
    if [ -d ".git" ]; then
        git pull || echo "Git pull başarısız, manuel güncelleme gerekebilir"
    fi
else
    echo "📁 Proje dosyaları /opt/ezooffice'e kopyalanıyor..."
    # /opt klasörünü oluştur (yoksa)
    sudo mkdir -p /opt
    
    # Mevcut dizindeki dosyaları /opt/ezooffice'e kopyala
    if [ -f "package.json" ] || [ -d "server" ] || [ -d "src" ]; then
        echo "✅ Mevcut dizinde proje dosyaları bulundu, kopyalanıyor..."
        sudo cp -r $CURRENT_DIR /opt/ezooffice
        # Gizli dosyaları da kopyala (varsa)
        sudo cp -r $CURRENT_DIR/.git* /opt/ezooffice/ 2>/dev/null || true
        sudo cp -r $CURRENT_DIR/.env* /opt/ezooffice/ 2>/dev/null || true
        # İzinleri düzelt
        sudo chown -R $USER:$USER /opt/ezooffice
        sudo chmod -R u+w /opt/ezooffice
    else
        echo "⚠️  Proje dosyaları bulunamadı!"
        echo "   Lütfen proje dosyalarının olduğu dizinde script'i çalıştırın"
        exit 1
    fi
fi

cd /opt/ezooffice

# /opt/ezooffice'e geç
cd /opt/ezooffice

# Backend kurulumu
echo "🔧 Backend kuruluyor..."
cd server
# Backend binary'lere execute izni ver
chmod +x node_modules/.bin/* 2>/dev/null || true
npm install

# .env dosyası oluştur
echo "📝 Backend .env dosyası oluşturuluyor..."
cat > .env <<EOF
DATABASE_URL="postgresql://ezooffice_user:$DB_PASSWORD@$DB_VM_IP:5432/ezooffice?schema=public"
JWT_SECRET="$JWT_SECRET"
PORT=3001
NODE_ENV=production
FRONTEND_URL="http://$APP_IP,https://$APP_DOMAIN"
EOF

# Prisma setup
echo "🗄️ Prisma yapılandırılıyor..."
# Prisma binary'sine execute izni ver
chmod +x node_modules/.bin/* 2>/dev/null || true
# npx ile çalıştır (daha güvenli)
npx prisma generate

# Migration kontrolü - ilk kurulum için db push, sonraki için migrate deploy
echo "📊 Veritabanı şeması oluşturuluyor..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "✅ Migration dosyaları bulundu, migrate deploy çalıştırılıyor..."
    npx prisma migrate deploy
else
    echo "⚠️  Migration dosyaları bulunamadı, db push kullanılıyor (ilk kurulum)..."
    npx prisma db push --accept-data-loss
fi

# Seed için tsx çalıştır
echo "🌱 Veritabanı seed ediliyor..."
if [ -f "node_modules/.bin/tsx" ]; then
    chmod +x node_modules/.bin/tsx
    npx tsx prisma/seed.ts
else
    echo "⚠️  tsx bulunamadı, seed atlanıyor. Manuel olarak çalıştırabilirsiniz: npx tsx prisma/seed.ts"
fi

# Build
echo "🏗️ Backend build ediliyor..."
npm run build

# Uploads klasörü
mkdir -p /opt/ezooffice/server/uploads
chmod 755 /opt/ezooffice/server/uploads

# PM2 ile başlat
echo "🚀 Backend PM2 ile başlatılıyor..."
# Eğer zaten çalışıyorsa durdur
pm2 stop ezooffice-backend 2>/dev/null || true
pm2 delete ezooffice-backend 2>/dev/null || true
# Yeni instance başlat
pm2 start dist/index.js --name ezooffice-backend
pm2 save
# Startup sadece ilk kez çalıştır
if ! systemctl is-enabled pm2-root.service >/dev/null 2>&1; then
    pm2 startup
fi

# Ana dizine dön
cd /opt/ezooffice

# Frontend kurulumu
echo "🎨 Frontend kuruluyor..."
npm install

# Frontend binary'lere execute izni ver
chmod +x node_modules/.bin/* 2>/dev/null || true

# Frontend .env
echo "📝 Frontend .env dosyası oluşturuluyor..."
cat > .env <<EOF
VITE_API_URL=http://$APP_IP/api
EOF
echo "✅ Frontend API URL: http://$APP_IP/api (Nginx proxy üzerinden)"

# Frontend build
echo "🏗️ Frontend build ediliyor..."
npm run build

# Nginx kurulumu
echo "🌐 Nginx kuruluyor..."
sudo apt install nginx -y

# Nginx config
echo "⚙️ Nginx yapılandırılıyor..."
sudo tee /etc/nginx/sites-available/ezooffice > /dev/null <<EOF
server {
    listen 80;
    server_name $APP_DOMAIN $APP_IP;

    root /opt/ezooffice/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

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

    location /uploads {
        alias /opt/ezooffice/server/uploads;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Nginx aktif et
sudo ln -sf /etc/nginx/sites-available/ezooffice /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx test ve restart
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    echo "✅ Nginx başarıyla yapılandırıldı ve başlatıldı"
else
    echo "❌ Nginx config hatası! Lütfen kontrol edin: sudo nginx -t"
fi

# Uploads symlink
sudo ln -sf /opt/ezooffice/server/uploads /opt/ezooffice/dist/uploads

echo ""
echo "✅ Kurulum tamamlandı!"
echo ""
echo "📋 Bilgiler:"
echo "   Frontend: http://$APP_IP"
echo "   Backend API: http://$APP_IP:3001/api"
echo "   PM2 Status: pm2 list"
echo "   PM2 Logs: pm2 logs ezooffice-backend"
echo ""
echo "🔒 SSL için:"
echo "   sudo certbot --nginx -d $APP_DOMAIN"
echo ""

