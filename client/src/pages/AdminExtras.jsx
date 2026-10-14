import { useEffect, useState } from 'react';
import { api } from '../api.js';

export function AdminCompanies() {
  const [list, setList] = useState(null);
  const load = () => api.get('/admin/companies').then(setList);
  useEffect(() => { load(); }, []);
  const toggle = async (c) => { await api.patch(`/admin/companies/${c._id}`, { verified: !c.verified }); load(); };
  if (!list) return <p className="muted center">Loading…</p>;
  return (
    <>
      <h2>Employers</h2>
      <p className="muted">Verify a company after you have checked it is real. Verified companies show a ✔ badge to job seekers.</p>
      <div className="table-wrap"><table>
        <thead><tr><th>Company</th><th>Owner</th><th>Contact</th><th>Status</th><th></th></tr></thead>
        <tbody>{list.map((c) => (
          <tr key={c._id}><td>{c.name}</td><td>{c.owner?.name}<br /><small className="muted">{c.owner?.email}</small></td>
            <td>{c.contactPhone || c.contactEmail || '-'}</td>
            <td><span className={'status ' + (c.verified ? 'hired' : 'pending')}>{c.verified ? 'verified' : 'not verified'}</span></td>
            <td className="actions"><button className={'btn small ' + (c.verified ? 'outline' : '')} onClick={() => toggle(c)}>{c.verified ? 'Remove badge' : 'Verify'}</button></td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}

export function AdminReports() {
  const [list, setList] = useState(null);
  const [status, setStatus] = useState('open');
  const load = () => api.get('/admin/reports' + (status ? `?status=${status}` : '')).then(setList);
  useEffect(() => { setList(null); load(); /* eslint-disable-next-line */ }, [status]);
  const act = async (r, st, removeJob) => { await api.patch(`/admin/reports/${r._id}`, { status: st, removeJob }); load(); };
  return (
    <>
      <div className="row between wrap"><h2>Reported jobs</h2>
        <select style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Open</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option><option value="">All</option></select>
      </div>
      {!list && <p className="muted center">Loading…</p>}
      {list?.length === 0 && <div className="empty"><h3>No reports</h3></div>}
      <div className="list">{list?.map((r) => (
        <div className="card" key={r._id}>
          <div className="row between wrap">
            <div><h3>{r.job?.title || 'Job deleted'} <small className="muted">{r.job?.employer?.name}</small></h3>
              <p className="muted">Reason: <b>{r.reason}</b> · by {r.reporter?.name} ({r.reporter?.email}) · {new Date(r.createdAt).toLocaleDateString()}</p></div>
            <span className={'status ' + (r.status === 'open' ? 'pending' : r.status === 'resolved' ? 'hired' : '')}>{r.status}</span>
          </div>
          {r.details && <p className="pre quote">{r.details}</p>}
          {r.status === 'open' && (
            <div className="row gap wrap">
              {r.job && <button className="btn small danger" onClick={() => act(r, 'resolved', true)}>Remove job and resolve</button>}
              <button className="btn small outline" onClick={() => act(r, 'resolved', false)}>Mark resolved</button>
              <button className="btn small outline" onClick={() => act(r, 'dismissed', false)}>Dismiss</button>
            </div>
          )}
        </div>
      ))}</div>
    </>
  );
}
