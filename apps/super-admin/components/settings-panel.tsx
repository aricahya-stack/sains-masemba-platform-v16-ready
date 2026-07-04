
'use client';
import { useState } from 'react';
import { Settings2, Check, Quote, Sparkles } from 'lucide-react';
import { FONT_OPTIONS, THEME_OPTIONS } from '../lib/theme-options';
import { useToast } from './toast-provider';

export function SettingsPanel({ initialTheme, initialMotto, initialFont }: { initialTheme: string; initialMotto: string; initialFont: string }) {
  const [active, setActive] = useState(initialTheme);
  const [motto, setMotto] = useState(initialMotto);
  const [font, setFont] = useState(initialFont || 'system');
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();

  async function save(nextTheme = active, nextMotto = motto, nextFont = font) {
    try {
      setSaving(true);
      const response = await fetch('/api/settings/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: nextTheme, motto: nextMotto, font: nextFont }),
      });
      const payload = await response.json();
      if (!response.ok) {
        notify('Gagal menyimpan pengaturan', payload.error || 'Terjadi kesalahan.');
        return;
      }
      setActive(nextTheme);
      setMotto(nextMotto);
      setFont(nextFont);
      notify('Pengaturan tersimpan', 'Tema, font, dan moto global berhasil diperbarui untuk semua portal.');
      window.location.reload();
    } catch (error) {
      notify('Gagal menyimpan pengaturan', error instanceof Error ? error.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card stack">
      <div className="page-hero-card">
        <div className="eyebrow">Pengaturan global</div>
        <h1>Tema warna & moto lintas portal</h1>
        <p className="muted">Pilih palet warna utama, font, dan moto aplikasi. Pengaturan yang disimpan super admin akan dipakai juga pada portal guru, siswa, dan orang tua.</p>
      </div>

      <div className="settings-layout">
        <div className="stack">
          <div className="card stack settings-subcard">
            <div className="section-title-row">
              <div>
                <strong>Palet warna</strong>
                <p className="muted" style={{ margin: '6px 0 0' }}>Default mengikuti komposisi warna #0A7C6E · #F59E0B · #FF6B35 · #FAFAFA.</p>
              </div>
              <span className="badge"><Sparkles size={14} /> 10 tema</span>
            </div>
            <div className="theme-grid">
              {THEME_OPTIONS.map((theme) => {
                const isActive = active === theme.key;
                return (
                  <button
                    key={theme.key}
                    type="button"
                    className={`theme-card${isActive ? ' active' : ''}`}
                    onClick={() => save(theme.key, motto, font)}
                    disabled={saving}
                  >
                    <span className="theme-swatch" style={{ background: theme.preview }} />
                    <strong>{theme.label}</strong>
                    <span>{theme.brand} · {theme.warning} · {theme.accent}</span>
                    {isActive ? <Check size={16} /> : <Settings2 size={16} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card stack settings-subcard">
            <div className="section-title-row">
              <div>
                <strong>Font aplikasi</strong>
                <p className="muted" style={{ margin: '6px 0 0' }}>Pilih font global untuk semua portal agar tampilan soal, materi, dan dashboard konsisten.</p>
              </div>
              <span className="badge">Aa</span>
            </div>
            <div className="font-grid">
              {FONT_OPTIONS.map((item) => {
                const isActive = font === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`font-card${isActive ? ' active' : ''}`}
                    onClick={() => save(active, motto, item.key)}
                    disabled={saving}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.sample}</span>
                    {isActive ? <Check size={16} /> : <Settings2 size={16} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card stack settings-subcard">
            <div className="section-title-row">
              <div>
                <strong>Moto aplikasi</strong>
                <p className="muted" style={{ margin: '6px 0 0' }}>Moto tampil di halaman login dan bisa diubah kapan saja.</p>
              </div>
              <span className="badge"><Quote size={14} /> Branding</span>
            </div>
            <div className="field">
              <label>Moto global</label>
              <textarea
                className="input"
                rows={3}
                value={motto}
                onChange={(event) => setMotto(event.target.value)}
                placeholder="Tulis moto global aplikasi..."
              />
            </div>
            <div className="button-row">
              <button className="button" type="button" disabled={saving} onClick={() => save(active, motto, font)}>
                Simpan pengaturan
              </button>
            </div>
          </div>
        </div>

        <div className="card stack settings-preview">
          <div className="eyebrow">Preview login</div>
          <div className="login-preview-shell" style={{ background: THEME_OPTIONS.find((item) => item.key === active)?.preview }}>
            <div className="login-preview-left">
              <span className="pill">Tracking Belajar</span>
              <h3>Sains Masemba</h3>
              <p>Belajar, latihan, tryout, dan monitoring yang lebih rapi dalam satu ekosistem.</p>
              <blockquote>{motto}</blockquote>
            </div>
            <div className="login-preview-right">
              <div className="login-preview-mark masemba-preview-mark" aria-hidden="true" />
              <strong>Login Portal</strong>
              <span className="muted">Palet dan font aktif akan memengaruhi semua portal.</span>
            </div>
          </div>
          <div className="hint-card">
            <strong>Mode gelap/terang</strong>
            <p className="muted">Mode gelap dan terang tetap diatur masing-masing pengguna dari tombol di taskbar atas.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
