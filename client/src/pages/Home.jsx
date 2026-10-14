import { useLang } from '../i18n.jsx';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, assetUrl } from '../api.js';
import { useSaved } from '../saved.jsx';

export const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];
export const CATEGORIES = ['Technology', 'Health', 'Finance', 'Education', 'Customer Service', 'Design', 'Marketing', 'Engineering', 'Other'];

export function JobCard({ job, saved }) {
  const { t } = useLang();
  const logo = assetUrl(job.employer?.logoUrl);
  const isSaved = saved?.ids.includes(job._id);
  return (
    <Link to={`/jobs/${job._id}`} className="card job-card">
      <div className="logo">{logo ? <img src={logo} alt="" /> : (job.employer?.name || '?')[0]}</div>
      <div className="grow">
        <h3>{job.title}</h3>
        <p className="muted">{job.employer?.name} · 📍 {job.location}</p>
        <div className="tags"><span className="tag">{job.jobType}</span><span className="tag">{job.category}</span>{job.salaryRange && <span className="tag green">{job.salaryRange}</span>}</div>
      </div>
      <div className="right">
        {saved?.enabled && <button type="button" className={'heart' + (isSaved ? ' on' : '')} title={isSaved ? t('Unsave') : t('Save job')} onClick={(e) => { e.preventDefault(); e.stopPropagation(); saved.toggle(job._id); }}>{isSaved ? '♥' : '♡'}</button>}
        {job.deadline && <small className="muted nowrap">{t('Deadline')}<br />{new Date(job.deadline).toLocaleDateString()}</small>}
      </div>
    </Link>
  );
}

export default function Home() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState({ q: params.get('q') || '', category: params.get('category') || '', location: params.get('location') || '', jobType: params.get('jobType') || '', postedWithin: params.get('postedWithin') || '' });
  const [jobs, setJobs] = useState(null);
  const [total, setTotal] = useState(0);
  const saved = useSaved();
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);
  const sort = params.get('sort') || 'newest';
  const LIMIT = 10;
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams(Object.entries(Object.fromEntries(params)).filter(([, v]) => v)).toString();
    setJobs(null);
    api.getWithTotal(`/jobs?limit=${LIMIT}${qs ? '&' + qs : ''}`).then((r) => { setJobs(r.items); setTotal(r.total); }).catch((e) => setError(e.message));
  }, [params]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => { e.preventDefault(); setParams(Object.fromEntries(Object.entries({ ...form, sort: sort !== 'newest' ? sort : '' }).filter(([, v]) => v))); };
  const goto = (extra) => setParams(Object.fromEntries(Object.entries({ ...Object.fromEntries(params), ...extra }).filter(([, v]) => v && v !== 1 && v !== 'newest')));
  const pages = Math.max(Math.ceil(total / LIMIT), 1);
  const clear = () => { setForm({ q: '', category: '', location: '', jobType: '', postedWithin: '' }); setParams({}); };

  return (
    <>
      <section className="hero">
        <h1>{t('Find your next job')}</h1>
        <p>{t('Find jobs across Puntland and beyond - search, filter and apply in minutes.')}</p>
        <form className="search" onSubmit={submit}>
          <input placeholder={t("Job title, skill or company")} value={form.q} onChange={set('q')} />
          <button className="btn">{t('Search')}</button>
        </form>
      </section>
      <form className="filters" onSubmit={submit}>
        <select value={form.category} onChange={set('category')}><option value="">{t('All categories')}</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <input placeholder={t("Location")} value={form.location} onChange={set('location')} />
        <select value={form.jobType} onChange={set('jobType')}><option value="">{t('All job types')}</option>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <select value={form.postedWithin} onChange={set('postedWithin')}><option value="">{t('Any date')}</option><option value="1">{t('Last 24 hours')}</option><option value="7">{t('Last 7 days')}</option><option value="30">{t('Last 30 days')}</option></select>
        <select value={sort} onChange={(e) => goto({ sort: e.target.value, page: 1 })} aria-label={t("Sort")}><option value="newest">{t('Sort: Newest')}</option><option value="oldest">{t('Sort: Oldest')}</option><option value="deadline">{t('Sort: Deadline soon')}</option><option value="title">{t('Sort: Title A-Z')}</option></select>
        <button className="btn small">{t('Apply filters')}</button>
        <button type="button" className="btn small outline" onClick={clear}>{t('Clear')}</button>
      </form>
      {error && <p className="alert error">{error}</p>}
      {jobs === null && !error && <p className="muted center">{t('Loading jobs…')}</p>}
      {jobs && jobs.length === 0 && <div className="empty"><h3>{t('No jobs found')}</h3><p className="muted">{t('Try different keywords or clear the filters.')}</p></div>}
      <div className="list">{jobs?.map((j) => <JobCard key={j._id} job={j} saved={saved} />)}</div>
      {jobs && total > LIMIT && (
        <div className="pager">
          <button className="btn small outline" disabled={page <= 1} onClick={() => goto({ page: page - 1 })}>← Previous</button>
          <span className="muted">{t('Page')} {page} of {pages} ({total} jobs)</span>
          <button className="btn small outline" disabled={page >= pages} onClick={() => goto({ page: page + 1 })}>{t('Next →')}</button>
        </div>
      )}
    </>
  );
}
