import { useLang } from '../i18n.jsx';
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Bars } from './Employer.jsx';

export function AdminDashboard() {
  const { t } = useLang();
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/admin/stats').then(setS); }, []);
  if (!s) return <p className="muted center">{t('Loading…')}</p>;
  const items = [['Job seekers', s.seekers], ['Employers', s.employers], ['Suspended users', s.suspended], ['Total jobs', s.jobs], ['Active jobs', s.activeJobs], ['Applications', s.applications], ['Hired', s.hired]];
  return (
    <>
      <h2>{t('Admin dashboard')}</h2>
      <div className="stats">{items.map(([k, v]) => <div className="card stat" key={k}><strong>{v}</strong><span className="muted">{t(k)}</span></div>)}</div>
      <div className="grid2 gap-top">
        <div className="card"><h3>{t('Applications by status')}</h3><Bars colors={{ pending: '#e0a800', shortlisted: '#1f4fd8', hired: '#0f8a5f', rejected: '#c93a3a' }} data={Object.entries(s.applicationsByStatus).map(([label, value]) => ({ label, value }))} /></div>
        <div className="card"><h3>{t('Jobs by category')}</h3>{s.jobsByCategory.length ? <Bars data={s.jobsByCategory.map((c) => ({ label: c.category, value: c.n }))} /> : <p className="muted">{t('No jobs yet.')}</p>}</div>
        <div className="card"><h3>{t('New users per month')}</h3>{s.signups.length ? <Bars data={s.signups.map((m) => ({ label: m.month, value: m.n }))} /> : <p className="muted">{t('No users yet.')}</p>}</div>
        <div className="card"><h3>{t('Download reports (CSV)')}</h3><p className="muted">{t('Open in Excel.')}</p>
          <div className="row gap wrap">{['users', 'jobs', 'applications'].map((t) => <button key={t} className="btn small outline" onClick={() => api.download(`/admin/export/${t}`, `${t}.csv`)}>⬇ {t}</button>)}</div></div>
      </div>
    </>
  );
}

export function AdminUsers() {
  const { t } = useLang();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [err, setErr] = useState('');
  const load = () => {
    const qs = new URLSearchParams(Object.entries({ q, role }).filter(([, v]) => v)).toString();
    api.get('/admin/users' + (qs ? '?' + qs : '')).then(setUsers).catch((e) => setErr(e.message));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [role]);
  const toggle = async (u) => { try { await api.patch(`/admin/users/${u._id}/status`, { status: u.status === 'active' ? 'suspended' : 'active' }); load(); } catch (e) { setErr(e.message); } };
  const del = async (u) => { if (confirm(`Delete ${u.name} and all their data?`)) { try { await api.del(`/admin/users/${u._id}`); load(); } catch (e) { setErr(e.message); } } };
  return (
    <>
      <h2>{t('Manage users')}</h2>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <input placeholder={t("Search name or email")} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)}><option value="">{t('All roles')}</option><option value="jobseeker">{t('Job seekers')}</option><option value="employer">{t('Employers')}</option><option value="admin">{t('Admins')}</option></select>
        <button className="btn small">{t('Search')}</button>
      </form>
      {err && <p className="alert error">{err}</p>}
      <div className="table-wrap"><table>
        <thead><tr><th>{t('Name')}</th><th>{t('Email')}</th><th>{t('Role')}</th><th>{t('Status')}</th><th>{t('Joined')}</th><th></th></tr></thead>
        <tbody>{users?.map((u) => (
          <tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
            <td><span className={'status ' + (u.status === 'active' ? 'hired' : 'rejected')}>{u.status}</span></td>
            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
            <td className="actions">{u.role !== 'admin' && <><button className="btn small outline" onClick={() => toggle(u)}>{u.status === 'active' ? t('Suspend') : t('Activate')}</button><button className="btn small danger" onClick={() => del(u)}>{t('Delete')}</button></>}</td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}

export function AdminJobs() {
  const { t } = useLang();
  const [jobs, setJobs] = useState(null);
  const load = () => api.get('/admin/jobs').then(setJobs);
  useEffect(() => { load(); }, []);
  const act = async (j, action) => { await api.patch(`/admin/jobs/${j._id}`, { action }); load(); };
  const del = async (j) => { if (confirm(`Permanently delete "${j.title}"?`)) { await api.del(`/admin/jobs/${j._id}`); load(); } };
  if (!jobs) return <p className="muted center">{t('Loading…')}</p>;
  return (
    <>
      <h2>{t('Moderate job postings')}</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>{t('Title')}</th><th>{t('Company')}</th><th>{t('Location')}</th><th>{t('Status')}</th><th></th></tr></thead>
        <tbody>{jobs.map((j) => (
          <tr key={j._id}><td>{j.title}</td><td>{j.employer?.name}</td><td>{j.location}</td>
            <td><span className={'status ' + (j.status === 'active' ? 'hired' : 'rejected')}>{j.status}</span>{j.reviewed && ' ✓'}</td>
            <td className="actions">
              {!j.reviewed && <button className="btn small outline" onClick={() => act(j, 'review')}>{t('Mark reviewed')}</button>}
              {j.status === 'active' ? <button className="btn small outline" onClick={() => act(j, 'remove')}>{t('Remove')}</button> : <button className="btn small outline" onClick={() => act(j, 'restore')}>{t('Restore')}</button>}
              <button className="btn small danger" onClick={() => del(j)}>{t('Delete')}</button>
            </td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
