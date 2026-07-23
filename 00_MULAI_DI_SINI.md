# Sains Masemba V18.1 — Paket Lengkap Lokal + Notifikasi

Paket ini sudah berisi **seluruh source code aplikasi**, bukan patch. Empat portal tersedia:

- Super Admin — `http://localhost:3000`
- Guru — `http://localhost:3001`
- Siswa — `http://localhost:3002`
- Orang Tua — `http://localhost:3003`

## Pilihan A — Instalasi lokal paling mudah dengan Docker

Syarat:

- Node.js 20 atau 22
- npm 10
- Docker Desktop atau Docker Engine + Docker Compose

### Windows

Klik dua kali:

```text
INSTALL_LOCAL_DOCKER.bat
```

### macOS/Linux

```bash
chmod +x INSTALL_LOCAL_DOCKER.sh
./INSTALL_LOCAL_DOCKER.sh
```

Skrip tersebut akan:

1. membuat `.env` lokal dan `AUTH_SECRET` acak;
2. menjalankan PostgreSQL 16 melalui Docker;
3. memasang dependency dengan `npm ci`;
4. menjalankan `prisma generate`;
5. menjalankan `prisma db push`;
6. mengisi akun/data demo;
7. memindahkan insiden lama ke tabel notifikasi bila ada.

Setelah selesai:

```bash
npm run dev
```

## Pilihan B — Menggunakan database PostgreSQL cloud

Contoh penyedia: Neon, Supabase, Railway, Render PostgreSQL, atau PostgreSQL sendiri.

Buat `.env`:

```bash
npm run env:remote
```

Kemudian edit file tersebut. Pada Linux/macOS dapat memakai:

```bash
nano .env
```

Pada Windows gunakan Notepad atau VS Code:

```powershell
notepad .env
```

Isi dua koneksi database:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

Untuk Neon, `DATABASE_URL` biasanya memakai **pooled connection**, sedangkan `DIRECT_URL` memakai **direct connection**.

Setelah `.env` selesai:

```bash
npm ci
npm run env:check
npm run db:init
npm run dev
```

## Push perubahan skema database berikutnya

Setelah mengubah `schema.prisma`:

### macOS/Linux

```bash
./PUSH_DATABASE.sh
```

### Windows

```text
PUSH_DATABASE.bat
```

Atau secara manual:

```bash
npm run db:update
```

Perintah tersebut menjalankan:

```bash
npm run env:check
npm run db:generate
npm run db:push
npm run db:backfill-notifications
```

## Akun demo hasil seed

| Portal | Email | Password |
|---|---|---|
| Super Admin | `superadmin@sh.local` | `ditentukan melalui DEFAULT_SEED_PASSWORD` |
| Guru | `guru@sh.local` | `ditentukan melalui DEFAULT_SEED_PASSWORD` |
| Siswa | `siswa@sh.local` | `ditentukan melalui DEFAULT_SEED_PASSWORD` |
| Orang Tua | `orangtua@sh.local` | `ditentukan melalui DEFAULT_SEED_PASSWORD` |

Ganti password seed pada `.env` sebelum dipakai pada lingkungan produksi.

## Catatan `.env`

- Hanya perlu **satu file `.env` di root proyek**.
- Tidak perlu membuat `.env.local` terpisah pada setiap folder aplikasi.
- Jangan mengunggah `.env` ke GitHub karena berisi kredensial database dan secret autentikasi.
- File `.env` sudah dikecualikan melalui `.gitignore`.

## Menghapus database lokal Docker

Menghentikan container tanpa menghapus data:

```bash
docker compose down
```

Menghapus container sekaligus seluruh data PostgreSQL lokal:

```bash
docker compose down -v
```

Perintah `-v` menghapus volume database secara permanen.

## Backup sebelum memasang versi baru

Pada portal Super Admin buka:

```text
Operasional → Backup Data
```

Klik **Unduh Backup Excel Lengkap** sebelum mengganti source atau menjalankan perubahan database. Backup terminal juga tersedia:

```bash
npm run db:backup-excel
```

Perintah push database sekarang otomatis membuat backup terlebih dahulu:

```bash
npm run db:update
```

Baca `BACKUP_DAN_UPDATE_AMAN.md` untuk batas perlindungan Excel dan prosedur update.
