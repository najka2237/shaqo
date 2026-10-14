import { Router } from 'express';
import Alert from '../models/Alert.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { isValidId, httpError, parseSkills } from '../utils/helpers.js';

const router = Router();
router.use(authMiddleware, requireRole('jobseeker'));

const MAX_ALERTS = 10;

router.get('/', async (req, res) => {
  res.json(await Alert.find({ user: req.user.id }).sort({ createdAt: -1 }));
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  const data = {
    user: req.user.id,
    keywords: parseSkills(b.keywords),
    category: b.category ? String(b.category).trim() : undefined,
    location: b.location ? String(b.location).trim() : undefined,
    jobType: b.jobType ? String(b.jobType).trim() : undefined,
  };
  if (!data.keywords.length && !data.category && !data.location && !data.jobType) {
    throw httpError(400, 'Add at least one keyword, category, location or job type');
  }
  if ((await Alert.countDocuments({ user: req.user.id })) >= MAX_ALERTS) {
    throw httpError(400, `You can have at most ${MAX_ALERTS} job alerts`);
  }
  res.status(201).json(await Alert.create(data));
});

router.delete('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(404, 'Alert not found');
  const r = await Alert.deleteOne({ _id: req.params.id, user: req.user.id });
  if (!r.deletedCount) throw httpError(404, 'Alert not found');
  res.json({ message: 'Alert deleted' });
});

export default router;
