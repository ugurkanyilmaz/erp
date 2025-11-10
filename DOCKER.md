# Docker Kurulum ve Kullanım Rehberi

## Önkoşullar

- Docker Desktop (Windows/Mac) veya Docker Engine (Linux)
- Docker Compose

## İlk Kurulum

### 1. Environment Dosyasını Oluşturun

```powershell
# .env.example dosyasını .env olarak kopyalayın
Copy-Item .env.example .env
```

Ardından `.env` dosyasını açıp güvenli şifreler belirleyin:
- `POSTGRES_PASSWORD`: PostgreSQL veritabanı şifresi
- `JWT_SECRET_KEY`: JWT token için gizli anahtar (uzun ve rastgele olmalı)

### 2. Docker Container'ları Başlatın

```powershell
# Tüm servisleri arka planda başlat
docker-compose up -d

# Logları takip edin (opsiyonel)
docker-compose logs -f
```

İlk başlatmada:
- PostgreSQL veritabanı otomatik oluşturulacak
- API veritabanı migration'larını çalıştıracak
- Frontend build edilip Nginx ile sunulacak

### 3. Uygulamaya Erişim

- **Frontend (React)**: http://localhost
- **API (Backend)**: http://localhost:5000
- **API Swagger**: http://localhost:5000/swagger
- **PostgreSQL**: localhost:5432

## Geliştirme Ortamında Kullanım

### Docker olmadan (Local Development)

#### Backend:
```powershell
cd KetenErp.Api
dotnet restore
dotnet run
```

#### Frontend:
```powershell
cd react
npm install
npm run dev
```

**Not:** Local development için PostgreSQL'i Docker'da çalıştırabilirsiniz:
```powershell
docker-compose up -d postgres
```

### Docker ile Development

Development için `docker-compose.dev.yml` dosyası oluşturabilirsiniz (hot-reload ile).

## Docker Komutları

### Tüm servisleri başlat
```powershell
docker-compose up -d
```

### Logları görüntüle
```powershell
# Tüm servisler
docker-compose logs -f

# Sadece API
docker-compose logs -f api

# Sadece Frontend
docker-compose logs -f frontend

# Sadece PostgreSQL
docker-compose logs -f postgres
```

### Servisleri durdur
```powershell
docker-compose stop
```

### Servisleri durdur ve container'ları sil
```powershell
docker-compose down
```

### Veritabanını da dahil tümünü sil (DİKKAT: Veri kaybı olur!)
```powershell
docker-compose down -v
```

### Yeniden build et ve başlat
```powershell
docker-compose up -d --build
```

### Sadece belirli bir servisi yeniden başlat
```powershell
docker-compose restart api
docker-compose restart frontend
```

## Veritabanı Yönetimi

### Veritabanı Bağlantı Bilgileri

```
Host: localhost
Port: 5432
Database: ketenerp
Username: ketenuser
Password: (.env dosyasındaki POSTGRES_PASSWORD)
```

### psql ile bağlan
```powershell
docker exec -it ketenerp-postgres psql -U ketenuser -d ketenerp
```

### Veritabanı Backup

```powershell
# Backup al
docker exec ketenerp-postgres pg_dump -U ketenuser ketenerp > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# Backup'ı geri yükle
Get-Content backup_file.sql | docker exec -i ketenerp-postgres psql -U ketenuser -d ketenerp
```

## Production Deployment

### 1. Environment Değişkenlerini Güncelleyin

`.env` dosyasında:
- Güçlü şifreler belirleyin
- JWT secret'ı değiştirin
- Gerekirse email ayarlarını yapın

### 2. HTTPS için Reverse Proxy (Nginx/Traefik)

Production'da önünüze bir reverse proxy koyarak HTTPS ekleyin.

Örnek Nginx config:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Otomatik Başlatma

Docker Compose zaten `restart: unless-stopped` ayarlı. Sunucu yeniden başlatıldığında container'lar otomatik başlayacak.

### 4. Monitoring ve Loglar

Production'da log toplama için:
- Docker log driver kullanın
- External log management (ELK, Grafana Loki, etc.)
- Healthcheck'leri kontrol edin

## Sorun Giderme

### API bağlanamıyor
```powershell
# API container'ının çalıştığını kontrol edin
docker ps

# API loglarını kontrol edin
docker-compose logs api

# PostgreSQL'in hazır olduğunu kontrol edin
docker exec ketenerp-postgres pg_isready -U ketenuser
```

### Frontend yüklenmiyor
```powershell
# Frontend container loglarını kontrol edin
docker-compose logs frontend

# Nginx config'i test edin
docker exec ketenerp-frontend nginx -t
```

### Veritabanı bağlantı hatası
```powershell
# PostgreSQL loglarını kontrol edin
docker-compose logs postgres

# Container'ın sağlıklı olduğunu kontrol edin
docker ps
# HEALTH kolonu "healthy" olmalı
```

### Port çakışması
Eğer 80, 5000 veya 5432 portları kullanımdaysa, `docker-compose.yml` dosyasında portları değiştirebilirsiniz:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # 80 yerine 8080
  api:
    ports:
      - "5001:8080"  # 5000 yerine 5001
  postgres:
    ports:
      - "5433:5432"  # 5432 yerine 5433
```

## Güvenlik Notları

1. `.env` dosyasını asla Git'e eklemeyin (`.gitignore`'da zaten var)
2. Production'da güçlü şifreler kullanın
3. JWT secret'ı düzenli olarak değiştirin
4. HTTPS kullanın
5. PostgreSQL'i sadece gerektiğinde dışarıya açın
6. Düzenli backup alın

## Güncellemeler

```powershell
# Son kodu çekin
git pull

# Container'ları yeniden build edin
docker-compose up -d --build

# Database migration'ları otomatik çalışacak
```
