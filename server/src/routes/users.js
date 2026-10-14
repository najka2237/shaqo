import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { listUsers } from './admin.js';

const router = Router();
router.get('/', authMiddleware, requireRole('admin'), listUsers);
export default router;
