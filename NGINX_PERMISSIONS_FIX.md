# EzoOffice - Nginx İzin Sorunu Çözümü

## Sorun
Nginx (www-data kullanıcısı) `/opt/ezooffice/dist` klasörüne erişemiyor.

## Çözüm 1: Nginx kullanıcısına okuma izni ver (Önerilen)

```bash
# /opt/ezooffice klasörüne www-data'nın erişebilmesi için
sudo chmod -R 755 /opt/ezooffice
sudo chmod -R 755 /opt/ezooffice/dist

# Veya daha spesifik:
sudo chown -R $USER:www-data /opt/ezooffice
sudo chmod -R 755 /opt/ezooffice
sudo chmod -R 755 /opt/ezooffice/dist
```

## Çözüm 2: www-data'yı grup olarak ekle

```bash
# Kullanıcıyı www-data grubuna ekle
sudo usermod -a -G www-data $USER

# İzinleri düzelt
sudo chown -R $USER:www-data /opt/ezooffice
sudo chmod -R 775 /opt/ezooffice
sudo chmod -R 775 /opt/ezooffice/dist
```

## Çözüm 3: Nginx kullanıcısını değiştir (Daha az güvenli)

```bash
# Nginx config'de user'ı değiştir
sudo nano /etc/nginx/nginx.conf
# user www-data; satırını user ezo_ezoenerji_com; olarak değiştir
sudo systemctl restart nginx
```

## Test

```bash
# İzinleri kontrol et
ls -la /opt/ezooffice/dist

# Nginx test
sudo nginx -t
sudo systemctl restart nginx

# Test
curl http://localhost/
```

