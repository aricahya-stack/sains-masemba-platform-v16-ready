import type { TryoutStatistics } from '@sh/core';
import { PageHero } from './page-hero';

type TryoutOption = {
  id: string;
  title: string;
  subtitle?: string;
};

type Marker = {
  label: string;
  score: number;
} | null;

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

function markerPosition(score: number) {
  return `${Math.max(0, Math.min(100, score))}%`;
}

export function TryoutStatisticsPanel({
  eyebrow,
  title,
  description,
  tryouts,
  selectedTryoutId,
  statistics,
  marker,
  preservedParams,
  emptyTryoutMessage = 'Belum ada tryout yang dapat dianalisis.',
}: {
  eyebrow: string;
  title: string;
  description: string;
  tryouts: TryoutOption[];
  selectedTryoutId: string;
  statistics: TryoutStatistics;
  marker?: Marker;
  preservedParams?: Record<string, string>;
  emptyTryoutMessage?: string;
}) {
  const maxFrequency = Math.max(1, ...statistics.bins.map((bin) => bin.frequency));
  const selectedTryout = tryouts.find((item) => item.id === selectedTryoutId);
  const modeText = statistics.modes.length ? statistics.modes.map(formatNumber).join(', ') : 'Tidak ada modus tunggal';

  return (
    <div className="stack">
      <PageHero eyebrow={eyebrow} title={title} description={description} />

      <section className="card stack stats-filter-card">
        <div>
          <div className="eyebrow">Filter wajib</div>
          <strong>Pilih satu tryout</strong>
          <p className="muted">Statistik selalu dihitung per tryout dan tidak pernah menggabungkan skor dari paket tryout lain.</p>
        </div>
        {tryouts.length ? (
          <form className="stats-filter-form" method="get">
            {Object.entries(preservedParams || {}).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
            <label className="field">
              <span>Tryout</span>
              <select className="select" name="tryout" defaultValue={selectedTryoutId}>
                {tryouts.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}{item.subtitle ? ` • ${item.subtitle}` : ''}</option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">Tampilkan statistik</button>
          </form>
        ) : <div className="empty-state">{emptyTryoutMessage}</div>}
      </section>

      {selectedTryout ? (
        <>
          <section className="card stack histogram-card">
            <div className="histogram-heading">
              <div>
                <div className="eyebrow">Distribusi frekuensi</div>
                <strong>{selectedTryout.title}</strong>
                <p className="muted">{statistics.count} attempt selesai menjadi observasi. Skor menggunakan skala 0–100.</p>
              </div>
              {marker ? <span className="marker-legend"><i /> {marker.label}: {formatNumber(marker.score)}</span> : null}
            </div>

            {statistics.count ? (
              <div className="histogram-shell">
                <div className="histogram-y-label">Frekuensi</div>
                <div className="histogram-plot" role="img" aria-label={`Diagram batang distribusi skor ${selectedTryout.title}`}>
                  <div className="histogram-gridline gridline-25" />
                  <div className="histogram-gridline gridline-50" />
                  <div className="histogram-gridline gridline-75" />
                  <div className="histogram-gridline gridline-100" />
                  {statistics.bins.map((bin) => (
                    <div className="histogram-column" key={bin.index}>
                      <div className="histogram-value">{bin.frequency}</div>
                      <div
                        className={`histogram-bar histogram-bar-${bin.index + 1}`}
                        style={{ height: `${Math.max(bin.frequency ? 7 : 0, (bin.frequency / maxFrequency) * 100)}%` }}
                        title={`${bin.label}: ${bin.frequency} siswa (${formatNumber(bin.percentage)}%)`}
                      />
                      <div className="histogram-label">{bin.label}</div>
                    </div>
                  ))}
                  {marker ? (
                    <div className="histogram-marker" style={{ left: markerPosition(marker.score) }}>
                      <span>{formatNumber(marker.score)}</span>
                    </div>
                  ) : null}
                </div>
                <div className="histogram-x-label">Interval nilai</div>
              </div>
            ) : <div className="empty-state">Belum ada attempt yang selesai pada tryout ini.</div>}
          </section>

          <section className="card stack">
            <div>
              <div className="eyebrow">Tabel distribusi frekuensi</div>
              <strong>Dasar pembentukan diagram batang</strong>
            </div>
            <div className="table-responsive">
              <table className="data-table statistics-table">
                <thead><tr><th>Interval nilai</th><th>Frekuensi</th><th>Persentase</th><th>Frekuensi kumulatif</th></tr></thead>
                <tbody>
                  {statistics.bins.map((bin, index) => {
                    const cumulative = statistics.bins.slice(0, index + 1).reduce((sum, item) => sum + item.frequency, 0);
                    return <tr key={bin.index}><td>{bin.label}</td><td>{bin.frequency}</td><td>{formatNumber(bin.percentage)}%</td><td>{cumulative}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="statistics-grid">
            <section className="card stack statistic-section-card">
              <div><div className="eyebrow">1. Ukuran tengah data</div><strong>Pemusatan skor</strong></div>
              <table className="data-table compact-stat-table"><tbody>
                <tr><th>Rerata</th><td>{formatNumber(statistics.mean)}</td></tr>
                <tr><th>Median</th><td>{formatNumber(statistics.median)}</td></tr>
                <tr><th>Modus</th><td>{modeText}</td></tr>
              </tbody></table>
            </section>

            <section className="card stack statistic-section-card">
              <div><div className="eyebrow">2. Ukuran dispersi data</div><strong>Penyebaran skor</strong></div>
              <table className="data-table compact-stat-table"><tbody>
                <tr><th>Minimal</th><td>{formatNumber(statistics.minimum)}</td></tr>
                <tr><th>Maksimal</th><td>{formatNumber(statistics.maximum)}</td></tr>
                <tr><th>Standar deviasi</th><td>{formatNumber(statistics.standardDeviation)}</td></tr>
                <tr><th>Varian</th><td>{formatNumber(statistics.variance)}</td></tr>
              </tbody></table>
            </section>

            <section className="card stack statistic-section-card">
              <div><div className="eyebrow">3. Ukuran tata letak</div><strong>Kuartil skor</strong></div>
              <table className="data-table compact-stat-table"><tbody>
                <tr><th>Q1</th><td>{formatNumber(statistics.q1)}</td></tr>
                <tr><th>Q2</th><td>{formatNumber(statistics.q2)}</td></tr>
                <tr><th>Q3</th><td>{formatNumber(statistics.q3)}</td></tr>
              </tbody></table>
            </section>

            <section className="card stack statistic-section-card">
              <div><div className="eyebrow">4. Keruncingan dan kemiringan</div><strong>Bentuk distribusi</strong></div>
              <table className="data-table compact-stat-table"><tbody>
                <tr><th>Skewness</th><td>{formatNumber(statistics.skewness)}</td></tr>
                <tr><th>Kurtosis (excess)</th><td>{formatNumber(statistics.kurtosisExcess)}</td></tr>
              </tbody></table>
              <div className="interpretation-box"><strong>Kemiringan</strong><p>{statistics.skewnessLabel}</p></div>
              <div className="interpretation-box"><strong>Keruncingan</strong><p>{statistics.kurtosisLabel}</p></div>
            </section>
          </div>

          <section className="card stats-method-note">
            <strong>Catatan perhitungan</strong>
            <p className="muted">Varian dan standar deviasi dihitung sebagai ukuran populasi dari seluruh attempt selesai pada tryout terpilih. Q1, Q2, dan Q3 memakai interpolasi posisi. Kurtosis ditampilkan sebagai excess kurtosis: nilai sekitar 0 berarti mendekati distribusi normal.</p>
          </section>
        </>
      ) : null}
    </div>
  );
}
