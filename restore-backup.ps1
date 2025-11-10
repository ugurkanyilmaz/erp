# Backup Restore Script
# Yedekten geri yükleme için

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [switch]$SkipUploads
)

$ErrorActionPreference = "Stop"

Write-Host "=== Keten ERP Backup Restore ===" -ForegroundColor Cyan
Write-Host ""

# Backup dosyası kontrolü
if (-not (Test-Path $BackupFile)) {
    Write-Host "HATA: Backup dosyası bulunamadı: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "Backup dosyası: $BackupFile" -ForegroundColor Green
Write-Host ""

# Onay al
Write-Host "UYARI: Bu işlem mevcut veritabanını ve dosyaları SİLECEK!" -ForegroundColor Red
$Confirm = Read-Host "Devam etmek istediğinizden emin misiniz? (yes yazın)"

if ($Confirm -ne "yes") {
    Write-Host "İşlem iptal edildi." -ForegroundColor Yellow
    exit 0
}

try {
    # Geçici klasör oluştur
    $TempPath = "$env:TEMP\ketenerp_restore_$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -ItemType Directory -Path $TempPath | Out-Null
    
    Write-Host "Backup dosyası açılıyor..." -ForegroundColor Cyan
    Expand-Archive -Path $BackupFile -DestinationPath $TempPath -Force
    
    # SQL dosyasını bul
    $SqlFile = Get-ChildItem -Path $TempPath -Filter "*.sql" -Recurse | Select-Object -First 1
    
    if (-not $SqlFile) {
        throw "SQL backup dosyası bulunamadı!"
    }
    
    Write-Host "SQL backup dosyası bulundu: $($SqlFile.Name)" -ForegroundColor Green
    
    # .env dosyasından şifreyi oku
    $ProjectPath = Split-Path $BackupFile -Parent | Split-Path -Parent
    $EnvFile = "$ProjectPath\.env"
    
    if (Test-Path $EnvFile) {
        $PostgresPass = (Get-Content $EnvFile | Where-Object { $_ -match '^POSTGRES_PASSWORD=' }) -replace 'POSTGRES_PASSWORD=', ''
    } else {
        throw ".env dosyası bulunamadı: $EnvFile"
    }
    
    # Database'i temizle ve restore et
    Write-Host ""
    Write-Host "Veritabanı restore ediliyor..." -ForegroundColor Cyan
    Write-Host "(Bu işlem birkaç dakika sürebilir...)" -ForegroundColor Yellow
    
    $env:PGPASSWORD = $PostgresPass
    
    # Önce mevcut bağlantıları kes
    docker exec ketenerp-postgres psql -U ketenuser -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ketenerp' AND pid <> pg_backend_pid();"
    
    # Database'i yeniden oluştur
    docker exec ketenerp-postgres psql -U ketenuser -d postgres -c "DROP DATABASE IF EXISTS ketenerp;"
    docker exec ketenerp-postgres psql -U ketenuser -d postgres -c "CREATE DATABASE ketenerp;"
    
    # Restore et
    Get-Content $SqlFile.FullName | docker exec -i ketenerp-postgres psql -U ketenuser -d ketenerp
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Veritabanı başarıyla restore edildi!" -ForegroundColor Green
    } else {
        throw "Veritabanı restore hatası!"
    }
    
    # Uploads'ı restore et
    if (-not $SkipUploads) {
        $UploadsPath = Get-ChildItem -Path $TempPath -Directory -Filter "uploads_*" | Select-Object -First 1
        
        if ($UploadsPath) {
            Write-Host ""
            Write-Host "Dosyalar restore ediliyor..." -ForegroundColor Cyan
            
            # Mevcut uploads'ı temizle
            docker exec ketenerp-api rm -rf /app/wwwroot 2>$null
            
            # Yeni uploads'ı kopyala
            docker cp "$($UploadsPath.FullName)/." ketenerp-api:/app/wwwroot/
            
            Write-Host "✅ Dosyalar başarıyla restore edildi!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Backup'ta uploads klasörü bulunamadı." -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "=== Restore Tamamlandı ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Container'ları yeniden başlatmanız önerilir:" -ForegroundColor Yellow
    Write-Host "  docker-compose restart" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "HATA: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    # Temizlik
    if (Test-Path $TempPath) {
        Remove-Item $TempPath -Recurse -Force
    }
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
