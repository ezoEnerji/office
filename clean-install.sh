#!/bin/bash

# EzoOffice - Temiz Kurulum Scripti
# Bu script mevcut kurulumu tamamen temizler ve yeni kurulum yapar

set -e

echo "🧹 EzoOffice Temiz Kurulum Başlatılıyor..."
echo "⚠️  Bu işlem mevcut kurulumu tamamen silecektir!"
read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ İşlem iptal edildi."
    exit 1
fi

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  EzoOffice Temiz Kurulum"
echo "=========================================="
echo ""

# 1. PM2 Process'lerini Durdur ve Sil
echo "🛑 PM2 process'leri durduruluyor..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
echo -e "${GREEN}✅ PM2 temizlendi${NC}"

# 2. Nginx Config'i Kaldır
echo "🗑️  Nginx config temizleniyor..."
if [ -f "/etc/nginx/sites-available/ezooffice" ]; then
    sudo rm -f /etc/nginx/sites-available/ezooffice
    echo -e "${GREEN}✅ Nginx config dosyası silindi${NC}"
fi

if [ -L "/etc/nginx/sites-enabled/ezooffice" ]; then
    sudo rm -f /etc/nginx/sites-enabled/ezooffice
    echo -e "${GREEN}✅ Nginx symlink silindi${NC}"
fi

# 3. Nginx Test ve Restart
echo "🔄 Nginx test ediliyor..."
sudo nginx -t 2>/dev/null && sudo systemctl reload nginx || echo -e "${YELLOW}⚠️  Nginx config hatası (normal, config silindi)${NC}"

# 4. EzoOffice Klasörünü Tamamen Sil
echo "🗑️  /opt/ezooffice klasörü siliniyor..."
if [ -d "/opt/ezooffice" ]; then
    sudo rm -rf /opt/ezooffice
    echo -e "${GREEN}✅ /opt/ezooffice silindi${NC}"
else
    echo -e "${YELLOW}⚠️  /opt/ezooffice zaten yok${NC}"
fi

# 5. PM2 Startup Script'i Kaldır
echo "🗑️  PM2 startup script kaldırılıyor..."
pm2 unstartup systemd 2>/dev/null || true
echo -e "${GREEN}✅ PM2 startup script kaldırıldı${NC}"

# 6. Uploads Klasörünü Sil (varsa)
if [ -d "/opt/ezooffice/uploads" ]; then
    echo "🗑️  Uploads klasörü siliniyor..."
    sudo rm -rf /opt/ezooffice/uploads
fi

# 7. Log Dosyalarını Temizle
echo "🗑️  Log dosyaları temizleniyor..."
sudo rm -rf ~/.pm2/logs/* 2>/dev/null || true
echo -e "${GREEN}✅ Log dosyaları temizlendi${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Temizleme tamamlandı!${NC}"
echo "=========================================="
echo ""
echo "📋 Sonraki Adımlar:"
echo "1. Proje dosyalarını /opt/ezooffice'e yükleyin"
echo "2. setup-app.sh scriptini çalıştırın"
echo ""
echo "Örnek komutlar:"
echo "  cd /opt"
echo "  # Dosyaları buraya yükleyin (Git, SCP, ZIP vb.)"
echo "  cd ezooffice"
echo "  chmod +x setup-app.sh"
echo "  ./setup-app.sh"
echo ""

