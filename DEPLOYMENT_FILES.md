# EzoOffice - Sunucuya Yüklenecek Dosyalar

## 📦 Yüklenecek Dosyalar ve Klasörler

### ✅ Yüklenecekler (Tüm Proje)

```
ezooffice/
├── src/                    # Frontend kaynak kodları
│   ├── components/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── data/
│   ├── App.tsx
│   └── index.tsx
├── server/                 # Backend kaynak kodları
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── package.json
│   └── tsconfig.json
├── index.html             # Frontend HTML
├── package.json           # Frontend dependencies
├── vite.config.ts         # Vite config
├── tsconfig.json          # TypeScript config
├── setup-app.sh           # Kurulum scripti
└── setup-postgres.sh      # PostgreSQL kurulum scripti
```

### ❌ Yüklenmeyecekler (Otomatik Oluşacak)

```
node_modules/              # npm install ile oluşur
dist/                      # npm run build ile oluşur
server/dist/              # npm run build ile oluşur
server/node_modules/       # npm install ile oluşur
server/uploads/            # Script oluşturur
.env                       # Sunucuda oluşturulacak
.env.local
*.log
.DS_Store
```

## 🚀 Yükleme Yöntemleri

### Yöntem 1: Git ile (Önerilen)

```bash
# Local makinede
git init
git add .
git commit -m "Initial commit"
git remote add origin [YOUR_GIT_REPO_URL]
git push -u origin main

# Sunucuda
cd /opt
sudo git clone [YOUR_GIT_REPO_URL] ezooffice
sudo chown -R $USER:$USER ezooffice
```

### Yöntem 2: SCP ile (Manuel)

```bash
# Local makineden (Windows PowerShell veya WSL)
scp -r ./src user@34.51.217.25:/opt/ezooffice/
scp -r ./server user@34.51.217.25:/opt/ezooffice/
scp index.html package.json vite.config.ts tsconfig.json user@34.51.217.25:/opt/ezooffice/
scp setup-app.sh setup-postgres.sh user@34.51.217.25:~/
```

### Yöntem 3: ZIP/RAR ile

```bash
# Local makinede
# node_modules, dist, .env hariç tüm dosyaları zip'le
# Sunucuda:
cd /opt
unzip ezooffice.zip
sudo chown -R $USER:$USER ezooffice
```

## 📋 Minimum Gereken Dosyalar

Eğer sadece gerekli minimum dosyaları yüklemek isterseniz:

```
✅ src/                    (Tüm klasör)
✅ server/src/             (Tüm klasör)
✅ server/prisma/          (schema.prisma ve seed.ts)
✅ index.html
✅ package.json
✅ server/package.json
✅ vite.config.ts
✅ tsconfig.json
✅ server/tsconfig.json
✅ setup-app.sh
✅ setup-postgres.sh
```

## ⚠️ Önemli Notlar

1. **node_modules yüklemeyin** - Sunucuda `npm install` çalıştırılacak
2. **dist klasörü yüklemeyin** - Sunucuda `npm run build` çalıştırılacak
3. **.env dosyası yüklemeyin** - Script otomatik oluşturuyor
4. **Git kullanıyorsanız** `.git` klasörünü de yükleyebilirsiniz

## 🔧 Hızlı Yükleme Komutu (SCP)

```bash
# Tüm projeyi yükle (node_modules hariç)
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.env' \
  ./ ezo_ezoenerji_com@34.51.217.25:/opt/ezooffice/
```

VEYA Windows'ta WinSCP veya FileZilla kullanabilirsiniz.

