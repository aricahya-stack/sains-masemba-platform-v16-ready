'use client';
import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useToast } from './toast-provider';

export function ProfilePasswordForm() {
  const { notify } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      notify('Password belum valid', 'Password baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('Konfirmasi tidak sama', 'Ulangi konfirmasi password baru.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const payload = await response.json();
      if (!response.ok) {
        notify('Password gagal diubah', payload.error || 'Server belum dapat memproses permintaan.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('Password berhasil diubah', 'Gunakan password baru saat login berikutnya.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="section-title-row">
        <div>
          <div className="eyebrow">Keamanan akun</div>
          <strong>Ubah password</strong>
        </div>
        <LockKeyhole size={22} />
      </div>
      <div className="field">
        <label htmlFor="currentPassword">Password saat ini</label>
        <input
          id="currentPassword"
          className="input"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="newPassword">Password baru</label>
        <input
          id="newPassword"
          className="input"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={8}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Ulangi password baru</label>
        <input
          id="confirmPassword"
          className="input"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
        />
      </div>
      <button className="button" type="submit" disabled={loading}>
        {loading ? 'Menyimpan...' : 'Simpan password baru'}
      </button>
    </form>
  );
}
