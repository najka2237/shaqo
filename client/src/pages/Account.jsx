import { useLang } from '../i18n.jsx';
import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Account() {
  const { t } = useLang();
  const { user } = useAuth();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setMsg(null);
    if (f.newPassword.length < 8) return setMsg({ ok: false, text: t('Password must be at least 8 characters') });
    if (f.newPassword !== f.confirm) return setMsg({ ok: false, text: t('Passwords do not match') });
    try {
      await api.put('/auth/password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
      setMsg({ ok: true, text: t('Password changed successfully') });
      setF({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (x) { setMsg({ ok: false, text: x.message }); }
  };
  return (
    <form className="card form narrow" onSubmit={submit}>
      <h2>{t('My account')}</h2>
      <p className="muted">{user.name} · {user.email} · {user.role}</p>
      <h3>{t('Change password')}</h3>
      {msg && <p className={'alert ' + (msg.ok ? 'ok' : 'error')}>{msg.text}</p>}
      <label>{t('Current password')}<input type="password" required value={f.currentPassword} onChange={set('currentPassword')} /></label>
      <label>{t('New password (min 8 characters)')}<input type="password" required minLength={8} value={f.newPassword} onChange={set('newPassword')} /></label>
      <label>{t('Confirm new password')}<input type="password" required value={f.confirm} onChange={set('confirm')} /></label>
      <button className="btn">{t('Change password')}</button>
    </form>
  );
}
