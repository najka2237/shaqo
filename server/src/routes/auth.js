import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { authMiddleware, signToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register - registers a new job seeker or employer account.
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'jobseeker', phone, companyName } = req.body || {};

  const errors = {};
  if (!name || !String(name).trim()) errors.name = 'Name is required';
  if (!email || !String(email).trim()) errors.email = 'Email is required';
  else if (!/^\S+@\S+\.\S+$/.test(String(email).trim())) errors.email = 'Please provide a valid email address';
  if (!password) errors.password = 'Password is required';
  else if (String(password).length < 8) errors.password = 'Password must be at least 8 characters';
  if (!['jobseeker', 'employer'].includes(role)) errors.role = 'Role must be jobseeker or employer';

  if (Object.keys(errors).length) {
    return res.status(400).json({ message: Object.values(errors)[0], errors });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  // Passwords are hashed with bcrypt before being stored (never saved in plain text).
  const hashed = await bcrypt.hash(String(password), 10);
  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashed,
    role,
    phone: phone ? String(phone).trim() : undefined,
  });

  if (role === 'employer') {
    try {
      await Company.create({
        owner: user._id,
        name: companyName && String(companyName).trim() ? String(companyName).trim() : String(name).trim(),
      });
    } catch (err) {
      await User.deleteOne({ _id: user._id });
      throw err;
    }
  }

  res.status(201).json({ message: 'Account created successfully', user });
});

// POST /api/auth/login - authenticates a user and returns a signed JWT.
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
  const valid = user ? await bcrypt.compare(String(password), user.password) : false;
  if (!user || !valid) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ message: 'Your account has been suspended' });
  }

  res.json({ token: signToken(user), user });
});

// GET /api/auth/me - current user (used by the client to restore a session).
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ message: 'Invalid or expired token' });
  let company = null;
  if (user.role === 'employer') company = await Company.findOne({ owner: user._id });
  res.json({ user, company });
});

// PUT /api/auth/password - change own password.
router.put('/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password are required' });
  if (String(newPassword).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  const user = await User.findById(req.user.id).select('+password');
  if (!user || !(await bcrypt.compare(String(currentPassword), user.password))) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  user.password = await bcrypt.hash(String(newPassword), 10);
  await user.save();
  res.json({ message: 'Password changed successfully' });
});

export default router;
