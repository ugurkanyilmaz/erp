# Production Hazırlık - Değişiklikler ve Yapılacaklar

## ✅ Tamamlanan İşlemler

### 1. Docker Kurulumu
- ✅ `Dockerfile.api` - Backend için Docker image
- ✅ `Dockerfile.frontend` - Frontend için Docker image
- ✅ `docker-compose.yml` - Tüm servisleri orkestre eden ana dosya
- ✅ `nginx.conf` - Frontend için Nginx konfigürasyonu
- ✅ `.dockerignore` - Gereksiz dosyaların build'e dahil olmaması için

### 2. SQLite → PostgreSQL Geçişi
- ✅ `KetenErp.Infrastructure.csproj` - PostgreSQL paketi eklendi (Npgsql.EntityFrameworkCore.PostgreSQL)
- ✅ SQLite paketleri kaldırıldı
- ✅ `Program.cs` - UseNpgsql() ile PostgreSQL kullanımı
- ✅ `appsettings.json` - PostgreSQL connection string eklendi
- ✅ `appsettings.Development.json` - Development ortamı için ayarlar
- ✅ `appsettings.Production.json` - Production ortamı için ayarlar

### 3. Konfigürasyon ve Güvenlik
- ✅ `.env.example` - Environment variables template
- ✅ `.gitignore` - Hassas dosyaların Git'e eklenmemesi
- ✅ CORS ayarları güncellendi (Docker hostları eklendi)
- ✅ JWT ve PostgreSQL şifreleri environment variable'a taşındı

### 4. Frontend Güncellemeleri
- ✅ API URL port değişikliği (5019 → 5000)
- ✅ `react/.env.example` - Frontend environment template
- ✅ Production ve development ayarları

### 5. Deployment Scriptleri
- ✅ `deploy.ps1` - Windows için deployment scripti
- ✅ `deploy.sh` - Linux/Mac için deployment scripti

### 6. Dokümantasyon
- ✅ `DOCKER.md` - Detaylı Docker kullanım rehberi
- ✅ `README.md` - Güncellenmiş proje dokümantasyonu
- ✅ `PROD_CHECKLIST.md` - Bu dosya

## 📋 İlk Deployment İçin Adımlar

### 1. Gerekli Araçları Yükleyin
```powershell
# Docker Desktop kurulu olmalı (Windows/Mac)
# Linux için: docker ve docker-compose
```

### 2. Environment Dosyasını Hazırlayın
```powershell
# .env.example'dan .env oluşturun
Copy-Item .env.example .env

# .env dosyasını düzenleyin ve şifreleri değiştirin:
# - POSTGRES_PASSWORD
# - JWT_SECRET_KEY
```

### 3. Paketleri Restore Edin (Opsiyonel - Docker build yapar)
```powershell
# Backend paketlerini restore et
cd KetenErp.Api
dotnet restore
cd ..
```

### 4. Docker ile Deploy Edin
```powershell
# Basit deployment
.\deploy.ps1

# Veya yeniden build ile
.\deploy.ps1 -Build
```

### 5. Uygulamayı Test Edin
- Frontend: http://localhost
- API: http://localhost:5000/swagger
- İlk kullanıcı oluşturun ve giriş yapın

## 🔧 Migration İşlemleri

### Yeni Migration Oluşturma
```powershell
dotnet ef migrations add MigrationName `
  --project KetenErp.Infrastructure `
  --startup-project KetenErp.Api
```

### Migration'ları Uygulama
```powershell
# Otomatik - Uygulama başladığında kendisi yapar
# Manuel:
dotnet ef database update `
  --project KetenErp.Infrastructure `
  --startup-project KetenErp.Api
```

### Migration'ları Geri Alma
```powershell
dotnet ef database update PreviousMigrationName `
  --project KetenErp.Infrastructure `
  --startup-project KetenErp.Api
```

## 🚀 Production Deployment Checklist

### Güvenlik
- [ ] `.env` dosyasındaki tüm şifreler değiştirildi
- [ ] JWT_SECRET_KEY güçlü ve rastgele
- [ ] POSTGRES_PASSWORD güçlü
- [ ] `.env` dosyası `.gitignore`'da (zaten var)
- [ ] HTTPS kurulumu (reverse proxy ile)
- [ ] Firewall kuralları ayarlandı

### Database
- [ ] PostgreSQL production kurulumu
- [ ] Backup stratejisi belirlendi
- [ ] Connection string production değerleri ile güncellendi

### Monitoring & Logging
- [ ] Log toplama mekanizması
- [ ] Error tracking (Sentry, Application Insights vb.)
- [ ] Uptime monitoring
- [ ] Performance monitoring

### Email
- [ ] SMTP ayarları yapıldı
- [ ] Email gönderimi test edildi
- [ ] Email template'leri kontrol edildi

### Domain & SSL
- [ ] Domain name yapılandırıldı
- [ ] SSL sertifikası kuruldu (Let's Encrypt önerilir)
- [ ] HTTP → HTTPS yönlendirmesi

### Backup & Recovery
- [ ] Otomatik database backup
- [ ] Backup restore testi
- [ ] Volume backup (uploads, vb.)

## 📊 Port Kullanımı

| Servis     | Port | Açıklama                    |
|-----------|------|----------------------------|
| Frontend  | 80   | Nginx (React build)        |
| API       | 5000 | .NET API                   |
| PostgreSQL| 5432 | Veritabanı                 |

## 🔍 Sorun Giderme

### Container başlamıyor
```powershell
# Logları kontrol et
docker-compose logs api
docker-compose logs frontend
docker-compose logs postgres

# Container'ları yeniden başlat
docker-compose restart
```

### Database bağlantı hatası
```powershell
# PostgreSQL hazır mı?
docker exec ketenerp-postgres pg_isready -U ketenuser

# Container içine gir ve bağlantıyı test et
docker exec -it ketenerp-postgres psql -U ketenuser -d ketenerp
```

### Port zaten kullanımda
```powershell
# docker-compose.yml dosyasında portları değiştir
# Örnek: "8080:80" şeklinde farklı port kullan
```

## 📝 Notlar

### SQLite'dan PostgreSQL'e Veri Migration
Eğer mevcut SQLite veritabanında veri varsa:

1. Eski veriyi export et:
```powershell
# SQLite'dan JSON export (özel script yazılmalı)
```

2. PostgreSQL'e import et:
```powershell
# Seeding ile veriyi yükle
```

### Performans İyileştirmeleri
- [ ] Database indexleri ekle
- [ ] Query optimization
- [ ] Response caching
- [ ] Frontend lazy loading
- [ ] Image optimization
- [ ] CDN kullanımı

### Gelecek Geliştirmeler
- [ ] CI/CD pipeline (GitHub Actions, Azure DevOps)
- [ ] Kubernetes deployment
- [ ] Load balancer
- [ ] Redis cache
- [ ] Message queue (RabbitMQ, Azure Service Bus)
- [ ] Microservices architecture

## 🎯 Başarı Kriterleri

Deployment başarılı sayılır eğer:
- ✅ Tüm container'lar çalışıyor
- ✅ Frontend erişilebilir
- ✅ API endpoint'leri çalışıyor
- ✅ Database bağlantısı var
- ✅ Authentication çalışıyor
- ✅ PDF oluşturma çalışıyor
- ✅ Email gönderimi çalışıyor
- ✅ File upload çalışıyor

## 📞 Destek

Herhangi bir sorun için development team ile iletişime geçin.

---

**Son Güncelleme:** 7 Kasım 2025
**Versiyon:** 1.0.0
