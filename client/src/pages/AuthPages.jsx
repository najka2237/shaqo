import { useLang } from '../i18n.jsx';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

const home = (role) => (role === 'admin' ? '/admin' : role === 'employer' ? '/employer/dashboard' : '/');

export function Login() {
  const { t } = useLang();
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const u = await login(f.email, f.password); nav(home(u.role)); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form className="card form narrow" onSubmit={submit}>
      <h2>{t('Login')}</h2>
      {err && <p className="alert error">{err}</p>}
      <label>{t('Email')}<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label>{t('Password')}<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
      <button className="btn" disabled={busy}>{busy ? t('Please wait…') : t('Login')}</button>
      <p className="muted">No account? <Link to="/register">{t('Register')}</Link></p>
    </form>
  );
}

export function Register() {
  const { t } = useLang();
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'jobseeker', companyName: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.password.length < 8) return setErr('Password must be at least 8 characters');
    setBusy(true);
    try {
      await api.post('/auth/register', f);
      const u = await login(f.email, f.password);
      nav(u.role === 'employer' ? '/employer/company' : '/seeker/profile');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form className="card form narrow" onSubmit={submit}>
      <h2>{t('Create account')}</h2>
      {err && <p className="alert error">{err}</p>}
      <div className="seg">
        <button type="button" className={f.role === 'jobseeker' ? 'on' : ''} onClick={() => setF({ ...f, role: 'jobseeker' })}>{t('I\'m a job seeker')}</button>
        <button type="button" className={f.role === 'employer' ? 'on' : ''} onClick={() => setF({ ...f, role: 'employer' })}>{t('I\'m an employer')}</button>
      </div>
      <label>{t('Full name')}<input required value={f.name} onChange={set('name')} /></label>
      {f.role === 'employer' && <label>{t('Company name')}<input required value={f.companyName} onChange={set('companyName')} /></label>}
      <label>{t('Email')}<input type="email" required value={f.email} onChange={set('email')} /></label>
      <label>{t('Password (min 8 characters)')}<input type="password" required minLength={8} value={f.password} onChange={set('password')} /></label>
      <button className="btn" disabled={busy}>{busy ? t('Please wait…') : t('Register')}</button>
      <p className="muted">Already registered? <Link to="/login">{t('Login')}</Link></p>
    </form>
  );
}
