# Audit dan Perbaikan Performa Sains Masemba

## Ringkasan diagnosis

Web terasa berat bukan karena ukuran aset proyek. Sumber utamanya adalah pola akses data dan jumlah JavaScript yang dihidrasi di browser.

### 1. Query autentikasi berulang pada setiap halaman

Root layout memanggil `getCurrentUser()`, kemudian halaman kembali memanggil `requireRole()` yang sebelumnya menjalankan query pengguna lagi. Implementasi lama juga selalu mengambil relasi orang tua-anak walaupun hampir semua halaman tidak memakainya.

**Perbaikan yang diterapkan:**
- `getCurrentUser()` dimemoisasi dengan React `cache()` dalam satu server render.
- Relasi `parentChildren` dan `childParents` tidak lagi dimuat otomatis.

### 2. Branding menghasilkan tiga query database

Tema, moto, dan font sebelumnya dibaca melalui tiga query `AppSetting` pada hampir setiap navigasi.

**Perbaikan yang diterapkan:**
- Ketiga pengaturan dibaca dalam satu `findMany()`.
- Hasil disimpan dalam cache selama 5 menit.
- Cache langsung dihapus saat Super Admin mengubah pengaturan.

### 3. Library Excel masuk ke bundle awal halaman import

`xlsx` diimpor pada level teratas komponen client. Library ini tidak diperlukan sebelum pengguna memilih file Excel.

**Perbaikan yang diterapkan:**
- `xlsx` diubah menjadi dynamic import dan hanya diunduh saat pengguna memilih file.

### 4. Database minim indeks

Banyak query memfilter `role`, `status`, `authorId`, `topicId`, `tryoutId`, `userId`, `submittedAt`, dan `createdAt`, tetapi skema hanya memiliki sedikit indeks.

**Perbaikan yang diterapkan:**
- Menambahkan indeks pada tabel User, ParentStudentLink, Material, TkadTip, Blueprint, Question, QuestionOption, Tryout, TryoutQuestion, Attempt, AttemptAnswer, dan TryoutIncident.
- Migration tersedia di:
  `packages/db/prisma/migrations/20260723090000_add_performance_indexes/migration.sql`

### 5. Payload ujian memuat data rahasia dan data yang tidak diperlukan

Halaman ujian sebelumnya mengirim `isCorrect` dan `explanation` ke browser. Selain menambah payload, ini merupakan celah serius karena kunci jawaban dapat dilihat melalui DevTools.

**Perbaikan yang diterapkan:**
- Query ujian menggunakan `select` yang terbatas.
- Kunci jawaban dan pembahasan tidak dikirim ke browser saat ujian aktif.

## Perbaikan lanjutan yang wajib dikerjakan

Paket ini memperbaiki overhead global, tetapi halaman dengan data besar masih perlu diubah secara struktural.

### Prioritas 1 — paginasi server

Halaman berikut masih mengambil seluruh record sekaligus:

- `/users`
- `/guru`, `/siswa`, `/orang-tua`, `/super-admin`
- `/tryout`
- `/latihan`
- `/mapping-tryout`
- `/nilai-tryout`
- `/statistik-tryout`
- beberapa halaman monitoring dan riwayat hasil

Gunakan paginasi server, misalnya 25–50 baris per halaman, dengan `take`, `skip` atau cursor. Jangan hanya menyembunyikan baris di client karena seluruh data tetap dikirim ke browser.

### Prioritas 2 — jangan kirim seluruh isi soal ke tabel

Halaman bank soal mengirim HTML soal, pembahasan, semua opsi, blueprint, topik, penulis, dan relasi tryout untuk seluruh soal ke komponen client. Ini akan memburuk secara linear saat jumlah soal bertambah.

Arsitektur yang disarankan:

1. Tabel awal hanya mengambil kolom ringkas: `id`, `code`, `status`, `topic`, `author`, dan `updatedAt`.
2. Saat pengguna menekan Edit, panggil endpoint detail berdasarkan `id`.
3. Form editor dimuat secara lazy/dynamic.
4. Setelah menyimpan, mutasi hanya baris terkait, bukan reload seluruh halaman.

### Prioritas 3 — pisahkan AppShell server dan client

`AppShell` saat ini merupakan client component besar yang membungkus seluruh halaman. Akibatnya, shell dan semua ikon/navigasi harus dihidrasi pada setiap portal.

Pisahkan menjadi:

- `AppShellServer`: markup sidebar, identitas aplikasi, dan navigasi statis.
- `ShellControlsClient`: tombol sidebar, mode gelap, pencarian, dan menu pengguna.

### Prioritas 4 — kurangi efek grafis pada perangkat lemah

CSS memakai banyak `backdrop-filter: blur(...)` dan bayangan besar. Efek ini dapat membuat scrolling tersendat pada ponsel atau laptop GPU rendah. Tambahkan fallback pada layar kecil dan `prefers-reduced-motion`.

Contoh:

```css
@media (max-width: 900px), (prefers-reduced-motion: reduce) {
  .topbar,
  .exam-header,
  .mobile-bottom-nav {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .card,
  .dashboard-action-card,
  .topic-card {
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
  }
}
```

## Cara memasang versi perbaikan

1. Backup database dan source lama.
2. Isi `.env` seperti instalasi sebelumnya.
3. Jalankan:

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run build:all-portals
```

4. Jika memakai Vercel, deploy ulang keempat portal setelah migration database berhasil.
5. Pastikan `DATABASE_URL` menggunakan connection pooler dan database berada di region yang dekat dengan deployment aplikasi.

## Pengujian yang perlu dilakukan

- Login seluruh role.
- Buka dashboard dan berpindah menu beberapa kali.
- Ubah tema/font/moto dari Super Admin dan pastikan portal lain mendapat perubahan.
- Import Excel pada portal Guru dan Super Admin.
- Mulai tryout, simpan jawaban, submit, lalu buka pembahasan.
- Periksa bahwa payload halaman ujian tidak lagi mengandung `isCorrect` atau `explanation`.
- Uji dengan data realistis, bukan database kosong.

## Status validasi

File TypeScript yang diubah telah diperiksa secara sintaksis menggunakan TypeScript transpiler. Build penuh tidak dapat dijalankan di lingkungan audit karena dependensi proyek tidak tersedia lengkap. Karena itu, tetap jalankan `npm ci`, `npm run typecheck`, dan build di lingkungan pengembangan/deployment sebelum mengganti versi produksi.
