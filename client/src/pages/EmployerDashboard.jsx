import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function EmployerDashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/employer/stats').then(setS); }, []);
  if (!s) return <p className="muted center">Loading…</p>;
  const cards = [['Jobs posted', s.jobs], ['Active jobs', s.activeJobs], ['Closed jobs', s.closedJobs], ['Applications', s.applications], ['Pending', s.status.pending], ['Shortlisted', s.status.shortlisted], ['Hired', s.status.hired], ['Rejected', s.status.rejected]];
  const max = Math.max(1, ...s.last14.map((d) => d.count));
  return (
    <>
      <div className="row between wrap"><h2>Dashboard</h2><Link className="btn" to="/employer/jobs/new">+ Post a job</Link></div>
      <div className="stats">{cards.map(([k, v]) => <div className="card stat" key={k}><strong>{v}</strong><span className="muted">{k}</span></div>)}</div>
      <h3>Applications in the last 14 days</h3>
      <div className="card bars">
        {s.last14.map((d) => (
          <div className="bar-col" key={d.date} title={`${d.date}: ${d.count}`}>
            <span className="bar-n">{d.count || ''}</span>
            <div className="bar" style={{ height: `${(d.count / max) * 100}%` }} />
            <small className="muted">{d.date.slice(8)}</small>
          </div>
        ))}
      </div>
      <h3>Applications per job</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>Job</th><th>Status</th><th>Applications</th><th></th></tr></thead>
        <tbody>{s.perJob.map((j) => (
          <tr key={j._id}><td>{j.title}</td><td>{j.status}</td><td>{j.count}</td><td><Link to={`/employer/jobs/${j._id}/applications`}>View</Link></td></tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
