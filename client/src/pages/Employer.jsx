import { useLang } from '../i18n.jsx';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, assetUrl } from '../api.js';
import { useAuth } from '../auth.jsx';
import { CATEGORIES, JOB_TYPES, JobCard } from './Home.jsx';
import { StatusBadge } from './Seeker.jsx';

export function EmployerJobs() {
  const { t } = useLang();
  const [jobs, setJobs] = useState(null);
  const load = () => api.get('/jobs/mine').then(setJobs);
  useEffect(() => { load(); }, []);
  const del = async (j) => { if (confirm(`Delete "${j.title}" and its applications?`)) { await api.del(`/jobs/${j._id}`); load(); } };
  if (!jobs) return <p className="muted center">{t('Loading…')}</p>;
  return (
    <>
      <div className="row between"><h2>{t('My Job Postings')}</h2><Link className="btn" to="/employer/jobs/new">+ Post a job</Link></div>
      {jobs.length === 0 && <div className="empty"><h3>{t('No jobs posted yet')}</h3></div>}
      <div className="list">{jobs.map((j) => (
        <div className="card row between wrap" key={j._id}>
          <div>
            <h3>{j.title} {j.expired && <span className="tag red">{t('Expired')}</span>}{j.status === 'removed' && <span className="tag red">{t('Removed by admin')}</span>}</h3>
            <p className="muted">{j.location} · {j.jobType} · deadline {j.deadline ? new Date(j.deadline).toLocaleDateString() : '-'}</p>
          </div>
          <div className="row gap wrap">
            <Link className="btn small" to={`/employer/jobs/${j._id}/applications`}>Applications ({j.applicationCount})</Link>
            <Link className="btn small outline" to={`/employer/jobs/${j._id}/edit`}>{t('Edit')}</Link>
            <button className="btn small danger" onClick={() => del(j)}>{t('Delete')}</button>
          </div>
        </div>
      ))}</div>
    </>
  );
}

export function JobForm() {
  const { t } = useLang();
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', description: '', requirements: '', category: CATEGORIES[0], location: '', jobType: 'full-time', salaryRange: '', deadline: '' });
  const [err, setErr] = useState('');
  useEffect(() => {
    if (id) api.get('/jobs/mine').then((all) => { const j = all.find((x) => x._id === id); if (j) setF({ ...f, ...j, deadline: j.deadline ? j.deadline.slice(0, 10) : '' }); });
    // eslint-disable-next-line
  }, [id]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { id ? await api.put(`/jobs/${id}`, f) : await api.post('/jobs', f); nav('/employer/jobs'); }
    catch (x) { setErr(x.message); }
  };
  return (
    <form className="card form" onSubmit={submit}>
      <h2>{id ? t('Edit job') : t('Post a job')}</h2>
      {err && <p className="alert error">{err}</p>}
      <label>{t('Title')}<input required value={f.title} onChange={set('title')} /></label>
      <div className="grid2">
        <label>{t('Category')}<select value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>{t('Job type')}<select value={f.jobType} onChange={set('jobType')}>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>{t('Location')}<input required value={f.location} onChange={set('location')} /></label>
        <label>{t('Salary range')}<input placeholder="$300 - $500" value={f.salaryRange || ''} onChange={set('salaryRange')} /></label>
        <label>{t('Application deadline')}<input type="date" required value={f.deadline} onChange={set('deadline')} /></label>
      </div>
      <label>{t('Description')}<textarea required rows={5} value={f.description} onChange={set('description')} /></label>
      <label>{t('Requirements')}<textarea rows={4} value={f.requirements || ''} onChange={set('requirements')} /></label>
      <div className="row gap"><button className="btn">{id ? t('Save changes') : t('Publish job')}</button><Link className="btn outline" to="/employer/jobs">{t('Cancel')}</Link></div>
    </form>
  );
}

export function JobApplications() {
  const { t } = useLang();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api.get(`/applications/job/${id}`).then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  const [notes, setNotes] = useState({});
  const setStatus = async (a, status) => {
    try { await api.patch(`/applications/${a._id}/status`, { status, note: notes[a._id] || '' }); setNotes({ ...notes, [a._id]: '' }); load(); } catch (e) { setErr(e.message); }
  };
  if (err) return <p className="alert error">{err}</p>;
  if (!data) return <p className="muted center">{t('Loading…')}</p>;
  return (
    <>
      <Link to="/employer/jobs" className="muted">← My jobs</Link>
      <h2>{t('Applications for')} {data.job.title}</h2>
      {data.applications.length === 0 && <div className="empty"><h3>{t('No applications yet')}</h3></div>}
      <div className="list">{data.applications.map((a) => (
        <div className="card" key={a._id}>
          <div className="row between wrap">
            <div>
              <h3>{a.fullName || a.applicant.name}</h3>
              <p className="muted">{a.applicant.email}{(a.phone || a.applicant.phone) && ` · ${a.phone || a.applicant.phone}`}{(a.location || a.applicant.location) && ` · ${a.location || a.applicant.location}`}</p>
              <p className="muted">{t('Applied')} {new Date(a.createdAt).toLocaleDateString()}</p>
            </div>
            <StatusBadge s={a.status} />
          </div>
          {(a.headline || a.applicant.headline) && <p><b>{a.headline || a.applicant.headline}</b></p>}
          {a.summary && <p className="pre">{a.summary}</p>}
          {a.skills?.length > 0 && <div className="tags">{a.skills.map((s) => <span className="tag" key={s}>{s}</span>)}</div>}
          {a.education?.length > 0 && <><h4>{t('Education')}</h4><ul>{a.education.map((e, i) => <li key={i}>{[e.degree, e.school, e.gradYear].filter(Boolean).join(' · ')}</li>)}</ul></>}
          {a.experience?.length > 0 && <><h4>{t('Experience')}</h4><ul>{a.experience.map((e, i) => <li key={i}>{[e.title, e.company, e.duration].filter(Boolean).join(' · ')}</li>)}</ul></>}
          {a.coverNote && <p className="pre quote">“{a.coverNote}”</p>}
          <div className="row gap wrap">
            {a.resumeName
              ? <button className="btn small outline" onClick={() => api.openFile(a.resumeUrl)}>📄 View CV ({a.resumeName})</button>
              : a.applicant.resumeName && <button className="btn small outline" onClick={() => api.openFile(a.applicant.resumeUrl)}>📄 View CV</button>}
            <select value={a.status} onChange={(e) => setStatus(a, e.target.value)}>
              {['pending', 'shortlisted', 'rejected', 'hired'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <input className="note-input" placeholder={t("Optional message to the applicant (sent with the next status change)")} maxLength={1000} value={notes[a._id] || ''} onChange={(e) => setNotes({ ...notes, [a._id]: e.target.value })} />
          {a.history?.length > 1 && <ol className="timeline">{a.history.map((h, i) => <li key={i}><StatusBadge s={h.status} /> <small className="muted">{new Date(h.at).toLocaleString()}</small>{h.note && <p className="note">{h.note}</p>}</li>)}</ol>}
        </div>
      ))}</div>
    </>
  );
}

export function CompanySettings() {
  const { t } = useLang();
  const { refresh } = useAuth();
  const [c, setC] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => { api.get('/company/me').then(setC); }, []);
  if (!c) return <p className="muted center">{t('Loading…')}</p>;
  const set = (k) => (e) => setC({ ...c, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); setMsg(null);
    try { setC(await api.put('/company/me', c)); refresh(); setMsg({ ok: true, text: t('Company profile saved') }); } catch (x) { setMsg({ ok: false, text: x.message }); }
  };
  const logo = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('logo', file);
    try { setC(await api.upload('/company/me/logo', fd)); } catch (x) { setMsg({ ok: false, text: x.message }); }
  };
  return (
    <form className="card form" onSubmit={save}>
      <h2>{t('Company profile')}</h2>
      {msg && <p className={'alert ' + (msg.ok ? 'ok' : 'error')}>{msg.text}</p>}
      <div className="row gap"><div className="logo big">{c.logoUrl ? <img src={assetUrl(c.logoUrl)} alt="" /> : c.name[0]}</div><label>{t('Logo (image, max 1 MB)')}<input type="file" accept="image/*" onChange={logo} /></label></div>
      <div className="grid2">
        <label>{t('Company name')}<input required value={c.name || ''} onChange={set('name')} /></label>
        <label>{t('Industry')}<input value={c.industry || ''} onChange={set('industry')} /></label>
        <label>{t('Contact email')}<input type="email" value={c.contactEmail || ''} onChange={set('contactEmail')} /></label>
        <label>{t('Contact phone')}<input value={c.contactPhone || ''} onChange={set('contactPhone')} /></label>
        <label>{t('Website')}<input value={c.website || ''} onChange={set('website')} /></label>
        <label>{t('Address')}<input value={c.address || ''} onChange={set('address')} /></label>
      </div>
      <label>{t('About the company')}<textarea rows={4} value={c.description || ''} onChange={set('description')} /></label>
      <button className="btn">{t('Save')}</button>
    </form>
  );
}

export function BrowseSeekers() {
  const { t } = useLang();
  const [q, setQ] = useState('');
  const [relevantTo, setRel] = useState('');
  const [jobs, setJobs] = useState([]);
  const [list, setList] = useState(null);
  useEffect(() => { api.get('/jobs/mine').then(setJobs); }, []);
  const search = (e) => {
    e?.preventDefault(); setList(null);
    const qs = new URLSearchParams(Object.entries({ q, relevantTo }).filter(([, v]) => v)).toString();
    api.get('/employer/seekers' + (qs ? '?' + qs : '')).then(setList);
  };
  useEffect(() => { search(); /* eslint-disable-next-line */ }, []);
  return (
    <>
      <h2>{t('Find candidates')}</h2>
      <form className="filters" onSubmit={search}>
        <input placeholder={t("Name, skill or headline")} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={relevantTo} onChange={(e) => setRel(e.target.value)}><option value="">{t('All candidates')}</option>{jobs.map((j) => <option key={j._id} value={j._id}>Match for: {j.title}</option>)}</select>
        <button className="btn small">{t('Search')}</button>
      </form>
      {list === null && <p className="muted center">{t('Loading…')}</p>}
      {list?.length === 0 && <div className="empty"><h3>{t('No candidates found')}</h3></div>}
      <div className="list">{list?.map((s) => (
        <div className="card" key={s._id}>
          <h3>{s.name}</h3><p className="muted">{s.headline} {s.location && `· 📍 ${s.location}`}</p>
          <div className="tags">{s.skills.map((k) => <span key={k} className={'tag ' + (s.matchedSkills?.includes(k) ? 'green' : '')}>{k}</span>)}</div>
        </div>
      ))}</div>
      <p className="muted">{t('Contact details become visible only when a candidate applies to one of your jobs.')}</p>
    </>
  );
}

const STATUS_COLORS = { pending: '#e0a800', shortlisted: '#1f4fd8', hired: '#0f8a5f', rejected: '#c93a3a' };

export function Bars({ data, colors }) {
  const { t } = useLang();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span className="bar-label">{t(d.label)}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.value / max) * 100}%`, background: colors?.[d.label] || 'var(--brand)' }} /></div>
          <strong className="bar-val">{d.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function EmployerDashboard() {
  const { t } = useLang();
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/employer/stats').then(setS); }, []);
  if (!s) return <p className="muted center">{t('Loading…')}</p>;
  const tiles = [['Jobs posted', s.totalJobs], ['Active jobs', s.activeJobs], ['Applications received', s.totalApplications], ['Hired', s.byStatus.hired]];
  return (
    <>
      <div className="row between wrap"><h2>{t('Employer dashboard')}</h2><Link className="btn" to="/employer/jobs/new">+ Post a job</Link></div>
      <div className="stats">{tiles.map(([k, v]) => <div className="card stat" key={k}><strong>{v}</strong><span className="muted">{t(k)}</span></div>)}</div>
      <div className="grid2 gap-top">
        <div className="card"><h3>{t('Applications by status')}</h3><Bars colors={STATUS_COLORS} data={Object.entries(s.byStatus).map(([label, value]) => ({ label, value }))} /></div>
        <div className="card"><h3>{t('Top jobs by applications')}</h3>{s.topJobs.length === 0 ? <p className="muted">{t('No jobs yet.')}</p> : <Bars data={s.topJobs.map((j) => ({ label: j.title, value: j.applications }))} />}</div>
      </div>
    </>
  );
}

export function CompanyPage() {
  const { t } = useLang();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get(`/company/public/${id}`).then(setData).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <p className="alert error">{err} <Link to="/">{t('Back to jobs')}</Link></p>;
  if (!data) return <p className="muted center">{t('Loading…')}</p>;
  const c = data.company;
  return (
    <>
      <div className="card">
        <div className="row gap">
          <div className="logo big">{c.logoUrl ? <img src={assetUrl(c.logoUrl)} alt="" /> : c.name[0]}</div>
          <div><h1>{c.name}</h1><p className="muted">{[c.industry, c.address].filter(Boolean).join(' · ')}</p>{c.website && <a href={/^https?:/.test(c.website) ? c.website : 'https://' + c.website} target="_blank" rel="noreferrer">{c.website}</a>}</div>
        </div>
        {c.description && <p className="pre">{c.description}</p>}
        {(c.contactEmail || c.contactPhone) && <p className="muted">Contact: {[c.contactEmail, c.contactPhone].filter(Boolean).join(' · ')}</p>}
      </div>
      <h2>Open positions ({data.jobs.length})</h2>
      {data.jobs.length === 0 && <div className="empty"><h3>{t('No open jobs right now')}</h3></div>}
      <div className="list">{data.jobs.map((j) => <JobCard key={j._id} job={j} />)}</div>
    </>
  );
}
