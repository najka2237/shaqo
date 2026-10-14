import { Router } from 'express';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { escapeRegex, isValidId, httpError } from '../utils/helpers.js';

const router = Router();
router.use(authMiddleware, requireRole('employer'));

// GET /api/employer/seekers?q=&skill=&location=&relevantTo=jobId  (FR11)
// Contact details (email/phone) are never exposed here - only visible once the seeker applies.
router.get('/seekers', async (req, res) => {
  const { q, skill, location, relevantTo } = req.query;
  const and = [{ role: 'jobseeker' }, { status: 'active' }, { profileVisible: { $ne: false } }];
  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
    and.push({ $or: [{ name: rx }, { headline: rx }, { summary: rx }, { skills: rx }] });
  }
  if (skill) and.push({ skills: new RegExp(escapeRegex(String(skill).trim()), 'i') });
  if (location) and.push({ location: new RegExp(escapeRegex(String(location).trim()), 'i') });

  if (relevantTo) {
    if (!isValidId(relevantTo)) throw httpError(400, 'Invalid job id');
    const job = await Job.findOne({ _id: relevantTo, postedBy: req.user.id });
    if (!job) throw httpError(404, 'Job not found');
    const text = [job.title, job.description, job.requirements, job.category].join(' ').toLowerCase();
    let seekers = await User.find({ $and: and })
      .select('name location headline summary skills education experience resumeName')
      .limit(200);
    seekers = seekers
      .map((s) => {
        const matched = s.skills.filter((k) => k.length >= 2 && text.includes(k.toLowerCase()));
        return { ...s.toJSON(), matchedSkills: matched };
      })
      .filter((s) => s.matchedSkills.length)
      .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length);
    return res.json(seekers);
  }

  const seekers = await User.find({ $and: and })
    .select('name location headline summary skills education experience resumeName')
    .sort({ updatedAt: -1 })
    .limit(100);
  res.json(seekers);
});

// GET /api/employer/stats - dashboard numbers for the logged-in employer.
router.get('/stats', async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user.id }).select('title deadline status').lean();
  const ids = jobs.map((j) => j._id);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const grouped = await Application.aggregate([
    { $match: { job: { $in: ids } } },
    { $group: { _id: { job: '$job', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const byStatus = { pending: 0, shortlisted: 0, rejected: 0, hired: 0 };
  const perJob = new Map();
  for (const g of grouped) {
    byStatus[g._id.status] += g.n;
    perJob.set(String(g._id.job), (perJob.get(String(g._id.job)) || 0) + g.n);
  }
  const topJobs = jobs
    .map((j) => ({ _id: j._id, title: j.title, applications: perJob.get(String(j._id)) || 0 }))
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 5);
  res.json({
    totalJobs: jobs.length,
    activeJobs: jobs.filter((j) => j.status === 'active' && (!j.deadline || j.deadline >= today)).length,
    totalApplications: Object.values(byStatus).reduce((a, b) => a + b, 0),
    byStatus,
    topJobs,
  });
});

export default router;
