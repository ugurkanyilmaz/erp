# Keten ERP - Docker Deployment Script
# Bu script projeyi Docker ile deploy eder

param(
    [switch]$Build,
    [switch]$Down,
    [switch]$Logs,
    [switch]$Restart
)

Write-Host "=== Keten ERP Docker Deployment ===" -ForegroundColor Cyan

# .env dosyası kontrolü
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env dosyası bulunamadı!" -ForegroundColor Yellow
    Write-Host "📋 .env.example dosyasından .env oluşturuluyor..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env dosyası oluşturuldu. Lütfen şifreleri düzenleyin!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Düzenlenecek değerler:" -ForegroundColor Cyan
    Write-Host "  - POSTGRES_PASSWORD" -ForegroundColor White
    Write-Host "  - JWT_SECRET_KEY" -ForegroundColor White
    Write-Host ""
    
    $continue = Read-Host "Devam etmek istiyor musunuz? (y/n)"
    if ($continue -ne "y") {
        Write-Host "İşlem iptal edildi." -ForegroundColor Red
        exit
    }
}

# Down - Tüm container'ları durdur ve sil
if ($Down) {
    Write-Host "🛑 Container'lar durduruluyor ve siliniyor..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "✅ Tamamlandı!" -ForegroundColor Green
    exit
}

# Restart - Container'ları yeniden başlat
if ($Restart) {
    Write-Host "🔄 Container'lar yeniden başlatılıyor..." -ForegroundColor Yellow
    docker-compose restart
    Write-Host "✅ Tamamlandı!" -ForegroundColor Green
    exit
}

# Logs - Logları göster
if ($Logs) {
    Write-Host "📋 Docker logları gösteriliyor (Çıkmak için Ctrl+C)..." -ForegroundColor Cyan
    docker-compose logs -f
    exit
}

# Build ve Deploy
Write-Host "🏗️  Proje build ediliyor..." -ForegroundColor Cyan

if ($Build) {
    Write-Host "♻️  Yeniden build ediliyor..." -ForegroundColor Yellow
    docker-compose up -d --build
} else {
    docker-compose up -d
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment başarılı!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Uygulama erişim bilgileri:" -ForegroundColor Cyan
    Write-Host "   Frontend:  http://localhost" -ForegroundColor White
    Write-Host "   API:       http://localhost:5000" -ForegroundColor White
    Write-Host "   Swagger:   http://localhost:5000/swagger" -ForegroundColor White
    Write-Host "   PostgreSQL: localhost:5432" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Kullanışlı komutlar:" -ForegroundColor Cyan
    Write-Host "   Logları göster:           .\deploy.ps1 -Logs" -ForegroundColor White
    Write-Host "   Yeniden başlat:          .\deploy.ps1 -Restart" -ForegroundColor White
    Write-Host "   Durdur ve sil:           .\deploy.ps1 -Down" -ForegroundColor White
    Write-Host "   Yeniden build:           .\deploy.ps1 -Build" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment sırasında hata oluştu!" -ForegroundColor Red
    Write-Host "Logları kontrol edin: docker-compose logs" -ForegroundColor Yellow
    exit 1
}
