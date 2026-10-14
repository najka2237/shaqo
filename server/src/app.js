import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import profileRoutes from './routes/profile.js';
import companyRoutes from './routes/company.js';
import employerRoutes from './routes/employer.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';
import savedRoutes from './routes/saved.js';
import notificationRoutes from './routes/notifications.js';
import { notFound, errorHandler } from './middleware/error.js';
import { config } from './config.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.clientUrl === '*' ? true : config.clientUrl.split(','), exposedHeaders: ['X-Total-Count'] }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/company', companyRoutes);
  app.use('/api/employer', employerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/saved', savedRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
