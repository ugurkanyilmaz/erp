# Otomatik Haftalık Veritabanı Yedekleme Scripti
# Her Pazar gecesi saat 02:00'de çalışır

param(
    [switch]$Manual,
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

# Konfigürasyon
$ProjectPath = "C:\keten-erp"  # Projenizin yolu
$BackupPath = "$ProjectPath\backups"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = "$BackupPath\backup_$Date.log"

# Backup klasörünü oluştur
if (-not (Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath | Out-Null
}

# Log fonksiyonu
function Write-Log {
    param($Message)
    $LogMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

Write-Log "=== Keten ERP Backup Started ==="

try {
    # .env dosyasından şifreyi oku
    $EnvFile = "$ProjectPath\.env"
    if (Test-Path $EnvFile) {
        $PostgresPass = (Get-Content $EnvFile | Where-Object { $_ -match '^POSTGRES_PASSWORD=' }) -replace 'POSTGRES_PASSWORD=', ''
        Write-Log "PostgreSQL password loaded from .env"
    } else {
        Write-Log "ERROR: .env file not found at $EnvFile"
        exit 1
    }

    # 1. PostgreSQL Database Backup
    Write-Log "Starting PostgreSQL backup..."
    $DbBackupFile = "$BackupPath\ketenerp_db_$Date.sql"
    
    $env:PGPASSWORD = $PostgresPass
    docker exec ketenerp-postgres pg_dump -U ketenuser ketenerp > $DbBackupFile
    
    if ($LASTEXITCODE -eq 0) {
        $FileSize = (Get-Item $DbBackupFile).Length / 1MB
        Write-Log "Database backup completed successfully. Size: $([math]::Round($FileSize, 2)) MB"
    } else {
        throw "Database backup failed with exit code $LASTEXITCODE"
    }

    # 2. Uploads/Files Backup
    Write-Log "Starting uploads backup..."
    $UploadsBackupPath = "$BackupPath\uploads_$Date"
    
    # wwwroot klasörünü kopyala (eğer varsa)
    docker cp ketenerp-api:/app/wwwroot $UploadsBackupPath 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $UploadSize = (Get-ChildItem $UploadsBackupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Log "Uploads backup completed. Size: $([math]::Round($UploadSize, 2)) MB"
    } else {
        Write-Log "WARNING: No uploads to backup or container not running"
    }

    # 3. Backup'ı sıkıştır (opsiyonel)
    Write-Log "Compressing backup files..."
    $ZipFile = "$BackupPath\ketenerp_backup_$Date.zip"
    
    Compress-Archive -Path $DbBackupFile, $UploadsBackupPath -DestinationPath $ZipFile -CompressionLevel Optimal
    
    if (Test-Path $ZipFile) {
        $ZipSize = (Get-Item $ZipFile).Length / 1MB
        Write-Log "Backup compressed successfully. Size: $([math]::Round($ZipSize, 2)) MB"
        
        # Sıkıştırılmamış dosyaları sil
        Remove-Item $DbBackupFile -Force
        Remove-Item $UploadsBackupPath -Recurse -Force -ErrorAction SilentlyContinue
    }

    # 4. Eski backup'ları temizle
    Write-Log "Cleaning old backups (older than $RetentionDays days)..."
    $OldBackups = Get-ChildItem $BackupPath -Filter "ketenerp_backup_*.zip" | 
                  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) }
    
    foreach ($OldBackup in $OldBackups) {
        Remove-Item $OldBackup.FullName -Force
        Write-Log "Deleted old backup: $($OldBackup.Name)"
    }

    # Eski log dosyalarını da temizle
    $OldLogs = Get-ChildItem $BackupPath -Filter "backup_*.log" | 
               Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) }
    
    foreach ($OldLog in $OldLogs) {
        Remove-Item $OldLog.FullName -Force
    }

    Write-Log "=== Backup Completed Successfully ==="
    Write-Log "Backup file: $ZipFile"
    
    # Backup listesini göster
    Write-Log "`nCurrent backups:"
    Get-ChildItem $BackupPath -Filter "ketenerp_backup_*.zip" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}, LastWriteTime | 
        Format-Table -AutoSize | Out-String | Write-Log

    exit 0
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    exit 1
}
finally {
    # Temizlik
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
