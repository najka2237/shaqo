import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import { config } from './config.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
}

/** Make sure the admin account exists (created from ADMIN_EMAIL / ADMIN_PASSWORD). */
export async function ensureAdmin() {
  if (await User.exists({ email: config.adminEmail })) return;
  await User.create({
    name: 'System Admin',
    email: config.adminEmail,
    password: await bcrypt.hash(config.adminPassword, 10),
    role: 'admin',
  });
  console.log(`Admin created: ${config.adminEmail}`);
}
