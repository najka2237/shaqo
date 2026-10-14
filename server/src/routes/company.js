import { Router } from 'express';
import multer from 'multer';
import Company from '../models/Company.js';
import Job from '../models/Job.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { isValidId, httpError } from '../utils/helpers.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(httpError(400, 'Logo must be an image')),
});

// Public logo
router.get('/logo/:companyId', async (req, res) => {
  if (!isValidId(req.params.companyId)) throw httpError(404, 'Logo not found');
  const c = await Company.findById(req.params.companyId).select('+logoFile');
  if (!c || !c.logoFile) throw httpError(404, 'Logo not found');
  const [mime, data] = c.logoFile.split(';base64,');
  res.set('Content-Type', mime);
  res.set('Cache-Control', 'public, max-age=300');
  res.send(Buffer.from(data, 'base64'));
});

// Public company page: profile + its active, non-expired jobs.
router.get('/public/:companyId', async (req, res) => {
  if (!isValidId(req.params.companyId)) throw httpError(404, 'Company not found');
  const company = await Company.findById(req.params.companyId);
  if (!company) throw httpError(404, 'Company not found');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const jobs = await Job.find({ employer: company._id, status: 'active', $or: [{ deadline: null }, { deadline: { $gte: today } }] })
    .sort({ createdAt: -1 })
    .populate('employer', 'name logoUrl industry');
  res.json({ company, jobs });
});

router.use(authMiddleware, requireRole('employer'));

router.get('/me', async (req, res) => {
  const c = await Company.findOne({ owner: req.user.id });
  if (!c) throw httpError(404, 'Company profile not found');
  res.json(c);
});

router.put('/me', async (req, res) => {
  const c = await Company.findOne({ owner: req.user.id });
  if (!c) throw httpError(404, 'Company profile not found');
  const b = req.body || {};
  for (const k of ['name', 'industry', 'description', 'contactEmail', 'contactPhone', 'website', 'address']) {
    if (b[k] !== undefined) c[k] = String(b[k]).trim();
  }
  await c.save();
  res.json(c);
});

router.post('/me/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) throw httpError(400, 'Please choose an image (field name "logo")');
  const c = await Company.findOne({ owner: req.user.id });
  if (!c) throw httpError(404, 'Company profile not found');
  c.logoFile = `${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  c.logoUrl = `/api/company/logo/${c._id}?v=${Date.now()}`;
  await c.save();
  res.status(201).json(c);
});

export default router;
