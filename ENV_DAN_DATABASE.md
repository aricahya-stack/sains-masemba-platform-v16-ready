# Konfigurasi `.env` dan Database

## Apakah harus memakai `nano .env`?

Tidak wajib. `nano` hanya editor teks pada Linux/macOS. Yang wajib adalah adanya file bernama `.env` di folder root proyek.

Pilihan editor:

```bash
nano .env
```

atau:

```bash
code .env
```

Pada Windows:

```powershell
notepad .env
```

## PostgreSQL lokal

Jalankan:

```bash
npm run env:local
docker compose up -d
npm ci
npm run db:init
```

Isi koneksi lokal yang digunakan:

```env
DATABASE_URL="postgresql://sains_user:sains_password@localhost:5432/sains_masemba?schema=public"
DIRECT_URL="postgresql://sains_user:sains_password@localhost:5432/sains_masemba?schema=public"
```

Untuk database lokal, `DATABASE_URL` dan `DIRECT_URL` boleh sama.

## PostgreSQL cloud

Jalankan:

```bash
npm run env:remote
nano .env
```

Ganti placeholder dengan kredensial sebenarnya. Setelah itu:

```bash
npm run env:check
npm ci
npm run db:init
```

## Perbedaan `db push` dan migration

`prisma db push` menyinkronkan skema secara langsung. Cocok untuk pengembangan lokal dan tahap awal.

```bash
npm run db:push
```

Untuk lingkungan produksi yang membutuhkan riwayat perubahan skema, gunakan migration:

```bash
npm run db:migrate
npm run db:deploy
```

Jangan mencampur penggunaan `db push` dan migration tanpa memahami kondisi database. Untuk paket ini, instalasi lokal standar menggunakan `db push`.

## Prisma Studio

```bash
npm run db:studio
```

Gunakan untuk memeriksa tabel `User`, `Tryout`, `TryoutIncident`, dan `Notification`.

## Wajib backup sebelum `db push`

Gunakan perintah berikut agar backup Excel dibuat sebelum sinkronisasi skema:

```bash
npm run db:update
```

File backup disimpan di folder `backups/`. Anda juga dapat membuat backup dari menu Super Admin **Operasional → Backup Data**.

Perintah tanpa backup hanya disediakan untuk keadaan khusus:

```bash
npm run db:update:no-backup
```

Jangan gunakan opsi tanpa backup pada database produksi kecuali sudah ada dump PostgreSQL yang tervalidasi.
