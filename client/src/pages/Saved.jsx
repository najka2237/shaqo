import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { CATEGORIES, JOB_TYPES, JobCard, useSavedJobs } from './Home.jsx';

export function SavedJobs() {
  const [jobs, setJobs] = useState(null);
  const saved = useSavedJobs();
  useEffect(() => { api.get('/saved').then(setJobs); }, []);
  const toggle = async (id) => { await saved.toggle(id); setJobs((j) => j.filter((x) => x._id !== id)); };
  if (!jobs) return <p className="muted center">Loading…</p>;
  return (
    <>
      <h2>Saved jobs</h2>
      {jobs.length === 0 && <div className="empty"><h3>No saved jobs yet</h3><p className="muted">Tap the ♡ on a job to keep it here.</p><Link className="btn" to="/">Browse jobs</Link></div>}
      <div className="list">{jobs.map((j) => <JobCard key={j._id} job={j} saved onToggleSave={toggle} />)}</div>
    </>
  );
}

export function JobAlerts() {
  const [alerts, setAlerts] = useState(null);
  const [f, setF] = useState({ keywords: '', category: '', location: '', jobType: '' });
  const [err, setErr] = useState('');
  const load = () => api.get('/alerts').then(setAlerts);
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.post('/alerts', f); setF({ keywords: '', category: '', location: '', jobType: '' }); load(); }
    catch (x) { setErr(x.message); }
  };
  const del = async (a) => { await api.del(`/alerts/${a._id}`); load(); };
  return (
    <>
      <h2>Job alerts</h2>
      <p className="muted">We notify you (on the website, and by email/SMS/WhatsApp if you enabled it in Account) when a new job matches an alert.</p>
      <form className="card form" onSubmit={add}>
        {err && <p className="alert error">{err}</p>}
        <div className="grid2">
          <label>Keywords (comma separated)<input placeholder="nurse, accountant" value={f.keywords} onChange={set('keywords')} /></label>
          <label>Location<input placeholder="Bosaso" value={f.location} onChange={set('location')} /></label>
          <label>Category<select value={f.category} onChange={set('category')}><option value="">Any</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Job type<select value={f.jobType} onChange={set('jobType')}><option value="">Any</option>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        </div>
        <button className="btn">+ Create alert</button>
      </form>
      {alerts === null && <p className="muted center">Loading…</p>}
      <div className="list">{alerts?.map((a) => (
        <div className="card row between wrap" key={a._id}>
          <div className="tags">
            {a.keywords.map((k) => <span className="tag" key={k}>🔎 {k}</span>)}
            {a.category && <span className="tag">{a.category}</span>}
            {a.location && <span className="tag">📍 {a.location}</span>}
            {a.jobType && <span className="tag">{a.jobType}</span>}
          </div>
          <button className="btn small danger" onClick={() => del(a)}>Delete</button>
        </div>
      ))}</div>
    </>
  );
}
