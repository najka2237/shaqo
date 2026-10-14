import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shaqodoon',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: process.env.CLIENT_URL || '*',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@shaqodoon.so').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin12345',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '..', 'uploads'),
};

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
