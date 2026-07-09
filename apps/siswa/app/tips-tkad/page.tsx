import { UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Calculator,
  CheckCircle2,
  CircleCheckBig,
  Clock3,
  Eye,
  FlaskConical,
  Gauge,
  Image as ImageIcon,
  Lightbulb,
  ListChecks,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Table2,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { PageHero } from '../../components/page-hero';

const quickSteps = [
  {
    no: '01',
    title: 'Baca yang ditanya dulu',
    text: 'Temukan target jawaban sebelum membaca stimulus panjang. Ini mencegah kamu tersesat pada informasi yang tidak diperlukan.',
    icon: Target,
  },
  {
    no: '02',
    title: 'Tandai kata kunci',
    text: 'Cari istilah, angka, satuan, hubungan sebab-akibat, atau kalimat pembanding yang langsung berkaitan dengan pertanyaan.',
    icon: ScanSearch,
  },
  {
    no: '03',
    title: 'Pisahkan data dan pengalih',
    text: 'Tidak semua informasi dalam stimulus harus digunakan. Ambil hanya bukti yang relevan dengan konsep yang ditanyakan.',
    icon: Eye,
  },
  {
    no: '04',
    title: 'Tentukan konsep IPA',
    text: 'Ubah cerita menjadi konsep: gaya, energi, organ, pH, pewarisan, ekologi, atau konsep lain yang tepat.',
    icon: Brain,
  },
  {
    no: '05',
    title: 'Uji opsi dan cek kewajaran',
    text: 'Periksa setiap opsi terhadap data dan konsep. Untuk hitungan, cek satuan serta apakah hasilnya masuk akal secara ilmiah.',
    icon: ShieldCheck,
  },
];

const formatTips = [
  {
    title: 'Teks literasi panjang',
    icon: BookOpenCheck,
    accent: 'brand',
    points: [
      'Baca pertanyaan terlebih dahulu.',
      'Cari kata kunci yang sama atau searti di stimulus.',
      'Jangan menganggap seluruh kalimat harus dipakai.',
      'Tarik kesimpulan hanya dari bukti yang tersedia.',
    ],
  },
  {
    title: 'Tabel dan grafik',
    icon: Table2,
    accent: 'warning',
    points: [
      'Baca judul, variabel, dan satuan.',
      'Cari nilai terbesar, terkecil, pola naik-turun, atau perbandingan.',
      'Bedakan data hasil pengamatan dengan kesimpulan.',
      'Jangan memperkirakan nilai yang tidak ditunjukkan data.',
    ],
  },
  {
    title: 'Gambar, organ, dan diagram',
    icon: ImageIcon,
    accent: 'accent',
    points: [
      'Kenali letak, bentuk, arah, dan hubungan antarbagian.',
      'Hubungkan struktur dengan fungsi, bukan hanya hafal nomor.',
      'Perhatikan legenda, panah, dan warna bila digunakan.',
      'Uji apakah label sesuai dengan proses yang dijelaskan.',
    ],
  },
  {
    title: 'Hitungan kontekstual',
    icon: Calculator,
    accent: 'brand',
    points: [
      'Tulis: diketahui → ditanya → konsep/rumus.',
      'Samakan satuan sebelum menghitung.',
      'Substitusikan angka setelah hubungan konsep jelas.',
      'Cek kewajaran hasil dan satuan akhir.',
    ],
  },
  {
    title: 'Pilihan ganda kompleks',
    icon: ListChecks,
    accent: 'warning',
    points: [
      'Nilai setiap opsi secara independen.',
      'Tulis secara mental: benar karena… / salah karena….',
      'Jangan berhenti setelah menemukan satu opsi benar.',
      'Pastikan jumlah pilihan benar sesuai instruksi soal.',
    ],
  },
  {
    title: 'Benar–salah',
    icon: CircleCheckBig,
    accent: 'accent',
    points: [
      'Anggap setiap pernyataan sebagai klaim terpisah.',
      'Periksa kata mutlak seperti selalu, hanya, semua, dan tidak pernah.',
      'Cek angka, urutan, arah proses, dan istilah ilmiah.',
      'Satu bagian keliru dapat membuat seluruh pernyataan salah.',
    ],
  },
  {
    title: 'Eksperimen dan data percobaan',
    icon: FlaskConical,
    accent: 'brand',
    points: [
      'Tentukan variabel bebas, terikat, dan kontrol.',
      'Baca pola data sebelum memilih kesimpulan.',
      'Kesimpulan harus sesuai rentang data yang diuji.',
      'Bedakan korelasi dengan hubungan sebab-akibat.',
    ],
  },
  {
    title: 'Soal dengan banyak jebakan opsi',
    icon: TriangleAlert,
    accent: 'warning',
    points: [
      'Eliminasi opsi yang salah konsep atau salah satuan.',
      'Waspadai opsi yang benar secara umum tetapi tidak menjawab pertanyaan.',
      'Bandingkan dua opsi tersisa menggunakan bukti stimulus.',
      'Jangan menambah asumsi yang tidak diberikan.',
    ],
  },
];

const timeRounds = [
  {
    title: 'Putaran 1 — Amankan poin',
    text: 'Kerjakan soal yang langsung kamu pahami. Tandai soal yang membutuhkan hitungan panjang atau analisis mendalam.',
    badge: 'Cepat & yakin',
  },
  {
    title: 'Putaran 2 — Fokus analisis',
    text: 'Kembali ke soal tabel, grafik, hitungan, eksperimen, dan stimulus panjang. Gunakan langkah DATA → KONSEP → UJI.',
    badge: 'Teliti',
  },
  {
    title: 'Putaran 3 — Verifikasi akhir',
    text: 'Periksa soal yang masih ragu, satuan, tanda negatif, opsi kompleks, dan jawaban benar–salah sebelum mengakhiri.',
    badge: 'Cek ulang',
  },
];

const traps = [
  'Terpancing angka yang sebenarnya tidak diperlukan.',
  'Langsung memakai rumus sebelum memahami apa yang ditanyakan.',
  'Menganggap opsi paling panjang pasti benar.',
  'Memilih kesimpulan yang lebih luas daripada data yang tersedia.',
  'Lupa konversi cm ke m atau cm² ke m².',
  'Mengira dua kejadian yang bersamaan pasti memiliki hubungan sebab-akibat.',
  'Pada pilihan kompleks, berhenti setelah menemukan satu opsi benar.',
  'Tidak membaca kata negatif seperti “tidak”, “kecuali”, atau “paling tidak tepat”.',
];

export default async function TipsTkadPage() {
  await requireRole(UserRole.SISWA);

  return (
    <div className="stack tips-page">
      <PageHero
        eyebrow="Tips TKAD"
        title="Strategi cerdas mengerjakan soal TKAD IPA"
        description="Soal TKAD menilai kemampuan membaca informasi, memahami konsep, mengolah data, dan mengambil keputusan berbasis bukti. Gunakan strategi di halaman ini sebelum latihan dan tryout."
      />

      <section className="tips-hero card">
        <div className="tips-hero-copy">
          <span className="tips-kicker"><Sparkles size={16} /> Rumus utama</span>
          <h2>TANYA → DATA → KONSEP → UJI → CEK</h2>
          <p>
            Jangan mulai dari rumus. Mulailah dari apa yang ditanyakan, ambil data yang relevan, tentukan konsep IPA,
            uji setiap opsi, lalu cek kembali satuan dan kewajaran jawaban.
          </p>
          <div className="tips-hero-chips" aria-label="Lima langkah utama">
            {['Tanya', 'Data', 'Konsep', 'Uji', 'Cek'].map((item, index) => (
              <span key={item}><b>{index + 1}</b>{item}</span>
            ))}
          </div>
        </div>
        <div className="tips-hero-score" aria-label="Prinsip menjawab TKAD">
          <div className="tips-score-ring"><Lightbulb size={38} /></div>
          <strong>Bukti lebih penting daripada tebakan</strong>
          <p>Jawaban terbaik adalah yang paling sesuai dengan stimulus, data, dan konsep ilmiah.</p>
        </div>
      </section>

      <section className="stack">
        <div className="tips-section-heading">
          <div>
            <div className="eyebrow">Strategi inti</div>
            <h2>5 langkah untuk hampir semua soal TKAD</h2>
          </div>
          <span className="badge"><Gauge size={16} /> Gunakan berulang</span>
        </div>
        <div className="tips-steps-grid">
          {quickSteps.map((step) => {
            const Icon = step.icon;
            return (
              <article className="tips-step-card" key={step.no}>
                <div className="tips-step-top">
                  <span className="tips-step-number">{step.no}</span>
                  <span className="tips-icon-badge"><Icon size={20} /></span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card stack tips-example">
        <div className="tips-section-heading compact">
          <div>
            <div className="eyebrow">Contoh cara berpikir</div>
            <h2>Jangan langsung menghitung</h2>
          </div>
          <Calculator size={26} />
        </div>
        <div className="tips-example-grid">
          <div className="tips-example-stimulus">
            <span className="tips-mini-label">Contoh stimulus</span>
            <p>Sebuah alat memberikan gaya 1.200 N pada permukaan seluas 0,08 m². Berapa tekanan yang dihasilkan?</p>
          </div>
          <div className="tips-example-flow">
            <div><span>1</span><p><strong>Ditanya:</strong> tekanan.</p></div>
            <ArrowRight size={18} />
            <div><span>2</span><p><strong>Data:</strong> F = 1.200 N, A = 0,08 m².</p></div>
            <ArrowRight size={18} />
            <div><span>3</span><p><strong>Konsep:</strong> P = F/A.</p></div>
            <ArrowRight size={18} />
            <div><span>4</span><p><strong>Cek:</strong> satuan akhir N/m² atau pascal.</p></div>
          </div>
        </div>
      </section>

      <section className="stack">
        <div className="tips-section-heading">
          <div>
            <div className="eyebrow">Sesuai format soal</div>
            <h2>Pilih strategi berdasarkan bentuk stimulus</h2>
          </div>
        </div>
        <div className="tips-format-grid">
          {formatTips.map((tip) => {
            const Icon = tip.icon;
            return (
              <article className={`tips-format-card tips-accent-${tip.accent}`} key={tip.title}>
                <div className="tips-format-title">
                  <span><Icon size={20} /></span>
                  <h3>{tip.title}</h3>
                </div>
                <ul>
                  {tip.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="tips-two-column">
        <article className="card stack">
          <div className="tips-section-heading compact">
            <div>
              <div className="eyebrow">Manajemen waktu</div>
              <h2>Gunakan sistem 3 putaran</h2>
            </div>
            <Clock3 size={26} />
          </div>
          <div className="tips-round-list">
            {timeRounds.map((round, index) => (
              <div className="tips-round" key={round.title}>
                <span className="tips-round-no">{index + 1}</span>
                <div>
                  <div className="tips-round-head"><strong>{round.title}</strong><span>{round.badge}</span></div>
                  <p>{round.text}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card stack tips-trap-card">
          <div className="tips-section-heading compact">
            <div>
              <div className="eyebrow">Jebakan umum</div>
              <h2>Hindari kesalahan yang sebenarnya bisa dicegah</h2>
            </div>
            <TriangleAlert size={26} />
          </div>
          <div className="tips-trap-list">
            {traps.map((trap) => (
              <div key={trap}><span>!</span><p>{trap}</p></div>
            ))}
          </div>
        </article>
      </section>

      <section className="tips-final-check card">
        <div className="tips-final-icon"><CheckCircle2 size={30} /></div>
        <div>
          <div className="eyebrow">Checklist sebelum kirim</div>
          <h2>Berhenti 30 detik dan cek 6 hal ini</h2>
          <div className="tips-check-grid">
            {[
              'Semua soal sudah terjawab.',
              'Kata “tidak/kecuali” tidak terlewat.',
              'Satuan sudah benar.',
              'Opsi kompleks sudah diperiksa satu per satu.',
              'Jawaban sesuai data, bukan asumsi.',
              'Hasil hitungan masuk akal secara ilmiah.',
            ].map((item) => (
              <span key={item}><CheckCircle2 size={17} />{item}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
