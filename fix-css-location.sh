#!/bin/bash

# EzoOffice - CSS Dosyası Düzeltme
# index.css dosyasını doğru yere taşır

set -e

echo "🔧 CSS dosyası düzeltiliyor..."

cd /opt/ezooffice

# 1. Root dizindeki yanlış dosyayı sil
if [ -f "index.css" ]; then
    echo "⚠️  Root dizindeki index.css siliniyor..."
    rm index.css
    echo "✅ Yanlış dosya silindi"
fi

# 2. src/index.css'in varlığını kontrol et
if [ ! -f "src/index.css" ]; then
    echo "❌ src/index.css bulunamadı!"
    echo "Dosyayı oluşturuyoruz..."
    cat > src/index.css <<'EOF'
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Inter', sans-serif;
  background-color: #f8fafc;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
EOF
    echo "✅ src/index.css oluşturuldu"
else
    echo "✅ src/index.css mevcut"
    
    # İçeriği kontrol et
    if ! grep -q "^@import url" src/index.css; then
        echo "⚠️  @import en üstte değil, düzeltiliyor..."
        # Geçici dosya oluştur
        {
            echo "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');"
            echo ""
            grep -v "@import url" src/index.css | grep -v "^$" | head -1
            tail -n +2 src/index.css
        } > src/index.css.tmp
        mv src/index.css.tmp src/index.css
        echo "✅ İçerik düzeltildi"
    fi
fi

# 3. Dosya içeriğini göster
echo ""
echo "📄 src/index.css içeriği (ilk 5 satır):"
head -5 src/index.css

# 4. Build cache'i temizle
echo ""
echo "🧹 Build cache temizleniyor..."
rm -rf dist
rm -rf node_modules/.vite 2>/dev/null || true
echo "✅ Cache temizlendi"

# 5. Yeniden build
echo ""
echo "🏗️  Yeniden build ediliyor..."
npm run build

echo ""
echo "✅ Tamamlandı!"
echo "Şimdi: sudo systemctl restart nginx"

