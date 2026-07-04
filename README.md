# Sains Masemba Monorepo (npm)

Platform belajar dan tryout IPA SMP berbasis **4 aplikasi**:
- Super Admin
- Guru
- Siswa
- Orang Tua

Branding visual menggunakan identitas **Sains Masemba** dengan ikon sains, pembelajaran, dan mode tryout/CBT yang fokus.

## Akun awal seed
- Super Admin: `superadmin@sh.local`
- Guru: `guru@sh.local`
- Siswa: `siswa@sh.local`
- Orang Tua: `orangtua@sh.local`
- Password semua akun: `Admin123!`

## Syarat
- Node.js 22.x disarankan
- npm 10.x

## Langkah install (Mac / Terminal)

```bash
cd sains-masemba-platform-v16
npm ci
cp .env.example .env
```

### Isi `.env`
Ganti placeholder dengan koneksi **Neon PostgreSQL** asli:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-POOLER/DBNAME?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
AUTH_SECRET="ganti-dengan-secret-random"
BLOB_READ_WRITE_TOKEN=""
APP_NAME="Sains Masemba"
DEFAULT_SEED_PASSWORD="Admin123!"
```

### Sebarkan env ke package/app
```bash
cp .env packages/db/.env
cp .env apps/guru/.env.local
cp .env apps/siswa/.env.local
cp .env apps/super-admin/.env.local
cp .env apps/orang-tua/.env.local
```

### Inisialisasi database
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### Jalankan development
```bash
npm run dev
```

Port default saat dev:
- Guru: http://localhost:3000
- Siswa: http://localhost:3001
- Super Admin: http://localhost:3002
- Orang Tua: http://localhost:3003

## Catatan penting
- Jika browser menampilkan peringatan hydration akibat extension, layout sudah memakai `suppressHydrationWarning`.
- Import Excel tersedia di setiap menu import dan template ada di `public/templates`.
- Setiap aksi simpan menampilkan notifikasi, dan setiap hapus memakai konfirmasi.
- Semua tampilan memakai simbol copyright **© SH**.
- Menu **Pengembang** menjelaskan aplikasi dibuat menggunakan AI oleh **Sinta Herahmawati** dan **Ari Cahya Mawardi**.

## Struktur singkat
- `apps/super-admin`
- `apps/guru`
- `apps/siswa`
- `apps/orang-tua`
- `packages/db`
- `packages/core`



## Perubahan v15
- Rebranding aplikasi tetap menggunakan **Sains Masemba**.
- Ikon aplikasi diperbarui menjadi SVG minimalis: hanya buku dan gelas reaksi.
- Favicon, app icon, dan logo publik semua memakai ikon baru yang lebih jelas.
- Nama pengguna, role, tombol Keluar, dan **© SH** digabung dalam satu kotak transparan di sidebar.
- Avatar pengguna memakai ikon user, bukan huruf nama.
- Simbol copyright tetap **© SH** sesuai arahan.


## Setelah update v15
Jalankan ulang `npm run db:push` bila database sudah pernah dipakai, agar struktur terbaru tetap sinkron.

## Catatan Deploy Vercel v16

Versi ini menambahkan konfigurasi Vercel monorepo, mengunci Node.js ke 22.x, dan mengunci npm ke 10.x untuk menghindari error `npm error Exit handler never called!`.

Jangan gunakan Install Command lama:

```bash
npm install --prefix=../..
```

Gunakan pola ini sesuai aplikasi yang dideploy:

```bash
cd ../.. && PRISMA_SKIP_POSTINSTALL_GENERATE=1 npm ci --no-audit --no-fund
cd ../.. && npm run db:generate && npm run build -w @sh/siswa
```

Ganti `@sh/siswa` menjadi `@sh/guru`, `@sh/super-admin`, atau `@sh/orang-tua` sesuai aplikasi.
