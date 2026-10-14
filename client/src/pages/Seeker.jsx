import { useLang } from '../i18n.jsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export const StatusBadge = ({ s }) => { const { t } = useLang(); return <span className={'status ' + s}>{t(s)}</span>; };

export function SeekerApplications() {
  const { t } = useLang();
  const [apps, setApps] = useState(null);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api.get('/applications/me').then(setApps);
  useEffect(() => { load(); }, []);
  const withdraw = async (a) => {
    if (!confirm(t('Withdraw this application?'))) return;
    try { await api.del(`/applications/${a._id}`); load(); } catch (e) { setErr(e.message); }
  };
  if (!apps) return <p className="muted center">{t('Loading…')}</p>;
  return (
    <>
      <h2>{t('My Applications')}</h2>
      {err && <p className="alert error">{err}</p>}
      {apps.length === 0 && <div className="empty"><h3>{t('You haven\'t applied to any job yet')}</h3><Link className="btn" to="/">{t('Browse jobs')}</Link></div>}
      <div className="list">{apps.map((a) => (
        <div className="card" key={a._id}>
          <div className="row between wrap">
            <div>
              {a.job ? <Link to={`/jobs/${a.job._id}`}><h3>{a.job.title}</h3></Link> : <h3>{t('Job removed')}</h3>}
              <p className="muted">{a.job?.employer?.name} · {a.job?.location} · applied {new Date(a.createdAt).toLocaleDateString()}</p>
            </div>
            <StatusBadge s={a.status} />
          </div>
          <div className="row gap wrap">
            <button className="btn small outline" onClick={() => setOpen(open === a._id ? null : a._id)}>{open === a._id ? t('Hide timeline') : t('Show timeline')}</button>
            {a.status === 'pending' && <button className="btn small danger" onClick={() => withdraw(a)}>{t('Withdraw')}</button>}
          </div>
          {open === a._id && (
            <ol className="timeline">
              {(a.history?.length ? a.history : [{ status: 'pending', at: a.createdAt }]).map((h, i) => (
                <li key={i}><StatusBadge s={h.status} /> <small className="muted">{new Date(h.at).toLocaleString()}</small>{h.note && <p className="note">{h.note}</p>}</li>
              ))}
            </ol>
          )}
        </div>
      ))}</div>
    </>
  );
}

export function SavedJobs() {
  const { t } = useLang();
  const [jobs, setJobs] = useState(null);
  const load = () => api.get('/saved').then(setJobs);
  useEffect(() => { load(); }, []);
  const remove = async (j) => { await api.del(`/saved/${j._id}`); load(); };
  if (!jobs) return <p className="muted center">{t('Loading…')}</p>;
  return (
    <>
      <h2>{t('Saved Jobs')}</h2>
      {jobs.length === 0 && <div className="empty"><h3>{t('No saved jobs yet')}</h3><p className="muted">{t('Tap the ♡ on any job to save it for later.')}</p><Link className="btn" to="/">{t('Browse jobs')}</Link></div>}
      <div className="list">{jobs.map((j) => (
        <div className="card row between wrap" key={j._id}>
          <div>
            <Link to={`/jobs/${j._id}`}><h3>{j.title}</h3></Link>
            <p className="muted">{j.employer?.name} · {j.location} {j.expired && <span className="tag red">{t('Expired')}</span>}{j.removed && <span className="tag red">{t('No longer available')}</span>}</p>
          </div>
          <button className="btn small outline" onClick={() => remove(j)}>{t('Remove')}</button>
        </div>
      ))}</div>
    </>
  );
}

const blankEdu = { degree: '', school: '', gradYear: '' };
const blankExp = { title: '', company: '', duration: '' };

export function SeekerProfile() {
  const { t } = useLang();
  const [p, setP] = useState(null);
  const [skills, setSkills] = useState('');
  const [msg, setMsg] = useState(null);
  useEffect(() => { api.get('/profile/me').then((u) => { setP(u); setSkills((u.skills || []).join(', ')); }); }, []);
  if (!p) return <p className="muted center">{t('Loading…')}</p>;
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const setRow = (list, i, k, v) => setP({ ...p, [list]: p[list].map((r, j) => (j === i ? { ...r, [k]: v } : r)) });
  const addRow = (list, blank) => setP({ ...p, [list]: [...p[list], { ...blank }] });
  const delRow = (list, i) => setP({ ...p, [list]: p[list].filter((_, j) => j !== i) });

  const save = async (e) => {
    e.preventDefault(); setMsg(null);
    try {
      const u = await api.put('/profile/me', { ...p, skills });
      setP(u); setMsg({ ok: true, text: t('Profile saved') });
    } catch (x) { setMsg({ ok: false, text: x.message }); }
  };
  const upload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('cv', file);
    try { const r = await api.upload('/profile/cv', fd); setP({ ...p, resumeName: r.resumeName, resumeUrl: r.resumeUrl }); setMsg({ ok: true, text: t('CV uploaded') }); }
    catch (x) { setMsg({ ok: false, text: x.message }); }
    e.target.value = '';
  };

  return (
    <form className="card form" onSubmit={save}>
      <h2>{t('My Profile')}</h2>
      {msg && <p className={'alert ' + (msg.ok ? 'ok' : 'error')}>{msg.text}</p>}
      <div className="grid2">
        <label>{t('Full name')}<input required value={p.name || ''} onChange={set('name')} /></label>
        <label>{t('Phone')}<input value={p.phone || ''} onChange={set('phone')} /></label>
        <label>{t('Location')}<input value={p.location || ''} onChange={set('location')} /></label>
        <label>{t('Headline')}<input placeholder={t("e.g. Computer Science graduate")} value={p.headline || ''} onChange={set('headline')} /></label>
      </div>
      <label>{t('Summary')}<textarea rows={3} value={p.summary || ''} onChange={set('summary')} /></label>
      <label>{t('Skills (comma separated)')}<input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={t("React, Node.js, MongoDB")} /></label>

      <h3>{t('Education')}</h3>
      {p.education.map((r, i) => (
        <div className="grid4" key={i}>
          <input placeholder={t("Degree")} value={r.degree || ''} onChange={(e) => setRow('education', i, 'degree', e.target.value)} />
          <input placeholder={t("School")} value={r.school || ''} onChange={(e) => setRow('education', i, 'school', e.target.value)} />
          <input placeholder={t("Year")} value={r.gradYear || ''} onChange={(e) => setRow('education', i, 'gradYear', e.target.value)} />
          <button type="button" className="btn small outline" onClick={() => delRow('education', i)}>{t('Remove')}</button>
        </div>
      ))}
      <button type="button" className="btn small outline" onClick={() => addRow('education', blankEdu)}>+ Add education</button>

      <h3>{t('Experience')}</h3>
      {p.experience.map((r, i) => (
        <div className="grid4" key={i}>
          <input placeholder={t("Job title")} value={r.title || ''} onChange={(e) => setRow('experience', i, 'title', e.target.value)} />
          <input placeholder={t("Company")} value={r.company || ''} onChange={(e) => setRow('experience', i, 'company', e.target.value)} />
          <input placeholder={t("Duration")} value={r.duration || ''} onChange={(e) => setRow('experience', i, 'duration', e.target.value)} />
          <button type="button" className="btn small outline" onClick={() => delRow('experience', i)}>{t('Remove')}</button>
        </div>
      ))}
      <button type="button" className="btn small outline" onClick={() => addRow('experience', blankExp)}>+ Add experience</button>

      <label className="check"><input type="checkbox" checked={p.profileVisible !== false} onChange={(e) => setP({ ...p, profileVisible: e.target.checked })} /> Let employers find my profile (contact details stay private)</label>
      <button className="btn">{t('Save profile')}</button>

      <h3>{t('CV / Resume')}</h3>
      <p className="muted">{t('PDF, DOC or DOCX, max 5 MB.')}</p>
      {p.resumeName && <p>📄 <button type="button" className="link" onClick={() => api.openFile(p.resumeUrl)}>{p.resumeName}</button></p>}
      <input type="file" accept=".pdf,.doc,.docx" onChange={upload} />
    </form>
  );
}
