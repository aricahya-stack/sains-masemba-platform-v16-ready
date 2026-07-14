
import { appMeta } from '../../lib/app';
import { BrandMark } from '../../components/app-shell';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params?.error; const serverError = error === 'server';
  return (
    <div className="auth-card stack">
      <div className="login-mark-wrap">
        <BrandMark />
      </div>
      <div className="stack-sm">
        <div className="eyebrow">{appMeta.loginBadge}</div>
        <h2 className="auth-card-title">Login {appMeta.roleLabel}</h2>
        <p className="muted">Masuk menggunakan akun portal yang telah diatur pada sistem.</p>
      </div>
      {serverError ? <div className="error-note">Server belum membaca konfigurasi env atau database. Pastikan file .env sudah dibuat dari root project.</div> : error ? <div className="error-note">Email, password, atau role akun tidak cocok untuk aplikasi ini.</div> : null}
      <form method="post" action="/api/login">
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" name="email" placeholder="nama@contoh.com" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" name="password" placeholder="••••••••" required />
        </div>
        <button className="button auth-submit" type="submit">Masuk</button>
      </form>
      <div className="auth-note">
        Aplikasi belajar dan tryout IPA SMP dengan tampilan fokus, rapi, dan mudah digunakan.
      </div>
      <div className="muted auth-credit">
        <div className="auth-credit-title">Pengembang dan validator:</div>
        <div className="auth-credit-list">
          <div className="auth-credit-person">
            <strong>Sinta Herahmawati, S.Pd.</strong>
            <span>Guru IPA · MTsN 9 Bantul</span>
          </div>
          <div className="auth-credit-person">
            <strong>Muh. Rosyid, S.T.</strong>
            <span>Guru IPA · MTsN 9 Bantul</span>
          </div>
          <div className="auth-credit-person">
            <strong>Zulisti Sudarojah, S.Pd.I.</strong>
            <span>Guru IPA · MTsN 9 Bantul</span>
          </div>
          <div className="auth-credit-person">
            <strong>Ari Cahya Mawardi, M.Pd.</strong>
            <span>Dosen Media Pembelajaran · UIN Sunan Kalijaga Yogyakarta</span>
          </div>
        </div>
      </div>
      <div className="auth-copyright">© SH</div>
    </div>
  );
}
