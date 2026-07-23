# Sains Masemba UI v17 — Neumorphism

Pembaruan ini mengubah dashboard Sains Masemba menjadi tampilan soft-neumorphism yang responsif tanpa mengubah schema atau data database.

## Yang diperbarui

- Komponen bersama `NeumorphicCard` berbasis React, TypeScript, Tailwind CSS, dan Motion.
- Sidebar collapsible dengan active state inset.
- Topbar baru: search inset, tombol notifikasi, mode gelap, dan avatar/profil.
- Dashboard modular untuk Super Admin, Guru, Siswa, dan Orang Tua.
- Empat KPI card pada setiap dashboard.
- Grafik responsif menggunakan Recharts.
- Tabel aktivitas terbaru.
- Responsive layout dan bottom navigation untuk perangkat mobile.
- Contoh aplikasi Expo di `examples/sains-masemba-mobile-expo`.

## Struktur utama

```text
packages/ui/
├── package.json
├── tsconfig.json
└── src/
    ├── dashboard-chart.tsx
    ├── dashboard-hero.tsx
    ├── neumorphic-card.tsx
    ├── quick-actions.tsx
    ├── recent-activity.tsx
    └── index.ts

apps/<portal>/
├── app/page.tsx
├── app/globals.css
├── components/app-shell.tsx
├── next.config.mjs
├── package.json
└── postcss.config.mjs

examples/sains-masemba-mobile-expo/
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
└── src/
    ├── HomeScreen.tsx
    └── theme.ts
```

## B1. NeumorphicCard

Lokasi:

```text
packages/ui/src/neumorphic-card.tsx
```

Contoh penggunaan:

```tsx
import { Users } from 'lucide-react';
import { NeumorphicCard } from '@sh/ui';

export function KpiPreview() {
  return (
    <NeumorphicCard
      title="Total pengguna"
      value="1.248"
      icon={<Users size={23} />}
      trend={{
        direction: 'up',
        value: '8,5%',
        label: 'dibanding bulan lalu',
      }}
      ariaLabel="Total pengguna 1.248, naik 8,5 persen"
    />
  );
}
```

Spesifikasi visual utama:

```text
Background : #EEF0F5
Shadow     : 8px 8px 16px #c5c8ce, -8px -8px 16px #ffffff
Radius     : rounded-2xl
Padding    : p-6
Accent     : #6C8EF5 dan #7EDCB5
```

## Instalasi web

Pembaruan ini menambah dependency frontend. Pada pemasangan pertama gunakan:

```bash
npm install
npm run db:generate
npm run typecheck
npm run build:all-portals
```

Setelah `npm install` selesai, commit `package-lock.json` yang telah diperbarui ke repository.

Tidak perlu menjalankan:

```bash
npm run db:deploy
npm run db:push
```

karena paket UI ini tidak mengubah Prisma schema atau database.

## Deploy ke Vercel

1. Pasang file drop-in ke repository lokal.
2. Jalankan `npm install` agar lockfile diperbarui.
3. Jalankan typecheck dan build.
4. Commit seluruh perubahan, termasuk `package-lock.json`.
5. Push ke branch deployment Vercel.
6. Redeploy keempat portal.

## Menjalankan contoh Expo

Contoh mobile tidak masuk ke proses build Vercel.

```bash
cd examples/sains-masemba-mobile-expo
npm install
npx expo start
```

## Catatan pengujian

- Semua file TypeScript/TSX baru telah diperiksa secara sintaksis.
- Build penuh tidak dijalankan pada lingkungan pembuatan paket karena registry npm tidak dapat diakses dari lingkungan tersebut.
- Jalankan `npm install`, `npm run typecheck`, dan `npm run build:all-portals` pada komputer atau CI yang memiliki akses internet sebelum production deployment.
