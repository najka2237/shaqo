import { Router } from 'express';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Notification from '../models/Notification.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { escapeRegex, isValidId, httpError } from '../utils/helpers.js';

export async function listUsers(req, res) {
  const { role, status, q } = req.query;
  const filter = {};
  if (role) filter.role = String(role);
  if (status) filter.status = String(status);
  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  res.json(await User.find(filter).sort({ createdAt: -1 }).limit(500));
}

const router = Router();
router.use(authMiddleware, requireRole('admin'));

router.get('/users', listUsers);

router.patch('/users/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'suspended'].includes(status)) throw httpError(400, 'Status must be active or suspended');
  if (!isValidId(req.params.id)) throw httpError(404, 'User not found');
  if (req.params.id === req.user.id) throw httpError(400, 'You cannot change your own status');
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  if (user.role === 'admin') throw httpError(400, 'Admin accounts cannot be suspended');
  user.status = status;
  await user.save();
  res.json(user);
});

router.delete('/users/:id', async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(404, 'User not found');
  if (req.params.id === req.user.id) throw httpError(400, 'You cannot delete your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  if (user.role === 'admin') throw httpError(400, 'Admin accounts cannot be deleted');
  if (user.role === 'employer') {
    const jobIds = await Job.find({ postedBy: user._id }).distinct('_id');
    await Application.deleteMany({ job: { $in: jobIds } });
    await Job.deleteMany({ postedBy: user._id });
    await Company.deleteOne({ owner: user._id });
  } else {
    await Application.deleteMany({ applicant: user._id });
  }
  await Notification.deleteMany({ user: user._id });
  await User.deleteOne({ _id: user._id });
  res.json({ message: 'User deleted' });
});

router.get('/jobs', async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 }).limit(500).populate('employer', 'name');
  res.json(jobs);
});

router.patch('/jobs/:id', async (req, res) => {
  const { action } = req.body || {};
  if (!['remove', 'restore', 'review'].includes(action)) throw httpError(400, 'Action must be remove, restore or review');
  if (!isValidId(req.params.id)) throw httpError(404, 'Job not found');
  const job = await Job.findById(req.params.id);
  if (!job) throw httpError(404, 'Job not found');
  if (action === 'remove') job.status = 'removed';
  if (action === 'restore') job.status = 'active';
  if (action === 'review') job.reviewed = true;
  await job.save({ validateModifiedOnly: true });
  res.json(job);
});

router.delete('/jobs/:id', async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(404, 'Job not found');
  const job = await Job.findById(req.params.id);
  if (!job) throw httpError(404, 'Job not found');
  await Application.deleteMany({ job: job._id });
  await Job.deleteOne({ _id: job._id });
  res.json({ message: 'Job deleted' });
});

router.get('/stats', async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [seekers, employers, suspended, jobs, activeJobs, applications, hired] = await Promise.all([
    User.countDocuments({ role: 'jobseeker' }),
    User.countDocuments({ role: 'employer' }),
    User.countDocuments({ status: 'suspended' }),
    Job.countDocuments(),
    Job.countDocuments({ status: 'active', $or: [{ deadline: null }, { deadline: { $gte: today } }] }),
    Application.countDocuments(),
    Application.countDocuments({ status: 'hired' }),
  ]);
  const [byStatusRaw, byCategoryRaw, signupsRaw] = await Promise.all([
    Application.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Job.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]),
    User.find({ role: { $ne: 'admin' } }).select('createdAt').lean(),
  ]);
  const applicationsByStatus = { pending: 0, shortlisted: 0, rejected: 0, hired: 0 };
  for (const r of byStatusRaw) applicationsByStatus[r._id] = r.n;
  const months = new Map();
  for (const u of signupsRaw) {
    const k = new Date(u.createdAt).toISOString().slice(0, 7);
    months.set(k, (months.get(k) || 0) + 1);
  }
  const signups = [...months.entries()].sort().slice(-6).map(([month, n]) => ({ month, n }));
  res.json({
    seekers, employers, suspended, jobs, activeJobs, applications, hired,
    applicationsByStatus,
    jobsByCategory: byCategoryRaw.map((r) => ({ category: r._id || 'Other', n: r.n })),
    signups,
  });
});

const csvCell = (v) => {
  const s = v === undefined || v === null ? '' : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function sendCsv(res, name, header, rows) {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${name}.csv"`);
  res.send('\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n'));
}

// GET /api/admin/export/:type - CSV reports (users, jobs, applications).
router.get('/export/:type', async (req, res) => {
  const { type } = req.params;
  if (type === 'users') {
    const users = await User.find().sort({ createdAt: -1 });
    return sendCsv(res, 'users', ['Name', 'Email', 'Role', 'Status', 'Joined'], users.map((u) => [u.name, u.email, u.role, u.status, u.createdAt]));
  }
  if (type === 'jobs') {
    const jobs = await Job.find().sort({ createdAt: -1 }).populate('employer', 'name');
    return sendCsv(res, 'jobs', ['Title', 'Company', 'Category', 'Location', 'Type', 'Status', 'Deadline', 'Posted'], jobs.map((j) => [j.title, j.employer?.name, j.category, j.location, j.jobType, j.status, j.deadline, j.createdAt]));
  }
  if (type === 'applications') {
    const apps = await Application.find().sort({ createdAt: -1 }).populate('job', 'title').populate('applicant', 'name email');
    return sendCsv(res, 'applications', ['Job', 'Applicant', 'Email', 'Status', 'Applied'], apps.map((a) => [a.job?.title, a.applicant?.name, a.applicant?.email, a.status, a.createdAt]));
  }
  throw httpError(404, 'Unknown report type');
});

export default router;
