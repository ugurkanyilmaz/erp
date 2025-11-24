# Keten ERP - Complete Cleanup Script
$ErrorActionPreference = "Stop"

Write-Host "=== Keten ERP TAM TEMİZLİK (CLEAN RESET) ===" -ForegroundColor Red
Write-Host "BU İŞLEM ŞUNLARI SİLECEK:" -ForegroundColor Yellow
Write-Host "1. Tüm Docker Container'ları"
Write-Host "2. Tüm Veritabanı Verileri (Volume'ler)"
Write-Host "3. Tüm Docker Image'ları (Cache dahil)"
Write-Host "4. Oluşturulan PDF dosyaları (exports klasörü)"
Write-Host ""

$confirm = Read-Host "Devam etmek istiyor musunuz? (yes yazın)"
if ($confirm -ne "yes") {
    Write-Host "İşlem iptal edildi." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "1/4 Docker servisleri durduruluyor ve siliniyor..." -ForegroundColor Cyan
docker-compose down -v
if ($LASTEXITCODE -ne 0) { Write-Host "Hata oluştu, devam ediliyor..." -ForegroundColor Yellow }

Write-Host ""
Write-Host "2/4 Kullanılmayan Docker kaynakları temizleniyor..." -ForegroundColor Cyan
# Force prune everything
docker system prune -a --volumes -f
if ($LASTEXITCODE -ne 0) { Write-Host "Hata oluştu, devam ediliyor..." -ForegroundColor Yellow }

Write-Host ""
Write-Host "3/4 'exports' klasörü temizleniyor..." -ForegroundColor Cyan
if (Test-Path "exports") {
    Remove-Item "exports" -Recurse -Force
    Write-Host "exports klasörü silindi." -ForegroundColor Green
} else {
    Write-Host "exports klasörü zaten yok." -ForegroundColor Gray
}

Write-Host ""
Write-Host "4/4 'wwwroot/uploads' klasörü temizleniyor..." -ForegroundColor Cyan
if (Test-Path "KetenErp.Api/wwwroot/uploads") {
    Remove-Item "KetenErp.Api/wwwroot/uploads" -Recurse -Force
    Write-Host "Uploads klasörü silindi." -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ TEMİZLİK TAMAMLANDI!" -ForegroundColor Green
Write-Host "Şimdi sıfırdan kurulum için:"
Write-Host "  ./deploy.ps1"
Write-Host ""
