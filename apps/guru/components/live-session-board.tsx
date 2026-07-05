'use client';
import { useState } from 'react';
import { PageHero } from './page-hero';
import { useToast } from './toast-provider';

type SessionRow = {
  id: string;
  title: string;
  status: string;
  attemptCount: number;
  warningCount: number;
};

type ParticipantRow = {
  id: string;
  studentName: string;
  className: string;
  attemptNumber: number;
  score: number;
  warnings: number;
  startedAt: string;
  submittedAt: string;
  status: string;
};

export function LiveSessionBoard({
  initialTryouts,
  initialParticipants,
}: {
  initialTryouts: SessionRow[];
  initialParticipants: Record<string, ParticipantRow[]>;
}) {
  const { notify } = useToast();
  const [tryouts, setTryouts] = useState(initialTryouts);
  const [selectedTryout, setSelectedTryout] = useState(initialTryouts[0]?.id || '');

  async function control(tryoutId: string, action: 'OPEN' | 'PAUSED' | 'ENDED' | 'WARNING') {
    const message = action === 'WARNING' ? prompt('Isi peringatan untuk semua peserta:', 'Fokus kembali ke halaman ujian.') || '' : '';
    const response = await fetch('/api/tryouts/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tryoutId, action, message }),
    });
    const payload = await response.json();
    if (!response.ok) {
      notify('Gagal', payload.error || 'Kontrol tryout gagal.');
      return;
    }
    setTryouts((prev) => prev.map((item) => (item.id === tryoutId ? { ...item, status: payload.status } : item)));
    notify('Aksi dikirim', payload.message || 'Perintah berhasil dikirim.');
  }

  const participants = initialParticipants[selectedTryout] || [];

  return (
    <div className="stack">
      <PageHero
        eyebrow="Tryout live"
        title="Monitoring dan laporan tryout"
        description="Guru dapat mengontrol sesi ujian sekaligus melihat laporan semua percobaan siswa pada setiap tryout."
      />
      <div className="grid-3">
        {tryouts.map((item) => (
          <article className="card stack" key={item.id}>
            <div className="item-head">
              <div>
                <strong>{item.title}</strong>
                <div className="muted">{item.attemptCount} percobaan • warning {item.warningCount}</div>
              </div>
              <span className={`badge${item.status === 'PAUSED' ? ' warning' : item.status === 'ENDED' ? ' danger' : ' success'}`}>{item.status}</span>
            </div>
            <div className="inline-group">
              <button className="button-secondary" type="button" onClick={() => setSelectedTryout(item.id)}>Lihat peserta</button>
              <button className="button" type="button" onClick={() => control(item.id, 'OPEN')}>Resume</button>
              <button className="button-secondary" type="button" onClick={() => control(item.id, 'PAUSED')}>Pause</button>
              <button className="button-danger" type="button" onClick={() => control(item.id, 'ENDED')}>Stop</button>
              <button className="button-secondary" type="button" onClick={() => control(item.id, 'WARNING')}>Peringatan</button>
            </div>
          </article>
        ))}
      </div>
      <section className="card stack">
        <div>
          <div className="eyebrow">Peserta</div>
          <strong>Laporan percobaan tryout terpilih</strong>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Kelas</th>
                <th>Percobaan</th>
                <th>Mulai</th>
                <th>Selesai</th>
                <th>Skor</th>
                <th>Warning</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state">Belum ada percobaan.</div></td></tr>
              ) : participants.map((item) => (
                <tr key={item.id}>
                  <td>{item.studentName}</td>
                  <td>{item.className}</td>
                  <td>Percobaan ke-{item.attemptNumber}</td>
                  <td>{item.startedAt}</td>
                  <td>{item.submittedAt || '-'}</td>
                  <td>{item.submittedAt ? item.score.toFixed(0) : '-'}</td>
                  <td>{item.warnings}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
