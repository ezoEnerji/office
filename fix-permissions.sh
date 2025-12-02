#!/bin/bash

# EzoOffice - Nginx İzin Sorunu Düzeltme
# www-data kullanıcısının dist klasörüne erişebilmesi için

set -e

echo "🔧 Nginx izin sorunu düzeltiliyor..."
echo ""

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. /opt klasörüne okuma izni
echo "1️⃣ /opt klasörü izinleri..."
sudo chmod 755 /opt
echo -e "${GREEN}✅ /opt izinleri düzeltildi${NC}"

# 2. /opt/ezooffice klasörüne okuma izni
echo ""
echo "2️⃣ /opt/ezooffice klasörü izinleri..."
sudo chmod 755 /opt/ezooffice
echo -e "${GREEN}✅ /opt/ezooffice izinleri düzeltildi${NC}"

# 3. dist klasörüne www-data erişimi
echo ""
echo "3️⃣ dist klasörü izinleri..."
sudo chmod -R 755 /opt/ezooffice/dist
echo -e "${GREEN}✅ dist klasörü izinleri düzeltildi${NC}"

# 4. www-data kullanıcısı için özel izin (ACL varsa)
echo ""
echo "4️⃣ www-data kullanıcı izinleri..."
if command -v setfacl &> /dev/null; then
    sudo setfacl -R -m u:www-data:rx /opt/ezooffice/dist
    echo -e "${GREEN}✅ ACL ile www-data izinleri verildi${NC}"
else
    # ACL yoksa, www-data grubuna ekle
    sudo chgrp -R www-data /opt/ezooffice/dist 2>/dev/null || {
        # Grup değiştirme başarısız olursa, herkese okuma izni ver
        echo -e "${YELLOW}⚠️  www-data grubu bulunamadı, herkese okuma izni veriliyor...${NC}"
        sudo chmod -R 755 /opt/ezooffice/dist
    }
    sudo chmod -R g+rX /opt/ezooffice/dist
    echo -e "${GREEN}✅ www-data grubu izinleri verildi${NC}"
fi

# 5. Test
echo ""
echo "5️⃣ İzin testi..."
if [ -r "/opt/ezooffice/dist/index.html" ]; then
    echo -e "${GREEN}✅ index.html okunabilir${NC}"
else
    echo -e "${YELLOW}⚠️  index.html okunamıyor, izinleri kontrol edin${NC}"
fi

# 6. Nginx restart
echo ""
echo "6️⃣ Nginx yeniden başlatılıyor..."
sudo systemctl restart nginx
echo -e "${GREEN}✅ Nginx yeniden başlatıldı${NC}"

# 7. Son kontrol
echo ""
echo "7️⃣ Son kontrol..."
sleep 2
if sudo -u www-data test -r /opt/ezooffice/dist/index.html 2>/dev/null; then
    echo -e "${GREEN}✅ www-data kullanıcısı dosyaya erişebiliyor${NC}"
else
    echo -e "${YELLOW}⚠️  www-data hala erişemiyor, alternatif çözüm uygulanıyor...${NC}"
    # Son çare: herkese okuma izni
    sudo chmod -R 755 /opt/ezooffice/dist
    sudo chmod 755 /opt/ezooffice
    sudo chmod 755 /opt
    echo -e "${GREEN}✅ Genel okuma izinleri verildi${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ İzin düzeltme tamamlandı!${NC}"
echo "=========================================="
echo ""
echo "📋 Test komutları:"
echo "  sudo -u www-data test -r /opt/ezooffice/dist/index.html && echo 'OK' || echo 'FAIL'"
echo "  curl http://localhost/"
echo "  sudo tail -f /var/log/nginx/error.log"
echo ""

