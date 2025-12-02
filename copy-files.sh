#!/bin/bash

# EzoOffice - Dosyaları /opt/ezooffice'e Kopyalama Scripti

set -e

echo "📁 Dosyalar /opt/ezooffice'e kopyalanıyor..."

# Mevcut dizini kaydet
CURRENT_DIR=$(pwd)

# /opt/ezooffice klasörünü oluştur ve izinleri ayarla
sudo mkdir -p /opt/ezooffice
sudo chown -R $USER:$USER /opt/ezooffice
sudo chmod -R u+w /opt/ezooffice

# Dosyaları kopyala
echo "📦 Dosyalar kopyalanıyor..."

# Root dizin dosyaları
if [ -f "package.json" ]; then
    cp package.json /opt/ezooffice/
    echo "✅ package.json kopyalandı"
fi

if [ -f "vite.config.ts" ]; then
    cp vite.config.ts /opt/ezooffice/
    echo "✅ vite.config.ts kopyalandı"
fi

if [ -f "tsconfig.json" ]; then
    cp tsconfig.json /opt/ezooffice/
    echo "✅ tsconfig.json kopyalandı"
fi

if [ -f "index.html" ]; then
    cp index.html /opt/ezooffice/
    echo "✅ index.html kopyalandı"
fi

if [ -f "tailwind.config.js" ]; then
    cp tailwind.config.js /opt/ezooffice/
    echo "✅ tailwind.config.js kopyalandı"
fi

if [ -f "postcss.config.js" ]; then
    cp postcss.config.js /opt/ezooffice/
    echo "✅ postcss.config.js kopyalandı"
fi

# src/ klasörü
if [ -d "src" ]; then
    cp -r src /opt/ezooffice/
    echo "✅ src/ klasörü kopyalandı"
fi

# server/ klasörü
if [ -d "server" ]; then
    cp -r server /opt/ezooffice/
    echo "✅ server/ klasörü kopyalandı"
fi

# complete-install.sh
if [ -f "complete-install.sh" ]; then
    cp complete-install.sh /opt/ezooffice/
    chmod +x /opt/ezooffice/complete-install.sh
    echo "✅ complete-install.sh kopyalandı"
fi

# İzinleri düzelt
echo ""
echo "🔧 İzinler ayarlanıyor..."
sudo chown -R $USER:$USER /opt/ezooffice
sudo chmod -R u+w /opt/ezooffice
sudo chmod 755 /opt/ezooffice

echo ""
echo "✅ Tüm dosyalar kopyalandı!"
echo ""
echo "Şimdi şu komutu çalıştırın:"
echo "  cd /opt/ezooffice"
echo "  ./complete-install.sh"

