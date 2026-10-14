// Extra features beyond the book: saved jobs, withdraw, stats, password change, feedback timeline,
// public company page, sorting, admin reports, application form with CV.
process.env.MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/shaqodoon_test2';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const { createApp } = await import('../src/app.js');
const { connectDb, ensureAdmin } = await import('../src/db.js');
let server, base;
const tok = {}; const ids = {};
const future = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
async function api(method, path, { token, body, form } = {}) {
  const headers = {}; if (token) headers.Authorization = `Bearer ${token}`;
  let payload; if (form) payload = form; else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(base + path, { method, headers, body: payload });
  const ct = res.headers.get('content-type') || '';
  return { status: res.status, data: ct.includes('json') ? await res.json() : await res.text(), res };
}
const reg = (o) => api('POST', '/api/auth/register', { body: o });
const login = (email, password) => api('POST', '/api/auth/login', { body: { email, password } });

before(async () => {
  await connectDb(); await mongoose.connection.dropDatabase(); await ensureAdmin();
  server = createApp().listen(0); base = `http://127.0.0.1:${server.address().port}`;
  await reg({ name: 'Emp', email: 'e@t.so', password: 'Password123', role: 'employer', companyName: 'Acme' });
  await reg({ name: 'Seeker', email: 's@t.so', password: 'Password123' });
  tok.emp = (await login('e@t.so', 'Password123')).data.token;
  tok.s = (await login('s@t.so', 'Password123')).data.token;
  tok.admin = (await login('admin@shaqodoon.so', 'Admin12345')).data.token;
  const mk = (title, d) => api('POST', '/api/jobs', { token: tok.emp, body: { title, description: 'A description long enough', category: 'Technology', location: 'Garowe', deadline: future(d) } });
  ids.j1 = (await mk('Zebra job', 30)).data._id; ids.j2 = (await mk('Alpha job', 5)).data._id;
});
after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });

test('F1 saved jobs: save, list, unsave', async () => {
  assert.equal((await api('POST', `/api/saved/${ids.j1}`, { token: tok.s })).status, 201);
  assert.equal((await api('POST', `/api/saved/${ids.j1}`, { token: tok.s })).status, 201); // idempotent
  assert.deepEqual((await api('GET', '/api/saved/ids', { token: tok.s })).data, [ids.j1]);
  assert.equal((await api('GET', '/api/saved', { token: tok.s })).data[0].title, 'Zebra job');
  assert.equal((await api('POST', `/api/saved/${ids.j1}`, { token: tok.emp })).status, 403);
  await api('DELETE', `/api/saved/${ids.j1}`, { token: tok.s });
  assert.equal((await api('GET', '/api/saved', { token: tok.s })).data.length, 0);
});

test('F2 application form with CV, then withdraw (only while pending)', async () => {
  const f = new FormData();
  f.append('jobId', ids.j1); f.append('fullName', 'Seeker Full'); f.append('phone', '+252901'); f.append('skills', 'Excel, Networking');
  f.append('education', JSON.stringify([{ degree: 'BSc', school: 'PSU', gradYear: '2026' }]));
  f.append('cv', new Blob(['%PDF-1.4 x'], { type: 'application/pdf' }), 'my-cv.pdf');
  const a = await api('POST', '/api/applications', { token: tok.s, form: f });
  assert.equal(a.status, 201); ids.app = a.data._id;
  const list = await api('GET', `/api/applications/job/${ids.j1}`, { token: tok.emp });
  const app = list.data.applications[0];
  assert.equal(app.fullName, 'Seeker Full'); assert.deepEqual(app.skills, ['Excel', 'Networking']); assert.equal(app.resumeName, 'my-cv.pdf');
  const cv = await fetch(`${base}/api/applications/${ids.app}/cv`, { headers: { Authorization: `Bearer ${tok.emp}` } });
  assert.equal(cv.status, 200);
  // second job: apply, employer shortlists, withdraw is refused; third: withdraw works
  const a2 = await api('POST', '/api/applications', { token: tok.s, body: { jobId: ids.j2 } });
  assert.equal((await api('DELETE', `/api/applications/${a2.data._id}`, { token: tok.s })).status, 200);
  assert.equal((await api('GET', '/api/applications/me', { token: tok.s })).data.length, 1);
  await api('PATCH', `/api/applications/${ids.app}/status`, { token: tok.emp, body: { status: 'shortlisted' } });
  assert.equal((await api('DELETE', `/api/applications/${ids.app}`, { token: tok.s })).status, 400);
  assert.equal((await api('DELETE', `/api/applications/${ids.app}`, { token: tok.emp })).status, 403);
});

test('F3 employer stats', async () => {
  const r = await api('GET', '/api/employer/stats', { token: tok.emp });
  assert.equal(r.status, 200); assert.equal(r.data.totalJobs, 2); assert.equal(r.data.byStatus.shortlisted, 1); assert.equal(r.data.topJobs[0].title, 'Zebra job');
  assert.equal((await api('GET', '/api/employer/stats', { token: tok.s })).status, 403);
});

test('F4 change password', async () => {
  assert.equal((await api('PUT', '/api/auth/password', { token: tok.s, body: { currentPassword: 'wrong', newPassword: 'NewPassword1' } })).status, 400);
  assert.equal((await api('PUT', '/api/auth/password', { token: tok.s, body: { currentPassword: 'Password123', newPassword: 'short' } })).status, 400);
  assert.equal((await api('PUT', '/api/auth/password', { token: tok.s, body: { currentPassword: 'Password123', newPassword: 'NewPassword1' } })).status, 200);
  assert.equal((await login('s@t.so', 'Password123')).status, 401);
  assert.equal((await login('s@t.so', 'NewPassword1')).status, 200);
});

test('F5 status feedback is stored in the timeline and sent as notification', async () => {
  await api('PATCH', `/api/applications/${ids.app}/status`, { token: tok.emp, body: { status: 'hired', note: 'Welcome aboard, start Monday' } });
  const mine = (await api('GET', '/api/applications/me', { token: tok.s })).data[0];
  assert.deepEqual(mine.history.map((h) => h.status), ['pending', 'shortlisted', 'hired']);
  assert.equal(mine.history[2].note, 'Welcome aboard, start Monday');
  const n = (await api('GET', '/api/notifications', { token: tok.s })).data.notifications;
  assert.ok(n.some((x) => /start Monday/.test(x.message)));
});

test('F6 public company page lists the active jobs', async () => {
  const company = (await api('GET', '/api/auth/me', { token: tok.emp })).data.company;
  const r = await api('GET', `/api/company/public/${company._id}`);
  assert.equal(r.status, 200); assert.equal(r.data.company.name, 'Acme'); assert.equal(r.data.jobs.length, 2);
  assert.equal((await api('GET', '/api/company/public/123')).status, 404);
});

test('F7 sorting and pagination', async () => {
  assert.equal((await api('GET', '/api/jobs?sort=title')).data[0].title, 'Alpha job');
  assert.equal((await api('GET', '/api/jobs?sort=deadline')).data[0].title, 'Alpha job');
  const p = await api('GET', '/api/jobs?limit=1&page=2&sort=title');
  assert.equal(p.data.length, 1); assert.equal(p.data[0].title, 'Zebra job'); assert.equal(p.res.headers.get('x-total-count'), '2');
});

test('F8 admin reports: stats charts + CSV export', async () => {
  const s = (await api('GET', '/api/admin/stats', { token: tok.admin })).data;
  assert.equal(s.applicationsByStatus.hired, 1); assert.ok(s.jobsByCategory.length >= 1); assert.ok(s.signups.length >= 1);
  const csv = await api('GET', '/api/admin/export/users', { token: tok.admin });
  assert.equal(csv.status, 200); assert.match(csv.data, /Name,Email,Role/); assert.match(csv.data, /s@t\.so/);
  assert.equal((await api('GET', '/api/admin/export/users', { token: tok.s })).status, 403);
  assert.equal((await api('GET', '/api/admin/export/nothing', { token: tok.admin })).status, 404);
});
