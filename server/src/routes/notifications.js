import { Router } from 'express';
import Notification from '../models/Notification.js';
import { authMiddleware } from '../middleware/auth.js';
import { isValidId, httpError } from '../utils/helpers.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ user: req.user.id, read: false }),
  ]);
  res.json({ unread, notifications: items });
});

router.patch('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
});

router.patch('/:id/read', async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(404, 'Notification not found');
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true }, { new: true });
  if (!n) throw httpError(404, 'Notification not found');
  res.json(n);
});

export default router;
