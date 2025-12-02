# EzoOffice - Production API URL Düzeltme

## Sorun
Frontend API çağrıları `:3001/api/auth/login` şeklinde yanlış URL'e gidiyor.

## Çözüm

VM'de şu komutları çalıştırın:

```bash
cd /opt/ezooffice

# .env dosyasını düzelt
cat > .env <<EOF
VITE_API_URL=http://34.51.217.25/api
EOF

# Veya domain kullanıyorsanız:
# VITE_API_URL=https://office.ezoenerji.com/api

# Frontend'i yeniden build et
npm run build

# Nginx restart
sudo systemctl restart nginx
```

**Önemli:** Nginx proxy kullandığımız için API URL'inde `:3001` portu olmamalı. Nginx `/api` isteklerini otomatik olarak `localhost:3001`'e yönlendiriyor.

