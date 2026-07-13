# Sains Masemba V18.1

Monorepo aplikasi pembelajaran dan tryout IPA SMP dengan empat portal:

- Super Admin — `http://localhost:3000`
- Guru — `http://localhost:3001`
- Siswa — `http://localhost:3002`
- Orang Tua — `http://localhost:3003`

## Fitur utama V18.1

- pusat notifikasi untuk empat portal;
- backup seluruh database ke satu workbook Excel;
- sheet terpisah untuk setiap tabel;
- manifest jumlah baris dan metadata backup;
- opsi menyertakan atau mengeluarkan hash password;
- penyimpanan lossless untuk teks lebih dari 32.000 karakter melalui sheet `LONG_TEXT`;
- backup terminal sebelum `db push`;
- restore Excel melalui terminal dengan pengaman eksplisit.

## Instalasi lokal

Syarat:

- Node.js 20 atau 22;
- npm 10;
- Docker untuk PostgreSQL lokal, atau koneksi PostgreSQL cloud.

### Docker lokal

Windows:

```text
INSTALL_LOCAL_DOCKER.bat
```

macOS/Linux:

```bash
chmod +x INSTALL_LOCAL_DOCKER.sh
./INSTALL_LOCAL_DOCKER.sh
```

Setelah instalasi:

```bash
npm run dev
```

### PostgreSQL cloud

```bash
npm run env:remote
nano .env
npm ci
npm run env:check
npm run db:init
npm run dev
```

Pada Windows, `.env` dapat diedit dengan:

```powershell
notepad .env
```

Hanya diperlukan satu `.env` di root proyek.

## Backup data

Dari portal Super Admin:

```text
Operasional → Backup Data
```

Atau melalui terminal:

```bash
npm run db:backup-excel
```

File terminal disimpan pada folder `backups/`.

## Push database secara aman

```bash
npm run db:update
```

Perintah tersebut membuat backup Excel sebelum menjalankan `prisma db push`.

## Restore backup Excel

Restore sengaja tidak tersedia sebagai tombol biasa. Gunakan terminal dengan konfirmasi eksplisit setelah memastikan `DATABASE_URL` benar.

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

Restore membuat backup otomatis kondisi database saat ini sebelum menghapus dan mengganti data.

## Akun demo

| Portal | Email | Password |
|---|---|---|
| Super Admin | `superadmin@sh.local` | `Admin123!` |
| Guru | `guru@sh.local` | `Admin123!` |
| Siswa | `siswa@sh.local` | `Admin123!` |
| Orang Tua | `orangtua@sh.local` | `Admin123!` |

Ganti password seed sebelum penggunaan produksi.

## Catatan penting

- Jangan commit `.env` atau folder `backups/`.
- Jangan menjalankan `docker compose down -v` jika data lokal masih diperlukan.
- Excel mencadangkan isi database dan URL file, bukan isi berkas fisik pada Vercel Blob atau penyimpanan eksternal.
- Untuk produksi, buat juga dump PostgreSQL dari penyedia database atau menggunakan `pg_dump`.

Dokumentasi rinci:

- `00_MULAI_DI_SINI.md`
- `ENV_DAN_DATABASE.md`
- `BACKUP_DAN_UPDATE_AMAN.md`
