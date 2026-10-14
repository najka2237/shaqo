import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setMsg(null); setBusy(true);
    try { const r = await api.post('/auth/forgot', { email }); setMsg({ ok: true, text: r.message }); }
    catch (x) { setMsg({ ok: false, text: x.message }); }
    setBusy(false);
  };
  return (
    <form className="card form narrow" onSubmit={submit}>
      <h2>Forgot password</h2>
      <p className="muted">Enter your email and we will send you a link to choose a new password.</p>
      {msg && <p className={'alert ' + (msg.ok ? 'ok' : 'error')}>{msg.text}</p>}
      <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <button className="btn" disabled={busy}>{busy ? 'Please wait…' : 'Send reset link'}</button>
      <p className="muted"><Link to="/login">Back to login</Link></p>
    </form>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setMsg(null); setBusy(true);
    try { await api.post('/auth/reset', { token, password: pw }); setMsg({ ok: true, text: 'Password updated. Redirecting to login…' }); setTimeout(() => nav('/login'), 1500); }
    catch (x) { setMsg({ ok: false, text: x.message }); }
    setBusy(false);
  };
  return (
    <form className="card form narrow" onSubmit={submit}>
      <h2>Choose a new password</h2>
      {msg && <p className={'alert ' + (msg.ok ? 'ok' : 'error')}>{msg.text}</p>}
      <label>New password (min 8 characters, letters and numbers)<input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      <button className="btn" disabled={busy}>{busy ? 'Please wait…' : 'Save new password'}</button>
    </form>
  );
}
