import { Router } from 'express';
import User from '../models/User.js';
import Job from '../models/Job.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { isValidId, httpError } from '../utils/helpers.js';

const router = Router();
router.use(authMiddleware, requireRole('jobseeker'));

// GET /api/saved - the seeker's saved jobs (only ones that still exist).
router.get('/', async (req, res) => {
  const user = await User.findById(req.user.id).select('savedJobs');
  const jobs = await Job.find({ _id: { $in: user.savedJobs } }).populate('employer', 'name logoUrl industry');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  res.json(jobs.map((j) => ({ ...j.toJSON(), expired: Boolean(j.deadline && j.deadline < today), removed: j.status !== 'active' })));
});

// GET /api/saved/ids - just the ids, so the UI can show which jobs are saved.
router.get('/ids', async (req, res) => {
  const user = await User.findById(req.user.id).select('savedJobs');
  res.json(user.savedJobs.map(String));
});

router.post('/:jobId', async (req, res) => {
  if (!isValidId(req.params.jobId)) throw httpError(404, 'Job not found');
  if (!(await Job.exists({ _id: req.params.jobId, status: 'active' }))) throw httpError(404, 'Job not found');
  await User.updateOne({ _id: req.user.id }, { $addToSet: { savedJobs: req.params.jobId } });
  res.status(201).json({ message: 'Job saved' });
});

router.delete('/:jobId', async (req, res) => {
  if (!isValidId(req.params.jobId)) throw httpError(404, 'Job not found');
  await User.updateOne({ _id: req.user.id }, { $pull: { savedJobs: req.params.jobId } });
  res.json({ message: 'Job removed from saved' });
});

export default router;
