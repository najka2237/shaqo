import { createApp } from './app.js';
import { connectDb, ensureAdmin } from './db.js';
import { config } from './config.js';

try {
  await connectDb();
  await ensureAdmin();
} catch (err) {
  console.error('\nCould not connect to MongoDB:', err.message);
  console.error('Check MONGO_URI in server/.env (see README).\n');
  process.exit(1);
}
createApp().listen(config.port, () => console.log(`ShaqoDoon API running on http://localhost:${config.port}`));
