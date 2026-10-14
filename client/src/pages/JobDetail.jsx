import { useLang } from '../i18n.jsx';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, assetUrl } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useSaved } from '../saved.jsx';

export default function JobDetail() {
  const { t } = useLang();
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState(null);
  const [f, setF] = useState(null);        // application form (prefilled from the seeker's profile)
  const [file, setFile] = useState(null);  // CV chosen for this application
  const [busy, setBusy] = useState(false);
  const saved = useSaved();
  useEffect(() => { api.get(`/jobs/${id}`).then(setJob).catch((e) => setErr(e.message)); }, [id]);
  useEffect(() => {
    if (user?.role !== 'jobseeker') return;
    api.get('/profile/me').then((p) => setF({
      fullName: p.name || '', phone: p.phone || '', location: p.location || '',
      headline: p.headline || '', summary: p.summary || '', skills: (p.skills || []).join(', '),
      education: p.education || [], experience: p.experience || [],
      coverNote: '', savedCv: p.resumeName || '',
    })).catch(() => setF({ fullName: user.name || '', phone: '', location: '', headline: '', summary: '', skills: '', education: [], experience: [], coverNote: '', savedCv: '' }));
  }, [user]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setRow = (list, i, k, v) => setF({ ...f, [list]: f[list].map((r, j) => (j === i ? { ...r, [k]: v } : r)) });
  const addRow = (list, blank) => setF({ ...f, [list]: [...f[list], { ...blank }] });
  const delRow = (list, i) => setF({ ...f, [list]: f[list].filter((_, j) => j !== i) });

  const apply = async (e) => {
    e.preventDefault(); setMsg(null);
    if (!file && !f.savedCv) { setMsg({ ok: false, text: t('Please attach your CV (PDF, DOC or DOCX).') }); return; }
    const fd = new FormData();
    fd.append('jobId', id);
    for (const k of ['fullName', 'phone', 'location', 'headline', 'summary', 'skills', 'coverNote']) fd.append(k, f[k] || '');
    fd.append('education', JSON.stringify(f.education));
    fd.append('experience', JSON.stringify(f.experience));
    if (file) fd.append('cv', file);
    setBusy(true);
    try { await api.upload('/applications', fd); setMsg({ ok: true, text: t('Application submitted! The employer can now see your details and CV. Track it under My Applications.') }); }
    catch (x) { setMsg({ ok: false, text: x.message }); }
    setBusy(false);
  };

  if (err) return <p className="alert error">{err} <Link to="/">{t('Back to jobs')}</Link></p>;
  if (!job) return <p className="muted center">{t('Loading…')}</p>;
  const logo = assetUrl(job.employer?.logoUrl);
  return (
    <article className="card detail">
      <Link to="/" className="muted">← All jobs</Link>
      <div className="row gap">
        <div className="logo big">{logo ? <img src={logo} alt="" /> : job.employer?.name?.[0]}</div>
        <div><h1>{job.title}</h1><p className="muted"><Link to={`/companies/${job.employer?._id}`}>{job.employer?.name}</Link> · 📍 {job.location}</p>
          {saved.enabled && <button type="button" className={'btn small ' + (saved.ids.includes(job._id) ? '' : 'outline')} onClick={() => saved.toggle(job._id)}>{saved.ids.includes(job._id) ? t('♥ Saved') : t('♡ Save job')}</button>}</div>
      </div>
      <div className="tags"><span className="tag">{job.jobType}</span><span className="tag">{job.category}</span>{job.salaryRange && <span className="tag green">{job.salaryRange}</span>}{job.deadline && <span className="tag">Deadline: {new Date(job.deadline).toLocaleDateString()}</span>}</div>
      <h3>{t('Description')}</h3><p className="pre">{job.description}</p>
      {job.requirements && <><h3>{t('Requirements')}</h3><p className="pre">{job.requirements}</p></>}
      {job.employer?.description && <><h3>{t('About')} {job.employer.name}</h3><p className="pre">{job.employer.description}</p></>}
      <hr />
      {job.expired ? <p className="alert error">{t('The application deadline has passed.')}</p>
        : !user ? <p><Link className="btn" to="/login">{t('Login to apply')}</Link></p>
        : user.role !== 'jobseeker' ? <p className="muted">{t('Only job seeker accounts can apply.')}</p>
        : (
          !f ? <p className="muted">{t('Loading…')}</p> : (
          <form className="form" onSubmit={apply}>
            <h3>{t('Your application')}</h3>
            <p className="muted">{t('Fill in your details. The employer will see them together with your CV.')}</p>
            <div className="grid2">
              <label>{t('Full name *')}<input required value={f.fullName} onChange={set('fullName')} /></label>
              <label>{t('Phone *')}<input required value={f.phone} onChange={set('phone')} placeholder={t("e.g. +252 90 xxx xxxx")} /></label>
              <label>{t('Location')}<input value={f.location} onChange={set('location')} /></label>
              <label>{t('Headline')}<input placeholder={t("e.g. Computer Science graduate")} value={f.headline} onChange={set('headline')} /></label>
            </div>
            <label>{t('About you')}<textarea rows={3} value={f.summary} onChange={set('summary')} /></label>
            <label>{t('Skills (comma separated)')}<input value={f.skills} onChange={set('skills')} placeholder={t("Networking, Customer service, Excel")} /></label>

            <h4>{t('Education')}</h4>
            {f.education.map((r, i) => (
              <div className="grid4" key={i}>
                <input placeholder={t("Degree")} value={r.degree || ''} onChange={(e) => setRow('education', i, 'degree', e.target.value)} />
                <input placeholder={t("School")} value={r.school || ''} onChange={(e) => setRow('education', i, 'school', e.target.value)} />
                <input placeholder={t("Year")} value={r.gradYear || ''} onChange={(e) => setRow('education', i, 'gradYear', e.target.value)} />
                <button type="button" className="btn small outline" onClick={() => delRow('education', i)}>{t('Remove')}</button>
              </div>
            ))}
            <button type="button" className="btn small outline" onClick={() => addRow('education', { degree: '', school: '', gradYear: '' })}>+ Add education</button>

            <h4>{t('Experience')}</h4>
            {f.experience.map((r, i) => (
              <div className="grid4" key={i}>
                <input placeholder={t("Job title")} value={r.title || ''} onChange={(e) => setRow('experience', i, 'title', e.target.value)} />
                <input placeholder={t("Company")} value={r.company || ''} onChange={(e) => setRow('experience', i, 'company', e.target.value)} />
                <input placeholder={t("Duration")} value={r.duration || ''} onChange={(e) => setRow('experience', i, 'duration', e.target.value)} />
                <button type="button" className="btn small outline" onClick={() => delRow('experience', i)}>{t('Remove')}</button>
              </div>
            ))}
            <button type="button" className="btn small outline" onClick={() => addRow('experience', { title: '', company: '', duration: '' })}>+ Add experience</button>

            <label>CV / Resume (PDF, DOC or DOCX, max 5 MB){!f.savedCv && ' *'}
              <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0] || null)} />
            </label>
            {f.savedCv && !file && <p className="muted">📄 No file chosen: your saved CV <b>{f.savedCv}</b> will be attached.</p>}

            <label>{t('Cover note (optional)')}<textarea rows={3} value={f.coverNote} onChange={set('coverNote')} /></label>
            <button className="btn" disabled={busy || msg?.ok}>{busy ? t('Submitting…') : t('Submit application')}</button>
            {msg && <p className={'alert ' + (msg.ok ? 'ok' : 'error')}>{msg.text}</p>}
          </form>
          )
        )}
    </article>
  );
}
