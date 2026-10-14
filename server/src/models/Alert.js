import mongoose from 'mongoose';

// A job alert: the seeker is notified (in-app, email, SMS/WhatsApp) when a new job matches.
const alertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    keywords: [{ type: String, trim: true }],
    category: { type: String, trim: true },
    location: { type: String, trim: true },
    jobType: { type: String, trim: true },
  },
  { timestamps: true }
);

alertSchema.set('toJSON', { transform: (_d, ret) => { delete ret.__v; return ret; } });

export default mongoose.model('Alert', alertSchema);
