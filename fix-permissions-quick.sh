#!/bin/bash

# EzoOffice - Hızlı İzin Düzeltme
# npm install ve build için gerekli izinleri verir

set -e

echo "🔧 İzinler düzeltiliyor..."

# Renk kodları
GREEN='\033[0;32m'
NC='\033[0m'

# 1. Klasör sahipliğini düzelt
echo "1️⃣ Klasör sahipliği düzeltiliyor..."
sudo chown -R $USER:$USER /opt/ezooffice
echo -e "${GREEN}✅ Sahiplik düzeltildi${NC}"

# 2. Yazma izinleri ver
echo ""
echo "2️⃣ Yazma izinleri veriliyor..."
sudo chmod -R u+w /opt/ezooffice
sudo chmod 755 /opt/ezooffice
echo -e "${GREEN}✅ Yazma izinleri verildi${NC}"

# 3. node_modules varsa temizle ve izinleri düzelt
echo ""
echo "3️⃣ node_modules kontrol ediliyor..."
if [ -d "/opt/ezooffice/node_modules" ]; then
    echo "Mevcut node_modules temizleniyor..."
    rm -rf /opt/ezooffice/node_modules
    echo -e "${GREEN}✅ node_modules temizlendi${NC}"
fi

# 4. .vite-temp temizle
echo ""
echo "4️⃣ Vite cache temizleniyor..."
rm -rf /opt/ezooffice/node_modules/.vite-temp 2>/dev/null || true
rm -rf /opt/ezooffice/.vite 2>/dev/null || true
echo -e "${GREEN}✅ Vite cache temizlendi${NC}"

# 5. dist klasörü izinleri
echo ""
echo "5️⃣ dist klasörü izinleri..."
if [ -d "/opt/ezooffice/dist" ]; then
    sudo chmod -R 755 /opt/ezooffice/dist
    echo -e "${GREEN}✅ dist izinleri düzeltildi${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ İzinler düzeltildi!${NC}"
echo "=========================================="
echo ""
echo "Şimdi şu komutları çalıştırabilirsiniz:"
echo "  cd /opt/ezooffice"
echo "  npm install"
echo "  npm run build"
echo ""

