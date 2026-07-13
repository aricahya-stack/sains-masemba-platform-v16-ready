# Sains Masemba V16.1 — Backup Excel Only

Paket ini menambahkan fitur backup database ke Excel pada portal Super Admin **tanpa fitur notifikasi dan tanpa perubahan schema.prisma**.

## Instalasi

```bash
npm install
npm run db:generate
npm run typecheck
```

Tidak perlu menjalankan `prisma db push` untuk memasang fitur backup ini karena schema database tidak berubah.

Buka portal Super Admin, lalu pilih **Operasional → Backup Data**.

## Perintah CLI

```bash
npm run db:backup-excel
```

File akan dibuat di folder `backups/`.

## Peringatan

- Jangan gunakan hotfix/model Notification jika fitur notifikasi belum diimplementasikan.
- Jangan jalankan `prisma migrate reset`, `prisma db push --force-reset`, atau `prisma db push --accept-data-loss`.
- Backup Excel menyimpan data database. File fisik eksternal hanya dicatat URL-nya.
