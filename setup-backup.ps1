# Otomatik Backup Kurulum Scripti
# Bu script haftalık backup için Windows Task Scheduler ayarlar

param(
    [string]$ProjectPath = "C:\keten-erp",
    [string]$BackupDay = "Sunday",
    [string]$BackupTime = "02:00"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Keten ERP Otomatik Backup Kurulumu ===" -ForegroundColor Cyan
Write-Host ""

# Admin kontrolü
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "HATA: Bu script Administrator olarak çalıştırılmalıdır!" -ForegroundColor Red
    Write-Host "PowerShell'i sağ tık > 'Run as Administrator' ile açın." -ForegroundColor Yellow
    exit 1
}

# Proje yolu kontrolü
if (-not (Test-Path $ProjectPath)) {
    Write-Host "UYARI: Proje yolu bulunamadı: $ProjectPath" -ForegroundColor Yellow
    $ProjectPath = Read-Host "Proje yolunu girin (örn: C:\keten-erp)"
    
    if (-not (Test-Path $ProjectPath)) {
        Write-Host "HATA: Geçersiz proje yolu!" -ForegroundColor Red
        exit 1
    }
}

$BackupScript = "$ProjectPath\backup.ps1"

if (-not (Test-Path $BackupScript)) {
    Write-Host "HATA: backup.ps1 bulunamadı: $BackupScript" -ForegroundColor Red
    exit 1
}

Write-Host "Kurulum Ayarları:" -ForegroundColor Green
Write-Host "  Proje Yolu: $ProjectPath"
Write-Host "  Backup Günü: $BackupDay"
Write-Host "  Backup Saati: $BackupTime"
Write-Host ""

# Mevcut görevi kaldır
$TaskName = "KetenERP_WeeklyBackup"
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($ExistingTask) {
    Write-Host "Mevcut backup görevi kaldırılıyor..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Yeni görev oluştur
Write-Host "Haftalık backup görevi oluşturuluyor..." -ForegroundColor Cyan

# Action - PowerShell ile backup scriptini çalıştır
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$BackupScript`""

# Trigger - Her hafta belirlenen günde çalışsın
$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $BackupDay -At $BackupTime

# Settings
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# Principal - SYSTEM olarak çalışsın (Docker erişimi için)
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Görevi kaydet
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Keten ERP haftalık otomatik veritabanı yedekleme"

Write-Host ""
Write-Host "✅ Otomatik backup başarıyla kuruldu!" -ForegroundColor Green
Write-Host ""
Write-Host "Detaylar:" -ForegroundColor Cyan
Write-Host "  Görev Adı: $TaskName"
Write-Host "  Çalışma Zamanı: Her $BackupDay saat $BackupTime"
Write-Host "  Backup Konumu: $ProjectPath\backups\"
Write-Host ""
Write-Host "Kontrol komutları:" -ForegroundColor Yellow
Write-Host "  Görevi görüntüle: Get-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Manuel test: .\backup.ps1 -Manual"
Write-Host "  Görevi sil: Unregister-ScheduledTask -TaskName '$TaskName'"
Write-Host ""

# Test backup teklifi
$RunTest = Read-Host "Şimdi test backup'ı çalıştırmak ister misiniz? (y/n)"
if ($RunTest -eq "y" -or $RunTest -eq "Y") {
    Write-Host ""
    Write-Host "Test backup başlatılıyor..." -ForegroundColor Cyan
    & $BackupScript -Manual
}

Write-Host ""
Write-Host "Kurulum tamamlandı! 🎉" -ForegroundColor Green
