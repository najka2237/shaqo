// The 20 test cases from the thesis book (Chapter 5), run against a separate test database.
process.env.MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/shaqodoon_test';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const { createApp } = await import('../src/app.js');
const { connectDb, ensureAdmin } = await import('../src/db.js');

let server, base;
const tok = {};
const ids = {};
const future = (d = 10) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

async function api(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(base + path, { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
const reg = (o) => api('POST', '/api/auth/register', { body: o });
const login = async (email, password) => api('POST', '/api/auth/login', { body: { email, password } });

before(async () => {
  await connectDb();
  await mongoose.connection.dropDatabase();
  await ensureAdmin();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  await reg({ name: 'Emp One', email: 'emp@test.so', password: 'Password123', role: 'employer', companyName: 'Test Co' });
  await reg({ name: 'Emp Two', email: 'emp2@test.so', password: 'Password123', role: 'employer', companyName: 'Other Co' });
  tok.emp = (await login('emp@test.so', 'Password123')).data.token;
  tok.emp2 = (await login('emp2@test.so', 'Password123')).data.token;
  tok.admin = (await login('admin@shaqodoon.so', 'Admin12345')).data.token;
});
after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });

test('TC01 valid registration', async () => {
  const r = await reg({ name: 'Sara', email: 'sara@test.so', password: 'Password123', role: 'jobseeker' });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.password, undefined);
});
test('TC02 duplicate email is blocked', async () => {
  const r = await reg({ name: 'Sara 2', email: 'SARA@test.so', password: 'Password123', role: 'jobseeker' });
  assert.equal(r.status, 409);
});
test('TC03 correct login returns JWT', async () => {
  const r = await login('sara@test.so', 'Password123');
  assert.equal(r.status, 200); assert.ok(r.data.token); tok.sara = r.data.token; ids.sara = r.data.user._id;
});
test('TC04 wrong password denied', async () => {
  assert.equal((await login('sara@test.so', 'WrongPass1')).status, 401);
});
test('TC05 employer posts a job and it appears in listings', async () => {
  const r = await api('POST', '/api/jobs', { token: tok.emp, body: { title: 'Node Developer', description: 'Build REST APIs with Node and MongoDB', category: 'Technology', location: 'Garowe', jobType: 'full-time', deadline: future() } });
  assert.equal(r.status, 201); ids.job = r.data._id;
  const l = await api('GET', '/api/jobs');
  assert.ok(l.data.some((j) => j._id === ids.job));
});
test('TC06 keyword search', async () => {
  await api('POST', '/api/jobs', { token: tok.emp, body: { title: 'Nurse', description: 'Care for patients in hospital', category: 'Health', location: 'Bosaso', deadline: future() } });
  const r = await api('GET', '/api/jobs?q=node');
  assert.equal(r.data.length, 1); assert.equal(r.data[0].title, 'Node Developer');
});
test('TC07 category and location filter', async () => {
  const a = await api('GET', '/api/jobs?category=Health');
  assert.deepEqual(a.data.map((j) => j.title), ['Nurse']);
  const b = await api('GET', '/api/jobs?location=Garowe');
  assert.deepEqual(b.data.map((j) => j.title), ['Node Developer']);
});
test('TC08 seeker applies and employer sees the application', async () => {
  const a = await api('POST', '/api/applications', { token: tok.sara, body: { jobId: ids.job, coverNote: 'Hello' } });
  assert.equal(a.status, 201); ids.app = a.data._id;
  const dup = await api('POST', '/api/applications', { token: tok.sara, body: { jobId: ids.job } });
  assert.equal(dup.status, 409);
  const l = await api('GET', `/api/applications/job/${ids.job}`, { token: tok.emp });
  assert.equal(l.data.applications.length, 1);
  assert.equal(l.data.applications[0].applicant.email, 'sara@test.so');
});
test('TC09 status update notifies the seeker', async () => {
  const r = await api('PATCH', `/api/applications/${ids.app}/status`, { token: tok.emp, body: { status: 'shortlisted' } });
  assert.equal(r.status, 200); assert.equal(r.data.status, 'shortlisted');
  const bad = await api('PATCH', `/api/applications/${ids.app}/status`, { token: tok.emp, body: { status: 'maybe' } });
  assert.equal(bad.status, 400);
  const other = await api('PATCH', `/api/applications/${ids.app}/status`, { token: tok.emp2, body: { status: 'hired' } });
  assert.equal(other.status, 403);
  const n = await api('GET', '/api/notifications', { token: tok.sara });
  assert.ok(n.data.notifications.some((x) => x.type === 'status_changed' && /shortlisted/.test(x.message)));
  assert.ok(n.data.unread >= 1);
});
test('TC10 seeker cannot use employer routes', async () => {
  const r = await api('POST', '/api/jobs', { token: tok.sara, body: { title: 'Hack', description: 'Not allowed here', deadline: future() } });
  assert.equal(r.status, 403);
  assert.equal((await api('GET', `/api/applications/job/${ids.job}`, { token: tok.sara })).status, 403);
});
test('TC11 responsive layout is declared in the client CSS', async () => {
  const fs = await import('node:fs');
  const css = fs.readFileSync(new URL('../../client/src/styles.css', import.meta.url), 'utf8');
  assert.match(css, /@media\s*\(max-width/); assert.match(css, /display:\s*grid/); assert.match(css, /display:\s*flex/);
});
test('TC12 CV upload (and bad file type rejected)', async () => {
  const f = new FormData();
  f.append('cv', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'cv.pdf');
  const r = await api('POST', '/api/profile/cv', { token: tok.sara, form: f });
  assert.equal(r.status, 201);
  const get = await fetch(`${base}/api/profile/cv/${ids.sara}`, { headers: { Authorization: `Bearer ${tok.emp}` } });
  assert.equal(get.status, 200);
  const get2 = await fetch(`${base}/api/profile/cv/${ids.sara}`, { headers: { Authorization: `Bearer ${tok.emp2}` } });
  assert.equal(get2.status, 403);
  const bad = new FormData();
  bad.append('cv', new Blob(['x'], { type: 'text/plain' }), 'x.txt');
  assert.equal((await api('POST', '/api/profile/cv', { token: tok.sara, form: bad })).status, 400);
});
test('TC13 missing fields give validation errors', async () => {
  assert.equal((await reg({ email: 'x@test.so', password: 'Password123' })).status, 400);
  assert.equal((await reg({ name: 'X', email: 'x@test.so', password: 'short' })).status, 400);
  const j = await api('POST', '/api/jobs', { token: tok.emp, body: { title: 'ab' } });
  assert.equal(j.status, 400);
  const past = await api('POST', '/api/jobs', { token: tok.emp, body: { title: 'Old job', description: 'Deadline in the past', deadline: '2020-01-01' } });
  assert.equal(past.status, 400);
});
test('TC14 employer edits a job', async () => {
  const r = await api('PUT', `/api/jobs/${ids.job}`, { token: tok.emp, body: { title: 'Senior Node Developer' } });
  assert.equal(r.status, 200); assert.equal(r.data.title, 'Senior Node Developer');
  assert.equal((await api('PUT', `/api/jobs/${ids.job}`, { token: tok.emp2, body: { title: 'Stolen' } })).status, 403);
});
test('TC15 employer deletes a job', async () => {
  const c = await api('POST', '/api/jobs', { token: tok.emp, body: { title: 'Temp job', description: 'To be deleted soon', category: 'Other', location: 'Garowe', deadline: future() } });
  assert.equal((await api('DELETE', `/api/jobs/${c.data._id}`, { token: tok.emp })).status, 200);
  assert.equal((await api('GET', `/api/jobs/${c.data._id}`)).status, 404);
});
test('TC16 seeker views application history', async () => {
  const r = await api('GET', '/api/applications/me', { token: tok.sara });
  assert.equal(r.data.length, 1); assert.equal(r.data[0].job.title, 'Senior Node Developer');
  assert.equal((await api('GET', `/api/applications/user/${ids.sara}`, { token: tok.sara })).status, 200);
  assert.equal((await api('GET', `/api/applications/user/${ids.sara}`, { token: tok.emp })).status, 403);
});
test('TC17 no token gives 401', async () => {
  assert.equal((await api('GET', '/api/applications/me')).status, 401);
  assert.equal((await api('GET', '/api/applications/me', { token: 'garbage' })).status, 401);
});
test('TC18 admin suspends a user who then cannot log in', async () => {
  assert.equal((await api('GET', '/api/admin/users', { token: tok.sara })).status, 403);
  const users = await api('GET', '/api/users', { token: tok.admin });
  assert.ok(users.data.length >= 4);
  const r = await api('PATCH', `/api/admin/users/${ids.sara}/status`, { token: tok.admin, body: { status: 'suspended' } });
  assert.equal(r.status, 200);
  assert.equal((await login('sara@test.so', 'Password123')).status, 403);
  assert.equal((await api('GET', '/api/applications/me', { token: tok.sara })).status, 403);
  await api('PATCH', `/api/admin/users/${ids.sara}/status`, { token: tok.admin, body: { status: 'active' } });
  assert.equal((await login('sara@test.so', 'Password123')).status, 200);
});
test('TC19 empty search returns an empty list', async () => {
  const r = await api('GET', '/api/jobs?q=zzzzzz-nothing');
  assert.equal(r.status, 200); assert.deepEqual(r.data, []);
});
test('TC20 concurrent applications are all saved', async () => {
  const seekers = [];
  for (let i = 0; i < 8; i++) {
    await reg({ name: `Con ${i}`, email: `con${i}@test.so`, password: 'Password123' });
    seekers.push((await login(`con${i}@test.so`, 'Password123')).data.token);
  }
  const rs = await Promise.all(seekers.map((t) => api('POST', '/api/applications', { token: t, body: { jobId: ids.job } })));
  assert.ok(rs.every((r) => r.status === 201));
  const l = await api('GET', `/api/applications/job/${ids.job}`, { token: tok.emp });
  assert.equal(l.data.applications.length, 9);
  // same seeker double-submitting concurrently still yields one record
  const dup = await Promise.all([1, 2, 3].map(() => api('POST', '/api/applications', { token: seekers[0], body: { jobId: ids.job } })));
  assert.ok(dup.every((r) => r.status === 409));
});
