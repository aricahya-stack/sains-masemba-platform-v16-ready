import { prisma, UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { CheckCircle2, Lightbulb, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHero } from '../../components/page-hero';
import { MathHtml } from '../../components/math-html';

type PublishedTip = {
  id: string;
  category: string;
  title: string;
  contentHtml: string;
  orderNo: number;
};

const accents = ['brand', 'warning', 'accent'] as const;

export default async function TipsTkadPage() {
  await requireRole(UserRole.SISWA);
  const tips: PublishedTip[] = await prisma.tkadTip.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ orderNo: 'asc' }, { updatedAt: 'desc' }],
  });

  const categories: string[] = Array.from(new Set(tips.map((tip) => tip.category)));

  return (
    <div className="stack tips-page">
      <PageHero
        eyebrow="Tips TKAD"
        title="Strategi cerdas mengerjakan soal TKAD IPA"
        description="Soal TKAD menilai kemampuan membaca informasi, memahami konsep, mengolah data, dan mengambil keputusan berbasis bukti. Gunakan strategi yang disusun guru sebelum latihan dan tryout."
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
          <p>{tips.length} panduan aktif telah dipublikasikan oleh guru.</p>
        </div>
      </section>

      {tips.length === 0 ? (
        <div className="empty-state">Belum ada Tips TKAD yang dipublikasikan oleh guru.</div>
      ) : null}

      {categories.map((category) => {
        const categoryTips = tips.filter((tip) => tip.category === category);
        return (
          <section className="stack" key={category}>
            <div className="tips-section-heading">
              <div>
                <div className="eyebrow">{category}</div>
                <h2>Strategi yang perlu dikuasai</h2>
              </div>
              <span className="badge"><ShieldCheck size={16} /> {categoryTips.length} panduan</span>
            </div>
            <div className="tips-format-grid">
              {categoryTips.map((tip, index) => (
                <article className={`tips-format-card tips-accent-${accents[index % accents.length]}`} key={tip.id}>
                  <div className="tips-format-title">
                    <span><CheckCircle2 size={20} /></span>
                    <h3>{tip.title}</h3>
                  </div>
                  <MathHtml html={tip.contentHtml} />
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
