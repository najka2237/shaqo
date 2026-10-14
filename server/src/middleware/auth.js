import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config.js';

/**
 * Authentication middleware.
 * Verifies the JWT sent in the `Authorization: Bearer <token>` header and
 * attaches { id, role, name } to req.user. Suspended accounts are rejected
 * immediately, even if they still hold a previously issued token.
 */
export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const user = await User.findById(decoded.id).select('name role status').lean();
  if (!user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ message: 'Your account has been suspended' });
  }

  req.user = { id: String(user._id), role: user.role, name: user.name };
  next();
}

/** Role-checking middleware (role-based access control). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: 'Access denied: you do not have permission to perform this action' });
    }
    next();
  };
}

export function signToken(user) {
  return jwt.sign({ id: String(user._id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}
