# Backup dan Restore Excel

## Backup dari antarmuka

Masuk sebagai Super Admin dan buka `/backup-data`. Pilih backup lengkap untuk pemulihan penuh atau backup aman tanpa hash password untuk audit.

## Backup dari terminal

```bash
npm run db:backup-excel
```

## Restore penuh

Restore sengaja tidak disediakan sebagai tombol karena akan mengganti isi database aktif.

macOS/Linux:

```bash
ALLOW_EXCEL_RESTORE=YES RESTORE_MODE=REPLACE npm run db:restore-excel -- backups/nama-file.xlsx
```

Windows PowerShell:

```powershell
$env:ALLOW_EXCEL_RESTORE="YES"
$env:RESTORE_MODE="REPLACE"
npm run db:restore-excel -- backups/nama-file.xlsx
```

Skrip membuat backup otomatis sebelum restore. Pastikan `DATABASE_URL` dan file yang dipilih benar.
