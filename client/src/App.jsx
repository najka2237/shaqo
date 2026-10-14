import { useLang } from './i18n.jsx';
import { useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { api } from './api.js';
import Home from './pages/Home.jsx';
import JobDetail from './pages/JobDetail.jsx';
import { Login, Register } from './pages/AuthPages.jsx';
import Notifications from './pages/Notifications.jsx';
import { SeekerProfile, SeekerApplications, SavedJobs } from './pages/Seeker.jsx';
import Account from './pages/Account.jsx';
import { EmployerJobs, JobForm, JobApplications, CompanySettings, BrowseSeekers, EmployerDashboard, CompanyPage } from './pages/Employer.jsx';
import { AdminDashboard, AdminUsers, AdminJobs } from './pages/Admin.jsx';

function Guard({ roles, children }) {
  const { t } = useLang();
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted center">{t('Loading…')}</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Bell() {
  const { t } = useLang();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const load = () => api.get('/notifications').then((r) => setUnread(r.unread)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    window.addEventListener('notif-changed', load);
    return () => { clearInterval(t); window.removeEventListener('notif-changed', load); };
  }, []);
  return <NavLink to="/notifications" className="bell">🔔{unread > 0 && <span className="badge">{unread}</span>}</NavLink>;
}

function Nav() {
  const { t } = useLang();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const { lang, setLang } = useLang();
  const close = () => setOpen(false);
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" onClick={close}>{t('Shaqo')}<span>{t('Doon')}</span></Link>
        <button className="burger" aria-label={t("Menu")} onClick={() => setOpen(!open)}>☰</button>
        <nav className={open ? 'links open' : 'links'} onClick={close}>
          <button className="lang" onClick={() => setLang(lang === 'en' ? 'so' : 'en')} title="Language / Luuqad">{lang === 'en' ? t('Somali') : t('English')}</button><NavLink to="/" end>{t('Jobs')}</NavLink>
          {user?.role === 'jobseeker' && <><NavLink to="/seeker/applications">{t('My Applications')}</NavLink><NavLink to="/seeker/saved">{t('Saved')}</NavLink><NavLink to="/seeker/profile">{t('My Profile')}</NavLink></>}
          {user?.role === 'employer' && <><NavLink to="/employer/dashboard">{t('Dashboard')}</NavLink><NavLink to="/employer/jobs">{t('My Jobs')}</NavLink><NavLink to="/employer/seekers">{t('Find Candidates')}</NavLink><NavLink to="/employer/company">{t('Company')}</NavLink></>}
          {user?.role === 'admin' && <><NavLink to="/admin" end>{t('Dashboard')}</NavLink><NavLink to="/admin/users">{t('Users')}</NavLink><NavLink to="/admin/jobs">{t('Jobs')}</NavLink></>}
          {user ? (
            <>
              {user.role !== 'admin' && <Bell />}
              <NavLink to="/account" className="who">{user.name} <small>({user.role})</small></NavLink>
              <button className="btn small outline" onClick={() => { logout(); nav('/'); }}>{t('Logout')}</button>
            </>
          ) : (
            <><NavLink to="/login">{t('Login')}</NavLink><Link to="/register" className="btn small">{t('Register')}</Link></>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  const { t } = useLang();
  return (
    <>
      <Nav />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/notifications" element={<Guard roles={['jobseeker', 'employer']}><Notifications /></Guard>} />
          <Route path="/companies/:id" element={<CompanyPage />} />
          <Route path="/account" element={<Guard roles={['jobseeker', 'employer', 'admin']}><Account /></Guard>} />
          <Route path="/seeker/saved" element={<Guard roles={['jobseeker']}><SavedJobs /></Guard>} />
          <Route path="/employer/dashboard" element={<Guard roles={['employer']}><EmployerDashboard /></Guard>} />
          <Route path="/seeker/profile" element={<Guard roles={['jobseeker']}><SeekerProfile /></Guard>} />
          <Route path="/seeker/applications" element={<Guard roles={['jobseeker']}><SeekerApplications /></Guard>} />
          <Route path="/employer/jobs" element={<Guard roles={['employer']}><EmployerJobs /></Guard>} />
          <Route path="/employer/jobs/new" element={<Guard roles={['employer']}><JobForm /></Guard>} />
          <Route path="/employer/jobs/:id/edit" element={<Guard roles={['employer']}><JobForm /></Guard>} />
          <Route path="/employer/jobs/:id/applications" element={<Guard roles={['employer']}><JobApplications /></Guard>} />
          <Route path="/employer/seekers" element={<Guard roles={['employer']}><BrowseSeekers /></Guard>} />
          <Route path="/employer/company" element={<Guard roles={['employer']}><CompanySettings /></Guard>} />
          <Route path="/admin" element={<Guard roles={['admin']}><AdminDashboard /></Guard>} />
          <Route path="/admin/users" element={<Guard roles={['admin']}><AdminUsers /></Guard>} />
          <Route path="/admin/jobs" element={<Guard roles={['admin']}><AdminJobs /></Guard>} />
          <Route path="*" element={<p className="center muted">Page not found. <Link to="/">{t('Go home')}</Link></p>} />
        </Routes>
      </main>
      <footer className="footer">{t('ShaqoDoon · Puntland State University graduation project')}</footer>
    </>
  );
}
