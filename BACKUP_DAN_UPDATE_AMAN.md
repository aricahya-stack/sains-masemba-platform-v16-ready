# Backup dan Update Database yang Aman

## 1. Backup dari portal Super Admin

Buka portal Super Admin, lalu pilih:

```text
Operasional → Backup Data
```

Tersedia dua ekspor:

1. **Backup Excel lengkap** — mencakup hash password. Gunakan untuk persiapan pemulihan penuh.
2. **Backup Excel aman** — tidak mencakup hash password. Gunakan untuk audit atau distribusi internal terbatas.

Workbook memiliki sheet berikut:

- `README_BACKUP`
- `MANIFEST`
- seluruh tabel database, masing-masing dalam sheet terpisah;
- `LONG_TEXT` untuk menyimpan isi sel di atas 32.000 karakter tanpa pemotongan.

Jangan mengubah nama sheet, nama kolom, atau ID jika file akan digunakan sebagai sumber pemulihan.

## 2. Backup melalui terminal

Dari root proyek:

```bash
npm run db:backup-excel
```

File dibuat di folder:

```text
backups/
```

Secara default hash password disertakan. Untuk mengeluarkannya:

### macOS/Linux

```bash
BACKUP_INCLUDE_PASSWORD_HASHES=NO npm run db:backup-excel
```

### PowerShell

```powershell
$env:BACKUP_INCLUDE_PASSWORD_HASHES="NO"
npm run db:backup-excel
```

## 3. Push database dengan backup otomatis

Gunakan:

```bash
npm run db:update
```

Urutannya adalah:

1. memeriksa `.env`;
2. membuat backup Excel di folder `backups/`;
3. menjalankan Prisma generate;
4. menjalankan Prisma db push;
5. menjalankan backfill notifikasi.

Skrip `PUSH_DATABASE.sh`, `PUSH_DATABASE.ps1`, dan `PUSH_DATABASE.bat` memakai alur aman tersebut.

## 4. Hal yang tidak dicadangkan oleh Excel

Backup Excel mencakup data PostgreSQL, termasuk URL berkas. Isi file fisik pada Vercel Blob atau penyimpanan eksternal tidak ikut disalin. Cadangkan file eksternal secara terpisah.

Untuk lingkungan produksi penting, backup Excel tidak boleh menjadi satu-satunya perlindungan. Buat juga dump PostgreSQL menggunakan fasilitas penyedia database atau `pg_dump`.

## 5. Jangan melakukan ini

- Jangan menjalankan `docker compose down -v` jika data lokal masih diperlukan.
- Jangan memakai `prisma migrate reset` pada database yang berisi data produksi.
- Jangan mengganti `DATABASE_URL` tanpa memastikan database tujuan.
- Jangan mengunggah `.env` atau file backup lengkap ke repository publik.

## 6. Restore dari backup Excel

Restore hanya dapat dijalankan lewat terminal. Aplikasi meminta dua pengaman:

- `ALLOW_EXCEL_RESTORE=YES`
- `RESTORE_MODE=REPLACE`

macOS/Linux:

```bash
ALLOW_EXCEL_RESTORE=YES RESTORE_MODE=REPLACE npm run db:restore-excel -- backups/nama-file.xlsx
```

PowerShell:

```powershell
$env:ALLOW_EXCEL_RESTORE="YES"
$env:RESTORE_MODE="REPLACE"
npm run db:restore-excel -- backups/nama-file.xlsx
```

Sebelum menghapus isi tabel saat ini, skrip membuat file `pre-restore-*.xlsx` secara otomatis di folder `backups/`. Restore mempertahankan seluruh ID relasi dan menyusun ulang data sesuai urutan dependensi tabel.

Gunakan backup lengkap yang memiliki `includePasswordHashes = YES` bila akun harus tetap dapat login dengan password lama. Backup aman tanpa hash password tetap dapat memulihkan data akademik, tetapi password akun harus ditetapkan ulang.
