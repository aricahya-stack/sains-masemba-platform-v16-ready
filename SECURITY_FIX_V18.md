# Sains Masemba Security Fix v18

## Perubahan utama

- Kunci jawaban tidak lagi dikirim saat autosave.
- Pembahasan tryout hanya dapat dibuka setelah attempt disubmit.
- Jadwal, status OPEN, durasi, dan deadline tryout ditegakkan di server.
- HTML materi, soal, opsi, tips, dan pembahasan disanitasi dengan allowlist sebelum dirender.
- Endpoint upload hanya tersedia bagi Guru/Super Admin, maksimal 5 MB, hanya PNG/JPG/GIF/WEBP, dan memeriksa signature file.
- `AUTH_SECRET` wajib minimal 32 karakter pada production.
- Session memiliki expiry 12 jam, cookie `SameSite=Strict`, signature constant-time, dan `authVersion` untuk pencabutan sesi setelah password diubah.
- Rate limiting login tersimpan di PostgreSQL dan diterapkan per alamat IP serta per akun: 5 kegagalan menyebabkan blokir 15 menit.
- Origin validation/CSRF guard diterapkan pada semua API mutasi.
- Security headers dan CSP diterapkan pada empat portal.
- Password baru wajib minimal 12 karakter dan memiliki huruf besar, huruf kecil, angka, serta simbol.
- Backup Excel aman menjadi default; backup berisi hash password membutuhkan konfirmasi khusus.
- Import Excel dibatasi ke `.xlsx`, maksimal 5 MB dan 5.000 baris.
- Seed tidak lagi memiliki password default publik.

## Perubahan database

Security fix menambah:

- `User.authVersion`
- tabel `LoginThrottle`

Karena itu deployment wajib menjalankan:

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run build:all-portals
```

Jangan menjalankan `db:seed` pada database produksi.

## Environment production wajib

Pada setiap project Vercel:

```env
DATABASE_URL=...
DIRECT_URL=...
AUTH_SECRET=...
```

Buat secret baru:

```bash
openssl rand -base64 48
```

Gunakan secret kuat pada setiap project Vercel. Mengganti `AUTH_SECRET` akan membatalkan seluruh sesi lama; tindakan ini disarankan setelah deployment security fix.

## Tindakan wajib setelah deploy

1. Ganti password semua akun demo/default.
2. Pastikan tidak ada akun produksi memakai password yang pernah ditulis di README lama.
3. Terapkan migration dengan `npm run db:deploy`.
4. Redeploy keempat portal.
5. Uji login gagal 5 kali, session expiry, upload file ilegal, deadline tryout, dan pembahasan sebelum submit.
6. Perbarui Next.js jalur 15.5 minimal ke 15.5.21 dan regenerasi `package-lock.json` dari komputer yang memiliki akses npm.
7. Ganti atau perbarui dependency `xlsx` setelah menguji ulang alur import/export Excel.

## Catatan dependency

Source yang diterima mengunci Next.js 15.5.20 dan `xlsx` 0.18.5. Kode ini menambahkan mitigasi input untuk Excel, tetapi dependency tetap harus diperbarui secara terpisah karena registry npm tidak tersedia pada lingkungan penyusunan paket.
