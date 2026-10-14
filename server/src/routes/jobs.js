import { Router } from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import Company from '../models/Company.js';
import Application from '../models/Application.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { escapeRegex, isValidId, httpError } from '../utils/helpers.js';
import { notifyMatchingSeekers } from '../utils/notify.js';

const router = Router();

const SORTS = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, deadline: { deadline: 1 }, title: { title: 1 } };

const EDITABLE = ['title', 'description', 'requirements', 'category', 'location', 'jobType', 'salaryRange', 'deadline'];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function withExpiry(job) {
  const obj = typeof job.toJSON === 'function' ? job.toJSON() : job;
  obj.expired = Boolean(obj.deadline && new Date(obj.deadline) < startOfToday());
  return obj;
}

function pick(body) {
  const data = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) data[key] = body[key] === '' ? undefined : body[key];
  }
  return data;
}

// GET /api/jobs - list jobs with keyword search + filters (category, location, job type, posting date).
router.get('/', async (req, res) => {
  const { q, category, location, jobType, postedWithin } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

  const and = [
    { status: 'active' },
    // Hide jobs whose deadline has passed.
    { $or: [{ deadline: null }, { deadline: { $gte: startOfToday() } }] },
  ];

  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    const companies = await Company.find({ name: rx }).select('_id').lean();
    and.push({
      $or: [
        { title: rx },
        { description: rx },
        { requirements: rx },
        { category: rx },
        { location: rx },
        ...(companies.length ? [{ employer: { $in: companies.map((c) => c._id) } }] : []),
      ],
    });
  }
  if (category) and.push({ category: new RegExp(`^${escapeRegex(String(category).trim())}$`, 'i') });
  if (location) and.push({ location: new RegExp(escapeRegex(String(location).trim()), 'i') });
  if (jobType) and.push({ jobType: String(jobType) });
  const days = parseInt(postedWithin, 10);
  if (days > 0) and.push({ createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } });

  const filter = { $and: and };
  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort(SORTS[req.query.sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('employer', 'name logoUrl industry'),
    Job.countDocuments(filter),
  ]);

  res.set('X-Total-Count', String(total));
  res.json(jobs.map(withExpiry));
});

// GET /api/jobs/mine - the employer's own postings (active and expired) with application counts.
router.get('/mine', authMiddleware, requireRole('employer'), async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user.id })
    .sort({ createdAt: -1 })
    .populate('employer', 'name logoUrl industry');

  const counts = await Application.aggregate([
    { $match: { job: { $in: jobs.map((j) => j._id) } } },
    { $group: { _id: '$job', count: { $sum: 1 } } },
  ]);
  const byJob = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json(
    jobs.map((j) => {
      const obj = withExpiry(j);
      obj.applicationCount = byJob.get(String(j._id)) || 0;
      return obj;
    })
  );
});

// GET /api/jobs/:id - full details of a single job posting.
router.get('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(404, 'Job not found');
  const job = await Job.findById(req.params.id).populate('employer', 'name logoUrl industry description website address');
  if (!job || job.status !== 'active') throw httpError(404, 'Job not found');
  res.json(withExpiry(job));
});

// POST /api/jobs - create a job posting (employer only).
router.post('/', authMiddleware, requireRole('employer'), async (req, res) => {
  const company = await Company.findOne({ owner: req.user.id });
  if (!company) throw httpError(400, 'Please complete your company profile before posting a job');

  const job = new Job({ ...pick(req.body || {}), employer: company._id, postedBy: req.user.id });
  await job.save();
  await notifyMatchingSeekers(job, company.name);

  await job.populate('employer', 'name logoUrl industry');
  res.status(201).json(withExpiry(job));
});

async function loadOwnedJob(req) {
  if (!isValidId(req.params.id)) throw httpError(404, 'Job not found');
  const job = await Job.findById(req.params.id);
  if (!job) throw httpError(404, 'Job not found');
  if (String(job.postedBy) !== req.user.id) {
    throw httpError(403, 'Access denied: you can only manage your own job postings');
  }
  return job;
}

// PUT /api/jobs/:id - update a job posting (owner only).
router.put('/:id', authMiddleware, requireRole('employer'), async (req, res) => {
  const job = await loadOwnedJob(req);
  job.set(pick(req.body || {}));
  await job.save();
  await job.populate('employer', 'name logoUrl industry');
  res.json(withExpiry(job));
});

// DELETE /api/jobs/:id - remove a job posting and its applications (owner only).
router.delete('/:id', authMiddleware, requireRole('employer'), async (req, res) => {
  const job = await loadOwnedJob(req);
  await Application.deleteMany({ job: job._id });
  await Job.deleteOne({ _id: job._id });
  res.json({ message: 'Job posting deleted' });
});

export default router;
export { mongoose };
