#!/bin/bash

# EzoOffice PostgreSQL VM Kurulum Scripti
# Google Cloud VM için hazırlanmıştır

set -e

echo "🚀 EzoOffice PostgreSQL Kurulumu Başlıyor..."

# Sistem güncellemesi
echo "📦 Sistem güncellemesi yapılıyor..."
sudo apt update && sudo apt upgrade -y

# PostgreSQL kurulumu
echo "🗄️ PostgreSQL kuruluyor..."
sudo apt install postgresql postgresql-contrib -y

# PostgreSQL versiyonunu al
PG_VERSION=$(sudo -u postgres psql -c "SELECT version();" | grep -oP 'PostgreSQL \K[0-9]+' | head -1)
echo "✅ PostgreSQL $PG_VERSION kuruldu"

# PostgreSQL yapılandırması
echo "⚙️ PostgreSQL yapılandırılıyor..."

# postgresql.conf düzenle
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/$PG_VERSION/main/postgresql.conf
sudo sed -i "s/max_connections = 100/max_connections = 200/" /etc/postgresql/$PG_VERSION/main/postgresql.conf

# pg_hba.conf düzenle (internal network için)
echo "host    all             all             10.0.0.0/8              md5" | sudo tee -a /etc/postgresql/$PG_VERSION/main/pg_hba.conf

# PostgreSQL restart
sudo systemctl restart postgresql
sudo systemctl enable postgresql

# Veritabanı ve kullanıcı oluştur
echo "📝 Veritabanı ve kullanıcı oluşturuluyor..."

# Şifreleri buraya girin
DB_PASSWORD="Ezo2025!+"  # DEĞİŞTİRİN!

sudo -u postgres psql <<EOF
CREATE DATABASE ezooffice;
CREATE USER ezooffice_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE ezooffice TO ezooffice_user;
ALTER DATABASE ezooffice OWNER TO ezooffice_user;
\c ezooffice
GRANT ALL ON SCHEMA public TO ezooffice_user;
ALTER SCHEMA public OWNER TO ezooffice_user;
EOF

# UFW firewall kurulumu
echo "🔥 Firewall yapılandırılıyor..."
sudo apt install ufw -y
sudo ufw allow 22/tcp
sudo ufw allow from 10.0.0.0/8 to any port 5432
sudo ufw --force enable

# Internal IP'yi göster
INTERNAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "✅ Kurulum tamamlandı!"
echo ""
echo "📋 Bağlantı Bilgileri:"
echo "   Internal IP: $INTERNAL_IP"
echo "   Database: ezooffice"
echo "   User: ezooffice_user"
echo "   Password: $DB_PASSWORD"
echo ""
echo "🔗 Connection String:"
echo "   postgresql://ezooffice_user:$DB_PASSWORD@$INTERNAL_IP:5432/ezooffice?schema=public"
echo ""

