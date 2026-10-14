import { Router } from 'express';
import multer from 'multer';
import User from '../models/User.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { isValidId, httpError, parseSkills } from '../utils/helpers.js';

const router = Router();
router.use(authMiddleware);

const ALLOWED = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(httpError(400, 'Only PDF, DOC or DOCX files are allowed')),
});

// GET /api/profile/me
router.get('/me', requireRole('jobseeker'), async (req, res) => {
  res.json(await User.findById(req.user.id));
});

// PUT /api/profile/me
router.put('/me', requireRole('jobseeker'), async (req, res) => {
  const b = req.body || {};
  const user = await User.findById(req.user.id);
  for (const k of ['name', 'phone', 'location', 'headline', 'summary']) {
    if (b[k] !== undefined) user[k] = String(b[k]).trim();
  }
  if (!user.name) throw httpError(400, 'Name is required');
  if (b.skills !== undefined) user.skills = parseSkills(b.skills);
  if (Array.isArray(b.education)) user.education = b.education.filter((e) => e && (e.degree || e.school));
  if (Array.isArray(b.experience)) user.experience = b.experience.filter((e) => e && (e.title || e.company));
  if (b.profileVisible !== undefined) user.profileVisible = Boolean(b.profileVisible);
  await user.save();
  res.json(user);
});

// POST /api/profile/cv - upload CV (pdf/doc/docx, max 5 MB)
router.post('/cv', requireRole('jobseeker'), upload.single('cv'), async (req, res) => {
  if (!req.file) throw httpError(400, 'Please choose a CV file (field name "cv")');
  const user = await User.findById(req.user.id);
  user.resumeFile = `${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  user.resumeName = req.file.originalname;
  user.resumeUrl = `/api/profile/cv/${user._id}`;
  await user.save();
  res.status(201).json({ message: 'CV uploaded', resumeName: user.resumeName, resumeUrl: user.resumeUrl });
});

// GET /api/profile/cv/:userId - owner, admin, or an employer who received an application from this seeker
router.get('/cv/:userId', async (req, res) => {
  if (!isValidId(req.params.userId)) throw httpError(404, 'CV not found');
  const { id, role } = req.user;
  let allowed = role === 'admin' || id === req.params.userId;
  if (!allowed && role === 'employer') {
    const jobs = await Job.find({ postedBy: id }).distinct('_id');
    allowed = Boolean(await Application.exists({ applicant: req.params.userId, job: { $in: jobs } }));
  }
  if (!allowed) throw httpError(403, 'Access denied: you cannot view this CV');
  const user = await User.findById(req.params.userId).select('+resumeFile resumeName');
  if (!user || !user.resumeFile) throw httpError(404, 'CV not found');
  const [mime, data] = user.resumeFile.split(';base64,');
  res.set('Content-Type', mime);
  res.set('Content-Disposition', `inline; filename="${encodeURIComponent(user.resumeName || 'cv')}"`);
  res.send(Buffer.from(data, 'base64'));
});

export default router;
