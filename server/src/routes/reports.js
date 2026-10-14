import { Router } from 'express';
import Report, { REPORT_REASONS } from '../models/Report.js';
import Job from '../models/Job.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { isValidId, httpError } from '../utils/helpers.js';

const router = Router();
router.use(authMiddleware, requireRole('jobseeker', 'employer'));

// POST /api/reports - report a suspicious or inappropriate job posting to the administrators.
router.post('/', async (req, res) => {
  const { jobId, reason, details } = req.body || {};
  if (!jobId || !isValidId(jobId)) throw httpError(400, 'A valid jobId is required');
  if (!REPORT_REASONS.includes(reason)) throw httpError(400, 'Reason must be one of: ' + REPORT_REASONS.join(', '));
  const job = await Job.findById(jobId).select('postedBy status');
  if (!job || job.status === 'removed') throw httpError(404, 'Job not found');
  if (String(job.postedBy) === req.user.id) throw httpError(400, 'You cannot report your own job');
  // The unique (job, reporter) index stops the same person reporting twice.
  try {
    await Report.create({ job: job._id, reporter: req.user.id, reason, details: details ? String(details).trim() : undefined });
  } catch (err) {
    if (err?.code === 11000) throw httpError(409, 'You have already reported this job');
    throw err;
  }
  res.status(201).json({ message: 'Thank you. An administrator will review this job.' });
});

export default router;
