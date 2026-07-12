import { UserRole } from '@sh/db';
import { requireRole } from '@sh/core';
import { Bot, UserRound, UserRoundCheck } from 'lucide-react';
import { PageHero } from '../../components/page-hero';

export default async function DeveloperPage() {
  await requireRole(UserRole.ORANG_TUA);
  return (
    <div className="stack">
      <PageHero
        eyebrow="Pengembang"
        title="Tentang aplikasi dan validasi konten"
        description="Aplikasi ini dikembangkan dengan dukungan AI untuk mempercepat perancangan antarmuka, penyusunan fitur, dan pengelolaan konten pembelajaran."
      />
      <section className="card stack">
        <div className="section-title-row">
          <div>
            <div className="eyebrow">Pengembangan berbasis AI</div>
            <strong>AI sebagai pendukung, validasi tetap dilakukan oleh ahli</strong>
          </div>
          <Bot size={28} />
        </div>
        <p className="muted">
          Platform ini dikembangkan menggunakan bantuan AI untuk merancang struktur aplikasi, tampilan pengguna, fitur belajar, tryout, pembahasan, dan dashboard monitoring. Materi dan soal tidak diperlakukan sebagai keluaran otomatis yang langsung digunakan, tetapi melalui proses validasi agar sesuai dengan kebutuhan pembelajaran IPA SMP, kisi-kisi, dan kelayakan evaluasi.
        </p>
        <p className="muted">
          Validasi konten dilakukan untuk memastikan bahasa soal mudah dipahami, kunci jawaban sesuai, pembahasan dapat dipertanggungjawabkan, dan materi relevan dengan tujuan pembelajaran. Dengan demikian, AI berperan sebagai alat bantu pengembangan, sedangkan keputusan akademik tetap berada pada pengembang dan validator manusia.
        </p>
      </section>
      <section className="developer-grid">
        <article className="developer-card female">
          <div className="developer-icon"><UserRound size={34} /></div>
          <div>
            <strong>Sinta Herahmawati, S.Pd.</strong>
            <span>Guru IPA</span>
            <p>Instansi: MTsN 9 Bantul</p>
          </div>
        </article>
        <article className="developer-card male">
          <div className="developer-icon"><UserRoundCheck size={34} /></div>
          <div>
            <strong>Muh. Rosyid, S.T.</strong>
            <span>Guru IPA</span>
            <p>Instansi: MTsN 9 Bantul</p>
          </div>
        </article>
        <article className="developer-card female">
          <div className="developer-icon"><UserRound size={34} /></div>
          <div>
            <strong>Zulisti Sudarojah, S.Pd.I.</strong>
            <span>Guru IPA</span>
            <p>Instansi: MTsN 9 Bantul</p>
          </div>
        </article>
        <article className="developer-card male">
          <div className="developer-icon"><UserRoundCheck size={34} /></div>
          <div>
            <strong>Ari Cahya Mawardi, M.Pd.</strong>
            <span>Dosen Media Pembelajaran</span>
            <p>Instansi: UIN Sunan Kalijaga Yogyakarta</p>
          </div>
        </article>
      </section>
    </div>
  );
}
